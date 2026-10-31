# Functional Requirements — Modul 4: E-Letter FST (`eletter`)

## Referensi Kode Sumber
- **Screen**: `src/app/eletter.tsx` (`ELetterScreen`)
- **Components**: `src/components/eletter/ELetterLoginForm.tsx`, `src/components/eletter/ELetterDashboard.tsx`
- **Services**: `src/services/eletter/eletterAuthService.ts`, `src/services/eletter/eletterApi.ts`, `src/services/eletter/eletterService.ts`

---

## 1. Tabel Ringkasan Kebutuhan Fungsional

| Kode FR | Nama Kebutuhan Fungsional | Prioritas | Use Case Terkait | Deskripsi Singkat |
| :--- | :--- | :---: | :--- | :--- |
| **FR-ELT-01** | Validasi Sesi Aktif E-Letter (`GET /home`) | Tinggi | `UC-ELT-01`, `UC-ELT-01A` | Sistem memeriksa apakah cookie sesi E-Letter di memori masih valid dengan mengakses `/home` dan memverifikasi keberadaan menu `logout`. |
| **FR-ELT-02** | *Auto-Login* E-Letter Menggunakan Kredensial Tersimpan | Tinggi | `UC-ELT-01`, `UC-ELT-02` | Jika sesi belum aktif namun `eletter_username` dan `eletter_password` tersimpan di `SecureStore`, sistem melakukan login otomatis saat layar dibuka. |
| **FR-ELT-03** | Ekstraksi CSRF/XSRF & Login Manual E-Letter | Tinggi | `UC-ELT-02`, `UC-ELT-02A..C` | Sistem mengambil token CSRF (`_token`) dan cookie `XSRF-TOKEN` / `laravel_session` dari halaman utama sebelum mengirimkan `POST /login`. |
| **FR-ELT-04** | Injeksi Cookie/XSRF & *Silent Re-Login Interceptor* | Tinggi | `UC-ELT-03` | Interceptor `eletterApi` menyisipkan header `Cookie` dan `X-XSRF-TOKEN` pada setiap request serta melakukan login ulang otomatis jika terdeteksi halaman login atau error `401`/`419`/`500`. |
| **FR-ELT-05** | Penampilan Riwayat Pengajuan Surat (`#example23`) | Tinggi | `UC-ELT-04` | Sistem melakukan scraping tabel `#example23` pada `/persuratan` untuk menampilkan daftar riwayat surat, tipe tanda tangan, dan status proses. |
| **FR-ELT-06** | Cetak / Unduh Dokumen Surat PDF Bertanda Tangan | Tinggi | `UC-ELT-04A` | Sistem menampilkan tombol "Cetak / Download Surat" untuk membuka tautan PDF (`/cetak/...`) pada surat yang berstatus telah ditandatangani. |
| **FR-ELT-07** | Pemuatan Formulir & Opsi Jenis Surat Baru | Tinggi | `UC-ELT-05` | Sistem melakukan scraping halaman `/persuratan/add` untuk mengambil daftar opsi `<select name="id_surat">`, token CSRF, NIM, dan Nama mahasiswa. |
| **FR-ELT-08** | Pengiriman Pengajuan Surat Baru (Elektronik / Manual) | Tinggi | `UC-ELT-06` | Sistem mengirimkan form pengajuan surat (`POST /pengajuansurat`) dengan pilihan jenis surat dan tipe tanda tangan (`1` Elektronik / `2` Manual). |
| **FR-ELT-09** | Logout & Pembersihan Sesi E-Letter | Sedang | `UC-ELT-07` | Sistem menghapus cookie sesi E-Letter di memori serta menghapus kredensial dari `SecureStore`. |

---

## 2. Spesifikasi Detail Kebutuhan Fungsional

### FR-ELT-01, FR-ELT-02 & FR-ELT-03: Cek Sesi, Auto-Login & Login Manual E-Letter
- **Sumber Implementasi**: `src/app/eletter.tsx:33-89`, `src/services/eletter/eletterAuthService.ts:34-134`
- **Input**: Pembukaan layar `/eletter` atau input `username` (NIM) & `password` pada `ELetterLoginForm`.
- **Proses**:
  1. **Validasi Sesi (`checkELetterSession`)**: Jika `_eletterCookies` tersedia di memori, sistem memanggil `fetch(ELETTER_URL + '/home', { redirect: 'manual' })`. Sesi dinyatakan valid jika status `200` dan HTML memuat kata `'logout'` atau `'Logout'`.
  2. **Auto-Login**: Jika sesi tidak valid, `checkSessionAndAutoLogin()` membaca `eletter_username` dan `eletter_password` dari `SecureStore`. Jika keduanya ada, sistem memanggil `loginELetter(storedUsername, storedPwd)`.
  3. **Proses Login (`loginELetter`)**:
     - **Step 1**: Mengirim `GET /` ke `http://e-letter.fst.uinjkt.ac.id/`, mengekstrak `Set-Cookie` (`XSRF-TOKEN`, `laravel_session`), mendekode nilai `XSRF-TOKEN`, dan mem-parsing `<meta name="csrf-token">` atau `<input name="_token">` dengan `cheerio`.
     - **Step 2**: Mengirim `POST /login` dengan header `Cookie`, `X-XSRF-TOKEN`, `Referer`, dan body `_token`, `username`, `password` (`redirect: 'manual'`).
     - **Step 3**: Memperbarui `_eletterCookies` dengan `laravel_session` baru. Jika status `301`/`302` (atau `200` tanpa pesan kredensial salah), menyimpan `eletter_username` & `eletter_password` ke `SecureStore` dan memuat dashboard.
