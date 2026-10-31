# Functional Requirements — Modul 2: Portal Akademik & Autentikasi SSO (`akademik`)

## Referensi Kode Sumber
- **Screens**: `src/app/android/login.tsx`, `src/app/ios/login.tsx`, `src/app/akademik.tsx`, `src/app/presensi-detail.tsx`
- **Components**: `src/components/akademik/NavigationTabs.tsx`, `KrsTab.tsx`, `PresensiTab.tsx`, `KhsTab.tsx`, `TagihanTab.tsx`, `ProfileModal.tsx`
- **Services**: `src/services/akademik/academicApi.ts`, `authService.ts`, `fetchHelper.ts`, `krsService.ts`, `krsParser.ts`, `presensiService.ts`, `presensiParser.ts`, `khsService.ts`, `khsParser.ts`, `tagihanService.ts`, `tagihanParser.ts`, `profileService.ts`, `profileParser.ts`

---

## 1. Tabel Ringkasan Kebutuhan Fungsional

| Kode FR | Nama Kebutuhan Fungsional | Prioritas | Use Case Terkait | Deskripsi Singkat |
| :--- | :--- | :---: | :--- | :--- |
| **FR-AKD-01** | Pre-fill NIM Tersimpan pada Halaman Login | Sedang | `UC-AKD-01` | Sistem mengisi otomatis kolom NIM pada halaman login jika sebelumnya pernah tersimpan di `SecureStore`. |
| **FR-AKD-02** | Penelusuran Redirect & Meta-Refresh ke Form SSO | Tinggi | `UC-AKD-01A` | Sistem menelusuri redirect HTTP `301..308` dan tag `<meta http-equiv="refresh">` secara manual hingga mendapatkan URL `action` dari `#kc-form-login`. |
| **FR-AKD-03** | Autentikasi Kredensial ke Server Keycloak SSO | Tinggi | `UC-AKD-01` | Sistem mengirimkan NIM dan password ke endpoint Keycloak SSO dan memvalidasi respons keberhasilan atau pesan kesalahan login. |
| **FR-AKD-04** | Pertukaran Token Sesi (*3x Meta-Refresh Loop*) | Tinggi | `UC-AKD-01B` | Sistem mengikuti rantai redirect dan 3 kali `<meta http-equiv="refresh">` pasca-login SSO untuk mengekstrak cookie `PHPSESSID` Portal Akademik. |
| **FR-AKD-05** | Penyimpanan Kredensial & Sesi Akademik Terenkripsi | Tinggi | `UC-AKD-01C` | Sistem menyimpan NIM, password, dan `PHPSESSID` ke `SecureStore` serta menyimpan cookie aktif di memori. |
| **FR-AKD-06** | Deteksi Kedaluwarsa Sesi & *Silent Login* Otomatis | Tinggi | `UC-AKD-02` | Interceptor `academicApi` mendeteksi respons HTML sesi kedaluwarsa/karantina dan menjalankan login ulang tanpa sepengetahuan pengguna. |
| **FR-AKD-07** | Manajemen Antrean Request Paralel (`failedQueue`) | Tinggi | `UC-AKD-02` | Saat *Silent Login* sedang berlangsung, request paralel lain diantrekan di `failedQueue` dan diulang otomatis setelah `PHPSESSID` baru tersedia. |
| **FR-AKD-08** | Ekstraksi URL Dinamis & Penampilan Data KRS | Tinggi | `UC-AKD-03`, `UC-AKD-03A` | Sistem mengekstrak URL KRS dinamis dari menu dashboard lalu melakukan scraping biodata akademik, daftar mata kuliah, jadwal, dan total SKS. |
| **FR-AKD-09** | Penampilan Rekapitulasi Presensi Perkuliahan | Tinggi | `UC-AKD-04` | Sistem melakukan scraping tabel rekap presensi untuk menampilkan jumlah hadir, alpa, persentase kehadiran, dan status tombol input absen mandiri. |
| **FR-AKD-10** | Penampilan Detail Pertemuan Kelas | Tinggi | `UC-AKD-05` | Sistem menampilkan riwayat pertemuan per mata kuliah beserta tanggal, dosen pengampu, status kehadiran, dan ketersediaan tombol "Isi Absen". |
| **FR-AKD-11** | Pengisian Presensi Mandiri (Hadir/Izin/Sakit/Alpa) | Tinggi | `UC-AKD-06` | Sistem mengirimkan form presensi mandiri (`POST /_proses_ajax.php`) dengan kode status kehadiran yang dipilih mahasiswa. |
| **FR-AKD-12** | Penampilan & Filter KHS (Nilai) serta IP/IPK per Semester | Tinggi | `UC-AKD-07`, `UC-AKD-07A` | Sistem mengambil daftar opsi semester KHS dan menampilkan rincian nilai (Formatif, UTS, UAS, Nilai Akhir) serta ringkasan IP Semester & IPK. |
| **FR-AKD-13** | Penampilan & Filter Tagihan UKT/SPP per Periode | Tinggi | `UC-AKD-08`, `UC-AKD-08A` | Sistem mengambil daftar periode semester tagihan dan menampilkan rincian nomor tagihan, total, potongan, sisa tagihan, dan status bayar. |
| **FR-AKD-14** | Penampilan Profil Mahasiswa & Logout Akademik | Sedang | `UC-AKD-09`, `UC-AKD-10` | Sistem menampilkan biodata lengkap mahasiswa di dalam modal profil serta menyediakan fitur hapus sesi (Logout). |

