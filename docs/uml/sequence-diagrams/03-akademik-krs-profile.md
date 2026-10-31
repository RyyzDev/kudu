# Sequence Diagram — Modul 2B: KRS, Profil Mahasiswa & Logout (`akademik-krs-profile`)

## Referensi Kode Sumber
- `src/app/akademik.tsx` (`AkademikScreen`, `handleLogout`)
- `src/components/akademik/KrsTab.tsx` (`KrsContent`)
- `src/services/akademik/krsService.ts` (`getDataKRS`) & `src/services/akademik/krsParser.ts` (`extractKrsUrl`, `parseKrsHtml`)
- `src/components/akademik/ProfileModal.tsx` (`ProfileModal`)
- `src/services/akademik/profileService.ts` (`getProfileData`) & `src/services/akademik/profileParser.ts` (`parseProfileHtml`)

---

## 1. Alur Lihat Kartu Rencana Studi (KRS), Profil Mahasiswa & Logout (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Screen as AkademikScreen (akademik.tsx)
    participant KrsUI as KrsContent (KrsTab.tsx)
    participant KrsSvc as krsService.ts / krsParser.ts
    participant ProfUI as ProfileModal (ProfileModal.tsx)
    participant ProfSvc as profileService.ts / profileParser.ts
    participant Api as academicApi
    participant Akd as Server Akademik
    participant Store as SecureStore

    rect rgb(255, 248, 220)
        Note over User,Akd: 1. Muat Kartu Rencana Studi (KRS)
        User->>Screen: Buka Layar Akademik (Tab default: 'krs')
        Screen->>KrsUI: Render <KrsContent />
        KrsUI->>Store: getItemAsync('akademik_phpSessId') || getItemAsync('phpSessId')
        Store-->>KrsUI: phpSessId
        KrsUI->>KrsSvc: getDataKRS()
        KrsSvc->>Api: GET DASHBOARD_URL (/index.php?pModule=ydKhmA==...)
        Api->>Akd: GET /index.php?pModule=ydKhmA==...
        Akd-->>Api: HTML Dashboard
        Api-->>KrsSvc: dashRes.data
        KrsSvc->>KrsSvc: extractKrsUrl(dashRes.data) (Cari <a href> "Kartu Rencana Studi")
        KrsSvc->>Api: GET krsUrl (Referer: DASHBOARD_URL)
        Api->>Akd: GET krsUrl
        Akd-->>Api: HTML Halaman KRS
        Api-->>KrsSvc: krsRes.data
        KrsSvc->>KrsSvc: parseKrsHtml(krsRes.data) (Scrape studentProfile, krsList, totalSks)
        KrsSvc-->>KrsUI: { studentProfile, krsList, totalSks }
        KrsUI-->>User: Tampilkan Kartu Ringkasan Akademik & Daftar Mata Kuliah KRS
    end

    rect rgb(235, 248, 255)
        Note over User,Akd: 2. Lihat & Muat Ulang Profil Mahasiswa
        User->>Screen: Tap Tombol "Profile"
        Screen->>ProfUI: setShowProfile(true) -> visible=true
        ProfUI->>ProfSvc: getProfileData()
        ProfSvc->>Api: GET PROFILE_URL (/index.php?pModule=1taZpQ==...)
        Api->>Akd: GET PROFILE_URL (Referer: DASHBOARD_URL)
        Akd-->>Api: HTML Profil Mahasiswa
        Api-->>ProfSvc: response.data
        ProfSvc->>ProfSvc: parseProfileHtml(response.data) (Kelompokkan section & field)
        ProfSvc-->>ProfUI: ProfileData { nama, nim, status, emailUniversitas, noHandphone, sections }
        ProfUI-->>User: Tampilkan Biodata Lengkap Mahasiswa
        opt Pull-to-Refresh di Modal Profil
            User->>ProfUI: Tarik ke bawah (onRefresh)
            ProfUI->>ProfSvc: fetchProfile(true) -> getProfileData()
        end
    end

    rect rgb(255, 235, 238)
        Note over User,Store: 3. Logout Portal Akademik
        User->>Screen: Tap Tombol "Logout" (handleLogout)
        Screen->>Store: deleteItemAsync('akademik_nim', 'akademik_password', 'akademik_phpSessId', 'nim', 'password', 'phpSessId')
        Screen-->>User: router.replace('/')
    end
```

---

## 2. Diagram (PlantUML)

```plantuml
@startuml Sequence_Akademik_KRS_Profile
autonumber
actor "Mahasiswa" as User
participant "AkademikScreen\n(akademik.tsx)" as Screen
participant "KrsContent\n(KrsTab.tsx)" as KrsUI
participant "krsService &\nkrsParser" as KrsSvc
participant "ProfileModal\n(ProfileModal.tsx)" as ProfUI
participant "profileService &\nprofileParser" as ProfSvc
participant "academicApi" as Api
participant "Server Akademik" as Akd
database "SecureStore" as Store

== 1. Lihat Kartu Rencana Studi (KRS) ==
User -> Screen : Buka /akademik (activeTab = 'krs')
Screen -> KrsUI : Render <KrsContent />
KrsUI -> Store : Cek akademik_phpSessId / phpSessId
Store --> KrsUI : phpSessId
KrsUI -> KrsSvc : getDataKRS()
KrsSvc -> Api : GET DASHBOARD_URL
Api -> Akd : GET /index.php?pModule=ydKhmA==...
Akd --> Api : HTML Dashboard
Api --> KrsSvc : dashRes.data
KrsSvc -> KrsSvc : extractKrsUrl(dashRes.data)
KrsSvc -> Api : GET krsUrl (Referer: DASHBOARD_URL)
Api -> Akd : GET krsUrl
Akd --> Api : HTML Tabel KRS
Api --> KrsSvc : krsRes.data
KrsSvc -> KrsSvc : parseKrsHtml(krsRes.data)
KrsSvc --> KrsUI : { studentProfile, krsList, totalSks }
KrsUI --> User : Tampilkan Profil Akademik & Jadwal KRS

== 2. Lihat Profil Mahasiswa ==
User -> Screen : Tap Tombol "Profile"
Screen -> ProfUI : visible = true
ProfUI -> ProfSvc : getProfileData()
ProfSvc -> Api : GET PROFILE_URL (Referer: DASHBOARD_URL)
Api -> Akd : GET /index.php?pModule=1taZpQ==...
Akd --> Api : HTML Biodata Mahasiswa
Api --> ProfSvc : response.data
ProfSvc -> ProfSvc : parseProfileHtml(response.data)
ProfSvc --> ProfUI : ProfileData (nama, nim, status, sections[])
ProfUI --> User : Render Modal Profil Mahasiswa

== 3. Logout Portal Akademik ==
User -> Screen : Tap Tombol "Logout"
Screen -> Store : Hapus akademik_nim, akademik_password, akademik_phpSessId
Screen --> User : router.replace('/')
@enduml
```