- **Output**: Mahasiswa berhasil terautentikasi ke sistem E-Letter FST dan langsung melihat dashboard persuratan.
- **Penanganan Error**: Jika respons `POST /login` berstatus `200` dan memuat `These credentials do not match` / `Username atau password salah` / `id="loginform"`, sistem melempar `Error('Username atau Password salah!')`.

### FR-ELT-04: Injeksi Cookie/XSRF & *Silent Re-Login Interceptor* (`eletterApi`)
- **Sumber Implementasi**: `src/services/eletter/eletterApi.ts:29-130`
- **Input**: Setiap request/response melalui instance Axios `eletterApi`.
- **Proses**:
  1. **Request Interceptor**: Menyisipkan header `Cookie: getEletterCookies()` dan mengekstrak nilai `XSRF-TOKEN` untuk disisipkan ke header `X-XSRF-TOKEN`.
  2. **Response Interceptor**: Memeriksa apakah respons HTML memuat form login (`id="loginform"` atau `name="username"` + `name="password"`) atau status error `401` / `419` (CSRF Token Mismatch) / `500`.
  3. Jika terdeteksi sesi habis, `handleEletterSessionExpired` membaca `eletter_username` dan `eletter_password` dari `SecureStore`, menjalankan `loginELetter(username, password, true)` (mengantrekan request paralel di `failedQueue`), memperbarui header `Cookie` dan `X-XSRF-TOKEN`, lalu mengulang `originalRequest`.
- **Output**: Permintaan data atau pengiriman surat tetap berhasil meskipun sesi Laravel di server E-Letter telah kedaluwarsa.

### FR-ELT-05 & FR-ELT-06: Riwayat Pengajuan Surat & Cetak PDF
- **Sumber Implementasi**: `src/services/eletter/eletterService.ts:31-68`, `src/components/eletter/ELetterDashboard.tsx:86-125`
- **Input**: Aktivasi tab **"Riwayat Surat"** (`activeTab === 'list'`).
- **Proses**:
  1. Memanggil `getELetterDashboard()` (`eletterApi.get('/persuratan')`).
  2. Mem-parsing setiap baris `table#example23 tbody tr`:
     - Kolom `0`: `no`
     - Kolom `1`: `tanggal`
     - Kolom `2`: `jenisSurat`
     - Kolom `3`: `tipe` (`Elektronik` / `Manual`)
     - Kolom `4`: `statusText` dan tautan `<a href*="/cetak/">` (`printUrl`).
     - Menentukan `isSigned = statusText.toLowerCase().includes('telah di tanda tangani')`.
  3. Jika `item.isSigned && item.printUrl` bernilai `true`, sistem merender tombol hijau **"Cetak / Download Surat"** yang memanggil `Linking.openURL(item.printUrl)`.
- **Output**: Daftar riwayat surat ditampilkan dengan badge status (`Selesai / Ditandatangani` hijau, `Ditolak` merah, atau `Diproses` kuning) dan akses unduh PDF.

### FR-ELT-07 & FR-ELT-08: Pemuatan Form & Pengajuan Surat Baru
- **Sumber Implementasi**: `src/services/eletter/eletterService.ts:70-96`, `src/app/eletter.tsx:107-148`, `src/components/eletter/ELetterDashboard.tsx:126-184`
- **Input**: Aktivasi tab **"Buat Surat"** (`activeTab === 'add'`), pemilihan `selectedSurat` (`id_surat`), dan pemilihan `tipePengajuan` (`'1'` Elektronik atau `'2'` Manual).
- **Proses**:
  1. **Muat Form (`getELetterFormAdd`)**: Mengambil `GET /persuratan/add`, mengekstrak opsi `<select name="id_surat"> <option>` (mengabaikan opsi placeholder `Pilih`), token CSRF `<meta name="csrf-token">`, serta NIM dan Nama dari `table.table-striped tbody tr`.
  2. **Submit Surat (`submitPengajuan`)**:
     - Memvalidasi bahwa `selectedSurat` telah dipilih.
     - Mengirim `eletterApi.post('/pengajuansurat', new URLSearchParams({ _token: csrfToken, id_surat: selectedSurat, tipe: tipePengajuan }).toString())` dengan header `Referer: ELETTER_URL + '/persuratan/add'`.
     - Menampilkan `Alert.alert('Sukses', 'Surat berhasil diajukan!')` dan otomatis berpindah ke tab `'list'` (`switchTab('list')`) untuk memuat ulang daftar riwayat surat.
- **Output**: Pengajuan surat baru tercatat di server E-Letter FST dan muncul pada daftar riwayat pengajuan.

### FR-ELT-09: Logout E-Letter
- **Sumber Implementasi**: `src/app/eletter.tsx:91-97` (`handleLogout`)
- **Input**: Aksi klik tombol **"Keluar"** pada header `ELetterDashboard`.
- **Proses**: Memanggil `clearEletterCookies()` untuk mengosongkan cookie di memori, menghapus `eletter_username` dan `eletter_password` dari `SecureStore`, serta mengubah state `isLoggedIn` menjadi `false` dan mengosongkan `submissions`.
- **Output**: Pengguna keluar dari sesi E-Letter dan dikembalikan ke tampilan `ELetterLoginForm`.