---

## 2. Spesifikasi Detail Kebutuhan Fungsional

### FR-AKD-01 s/d FR-AKD-05: Autentikasi SSO Portal Akademik
- **Sumber Implementasi**: `src/app/android/login.tsx:23-56`, `src/services/akademik/authService.ts:22-97, 319-454`, `src/services/akademik/fetchHelper.ts:10-97`
- **Input**: `username` (NIM) dan `password` mahasiswa.
- **Proses**:
  1. **Validasi Input**: Jika `username` atau `password` kosong, tampilkan `Alert.alert('Error', 'NIM dan Password harus diisi')`.
  2. **Stage 1 (Pencarian Form SSO)**:
     - Memanggil `fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '', 5, { forcePromptLogin: true })`.
     - Setiap respons `301..308` mengumpulkan header `Set-Cookie` (`extractSetCookies` & `updateCookies`) dan menambahkan `&prompt=login` pada URL OAuth Keycloak.
     - Memuat HTML dengan `cheerio.load` untuk mengambil atribut `action` dari `#kc-form-login`. Jika terhalang halaman karantina (`Anda tidak diijinkan`) atau `<meta http-equiv="refresh">`, sistem mengekstrak URL refresh (`extractMetaRefresh`), menunggu jeda `delay`, dan mengikuti URL tersebut hingga form ditemukan.
  3. **Stage 2 (Submit Kredensial SSO)**:
     - Mengirim `POST` ke `formAction` dengan body `application/x-www-form-urlencoded` (`username`, `password`, `credentialId: ''`) dan `redirect: 'manual'`.
     - Jika status `301`/`302` atau `200` (dengan meta-refresh tanpa error `#kc-form-login`), ambil `loginLocation` dan perbarui cookie.
  4. **Stage 3 (Token Exchange Loop)**:
     - Memanggil `executeTokenExchangeLoop(loginLocation, baseHeaders, currentCookies, formAction)` yang melakukan iterasi hingga 8 langkah mengikuti HTTP redirect dan 3x `<meta http-equiv="refresh">` di `akademik.uinjkt.ac.id` hingga mendapatkan cookie `PHPSESSID`.
  5. **Penyimpanan Sesi**: Menyimpan `akademik_nim`, `akademik_password`, `akademik_phpSessId` (beserta key kompatibilitas `nim`, `password`, `phpSessId`) ke `SecureStore` dan memanggil `router.replace('/akademik')`.
- **Output**: Sesi `PHPSESSID` aktif tersimpan dan pengguna masuk ke layar utama Akademik.
- **Penanganan Error**:
  - Jika form SSO tidak ditemukan → melempar `Error('Form login SSO tidak ditemukan.')`.
  - Jika respons SSO memuat `#kc-form-login` atau pesan `Invalid username or password` / `Username atau password salah` → melempar `Error('Login Gagal. Username/Password salah.')`.

