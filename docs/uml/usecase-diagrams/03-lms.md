# Use Case Diagram — Modul 3: LMS Moodle (`lms`)

## Referensi Kode Sumber
- **Screen**: `src/app/lms.tsx` (`LmsScreen`)
- **Components**: `src/components/lms/LmsAuthModal.tsx`, `src/components/lms/LmsBackgroundSyncer.tsx`, `src/components/lms/LmsCourseSearchTab.tsx`
- **Services & Utils**: `src/services/lms/lmsService.ts`, `lmsInjectedScript.ts`, `lmsSearchService.ts`, `lmsParser.ts`, `lmsTypes.ts`, `src/utils/storageUtils.ts`

## Spesifikasi Use Case

| ID | Nama Use Case | Aktor | Relasi (`<<include>>` / `<<extend>>`) | Deskripsi Logika |
| :--- | :--- | :--- | :--- | :--- |
| **UC-LMS-01** | Hubungkan Akun LMS via Google SSO | Mahasiswa, Google OAuth2, Server LMS, SecureStore | `<<include>>` **UC-LMS-01A**, **UC-LMS-01B**, **UC-LMS-01C** | Membuka `LmsAuthModal` (`WebView`) untuk login SSO Google dan menyinkronkan data Moodle. |
| **UC-LMS-01A** | Auto-Click Tombol Google OAuth2 | Server LMS, Google OAuth2 | Included by **UC-LMS-01** | `LMS_INJECTED_SCRIPT` mendeteksi halaman `/login/index.php` dan mengeksekusi klik otomatis pada `a[href*="auth/oauth2/login.php?id=1"]`. |
| **UC-LMS-01B** | Sinkronisasi Data via Moodle AJAX Web Services | Server LMS | Included by **UC-LMS-01**, **UC-LMS-02** | Memanggil `core_course_get_enrolled_courses_by_timeline_classification` dan `core_calendar_get_action_events_by_timesort` menggunakan `M.cfg.sesskey`. |
| **UC-LMS-01C** | Simpan Cache Terenkripsi (Chunked Storage) | SecureStore | Included by **UC-LMS-01**, **UC-LMS-02** | `saveLmsSyncPayload` memecah JSON besar menjadi potongan 1800 karakter via `saveSafeStorage`. |
| **UC-LMS-02** | Sinkronisasi Latar Belakang Otomatis (Headless Sync) | Server LMS, SecureStore | `<<include>>` **UC-LMS-01B**, **UC-LMS-01C**<br>`<<extend>>` **UC-LMS-02A** `[redirect ke /login/]` | `LmsBackgroundSyncer` menjalankan WebView tersembunyi (0x0 px) saat `isConnected == true`. |
| **UC-LMS-02A** | Deteksi Sesi LMS Kedaluwarsa | SecureStore | Extends **UC-LMS-02** | Mengirim `LMS_SESSION_EXPIRED`, memanggil `setLmsDisconnected()`, dan menampilkan banner peringatan oranye tanpa menghapus cache tugas offline. |
| **UC-LMS-03** | Lihat Daftar Tugas & Deadline | Mahasiswa, SecureStore | `<<include>>` **UC-LMS-03A**, **UC-LMS-03B**<br>`<<extend>>` **UC-LMS-03C** | Menampilkan daftar tugas diurutkan berdasarkan tenggat waktu terdekat. |
| **UC-LMS-03A** | Muat Cache LMS Lokal (Reassembly Chunks) | SecureStore | Included by **UC-LMS-03**, **UC-LMS-04** | Memanggil `getLmsState()` → `getSafeStorage()` untuk menyatukan kembali chunk data dari `SecureStore`. |
| **UC-LMS-03B** | Hitung Urgensi Deadline Tugas | - | Included by **UC-LMS-03** | `getUrgencyInfo(timesort)` mengklasifikasikan tugas ke `overdue`, `critical` (≤24 jam), `warning` (≤3 hari), atau `normal`. |
| **UC-LMS-03C** | Buka Aktivitas di Browser Eksternal | Mahasiswa, Browser Eksternal | Extends **UC-LMS-03**, **UC-LMS-04**, **UC-LMS-05** | Membuka URL tugas/mata kuliah melalui `Linking.openURL()`. |
| **UC-LMS-04** | Lihat Daftar Mata Kuliah Terdaftar & Progress | Mahasiswa, SecureStore | `<<include>>` **UC-LMS-03A**<br>`<<extend>>` **UC-LMS-03C** | Menampilkan kartu mata kuliah beserta progress bar persentase penyelesaian. |
| **UC-LMS-05** | Cari & Filter Katalog Kursus LMS | Mahasiswa, Server LMS | `<<include>>` **UC-LMS-05A**<br>`<<extend>>` **UC-LMS-05B** `[fetch langsung diredirect ke login]` | Mencari kursus berdasarkan kata kunci atau kategori (`Semua`, `Wajib`, `Pilihan`, `MOOCs`, `Magang / PKL`, `Tugas Akhir`, `Praktikum`, `KKN / PkM`). |
| **UC-LMS-05A** | Parse HTML Katalog & Status Self-Enrolment | - | Included by **UC-LMS-05** | `parseSearchCoursesFromHtml` mengekstrak `.coursebox` dan mendeteksi ikon `.fa-key` (`isSelfEnrol`). |
| **UC-LMS-05B** | Fallback Fetch via Sesi Headless WebView | Server LMS | Extends **UC-LMS-05** | Memanggil `syncerRef.current.fetchUrl(targetUrl)` di dalam konteks cookie WebView jika `fetch()` native ditolak server. |
| **UC-LMS-06** | Segarkan Data LMS (Refresh) | Mahasiswa | `<<include>>` **UC-LMS-02** `[jika terhubung]` atau **UC-LMS-01** `[jika terputus]` | Menambah `syncKey` untuk memuat ulang `LmsBackgroundSyncer` atau membuka modal login. |
| **UC-LMS-07** | Putuskan Akun LMS (Logout & Hapus Cache) | Mahasiswa, SecureStore | - | Memanggil `clearLmsState()` untuk menghapus seluruh chunk `lms_user`, `lms_courses`, `lms_assignments`, dan `lms_sesskey`. |

