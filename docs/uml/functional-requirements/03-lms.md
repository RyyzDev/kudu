# Functional Requirements — Modul 3: LMS Moodle (`lms`)

## Referensi Kode Sumber
- **Screen**: `src/app/lms.tsx` (`LmsScreen`)
- **Components**: `src/components/lms/LmsAuthModal.tsx`, `src/components/lms/LmsBackgroundSyncer.tsx`, `src/components/lms/LmsCourseSearchTab.tsx`
- **Services & Utils**: `src/services/lms/lmsService.ts`, `lmsInjectedScript.ts`, `lmsSearchService.ts`, `lmsParser.ts`, `lmsTypes.ts`, `src/utils/storageUtils.ts`

---

## 1. Tabel Ringkasan Kebutuhan Fungsional

| Kode FR | Nama Kebutuhan Fungsional | Prioritas | Use Case Terkait | Deskripsi Singkat |
| :--- | :--- | :---: | :--- | :--- |
| **FR-LMS-01** | Autentikasi LMS via Google OAuth2 WebView & *Auto-Click* | Tinggi | `UC-LMS-01`, `UC-LMS-01A` | Sistem membuka WebView login Moodle dengan *custom User-Agent* dan mengklik otomatis tombol Google OAuth2. |
| **FR-LMS-02** | Pengambilan Data Kursus & Tugas via Moodle AJAX | Tinggi | `UC-LMS-01B` | Sistem mengekstrak `M.cfg.sesskey` dari halaman Moodle dan memanggil endpoint AJAX resmi Moodle untuk mengambil kursus terdaftar dan tugas kalender. |
| **FR-LMS-03** | Penyimpanan & Pembacaan Cache Terenkripsi (*Chunked 1800B*) | Tinggi | `UC-LMS-01C`, `UC-LMS-03A` | Sistem memecah payload JSON besar menjadi potongan 1800 karakter agar dapat disimpan dengan aman di `SecureStore` tanpa melampaui batas ukuran kunci. |
| **FR-LMS-04** | Sinkronisasi Latar Belakang Otomatis (*Headless Sync*) | Tinggi | `UC-LMS-02` | Sistem menjalankan WebView tersembunyi (`0x0` px) di latar belakang untuk menyegarkan tugas dan kursus secara otomatis saat pengguna membuka layar LMS. |
| **FR-LMS-05** | Deteksi Sesi LMS Kedaluwarsa Tanpa Menghapus Cache | Tinggi | `UC-LMS-02A` | Jika WebView latar belakang diredirect ke `/login/`, sistem menandai status terputus dan menampilkan banner peringatan sambil tetap menampilkan cache tugas terakhir. |
| **FR-LMS-06** | Penampilan Daftar Tugas & Klasifikasi Urgensi Deadline | Tinggi | `UC-LMS-03`, `UC-LMS-03B` | Sistem mengurutkan tugas berdasarkan tenggat waktu terdekat dan memberi label urgensi (`Terlambat`, `Hari Ini`, `Segera`, ` Mendatang`). |
| **FR-LMS-07** | Penampilan Daftar Mata Kuliah Terdaftar & Progress | Tinggi | `UC-LMS-04` | Sistem menampilkan daftar mata kuliah yang diikuti mahasiswa beserta persentase progress bar penyelesaian. |
| **FR-LMS-08** | Pencarian & Filter Kategori Katalog Kursus LMS | Sedang | `UC-LMS-05`, `UC-LMS-05A` | Sistem memungkinkan pencarian kursus berdasarkan kata kunci atau filter 8 kategori kurikulum beserta deteksi status *Self Enrolment*. |
| **FR-LMS-09** | *Fallback Fetch* Katalog Kursus via Sesi Headless WebView | Tinggi | `UC-LMS-05B` | Jika `fetch` langsung ditolak server LMS (redirect ke login), sistem mengambil HTML katalog melalui injeksi `fetch()` di dalam sesi WebView latar belakang. |
| **FR-LMS-10** | Penyegaran Manual (*Refresh*) & Pemutusan Akun LMS | Sedang | `UC-LMS-06`, `UC-LMS-07` | Sistem menyediakan fitur *pull-to-refresh* / tombol sinkronisasi ulang serta fitur hapus seluruh cache & sesi LMS. |

---

## 2. Spesifikasi Detail Kebutuhan Fungsional