### FR-AKD-06 & FR-AKD-07: Silent Login & Antrean Request (`academicApi`)
- **Sumber Implementasi**: `src/services/akademik/academicApi.ts:24-103`, `src/services/akademik/authService.ts:103-314`
- **Input**: Setiap HTTP request/response yang melewati instance Axios `academicApi`.
- **Proses**:
  1. **Request Interceptor**: Membaca `akademik_phpSessId` dari `SecureStore` dan menyisipkannya ke header `Cookie` (kecuali bernilai `'NATIVE_MANAGED'`).
  2. **Deteksi Sesi Habis**: Response interceptor memeriksa apakah HTML respons mengandung indikator sesi kedaluwarsa (`kc-form-login`, `login-pf-page`, `Log in to`, `Anda tidak diijinkan mengakses module ini`, `pModule=xtWmoqk=`, `title="Access Denied"`, `Kami mengira Anda telah pergi`, `menutup sesi`).
  3. **Antrean Paralel**: Jika `isRefreshing === true`, request yang masuk dimasukkan ke array `failedQueue` dan menunggu `processQueue(null, newPhpSessId)`.
  4. **Eksekusi Silent Login**:
     - Memanggil `performSilentLogin(response.data, originalRequest.url)`: menghapus `PHPSESSID` lama, mengikuti hingga 8 langkah meta-refresh/redirect karantina menuju `sso.uinjkt.ac.id`, memeriksa apakah sesi SSO masih aktif (`302`) atau perlu `POST` ulang kredensial dari `SecureStore`, lalu menjalankan `executeTokenExchangeLoop()`.
     - Jika `performSilentLogin` gagal, sistem otomatis melakukan fallback ke `authenticateAcademicSystem(username, password)`.
     - Menyimpan `newPhpSessId` ke `SecureStore`, memproses seluruh antrean di `failedQueue`, dan mengulang `originalRequest`.
- **Output**: Request data Akademik tetap berhasil dikembalikan ke komponen UI tanpa memaksa pengguna login ulang.

### FR-AKD-08: Penampilan Kartu Rencana Studi (KRS)
- **Sumber Implementasi**: `src/components/akademik/KrsTab.tsx:13-91`, `src/services/akademik/krsService.ts:14-40`, `src/services/akademik/krsParser.ts:37-104`
- **Input**: Aktivasi tab `'krs'` pada `AkademikScreen`.
- **Proses**:
  1. Memanggil `academicApi.get(DASHBOARD_URL)` (`/index.php?pModule=ydKhmA==&pSub=ydKhmA==&pAct=18yZqg==`).
  2. Mengekstrak URL KRS dinamis dari elemen `<a>` yang memuat teks `"Kartu Rencana Studi"` (`extractKrsUrl`).
  3. Memanggil `academicApi.get(krsUrl, { headers: { Referer: DASHBOARD_URL } })`.
  4. Mem-parsing HTML (`parseKrsHtml`) untuk mengambil `studentProfile` (`nama`, `nim`, `programStudi`, `semester`, `maksimumSks`, `dosenPembimbing`), daftar `krsList` (`no`, `kodeMk`, `kelas`, `matakuliah`, `jadwalWaktu`, `jadwalRuang`, `sks`), dan menghitung `totalSks`.
- **Output**: Menampilkan kartu ringkasan akademik (Prodi, Semester, Dosen PA, Total SKS / Maks SKS) dan daftar kartu mata kuliah KRS.

### FR-AKD-09, FR-AKD-10 & FR-AKD-11: Rekap Presensi, Detail Pertemuan & Input Absen Mandiri
- **Sumber Implementasi**: `src/components/akademik/PresensiTab.tsx`, `src/app/presensi-detail.tsx`, `src/services/akademik/presensiService.ts`, `src/services/akademik/presensiParser.ts`
- **Input**:
  - Aktivasi tab `'presensi'`.
  - Klik tombol **"Masuk Kelas (Input)"** (`url`, `matkul`).
  - Pemilihan status kehadiran pada modal absen mandiri (`'2'` Hadir, `'4'` Izin, `'3'` Sakit, `'1'` Alpa).
- **Proses**:
  1. **Rekap Presensi (`getDataPresensi`)**: Mengambil `PRESENSI_URL`, mem-parsing setiap baris tabel mata kuliah (`hadir`, `tidakHadir`, `terlaksana`, `persentase`), dan memeriksa apakah tombol `button[title="input presensi mandiri"]` tidak memiliki atribut `disabled` untuk mengaktifkan `canInputPresensi` dan `inputPresensiUrl`.
  2. **Detail Pertemuan (`getDetailPresensi`)**: Mengambil halaman `detailUrl` dan mem-parsing daftar pertemuan (`no`, `tanggalRencana`, `tanggalTerlaksana`, `dosen`, `statusHadir`) serta memeriksa `button.btn_input_pres_mhs` (`data-prs_id` dan atribut `disabled`) untuk menentukan `canInput`.
  3. **Submit Presensi Mandiri (`submitPresensi`)**: Mengekstrak parameter query `sia` dan `kelas` (`kls`) dari `detailUrl`, lalu mengirim `POST /_proses_ajax.php` dengan payload `status_hadir_mhs`, `prs`, `sia`, `kls`, `ipaddress_user: ''`, dan `btnPresensiMhs: 'Simpan'`. Setelah sukses, memanggil `fetchDetail()` untuk menyegarkan daftar pertemuan.
