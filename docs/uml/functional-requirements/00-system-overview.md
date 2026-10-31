# Functional Requirements — Global System Overview (Kudu)

Dokumen ini merangkum **Kebutuhan Fungsional (Functional Requirements / FR)** keseluruhan aplikasi **Kudu (`com.ryyzdev.kudu`)** beserta matriks ketertelusuran (*traceability matrix*) terhadap **Use Case Diagram** dan **Sequence Diagram**.

---

## Ringkasan Modul & Cakupan FR

| Modul | Kode Prefix | Jumlah FR | Fokus Fungsionalitas Utama | Dokumen Detail |
| :--- | :--- | :---: | :--- | :--- |
| **1. Home & Navigasi** | `FR-HOME` | 6 | Routing otomatis berbasis OS, *Session Gate* Portal Akademik via `SecureStore`, peluncur modul kampus, dan tautan eksternal. | [01-home.md](./01-home.md) |
| **2. Portal Akademik & SSO** | `FR-AKD` | 14 | Login SSO Keycloak, *Token Exchange Loop* (3x Meta-Refresh), *Silent Login* & antrean request (`failedQueue`), scraping KRS, Presensi & Input Absen Mandiri, KHS (Nilai), Tagihan UKT, Profil Mahasiswa, dan Logout. | [02-akademik.md](./02-akademik.md) |
| **3. LMS Moodle** | `FR-LMS` | 10 | Login Google OAuth2 via WebView + *Auto-Click*, sinkronisasi Moodle AJAX Web Services, *Headless Background Sync*, *Chunked Storage* (`1800` byte/chunk), kalkulasi urgensi deadline tugas, progress kursus, pencarian katalog kursus + *WebView Fallback*, dan Disconnect. | [03-lms.md](./03-lms.md) |
| **4. E-Letter FST** | `FR-ELT` | 9 | Validasi sesi & *Auto-Login*, ekstraksi token CSRF/XSRF Laravel, *Silent Re-Login Interceptor*, scraping riwayat surat, unduh/cetak PDF surat bertanda tangan, pengajuan surat baru (Elektronik/Manual), dan Logout. | [04-eletter.md](./04-eletter.md) |

---

## Matriks Ketertelusuran (*Traceability Matrix*)

