# Use Case Diagram — Modul 4: E-Letter FST (`eletter`)

## Referensi Kode Sumber
- **Screen**: `src/app/eletter.tsx` (`ELetterScreen`)
- **Components**: `src/components/eletter/ELetterLoginForm.tsx`, `src/components/eletter/ELetterDashboard.tsx`
- **Services**: `src/services/eletter/eletterAuthService.ts`, `src/services/eletter/eletterApi.ts`, `src/services/eletter/eletterService.ts`

## Spesifikasi Use Case

| ID | Nama Use Case | Aktor | Relasi (`<<include>>` / `<<extend>>`) | Deskripsi Logika |
| :--- | :--- | :--- | :--- | :--- |
| **UC-ELT-01** | Cek Sesi & Auto-Login E-Letter | Mahasiswa, Server E-Letter, SecureStore | `<<include>>` **UC-ELT-01A**<br>`<<extend>>` **UC-ELT-02** `[sesi habis & kredensial tersimpan]` | Saat layar `/eletter` dibuka, memeriksa sesi aktif terlebih dahulu sebelum mencoba login otomatis. |
| **UC-ELT-01A** | Validasi Sesi Aktif (`GET /home`) | Server E-Letter | Included by **UC-ELT-01** | `checkELetterSession()` memeriksa apakah cookie memori masih valid dan respons `/home` memuat teks `logout`. |
| **UC-ELT-02** | Login E-Letter FST | Mahasiswa, Server E-Letter, SecureStore | `<<include>>` **UC-ELT-02A**, **UC-ELT-02B**, **UC-ELT-02C** | Melakukan autentikasi ke server Laravel E-Letter FST (`loginELetter`). |
| **UC-ELT-02A** | Ambil Token CSRF & Cookie Awal (`GET /`) | Server E-Letter | Included by **UC-ELT-02** | Mengambil `XSRF-TOKEN`, `laravel_session`, dan `<meta name="csrf-token">` / `<input name="_token">`. |
| **UC-ELT-02B** | Kirim Kredensial Login (`POST /login`) | Server E-Letter | Included by **UC-ELT-02** | Mengirim `_token`, `username`, `password` serta header `X-XSRF-TOKEN` dengan `redirect: 'manual'`. |
| **UC-ELT-02C** | Simpan Kredensial ke SecureStore | SecureStore | Included by **UC-ELT-02** | Menyimpan `eletter_username` dan `eletter_password` ke `SecureStore`. |
| **UC-ELT-03** | Silent Re-Login E-Letter (Pemulihan Sesi) | Server E-Letter, SecureStore | `<<extend>>` dari **UC-ELT-04**, **UC-ELT-05**, **UC-ELT-06** `[status 401/419/500 atau HTML loginform]`<br>`<<include>>` **UC-ELT-02A**, **UC-ELT-02B** | Interceptor `eletterApi` (`handleEletterSessionExpired`) melakukan login ulang di latar belakang dan mengulang request yang gagal. |
| **UC-ELT-04** | Lihat Riwayat Pengajuan Surat | Mahasiswa, Server E-Letter | `<<include>>` Parse Tabel `#example23`<br>`<<extend>>` **UC-ELT-04A** `[isSigned && printUrl]` | Mengambil halaman `/persuratan` (`getELetterDashboard`) dan menampilkan daftar status pengajuan surat. |
| **UC-ELT-04A** | Cetak / Download Surat (PDF) | Mahasiswa, Browser Eksternal | Extends **UC-ELT-04** | Membuka URL cetak PDF (`/cetak/...`) melalui `Linking.openURL()` jika surat telah ditandatangani. |
| **UC-ELT-05** | Muat Form Pengajuan Surat Baru | Mahasiswa, Server E-Letter | - | Mengambil `/persuratan/add` (`getELetterFormAdd`) untuk mengekstrak opsi `<select name="id_surat">`, token CSRF, NIM, dan Nama. |
| **UC-ELT-06** | Ajukan Surat Baru (Elektronik / Manual) | Mahasiswa, Server E-Letter | `<<include>>` **UC-ELT-04** (Refresh Riwayat) | Mengirim `POST /pengajuansurat` dengan `_token`, `id_surat`, dan `tipe` (`1` Elektronik / `2` Manual), lalu kembali ke tab Riwayat. |
| **UC-ELT-07** | Logout E-Letter | Mahasiswa, SecureStore | - | Menghapus `_eletterCookies` di memori serta `eletter_username` dan `eletter_password` dari `SecureStore`. |

---

## Diagram (Mermaid)