- **Output**: Rekapitulasi kehadiran, daftar pertemuan kelas, dan pembaruan status presensi mandiri secara *real-time*.

### FR-AKD-12: Penampilan & Filter KHS (Nilai) per Semester
- **Sumber Implementasi**: `src/components/akademik/KhsTab.tsx`, `src/services/akademik/khsService.ts`, `src/services/akademik/khsParser.ts`
- **Input**: Aktivasi tab `'nilai'` dan pemilihan chip semester (`activeSemester`).
- **Proses**:
  1. Memanggil `getKhsSemesters()` (`GET KHS_URL`) untuk mem-parsing opsi `<select name="lstSemester">`.
  2. Memilih semester pertama secara otomatis (`sems[0].value`).
  3. Setiap kali `activeSemester` berubah, memanggil `getKhsData(activeSemester)` (`POST KHS_URL` dengan body `lstSemester` & `btnLihat='Lihat'`).
  4. `parseKhsHtml` mengekstrak `summary` (`ipSemester`, `ipKumulatif`, `jumlahSks`, `jumlahMatkul`) dan rincian nilai tiap mata kuliah (`formatif`, `uts`, `uas`, `nilaiAkhir`).
- **Output**: Kartu ringkasan IP Semester / IPK dan daftar nilai mata kuliah dengan warna badge berdasarkan grade (`A` hijau, `B` biru, `C` kuning, `D`/`E` merah).

### FR-AKD-13: Penampilan & Filter Tagihan UKT/SPP per Periode
- **Sumber Implementasi**: `src/components/akademik/TagihanTab.tsx`, `src/services/akademik/tagihanService.ts`, `src/services/akademik/tagihanParser.ts`
- **Input**: Aktivasi tab `'tagihan'` dan pemilihan pill periode semester (`activeSemester`).
- **Proses**:
  1. Memanggil `getTagihanSemesters()` (`GET TAGIHAN_URL`) untuk mengambil daftar periode dari `<select name="lstSemester">`.
  2. Memanggil `getTagihanData(activeSemester)` (`POST TAGIHAN_URL` dengan `lstSemester` & `btnLihat='Lihat'`).
  3. `parseTagihanHtml` mengekstrak `noTagihan`, `semester`, `jenisPembayaran`, `totalTagihan`, `potongan`, `sisaTagihan`, `tanggalAwal`, `tanggalAkhir`, dan `status`.
- **Output**: Daftar kartu tagihan dengan indikator status pembayaran (hijau untuk `Lunas` / `Sudah Bayar`, merah untuk belum lunas).

### FR-AKD-14: Penampilan Profil Mahasiswa & Logout Akademik
- **Sumber Implementasi**: `src/components/akademik/ProfileModal.tsx`, `src/services/akademik/profileService.ts`, `src/services/akademik/profileParser.ts`, `src/app/akademik.tsx:63-74`
- **Input**: Klik tombol **"Profile"** atau **"Logout"** pada header `AkademikScreen`.
- **Proses**:
  - **Profil**: Saat modal dibuka (`visible === true`), memanggil `getProfileData()` (`GET PROFILE_URL` dengan `Referer: DASHBOARD_URL`). `parseProfileHtml` mengelompokkan baris tabel berdasarkan header `<th colspan>` menjadi `sections` serta mengekstrak `nama`, `nim`, `status`, `emailUniversitas`, dan `noHandphone`. Mendukung *pull-to-refresh*.
  - **Logout**: Menghapus `akademik_nim`, `akademik_password`, `akademik_phpSessId`, `nim`, `password`, dan `phpSessId` dari `SecureStore` lalu mengarahkan ke rute `'/'`.
- **Output**: Modal biodata mahasiswa ditampilkan atau sesi pengguna dibersihkan sepenuhnya.
