# Sequence Diagram — Modul 2A: Autentikasi SSO & Silent Login Akademik (`akademik-auth`)

## Referensi Kode Sumber
- `src/app/android/login.tsx` & `src/app/ios/login.tsx` (`LoginScreen`, `handleLogin`)
- `src/services/akademik/authService.ts` (`authenticateAcademicSystem`, `performSilentLogin`, `executeTokenExchangeLoop`)
- `src/services/akademik/fetchHelper.ts` (`fetchWithManualRedirects`, `extractMetaRefresh`)
- `src/services/akademik/academicApi.ts` (Axios Request/Response Interceptors, `isRefreshing`, `failedQueue`, `processQueue`)
- `src/utils/cookieUtils.ts` (`extractSetCookies`, `updateCookies`)

---

## 1. Alur Login SSO Portal Akademik (`authenticateAcademicSystem`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant UI as LoginScreen (login.tsx)
    participant Auth as authService.ts
    participant Helper as fetchHelper.ts
    participant Akd as Server Akademik (akademik.uinjkt.ac.id)
    participant SSO as Keycloak SSO (sso.uinjkt.ac.id)
    participant Store as SecureStore

    User->>UI: Buka Halaman Login
    UI->>Store: getItemAsync('nim')
    Store-->>UI: savedNim (pre-fill username)

    User->>UI: Input NIM & Password, Tap "Login SSO" (handleLogin)
    alt !username || !password
        UI-->>User: Alert('Error', 'NIM dan Password harus diisi')
    else Kredensial terisi
        UI->>Auth: authenticateAcademicSystem(username, password)

        Note over Auth,SSO: Stage 1: Telusuri Redirect & Meta-Refresh menuju Form SSO
        Auth->>Helper: fetchWithManualRedirects(AKADEMIK_ORIGIN_URL, forcePromptLogin=true)
        loop Maksimal 5 Redirect HTTP (301..308)
            Helper->>Akd: GET currentUrl (redirect: 'manual')
            Akd-->>Helper: 302 Location + Set-Cookie
            Helper->>Helper: updateCookies() & tambah &prompt=login jika OAuth URL
        end
        Helper-->>Auth: { res, currentUrl, currentCookies }
        Auth->>Auth: cheerio.load(metaHtml) cari #kc-form-login[action]

        opt Form belum ditemukan (Karantina / Meta-Refresh)
            Auth->>Helper: extractMetaRefresh(metaHtml, finalUrl)
            Auth->>Helper: fetchWithManualRedirects(metaRefresh.url)
            Helper->>SSO: GET /auth/realms/uinkita/protocol/openid-connect/auth
            SSO-->>Helper: 200 OK (HTML Form Login Keycloak + Cookie AUTH_SESSION_ID)
            Helper-->>Auth: { res, currentUrl, currentCookies }
            Auth->>Auth: Ekstrak formAction dari #kc-form-login
        end

        Note over Auth,SSO: Stage 2: Kirim Kredensial ke Keycloak SSO
        Auth->>SSO: POST formAction (username, password, credentialId='')
        alt Status 200 & Terdapat pesan "Invalid username or password"
            SSO-->>Auth: 200 OK (Error HTML)
            Auth-->>UI: throw Error('Login Gagal. Username/Password salah.')
            UI-->>User: Alert('Login Gagal', error.message)
        else Status 302 Redirect ke Callback Akademik
            SSO-->>Auth: 302 Found (Location: akademikCallbackUrl) + Set-Cookie KEYCLOAK_IDENTITY
            Auth->>Auth: updateCookies(currentCookies, setCookies)

            Note over Auth,Akd: Stage 3: Token Exchange Loop (3x Meta-Refresh di Server Akademik)
            Auth->>Auth: executeTokenExchangeLoop(loginLocation, baseHeaders, currentCookies, formAction)
            loop Maksimal 8 Hop (HTTP 3xx / <meta http-equiv="refresh">)
                Auth->>Akd: GET currentUrl (Cookie: currentCookies, Referer: previousUrl)
                Akd-->>Auth: 200 OK / 302 + Set-Cookie (PHPSESSID=...)
                Auth->>Auth: updateCookies() & tangkap PHPSESSID
                Auth->>Helper: extractMetaRefresh(html, currentUrl)
                opt Ada Meta-Refresh
                    Auth->>Auth: Tunggu delay ms -> lanjut ke metaRefresh.url
                end
            end
            Auth->>Auth: setActiveAcademicCookies(currentCookies)
            Auth-->>UI: return resultPhpSessId

            Note over UI,Store: Simpan Sesi & Navigasi ke Dashboard
            UI->>Store: setItemAsync('akademik_nim', username)
            UI->>Store: setItemAsync('akademik_password', password)
            UI->>Store: setItemAsync('akademik_phpSessId', phpSessId)
            UI-->>User: router.replace('/akademik')
        end
    end