| Kode FR | Nama Kebutuhan Fungsional | Kode Use Case | Dokumen Sequence |
| :--- | :--- | :--- | :--- |
| `FR-HOME-01` | Routing Otomatis Berbasis Platform OS | `UC-HOME-01` | `01-home.md` |
| `FR-HOME-02` | Pemeriksaan Sesi Lokal Akademik (*Session Gate*) | `UC-HOME-02`, `UC-HOME-02A` | `01-home.md` |
| `FR-HOME-03` | Pengalihan Navigasi Akademik (Dashboard vs Login) | `UC-HOME-02B`, `UC-HOME-02C` | `01-home.md` |
| `FR-HOME-04` | Navigasi ke Modul LMS Moodle & E-Letter FST | `UC-HOME-03`, `UC-HOME-04` | `01-home.md` |
| `FR-HOME-05` | Navigasi ke Halaman Layanan FST (*Coming Soon*) | `UC-HOME-05` | `01-home.md` |
| `FR-HOME-06` | Pembukaan Tautan Eksternal (Trakteer & GitHub) | `UC-HOME-06` | `01-home.md` |
| `FR-AKD-01` | Pre-fill NIM Tersimpan pada Halaman Login | `UC-AKD-01` | `02-akademik-auth.md` |
| `FR-AKD-02` | Penelusuran Redirect & Meta-Refresh ke Form SSO | `UC-AKD-01A` | `02-akademik-auth.md` |
| `FR-AKD-03` | Autentikasi Kredensial ke Server Keycloak SSO | `UC-AKD-01` | `02-akademik-auth.md` |
| `FR-AKD-04` | Pertukaran Token Sesi (*3x Meta-Refresh Loop*) | `UC-AKD-01B` | `02-akademik-auth.md` |
| `FR-AKD-05` | Penyimpanan Kredensial & Sesi Akademik Terenkripsi | `UC-AKD-01C` | `02-akademik-auth.md` |
| `FR-AKD-06` | Deteksi Kedaluwarsa Sesi & *Silent Login* Otomatis | `UC-AKD-02` | `02-akademik-auth.md` |
| `FR-AKD-07` | Manajemen Antrean Request Paralel (`failedQueue`) | `UC-AKD-02` | `02-akademik-auth.md` |
| `FR-AKD-08` | Ekstraksi URL Dinamis & Penampilan Data KRS | `UC-AKD-03`, `UC-AKD-03A` | `03-akademik-krs-profile.md` |
| `FR-AKD-09` | Penampilan Rekapitulasi Presensi Perkuliahan | `UC-AKD-04` | `04-akademik-presensi.md` |
| `FR-AKD-10` | Penampilan Detail Pertemuan Kelas | `UC-AKD-05` | `04-akademik-presensi.md` |
| `FR-AKD-11` | Pengisian Presensi Mandiri (Hadir/Izin/Sakit/Alpa) | `UC-AKD-06` | `04-akademik-presensi.md` |
| `FR-AKD-12` | Penampilan & Filter KHS (Nilai) serta IP/IPK per Semester | `UC-AKD-07`, `UC-AKD-07A` | `05-akademik-khs-tagihan.md` |
| `FR-AKD-13` | Penampilan & Filter Tagihan UKT/SPP per Periode | `UC-AKD-08`, `UC-AKD-08A` | `05-akademik-khs-tagihan.md` |
| `FR-AKD-14` | Penampilan Profil Mahasiswa & Logout Akademik | `UC-AKD-09`, `UC-AKD-10` | `03-akademik-krs-profile.md` |
| `FR-LMS-01` | Autentikasi LMS via Google OAuth2 WebView & *Auto-Click* | `UC-LMS-01`, `UC-LMS-01A` | `06-lms.md` |
| `FR-LMS-02` | Pengambilan Data Kursus & Tugas via Moodle AJAX | `UC-LMS-01B` | `06-lms.md` |
| `FR-LMS-03` | Penyimpanan & Pembacaan Cache Terenkripsi (*Chunked 1800B*) | `UC-LMS-01C`, `UC-LMS-03A` | `06-lms.md` |
| `FR-LMS-04` | Sinkronisasi Latar Belakang Otomatis (*Headless Sync*) | `UC-LMS-02` | `06-lms.md` |
| `FR-LMS-05` | Deteksi Sesi LMS Kedaluwarsa Tanpa Menghapus Cache | `UC-LMS-02A` | `06-lms.md` |
| `FR-LMS-06` | Penampilan Daftar Tugas & Klasifikasi Urgensi Deadline | `UC-LMS-03`, `UC-LMS-03B` | `06-lms.md` |
| `FR-LMS-07` | Penampilan Daftar Mata Kuliah Terdaftar & Progress | `UC-LMS-04` | `06-lms.md` |
| `FR-LMS-08` | Pencarian & Filter Kategori Katalog Kursus LMS | `UC-LMS-05`, `UC-LMS-05A` | `06-lms.md` |
| `FR-LMS-09` | *Fallback Fetch* Katalog Kursus via Sesi Headless WebView | `UC-LMS-05B` | `06-lms.md` |
| `FR-LMS-10` | Penyegaran Manual (*Refresh*) & Pemutusan Akun LMS | `UC-LMS-06`, `UC-LMS-07` | `06-lms.md` |
| `FR-ELT-01` | Validasi Sesi Aktif E-Letter (`GET /home`) | `UC-ELT-01`, `UC-ELT-01A` | `07-eletter.md` |
| `FR-ELT-02` | *Auto-Login* E-Letter Menggunakan Kredensial Tersimpan | `UC-ELT-01`, `UC-ELT-02` | `07-eletter.md` |
| `FR-ELT-03` | Ekstraksi CSRF/XSRF & Login Manual E-Letter | `UC-ELT-02`, `UC-ELT-02A..C` | `07-eletter.md` |
| `FR-ELT-04` | Injeksi Cookie/XSRF & *Silent Re-Login Interceptor* | `UC-ELT-03` | `07-eletter.md` |
| `FR-ELT-05` | Penampilan Riwayat Pengajuan Surat (`#example23`) | `UC-ELT-04` | `07-eletter.md` |
| `FR-ELT-06` | Cetak / Unduh Dokumen Surat PDF Bertanda Tangan | `UC-ELT-04A` | `07-eletter.md` |
| `FR-ELT-07` | Pemuatan Formulir & Opsi Jenis Surat Baru | `UC-ELT-05` | `07-eletter.md` |
| `FR-ELT-08` | Pengiriman Pengajuan Surat Baru (Elektronik / Manual) | `UC-ELT-06` | `07-eletter.md` |
| `FR-ELT-09` | Logout & Pembersihan Sesi E-Letter | `UC-ELT-07` | `07-eletter.md` |