---

## Diagram (Mermaid)

```mermaid
flowchart LR
    MHS(["👤 Mahasiswa"])
    GOOGLE[["🔑 Google OAuth2 Server"]]
    LMS[["📚 LMS Moodle Server"]]
    STORE[("🔒 SecureStore (Chunked)")]
    BROWSER[["🌐 Browser Eksternal"]]

    subgraph MOD_LMS["Modul 3: LMS Moodle"]
        UC01(["UC-LMS-01: Hubungkan Akun LMS via Google SSO"])
        UC01A(["UC-LMS-01A: Auto-Click Tombol Google OAuth2"])
        UC01B(["UC-LMS-01B: Sinkronisasi via Moodle AJAX Web Services"])
        UC01C(["UC-LMS-01C: Simpan Cache Terenkripsi (Chunked 1800B)"])

        UC02(["UC-LMS-02: Sinkronisasi Latar Belakang (Headless Sync)"])
        UC02A(["UC-LMS-02A: Tandai Sesi LMS Kedaluwarsa"])

        UC03(["UC-LMS-03: Lihat Daftar Tugas & Deadline"])
        UC03A(["UC-LMS-03A: Muat Cache LMS Lokal"])
        UC03B(["UC-LMS-03B: Hitung Urgensi Deadline"])
        UC03C(["UC-LMS-03C: Buka Aktivitas/Kursus di Browser"])

        UC04(["UC-LMS-04: Lihat Daftar Mata Kuliah & Progress"])

        UC05(["UC-LMS-05: Cari & Filter Katalog Kursus LMS"])
        UC05A(["UC-LMS-05A: Parse HTML Katalog & Status Self-Enrolment"])
        UC05B(["UC-LMS-05B: Fallback Fetch via Headless WebView"])

        UC06(["UC-LMS-06: Segarkan Data LMS (Refresh)"])
        UC07(["UC-LMS-07: Putuskan Akun LMS & Hapus Cache"])
    end

    MHS --> UC01
    MHS --> UC03
    MHS --> UC04
    MHS --> UC05
    MHS --> UC06
    MHS --> UC07

    UC01 -. "<<include>>" .-> UC01A
    UC01 -. "<<include>>" .-> UC01B
    UC01 -. "<<include>>" .-> UC01C

    UC02 -. "<<include>>" .-> UC01B
    UC02 -. "<<include>>" .-> UC01C
    UC02A -. "<<extend>> [redirect ke /login/]" .-> UC02

    UC03 -. "<<include>>" .-> UC03A
    UC03 -. "<<include>>" .-> UC03B
    UC03C -. "<<extend>>" .-> UC03
    UC03C -. "<<extend>>" .-> UC04
    UC03C -. "<<extend>>" .-> UC05

    UC04 -. "<<include>>" .-> UC03A

    UC05 -. "<<include>>" .-> UC05A
    UC05B -. "<<extend>> [direct fetch gagal]" .-> UC05

    UC06 -. "<<include>>" .-> UC02

    UC01A --> GOOGLE
    UC01A --> LMS
    UC01B --> LMS
    UC01C --> STORE
    UC02A --> STORE
    UC03A --> STORE
    UC03C --> BROWSER
    UC05 --> LMS
    UC05B --> LMS
    UC07 --> STORE
```

