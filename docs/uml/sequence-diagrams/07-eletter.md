# Sequence Diagram — Modul 4: E-Letter FST (`eletter`)

## Referensi Kode Sumber
- `src/app/eletter.tsx` (`ELetterScreen`, `checkSessionAndAutoLogin`, `handleManualLogin`, `loadDashboard`, `loadFormAdd`, `submitPengajuan`, `handleLogout`)
- `src/components/eletter/ELetterLoginForm.tsx` (`ELetterLoginForm`)
- `src/components/eletter/ELetterDashboard.tsx` (`ELetterDashboard`)
- `src/services/eletter/eletterAuthService.ts` (`checkELetterSession`, `loginELetter`, `clearEletterCookies`)
- `src/services/eletter/eletterApi.ts` (Axios Request/Response Interceptors, `handleEletterSessionExpired`)
- `src/services/eletter/eletterService.ts` (`getELetterDashboard`, `getELetterFormAdd`)

---

## 1. Alur Cek Sesi, Auto-Login, Login Manual & Silent Re-Login (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Screen as ELetterScreen (eletter.tsx)
    participant Auth as eletterAuthService.ts
    participant Api as eletterApi.ts (Interceptor)
    participant Svc as eletterService.ts
    participant Server as Server E-Letter (e-letter.fst.uinjkt.ac.id)
    participant Store as SecureStore

    rect rgb(235, 248, 255)
        Note over User,Store: 1. Buka Layar E-Letter: Cek Sesi & Auto-Login
        User->>Screen: Buka Layar E-Letter (/eletter)
        Screen->>Auth: checkSessionAndAutoLogin() -> checkELetterSession()
        alt _eletterCookies tersedia di memori
            Auth->>Server: GET /home (Cookie: _eletterCookies, redirect: 'manual')
            Server-->>Auth: HTTP 200 (HTML memuat 'logout')
            Auth-->>Screen: return true
            Screen->>Svc: loadDashboard() -> getELetterDashboard()
        else Sesi tidak aktif / belum ada cookie
            Auth-->>Screen: return false
            Screen->>Store: getItemAsync('eletter_username') & getItemAsync('eletter_password')
            Store-->>Screen: storedUsername, storedPwd
            opt storedUsername && storedPwd tersedia
                Screen->>Auth: loginELetter(storedUsername, storedPwd)
                Auth->>Server: GET / (Ambil XSRF-TOKEN, laravel_session & _token CSRF)
                Server-->>Auth: 200 OK (HTML + Set-Cookie)
                Auth->>Server: POST /login (_token, username, password, Header X-XSRF-TOKEN)
                Server-->>Auth: 302 Found + Set-Cookie laravel_session baru
                Auth-->>Screen: return true
                Screen->>Svc: loadDashboard() -> getELetterDashboard()
            end
        end
    end

    rect rgb(255, 248, 220)
        Note over User,Store: 2. Login Manual E-Letter (Jika Belum Login)
        User->>Screen: Input NIM/Username & Password di ELetterLoginForm, Tap "Login"
        Screen->>Auth: handleManualLogin() -> loginELetter(username, password)
        Auth->>Server: GET / (Ambil CSRF token & Cookie awal)
        Server-->>Auth: 200 OK + Set-Cookie (XSRF-TOKEN, laravel_session)
        Auth->>Server: POST /login (_token, username, password, redirect: 'manual')
        alt Status 302 / 301 (Berhasil)
            Server-->>Auth: 302 Found + Set-Cookie
            Auth-->>Screen: return true
            Screen->>Store: setItemAsync('eletter_username', username) & setItemAsync('eletter_password', password)
            Screen->>Svc: loadDashboard() -> getELetterDashboard()
        else Status 200 (Gagal Login)
            Server-->>Auth: 200 OK (HTML Error)
            Auth-->>Screen: throw Error('Username atau Password salah!')
            Screen-->>User: Alert('Login Gagal', err.message)
        end
    end

    rect rgb(255, 235, 238)
        Note over Svc,Store: 3. Silent Re-Login via eletterApi Interceptor (Saat Sesi Habis di Tengah Pemakaian)
        Svc->>Api: GET /persuratan atau POST /pengajuansurat
        Api->>Server: Request dengan Header Cookie & X-XSRF-TOKEN
        Server-->>Api: Response HTML id="loginform" atau HTTP 401/419/500
        Api->>Api: Deteksi isLoginPage / Status Error -> handleEletterSessionExpired()
        Api->>Store: Baca eletter_username & eletter_password
        Store-->>Api: username, password
        Api->>Auth: loginELetter(username, password, isSilent=true)
        Auth->>Server: GET / lalu POST /login
        Server-->>Auth: Cookie laravel_session & XSRF-TOKEN baru
        Auth-->>Api: return true
        Api->>Server: Retry originalRequest dengan Cookie & X-XSRF-TOKEN baru
        Server-->>Api: 200 OK (HTML Valid)
        Api-->>Svc: return response
    end
