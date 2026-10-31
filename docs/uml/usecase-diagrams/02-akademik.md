# Use Case Diagram — Modul 2: Portal Akademik & Autentikasi SSO (`akademik`)

## Referensi Kode Sumber
- **Screens**: `src/app/android/login.tsx`, `src/app/ios/login.tsx`, `src/app/akademik.tsx`, `src/app/presensi-detail.tsx`
- **Components**: `src/components/akademik/NavigationTabs.tsx`, `KrsTab.tsx`, `PresensiTab.tsx`, `KhsTab.tsx`, `TagihanTab.tsx`, `ProfileModal.tsx`
- **Services**: `src/services/akademik/academicApi.ts`, `authService.ts`, `fetchHelper.ts`, `krsService.ts`, `krsParser.ts`, `presensiService.ts`, `presensiParser.ts`, `khsService.ts`, `khsParser.ts`, `tagihanService.ts`, `tagihanParser.ts`, `profileService.ts`, `profileParser.ts`

## Spesifikasi Use Case

| ID | Nama Use Case | Aktor | Relasi (`<<include>>` / `<<extend>>`) | Deskripsi Logika |
| :--- | :--- | :--- | :--- | :--- |
| **UC-AKD-01** | Login SSO Portal Akademik | Mahasiswa, Keycloak SSO, Server Akademik, SecureStore | `<<include>>` **UC-AKD-01A**, **UC-AKD-01B**, **UC-AKD-01C** | Autentikasi NIM & Password melalui `authenticateAcademicSystem()`. |
| **UC-AKD-01A** | Telusuri Redirect & Meta-Refresh Form SSO | Keycloak SSO, Server Akademik | Included by **UC-AKD-01** | Menjalankan `fetchWithManualRedirects` & `extractMetaRefresh` hingga menemukan `#kc-form-login`. |
| **UC-AKD-01B** | Tukar Token Sesi (3x Meta-Refresh Loop) | Server Akademik | Included by **UC-AKD-01**, **UC-AKD-02** | Menjalankan `executeTokenExchangeLoop()` untuk menukar kode OAuth menjadi `PHPSESSID`. |
| **UC-AKD-01C** | Simpan Kredensial & Sesi ke SecureStore | SecureStore | Included by **UC-AKD-01**, **UC-AKD-02** | Menyimpan `akademik_nim`, `akademik_password`, dan `akademik_phpSessId`. |
| **UC-AKD-02** | Silent Login (Regenerasi Sesi Otomatis) | Keycloak SSO, Server Akademik, SecureStore | `<<extend>>` dari **UC-AKD-03..09** `[isSessionExpired]`<br>`<<include>>` **UC-AKD-01B**, **UC-AKD-01C**<br>`<<extend>>` **UC-AKD-01** `[jika silent login gagal]` | Interceptor `academicApi` mendeteksi HTML sesi habis, menjalankan `performSilentLogin()`, dan mengulang request yang tertunda di `failedQueue`. |
| **UC-AKD-03** | Lihat Kartu Rencana Studi (KRS) | Mahasiswa, Server Akademik | `<<include>>` Ekstrak URL KRS Dinamis (`extractKrsUrl`) & Parse HTML KRS (`parseKrsHtml`) | Mengambil halaman dashboard untuk mengekstrak URL KRS dinamis lalu merender jadwal & total SKS. |
| **UC-AKD-04** | Lihat Rekapitulasi Presensi Kuliah | Mahasiswa, Server Akademik | - | Mengambil persentase kehadiran, jumlah hadir/alpa, dan status tombol "Masuk Kelas (Input)". |
| **UC-AKD-05** | Lihat Detail Pertemuan Kelas | Mahasiswa, Server Akademik | `<<extend>>` dari **UC-AKD-04** `[canInputPresensi == true]` | Menampilkan daftar pertemuan per mata kuliah beserta status kehadiran & dosen pengampu. |
| **UC-AKD-06** | Input Presensi Mandiri (Hadir/Izin/Sakit/Alpa) | Mahasiswa, Server Akademik | `<<extend>>` dari **UC-AKD-05** `[canInput == true]`<br>`<<include>>` **UC-AKD-05** (Refresh) | Mengirim POST ke `/_proses_ajax.php` (`submitPresensi`) dengan kode status (`2`, `4`, `3`, `1`). |
| **UC-AKD-07** | Lihat Kartu Hasil Studi (KHS / Nilai) & IP/IPK | Mahasiswa, Server Akademik | `<<include>>` Ambil Daftar Semester (`getKhsSemesters`) & Filter Nilai per Semester (`getKhsData`) | Menampilkan nilai Formatif, UTS, UAS, Nilai Akhir, IP Semester, dan IPK. |
| **UC-AKD-08** | Lihat Data Tagihan UKT/SPP | Mahasiswa, Server Akademik | `<<include>>` Ambil Periode Semester (`getTagihanSemesters`) & Filter Tagihan (`getTagihanData`) | Menampilkan rincian tagihan, potongan, sisa tagihan, dan status lunas/belum bayar. |
| **UC-AKD-09** | Lihat & Muat Ulang Profil Mahasiswa | Mahasiswa, Server Akademik | - | Membuka `ProfileModal` dan melakukan scraping biodata mahasiswa (`getProfileData`). |
| **UC-AKD-10** | Logout Portal Akademik | Mahasiswa, SecureStore | - | Menghapus seluruh kunci kredensial & sesi Akademik dari `SecureStore` dan kembali ke `/`. |