```mermaid
flowchart LR
    MHS(["👤 Mahasiswa"])
    ELT[["✉️ E-Letter FST Server"]]
    STORE[("🔒 SecureStore")]
    BROWSER[["🌐 Browser Eksternal"]]

    subgraph MOD_ELT["Modul 4: E-Letter FST"]
        UC01(["UC-ELT-01: Cek Sesi & Auto-Login E-Letter"])
        UC01A(["UC-ELT-01A: Validasi Sesi Aktif (GET /home)"])

        UC02(["UC-ELT-02: Login E-Letter FST"])
        UC02A(["UC-ELT-02A: Ambil Token CSRF & Cookie Awal"])
        UC02B(["UC-ELT-02B: Kirim Kredensial Login (POST /login)"])
        UC02C(["UC-ELT-02C: Simpan Kredensial ke SecureStore"])

        UC03(["UC-ELT-03: Silent Re-Login E-Letter"])

        UC04(["UC-ELT-04: Lihat Riwayat Pengajuan Surat"])
        UC04A(["UC-ELT-04A: Cetak / Download Surat (PDF)"])

        UC05(["UC-ELT-05: Muat Form Pengajuan Surat Baru"])
        UC06(["UC-ELT-06: Ajukan Surat Baru (Elektronik / Manual)"])
        UC07(["UC-ELT-07: Logout E-Letter"])
    end

    MHS --> UC01
    MHS --> UC02
    MHS --> UC04
    MHS --> UC05
    MHS --> UC06
    MHS --> UC07

    UC01 -. "<<include>>" .-> UC01A
    UC02 -. "<<extend>> [sesi tidak aktif & kredensial ada]" .-> UC01

    UC02 -. "<<include>>" .-> UC02A
    UC02 -. "<<include>>" .-> UC02B
    UC02 -. "<<include>>" .-> UC02C

    UC03 -. "<<include>>" .-> UC02A
    UC03 -. "<<include>>" .-> UC02B
    UC03 -. "<<extend>> [401/419/500 / loginform]" .-> UC04
    UC03 -. "<<extend>> [401/419/500 / loginform]" .-> UC05
    UC03 -. "<<extend>> [401/419/500 / loginform]" .-> UC06

    UC04A -. "<<extend>> [isSigned == true]" .-> UC04
    UC06 -. "<<include>>" .-> UC04

    UC01A --> ELT
    UC02A --> ELT
    UC02B --> ELT
    UC02C --> STORE
    UC03 --> STORE
    UC04 --> ELT
    UC04A --> BROWSER
    UC05 --> ELT
    UC06 --> ELT
    UC07 --> STORE
```

---

## Diagram (PlantUML)

```plantuml
@startuml UseCase_ELetter
left to right direction
skinparam packageStyle rectangle

actor "Mahasiswa" as MHS
actor "E-Letter FST Server\n(e-letter.fst.uinjkt.ac.id)" as ELT <<System>>
actor "SecureStore" as STORE <<System>>
actor "Browser Eksternal\n(Expo Linking)" as BROWSER <<System>>

rectangle "Modul 4: E-Letter FST" {
  usecase "UC-ELT-01: Cek Sesi &\nAuto-Login E-Letter" as UC01
  usecase "UC-ELT-01A: Validasi Sesi Aktif\n(GET /home)" as UC01A

  usecase "UC-ELT-02: Login E-Letter FST" as UC02
  usecase "UC-ELT-02A: Ambil Token CSRF &\nCookie Awal (GET /)" as UC02A
  usecase "UC-ELT-02B: Kirim Kredensial Login\n(POST /login)" as UC02B
  usecase "UC-ELT-02C: Simpan Kredensial\nke SecureStore" as UC02C

  usecase "UC-ELT-03: Silent Re-Login E-Letter\n(handleEletterSessionExpired)" as UC03

  usecase "UC-ELT-04: Lihat Riwayat\nPengajuan Surat" as UC04
  usecase "UC-ELT-04A: Cetak / Download\nSurat (PDF)" as UC04A

  usecase "UC-ELT-05: Muat Form\nPengajuan Surat Baru" as UC05
  usecase "UC-ELT-06: Ajukan Surat Baru\n(Elektronik / Manual)" as UC06
  usecase "UC-ELT-07: Logout E-Letter" as UC07
}

MHS --> UC01
MHS --> UC02
MHS --> UC04
MHS --> UC05
MHS --> UC06
MHS --> UC07

UC01 ..> UC01A : <<include>>
UC02 ..> UC01 : <<extend>>\n[sesi tidak aktif & kredensial ada]

UC02 ..> UC02A : <<include>>
UC02 ..> UC02B : <<include>>
UC02 ..> UC02C : <<include>>

UC03 ..> UC02A : <<include>>
UC03 ..> UC02B : <<include>>
UC03 ..> UC04 : <<extend>> [401/419/500 / loginform]
UC03 ..> UC05 : <<extend>> [401/419/500 / loginform]
UC03 ..> UC06 : <<extend>> [401/419/500 / loginform]

UC04A ..> UC04 : <<extend>>\n[isSigned && printUrl]
UC06 ..> UC04 : <<include>> (refresh list)

UC01A --> ELT
UC02A --> ELT
UC02B --> ELT
UC02C --> STORE
UC03 --> STORE
UC04 --> ELT
UC04A --> BROWSER
UC05 --> ELT
UC06 --> ELT
UC07 --> STORE
@enduml
```