```

---

## 2. Alur Lihat Riwayat Surat, Cetak PDF, Ajukan Surat Baru & Logout (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Screen as ELetterScreen / ELetterDashboard
    participant Svc as eletterService.ts
    participant Api as eletterApi.ts
    participant Server as Server E-Letter
    participant Linking as Expo Linking
    participant Store as SecureStore

    rect rgb(235, 248, 255)
        Note over User,Linking: 1. Lihat Riwayat Surat & Cetak PDF (Tab 'list')
        Screen->>Svc: loadDashboard() -> getELetterDashboard()
        Svc->>Api: GET /persuratan
        Api->>Server: GET /persuratan
        Server-->>Api: HTML Dashboard Persuratan
        Api-->>Svc: res.data
        Svc->>Svc: cheerio.load() parse table#example23 tbody tr
        Svc-->>Screen: { submissions[], csrfToken }
        Screen-->>User: Render Daftar Riwayat Surat & Status Tanda Tangan

        opt Surat Telah Ditandatangani (item.isSigned && item.printUrl)
            User->>Screen: Tap "Cetak / Download Surat"
            Screen->>Linking: Linking.openURL(item.printUrl)
        end
    end

    rect rgb(240, 255, 240)
        Note over User,Server: 2. Muat Form & Ajukan Surat Baru (Tab 'add')
        User->>Screen: Pilih Tab "Buat Surat" (switchTab('add'))
        Screen->>Svc: loadFormAdd() -> getELetterFormAdd()
        Svc->>Api: GET /persuratan/add
        Api->>Server: GET /persuratan/add
        Server-->>Api: HTML Form Pengajuan
        Api-->>Svc: res.data
        Svc->>Svc: Scrape <select name="id_surat">, meta csrf-token, NIM & Nama
        Svc-->>Screen: { options[], csrfToken, nim, nama }
        Screen-->>User: Tampilkan Pilihan Jenis Surat & Tipe Tanda Tangan

        User->>Screen: Pilih Jenis Surat, Pilih Tipe ('1' Elektronik / '2' Manual), Tap "Ajukan Surat"
        Screen->>Api: POST /pengajuansurat (_token, id_surat, tipe, Referer: /persuratan/add)
        Api->>Server: POST /pengajuansurat
        Server-->>Api: 200 OK / Redirect
        Api-->>Screen: Sukses
        Screen-->>User: Alert('Sukses', 'Surat berhasil diajukan!')
        Screen->>Screen: switchTab('list') -> loadDashboard()
    end

    rect rgb(255, 248, 220)
        Note over User,Store: 3. Logout E-Letter
        User->>Screen: Tap Tombol "Keluar" (handleLogout)
        Screen->>Screen: clearEletterCookies()
        Screen->>Store: deleteItemAsync('eletter_username') & deleteItemAsync('eletter_password')
        Screen-->>User: Kembali ke ELetterLoginForm (isLoggedIn = false)
    end
```

---

## 3. Diagram (PlantUML)

```plantuml
@startuml Sequence_ELetter_FST
autonumber
actor "Mahasiswa" as User
participant "ELetterScreen &\nELetterDashboard" as Screen
participant "eletterAuthService.ts" as Auth
participant "eletterService.ts" as Svc
participant "eletterApi.ts\n(Interceptor)" as Api
participant "Server E-Letter\n(e-letter.fst.uinjkt.ac.id)" as Server
database "SecureStore" as Store
participant "Expo Linking" as Linking

== 1. Cek Sesi & Auto-Login / Login Manual ==
User -> Screen : Buka /eletter
Screen -> Auth : checkELetterSession()
Auth -> Server : GET /home (Cookie: _eletterCookies)
alt Sesi Aktif (200 & memuat 'logout')
  Server --> Auth : 200 OK
  Auth --> Screen : true
else Sesi Tidak Aktif
  Auth --> Screen : false
  Screen -> Store : Baca eletter_username & eletter_password
  alt Kredensial Tersimpan (Auto-Login) atau Input Manual
    Screen -> Auth : loginELetter(username, password)
    Auth -> Server : GET / (Ambil CSRF _token & Cookie awal)
    Server --> Auth : 200 OK + Set-Cookie (XSRF-TOKEN, laravel_session)
    Auth -> Server : POST /login (_token, username, password, X-XSRF-TOKEN)
    Server --> Auth : 302 Found + Set-Cookie laravel_session
    Auth --> Screen : true
    Screen -> Store : Simpan eletter_username & eletter_password
  end
end

== 2. Lihat Riwayat Surat & Cetak PDF ==
Screen -> Svc : getELetterDashboard()
Svc -> Api : GET /persuratan
Api -> Server : GET /persuratan
opt Sesi Habis (HTML id="loginform" / 401 / 419 / 500)
  Api -> Store : Ambil eletter_username & eletter_password
  Api -> Auth : loginELetter(username, password, isSilent=true)
  Api -> Server : Retry GET /persuratan
end
Server --> Api : HTML Tabel #example23
Api --> Svc : res.data
Svc --> Screen : { submissions[], csrfToken }
Screen --> User : Tampilkan Riwayat Pengajuan Surat

opt item.isSigned && item.printUrl
  User -> Screen : Tap "Cetak / Download Surat"
  Screen -> Linking : Linking.openURL(item.printUrl)
end

== 3. Muat Form & Ajukan Surat Baru ==
User -> Screen : Pilih Tab "Buat Surat"
Screen -> Svc : getELetterFormAdd()
Svc -> Api : GET /persuratan/add
Api -> Server : GET /persuratan/add
Server --> Api : HTML Form Pengajuan
Api --> Svc : res.data
Svc --> Screen : { options[], csrfToken, nim, nama }
User -> Screen : Pilih Jenis Surat & Tipe ('1' Elektronik / '2' Manual), Tap "Ajukan Surat"
Screen -> Api : POST /pengajuansurat (_token, id_surat, tipe)
Api -> Server : POST /pengajuansurat
Server --> Api : 200 OK
Api --> Screen : Sukses
Screen --> User : Alert('Sukses', 'Surat berhasil diajukan!')
Screen -> Svc : switchTab('list') -> getELetterDashboard()

== 4. Logout E-Letter ==
User -> Screen : Tap "Keluar"
Screen -> Auth : clearEletterCookies()
Screen -> Store : Hapus eletter_username & eletter_password
Screen --> User : Tampilkan Form Login E-Letter
@enduml
```