---

## Diagram (Mermaid)

```mermaid
flowchart LR
    MHS(["👤 Mahasiswa"])
    SSO[["🌐 Keycloak SSO Server"]]
    AKD[["🏛️ Portal Akademik Server"]]
    STORE[("🔒 SecureStore")]

    subgraph MOD_AKD["Modul 2: Portal Akademik & SSO Authentication"]
        UC01(["UC-AKD-01: Login SSO Portal Akademik"])
        UC01A(["UC-AKD-01A: Telusuri Redirect & Meta-Refresh ke Form SSO"])
        UC01B(["UC-AKD-01B: Tukar Token Sesi (3x Meta-Refresh Loop)"])
        UC01C(["UC-AKD-01C: Simpan Kredensial & PHPSESSID"])

        UC02(["UC-AKD-02: Silent Login (Regenerasi Sesi Otomatis)"])

        UC03(["UC-AKD-03: Lihat Kartu Rencana Studi (KRS)"])
        UC03A(["UC-AKD-03A: Ekstrak URL KRS Dinamis & Parse HTML"])

        UC04(["UC-AKD-04: Lihat Rekapitulasi Presensi Kuliah"])
        UC05(["UC-AKD-05: Lihat Detail Pertemuan Kelas"])
        UC06(["UC-AKD-06: Input Presensi Mandiri (Hadir/Izin/Sakit/Alpa)"])

        UC07(["UC-AKD-07: Lihat KHS (Nilai) & IP/IPK"])
        UC07A(["UC-AKD-07A: Ambil & Filter Semester KHS"])

        UC08(["UC-AKD-08: Lihat Data Tagihan UKT/SPP"])
        UC08A(["UC-AKD-08A: Ambil & Filter Periode Tagihan"])

        UC09(["UC-AKD-09: Lihat & Muat Ulang Profil Mahasiswa"])
        UC10(["UC-AKD-10: Logout Portal Akademik"])
    end

    MHS --> UC01
    MHS --> UC03
    MHS --> UC04
    MHS --> UC07
    MHS --> UC08
    MHS --> UC09
    MHS --> UC10

    UC01 -. "<<include>>" .-> UC01A
    UC01 -. "<<include>>" .-> UC01B
    UC01 -. "<<include>>" .-> UC01C

    UC02 -. "<<include>>" .-> UC01B
    UC02 -. "<<include>>" .-> UC01C
    UC01 -. "<<extend>> [silent login gagal]" .-> UC02

    UC02 -. "<<extend>> [sesi habis]" .-> UC03
    UC02 -. "<<extend>> [sesi habis]" .-> UC04
    UC02 -. "<<extend>> [sesi habis]" .-> UC05
    UC02 -. "<<extend>> [sesi habis]" .-> UC06
    UC02 -. "<<extend>> [sesi habis]" .-> UC07
    UC02 -. "<<extend>> [sesi habis]" .-> UC08
    UC02 -. "<<extend>> [sesi habis]" .-> UC09

    UC03 -. "<<include>>" .-> UC03A
    UC05 -. "<<extend>> [canInputPresensi]" .-> UC04
    UC06 -. "<<extend>> [canInput]" .-> UC05
    UC06 -. "<<include>>" .-> UC05

    UC07 -. "<<include>>" .-> UC07A
    UC08 -. "<<include>>" .-> UC08A

    UC01A --> SSO
    UC01B --> AKD
    UC01C --> STORE
    UC02 --> SSO
    UC02 --> AKD
    UC03 --> AKD
    UC04 --> AKD
    UC05 --> AKD
    UC06 --> AKD
    UC07 --> AKD
    UC08 --> AKD
    UC09 --> AKD
    UC10 --> STORE
```