### FR-LMS-01 & FR-LMS-02: Autentikasi Google OAuth2 & Sinkronisasi Moodle AJAX
- **Sumber Implementasi**: `src/components/lms/LmsAuthModal.tsx:16-161`, `src/services/lms/lmsInjectedScript.ts:1-172`
- **Input**: Aksi klik pengguna pada tombol **"Hubungkan"** / **"Hubungkan Sekarang"** dan login akun Google kampus.
- **Proses**:
  1. `LmsAuthModal` memuat `https://lms.uinjakarta.id/login/index.php` dengan `userAgent={LMS_USER_AGENT}` (User-Agent mobile standar agar tidak diblokir error `403 disallowed_useragent` oleh Google OAuth).
  2. `LMS_INJECTED_SCRIPT` mendeteksi halaman `/login/index.php`, menonjolkan tombol `a[href*="auth/oauth2/login.php?id=1"]`, dan mengeksekusi `.click()` otomatis setelah 400ms (atau melalui tombol **"Buka Google"**).
  3. Setelah autentikasi Google selesai dan WebView mendarat di `lms.uinjakarta.id`, script membaca `window.M.cfg.sesskey`, `window.M.cfg.userId`, `.usertext` (`fullname`), dan `.userpicture` (`avatarUrl`).
  4. Script menjalankan `fetchMoodleData()` secara paralel/berurutan ke `/lib/ajax/service.php?sesskey=...`:
     - `core_course_get_enrolled_courses_by_timeline_classification` (`classification: 'all'`) untuk daftar mata kuliah terdaftar.
     - `core_calendar_get_action_events_by_timesort` (`timesortfrom: now - 86400`, `limitnum: 30`) untuk daftar tugas/aktivitas mendatang.
  5. Mengirim pesan `window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LMS_SYNC_SUCCESS', payload }))`.
- **Output**: Data profil LMS, daftar kursus, dan daftar tugas berhasil diambil dari Moodle.

### FR-LMS-03: Penyimpanan & Pembacaan Cache Terenkripsi (*Chunked Storage*)
- **Sumber Implementasi**: `src/utils/storageUtils.ts:1-61`, `src/services/lms/lmsService.ts:22-72`
- **Input**: Objek `LmsSyncPayload` (`user`, `courses`, `assignments`, `sesskey`, `syncedAt`).
- **Proses**:
  1. `saveSafeStorage(key, value)` mengubah objek menjadi string JSON.
  2. Jika panjang string `<= 1800` karakter (`CHUNK_SIZE`), disimpan langsung ke `SecureStore` dan key `${key}__chunks` dihapus.
  3. Jika `> 1800` karakter, string dipecah menjadi potongan 1800 karakter, disimpan ke `${key}__0`, `${key}__1`, dst., serta jumlah potongan disimpan di `${key}__chunks`.
  4. Saat pembacaan (`getSafeStorage`), sistem memeriksa `${key}__chunks`, menggabungkan seluruh potongan secara berurutan, dan melakukan `JSON.parse()`.
- **Output**: Data LMS berukuran besar tersimpan dengan aman di `SecureStore` dan dapat dimuat secara instan saat offline.

### FR-LMS-04 & FR-LMS-05: Headless Background Sync & Deteksi Sesi Kedaluwarsa
- **Sumber Implementasi**: `src/components/lms/LmsBackgroundSyncer.tsx:18-129`, `src/services/lms/lmsInjectedScript.ts:13-22`
- **Input**: Status `isConnected === true` dan nilai `syncKey` pada `LmsScreen`.
- **Proses**:
  1. `LmsBackgroundSyncer` merender `WebView` berukuran `0x0` piksel ke `https://lms.uinjakarta.id/my/` dengan flag `window.__KUDU_HEADLESS__ = true`.
  2. Jika URL diarahkan ke `/login/index.php`, script mengirimkan `{ type: 'LMS_SESSION_EXPIRED' }`.
  3. `LmsBackgroundSyncer` memanggil `setLmsDisconnected()` (`lms_is_connected = 'false'`) dan `onSessionExpired()`, sehingga `LmsScreen` menampilkan banner oranye **"Sesi LMS Kedaluwarsa"** tanpa menghapus cache tugas dan kursus yang sudah ada.
  4. Jika sesi masih aktif, script mengeksekusi `fetchMoodleData()`, menyimpan payload terbaru via `saveLmsSyncPayload()`, dan memanggil `onSyncSuccess()` untuk memperbarui tampilan `LmsScreen`.
- **Output**: Data LMS tersinkronisasi secara diam-diam di latar belakang, atau pengguna mendapat notifikasi non-intrusif jika sesi habis.