---

## Diagram (PlantUML)

```plantuml
@startuml UseCase_LMS
left to right direction
skinparam packageStyle rectangle

actor "Mahasiswa" as MHS
actor "Google OAuth2\n(accounts.google.com)" as GOOGLE <<System>>
actor "LMS Moodle Server\n(lms.uinjakarta.id)" as LMS <<System>>
actor "SecureStore\n(Chunked Storage)" as STORE <<System>>
actor "Browser Eksternal\n(Expo Linking)" as BROWSER <<System>>

rectangle "Modul 3: LMS Moodle" {
  usecase "UC-LMS-01: Hubungkan Akun LMS\nvia Google SSO" as UC01
  usecase "UC-LMS-01A: Auto-Click Tombol\nGoogle OAuth2" as UC01A
  usecase "UC-LMS-01B: Sinkronisasi via\nMoodle AJAX Web Services" as UC01B
  usecase "UC-LMS-01C: Simpan Cache Terenkripsi\n(Chunked 1800 Bytes)" as UC01C

  usecase "UC-LMS-02: Sinkronisasi Latar Belakang\n(Headless WebView Sync)" as UC02
  usecase "UC-LMS-02A: Tandai Sesi LMS\nKedaluwarsa" as UC02A

  usecase "UC-LMS-03: Lihat Daftar Tugas & Deadline" as UC03
  usecase "UC-LMS-03A: Muat Cache LMS Lokal" as UC03A
  usecase "UC-LMS-03B: Hitung Urgensi Deadline" as UC03B
  usecase "UC-LMS-03C: Buka Aktivitas/Kursus\ndi Browser Eksternal" as UC03C

  usecase "UC-LMS-04: Lihat Daftar Mata Kuliah\n& Progress" as UC04

  usecase "UC-LMS-05: Cari & Filter\nKatalog Kursus LMS" as UC05
  usecase "UC-LMS-05A: Parse HTML Katalog &\nStatus Self-Enrolment" as UC05A
  usecase "UC-LMS-05B: Fallback Fetch via\nSesi Headless WebView" as UC05B

  usecase "UC-LMS-06: Segarkan Data LMS (Refresh)" as UC06
  usecase "UC-LMS-07: Putuskan Akun LMS &\nHapus Cache" as UC07
}

MHS --> UC01
MHS --> UC03
MHS --> UC04
MHS --> UC05
MHS --> UC06
MHS --> UC07

UC01 ..> UC01A : <<include>>
UC01 ..> UC01B : <<include>>
UC01 ..> UC01C : <<include>>

UC02 ..> UC01B : <<include>>
UC02 ..> UC01C : <<include>>
UC02A ..> UC02 : <<extend>>\n[redirect ke /login/]

UC03 ..> UC03A : <<include>>
UC03 ..> UC03B : <<include>>
UC03C ..> UC03 : <<extend>>
UC03C ..> UC04 : <<extend>>
UC03C ..> UC05 : <<extend>>

UC04 ..> UC03A : <<include>>

UC05 ..> UC05A : <<include>>
UC05B ..> UC05 : <<extend>>\n[direct fetch diredirect ke login]

UC06 ..> UC02 : <<include>>

UC01A --> GOOGLE
UC01A --> LMS
UC01B --> LMS
UC01C --> STORE
UC02A --> STORE
UC03A --> STORE
UC03C --> BROWSER
UC05 --> LMS
UC05B --> LMS
UC07 --> STORE
@enduml
```