---

## Diagram (PlantUML)

```plantuml
@startuml UseCase_Akademik
left to right direction
skinparam packageStyle rectangle

actor "Mahasiswa" as MHS
actor "Keycloak SSO\n(sso.uinjkt.ac.id)" as SSO <<System>>
actor "Portal Akademik\n(akademik.uinjkt.ac.id)" as AKD <<System>>
actor "SecureStore" as STORE <<System>>

rectangle "Modul 2: Portal Akademik & SSO Authentication" {
  usecase "UC-AKD-01: Login SSO Portal Akademik" as UC01
  usecase "UC-AKD-01A: Telusuri Redirect &\nMeta-Refresh ke Form SSO" as UC01A
  usecase "UC-AKD-01B: Tukar Token Sesi\n(3x Meta-Refresh Loop)" as UC01B
  usecase "UC-AKD-01C: Simpan Kredensial &\nPHPSESSID ke SecureStore" as UC01C

  usecase "UC-AKD-02: Silent Login\n(Regenerasi Sesi Otomatis)" as UC02

  usecase "UC-AKD-03: Lihat Kartu Rencana Studi (KRS)" as UC03
  usecase "UC-AKD-03A: Ekstrak URL KRS Dinamis\n& Parse Tabel KRS" as UC03A

  usecase "UC-AKD-04: Lihat Rekapitulasi Presensi Kuliah" as UC04
  usecase "UC-AKD-05: Lihat Detail Pertemuan Kelas" as UC05
  usecase "UC-AKD-06: Input Presensi Mandiri\n(Hadir / Izin / Sakit / Alpa)" as UC06

  usecase "UC-AKD-07: Lihat KHS (Nilai) & IP/IPK" as UC07
  usecase "UC-AKD-07A: Ambil Daftar Semester &\nFilter Nilai KHS" as UC07A

  usecase "UC-AKD-08: Lihat Data Tagihan UKT/SPP" as UC08
  usecase "UC-AKD-08A: Ambil Periode Semester &\nFilter Tagihan" as UC08A

  usecase "UC-AKD-09: Lihat & Muat Ulang\nProfil Mahasiswa" as UC09
  usecase "UC-AKD-10: Logout Portal Akademik" as UC10
}

MHS --> UC01
MHS --> UC03
MHS --> UC04
MHS --> UC07
MHS --> UC08
MHS --> UC09
MHS --> UC10

UC01 ..> UC01A : <<include>>
UC01 ..> UC01B : <<include>>
UC01 ..> UC01C : <<include>>

UC02 ..> UC01B : <<include>>
UC02 ..> UC01C : <<include>>
UC01 ..> UC02 : <<extend>>\n[silent login gagal]

UC02 ..> UC03 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC04 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC05 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC06 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC07 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC08 : <<extend>> [sesi kedaluwarsa]
UC02 ..> UC09 : <<extend>> [sesi kedaluwarsa]

UC03 ..> UC03A : <<include>>
UC05 ..> UC04 : <<extend>>\n[canInputPresensi == true]
UC06 ..> UC05 : <<extend>>\n[canInput == true]
UC06 ..> UC05 : <<include>> (refresh)

UC07 ..> UC07A : <<include>>
UC08 ..> UC08A : <<include>>

UC01A --> SSO
UC01B --> AKD
UC01C --> STORE
UC02 --> SSO
UC02 --> AKD
UC03 --> AKD
UC04 --> AKD
UC05 --> AKD
UC06 --> AKD
UC07 --> AKD
UC08 --> AKD
UC09 --> AKD
UC10 --> STORE
@enduml
```