```

---

## 2. Alur Silent Login & Queue Interceptor (`academicApi` & `performSilentLogin`)

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Akademik Service (KRS/Presensi/KHS/Tagihan/Profile)
    participant Api as academicApi (Axios Interceptor)
    participant Auth as authService.ts
    participant Store as SecureStore
    participant Akd as Server Akademik
    participant SSO as Keycloak SSO

    Caller->>Api: academicApi.get(url) / post(url, data)
    Api->>Store: getItemAsync('akademik_phpSessId')
    Store-->>Api: phpSessId
    Api->>Akd: HTTP Request (Header Cookie: phpSessId)
    Akd-->>Api: HTTP 200 Response (HTML)

    Api->>Api: Cek isSessionExpired(response.data)
    alt Sesi Masih Aktif (!isSessionExpired)
        Api-->>Caller: return response
    else Sesi Kedaluwarsa (kc-form-login / Access Denied / Kami mengira Anda telah pergi)
        alt isRefreshing === true (Request paralel lain sedang refresh)
            Api->>Api: Simpan Promise ke failedQueue[]
            Note over Api: Menunggu processQueue(null, newPhpSessId)
        else isRefreshing === false
            Api->>Api: originalRequest._retry = true, isRefreshing = true
            Api->>Auth: performSilentLogin(response.data, originalRequest.url)
            Auth->>Store: Ambil akademik_nim & akademik_password
            Store-->>Auth: username, password
            Auth->>Auth: Hapus PHPSESSID lama dari currentCookies

            loop Telusuri Redirect/Meta-Refresh Karantina (Maks 8 Langkah)
                Auth->>Akd: GET nextUrl (redirect: 'manual')
                Akd-->>Auth: 302 / Meta-Refresh menuju sso.uinjkt.ac.id
            end

            Auth->>SSO: GET ssoLandingUrl (Cookie: currentCookies)
            alt Cookie SSO Masih Aktif (301/302)
                SSO-->>Auth: 302 Location (academicCallbackUrl)
            else Sesi SSO Habis (200 HTML #kc-form-login)
                SSO-->>Auth: 200 OK (Form Login Keycloak)
                Auth->>SSO: POST formAction (username, password, credentialId='')
                SSO-->>Auth: 302 Location (academicCallbackUrl)
            end

            Auth->>Auth: executeTokenExchangeLoop(academicCallbackUrl, ...)
            Auth->>Akd: Ikuti 3x Meta-Refresh & dapatkan PHPSESSID baru
            Akd-->>Auth: Set-Cookie: PHPSESSID=new_session_id
            Auth-->>Api: return newPhpSessId

            opt Jika performSilentLogin Gagal (Exception)
                Api->>Auth: Fallback authenticateAcademicSystem(username, password)
                Auth-->>Api: return newPhpSessId
            end

            Api->>Store: setItemAsync('akademik_phpSessId', newPhpSessId)
            Api->>Api: processQueue(null, newPhpSessId) & isRefreshing = false
        end

        Api->>Akd: Retry originalRequest (Header Cookie: newPhpSessId)
        Akd-->>Api: HTTP 200 (HTML Data Valid)
        Api-->>Caller: return response
    end
```