### FR-LMS-06 & FR-LMS-07: Penampilan Tugas (Urgensi Deadline) & Mata Kuliah Terdaftar
- **Sumber Implementasi**: `src/app/lms.tsx:100-103, 275-439`, `src/services/lms/lmsParser.ts:27-68`
- **Input**: State `assignments` dan `courses` pada `LmsScreen`.
- **Proses**:
  1. `sortedAssignments` mengurutkan tugas berdasarkan `timesort` secara *ascending*.
  2. `getUrgencyInfo(timesort)` menghitung selisih waktu terhadap `Date.now() / 1000`:
     - `< 0` → `overdue` (**"Terlambat"**, merah `#EF4444`)
     - `<= 86400` (24 jam) → `critical` (**"Hari Ini"**, oranye `#F97316`)
     - `<= 259200` (3 hari) → `warning` (**"Segera"**, kuning `#EAB308`)
     - `> 259200` → `normal` (**"Mendatang"**, hijau `#10B981`)
  3. Pada tab **Mata Kuliah** (`courses`), sistem merender nama mata kuliah, kategori/shortname, dan progress bar (`item.progress`%).
  4. Klik pada kartu tugas atau mata kuliah akan membuka URL terkait melalui `Linking.openURL()`.
- **Output**: Daftar tugas terurut dengan indikator warna urgensi deadline dan daftar mata kuliah beserta progress.

### FR-LMS-08 & FR-LMS-09: Pencarian & Filter Katalog Kursus + *Fallback WebView*
- **Sumber Implementasi**: `src/components/lms/LmsCourseSearchTab.tsx:18-281`, `src/services/lms/lmsSearchService.ts:8-70`, `src/services/lms/lmsParser.ts:159-203`
- **Input**: Kata kunci pencarian (`searchQuery`) dan ID kategori (`selectedCategory`: `0` Semua, `2` Wajib, `3` Pilihan, `4` MOOCs, `5` Magang / PKL, `6` Tugas Akhir, `7` Praktikum, `8` KKN / PkM).
- **Proses**:
  1. Menyusun `targetUrl` (`/course/search.php?search=...` jika ada query, atau `/course/index.php?categoryid=...`).
  2. **Attempt 1 (Direct Fetch)**: Memanggil `fetch(targetUrl)` dengan `LMS_USER_AGENT`. Jika respons tidak terdeteksi sebagai redirect login (`/login/index.php`, `This page should automatically redirect`, `kc-form-login`), gunakan HTML tersebut.
  3. **Attempt 2 (WebView Fallback)**: Jika Attempt 1 gagal/diredirect ke login dan `syncerRef.current?.fetchUrl` tersedia, sistem menyuntikkan script `fetch(targetUrl)` ke dalam `LmsBackgroundSyncer` (dengan timeout 15 detik) yang memiliki cookie sesi Moodle.
  4. `parseSearchCoursesFromHtml(html)` mem-parsing elemen `.coursebox` untuk mengekstrak `id`, `name`, `url`, `infoUrl`, `summary`, serta mendeteksi `isSelfEnrol` dari keberadaan ikon `.enrolmenticons .fa-key` atau atribut `title*="Self enrolment"`.
- **Output**: Daftar katalog kursus ditampilkan beserta badge **"Self Enrolment"**, tombol **"Info"**, dan tombol **"Masuk Mata Kuliah"**.

### FR-LMS-10: Penyegaran Manual & Pemutusan Akun LMS
- **Sumber Implementasi**: `src/app/lms.tsx:65-95` (`handleRefresh`, `handleLogout`)
- **Input**: Aksi klik tombol Refresh / *pull-to-refresh* atau tombol Logout di header LMS.
- **Proses**:
  - **Refresh**: Jika `isConnected === false`, membuka `LmsAuthModal`. Jika `isConnected === true`, menaikkan state `syncKey` (`prev + 1`) untuk memicu siklus sinkronisasi baru pada `LmsBackgroundSyncer`.
  - **Logout**: Menampilkan dialog konfirmasi `Alert.alert('Putuskan Akun LMS', ...)`. Jika dikonfirmasi, memanggil `clearLmsState()` yang menghapus seluruh chunk `lms_user`, `lms_courses`, `lms_assignments`, serta `lms_sesskey`, `lms_is_connected`, dan `lms_last_sync` dari `SecureStore`.
- **Output**: Data LMS disegarkan atau seluruh cache dan sesi LMS dihapus dari perangkat.