---

## 3. Diagram (PlantUML)

```plantuml
@startuml Sequence_Akademik_Auth_And_SilentLogin
autonumber
actor "Mahasiswa" as User
participant "LoginScreen\n(login.tsx)" as UI
participant "academicApi\n(Interceptor)" as Api
participant "authService.ts" as Auth
participant "fetchHelper.ts" as Helper
database "SecureStore" as Store
participant "Server Akademik\n(akademik.uinjkt.ac.id)" as Akd
participant "Keycloak SSO\n(sso.uinjkt.ac.id)" as SSO

== 1. Login SSO Portal Akademik ==
User -> UI : Input NIM & Password, Tap "Login SSO"
UI -> Auth : authenticateAcademicSystem(username, password)
Auth -> Helper : fetchWithManualRedirects(AKADEMIK_ORIGIN_URL, forcePromptLogin=true)
Helper -> Akd : GET / (redirect: 'manual')
Akd --> Helper : 302 / Meta-Refresh ke SSO
Helper -> SSO : GET /protocol/openid-connect/auth?...&prompt=login
SSO --> Helper : 200 OK (HTML #kc-form-login + Cookie)
Helper --> Auth : { res, currentUrl, currentCookies }

Auth -> SSO : POST formAction (username, password, credentialId='')
alt Kredensial Salah
  SSO --> Auth : 200 OK ("Invalid username or password")
  Auth --> UI : throw Error('Login Gagal. Username/Password salah.')
  UI --> User : Alert('Login Gagal')
else Kredensial Valid
  SSO --> Auth : 302 Found (Location: callbackUrl + Set-Cookie)
  Auth -> Auth : executeTokenExchangeLoop(callbackUrl)
  loop 3x Meta-Refresh Hop
    Auth -> Akd : GET currentUrl (Cookie: currentCookies)
    Akd --> Auth : 200 OK (<meta http-equiv="refresh">) + Set-Cookie PHPSESSID
  end
  Auth --> UI : return resultPhpSessId
  UI -> Store : Simpan akademik_nim, akademik_password, akademik_phpSessId
  UI --> User : router.replace('/akademik')
end

== 2. Silent Login via Axios Interceptor ==
UI -> Api : Request Data Akademik (KRS/Presensi/KHS/Tagihan/Profil)
Api -> Store : getItemAsync('akademik_phpSessId')
Store --> Api : phpSessId
Api -> Akd : GET/POST Endpoint (Cookie: phpSessId)
Akd --> Api : 200 OK (HTML Sesi Kedaluwarsa / Karantina)

Api -> Api : Deteksi isSessionExpired == true
alt isRefreshing == true
  Api -> Api : Antrekan request ke failedQueue
else isRefreshing == false
  Api -> Auth : performSilentLogin(expiredHtml, originalRequest.url)
  Auth -> Store : Baca akademik_nim & akademik_password
  Auth -> Akd : Telusuri Meta-Refresh Karantina menuju ssoLandingUrl
  Auth -> SSO : GET ssoLandingUrl
  alt Sesi SSO masih hidup (302)
    SSO --> Auth : 302 Location (academicCallbackUrl)
  else Sesi SSO habis (200 #kc-form-login)
    Auth -> SSO : POST formAction (username, password)
    SSO --> Auth : 302 Location (academicCallbackUrl)
  end
  Auth -> Auth : executeTokenExchangeLoop(academicCallbackUrl)
  Auth --> Api : newPhpSessId
  opt performSilentLogin throw Error
    Api -> Auth : Fallback authenticateAcademicSystem(username, password)
    Auth --> Api : newPhpSessId
  end
  Api -> Store : Update akademik_phpSessId
  Api -> Api : processQueue(null, newPhpSessId)
end
Api -> Akd : Retry originalRequest (Cookie: newPhpSessId)
Akd --> Api : 200 OK (HTML Data Valid)
Api --> UI : Return Response
@enduml
```
