# Functional Requirements — Modul 1: Home & Navigasi (`home`)

## Referensi Kode Sumber
- `src/app/_layout.tsx` (`RootLayout`)
- `src/app/index.tsx` (`EntryPoint`)
- `src/app/android/index.tsx` & `src/app/ios/index.tsx` (`HomeScreen`, `handleAkademikPress`, `openLink`)
- `src/app/layanan-fst.tsx` (`LayananFSTScreen`)

---

## 1. Tabel Ringkasan Kebutuhan Fungsional

| Kode FR | Nama Kebutuhan Fungsional | Prioritas | Use Case Terkait | Deskripsi Singkat |
| :--- | :--- | :---: | :--- | :--- |
| **FR-HOME-01** | Routing Otomatis Berbasis Platform OS | Tinggi | `UC-HOME-01` | Sistem mendeteksi sistem operasi perangkat (`android` / `ios`) saat aplikasi dibuka dan mengarahkan pengguna ke halaman Home yang sesuai. |
| **FR-HOME-02** | Pemeriksaan Sesi Lokal Akademik (*Session Gate*) | Tinggi | `UC-HOME-02`, `UC-HOME-02A` | Sistem memeriksa ketersediaan NIM dan token sesi (`PHPSESSID`) di `SecureStore` saat pengguna memilih menu Akademik. |
| **FR-HOME-03** | Pengalihan Navigasi Akademik (Dashboard vs Login) | Tinggi | `UC-HOME-02B`, `UC-HOME-02C` | Sistem mengarahkan pengguna langsung ke `/akademik` jika sesi lokal ditemukan, atau ke `/android/login` (`/ios/login`) jika sesi belum ada. |
| **FR-HOME-04** | Navigasi ke Modul LMS Moodle & E-Letter FST | Tinggi | `UC-HOME-03`, `UC-HOME-04` | Sistem menyediakan navigasi langsung dari kartu layanan Home menuju layar `/lms` dan `/eletter`. |
| **FR-HOME-05** | Navigasi ke Halaman Layanan FST (*Coming Soon*) | Rendah | `UC-HOME-05` | Sistem menampilkan layar informasi "Segera hadir" (`/layanan-fst`) saat kartu Layanan FST dipilih. |
| **FR-HOME-06** | Pembukaan Tautan Eksternal (Trakteer & GitHub) | Rendah | `UC-HOME-06` | Sistem membuka browser eksternal perangkat untuk mengakses tautan dukungan Trakteer atau repositori GitHub Kudu. |

---

## 2. Spesifikasi Detail Kebutuhan Fungsional

### FR-HOME-01: Routing Otomatis Berbasis Platform OS
- **Sumber Implementasi**: `src/app/index.tsx:5-15` (`EntryPoint`)
- **Input**: Nilai `Platform.OS` dari `react-native`.
- **Proses**:
  1. Saat rute `/` diakses, komponen `EntryPoint` mengevaluasi `Platform.OS === 'android'`.
  2. Jika `true`, sistem merender `<Redirect href="/android" />`.
  3. Jika bukan `android` (mis. `ios`), sistem merender `<Redirect href="/ios" />`.
- **Output**: Pengguna diarahkan ke layar `HomeScreen` sesuai platform tanpa interaksi manual.

### FR-HOME-02 & FR-HOME-03: Pemeriksaan Sesi Lokal & Pengalihan Navigasi Akademik
- **Sumber Implementasi**: `src/app/android/index.tsx:44-57` & `src/app/ios/index.tsx:44-57` (`handleAkademikPress`)
- **Input**: Aksi klik pengguna pada kartu layanan **"Akademik"**.
- **Proses**:
  1. Sistem membaca `SecureStore.getItemAsync('akademik_nim')` dengan fallback ke `SecureStore.getItemAsync('nim')`.
  2. Sistem membaca `SecureStore.getItemAsync('akademik_phpSessId')` dengan fallback ke `SecureStore.getItemAsync('phpSessId')`.
  3. Jika `nim` dan `phpSessId` keduanya bernilai *truthy*, panggil `router.push('/akademik')`.
  4. Jika salah satu kosong, panggil `router.push('/android/login')` (pada Android) atau `router.push('/ios/login')` (pada iOS).
- **Output**: Pengguna masuk ke dashboard Akademik tanpa login ulang jika pernah masuk sebelumnya, atau diarahkan ke form login SSO jika belum.
- **Penanganan Error**: Jika pembacaan `SecureStore` melempar exception (`catch`), sistem secara aman mengarahkan pengguna ke halaman login (`/android/login` atau `/ios/login`).

### FR-HOME-04 & FR-HOME-05: Navigasi Modul Layanan Kampus Lainnya
- **Sumber Implementasi**: `src/app/android/index.tsx:10-35` (`SERVICES`)
- **Input**: Aksi klik pengguna pada kartu layanan di daftar `SERVICES`.
- **Proses**:
  - Kartu **"LMS"** → mengeksekusi `router.push('/lms')`.
  - Kartu **"E-Letter FST"** → mengeksekusi `router.push('/eletter')`.
  - Kartu **"Layanan FST"** → mengeksekusi `router.push('/layanan-fst')` yang merender `LayananFSTScreen` (`src/app/layanan-fst.tsx:6-25`) beserta tombol kembali (`router.back()`).
- **Output**: Layar modul terkait ditampilkan.

### FR-HOME-06: Pembukaan Tautan Eksternal
- **Sumber Implementasi**: `src/app/android/index.tsx:59-61` (`openLink`)
- **Input**: Aksi klik pada tombol **"Traktir Kopi"** (`https://trakteer.id/ryyz/tip`) atau **"GitHub"** (`https://github.com/RyyzDev/kudu`).
- **Proses**: Memanggil `Linking.openURL(url)` dan menangkap error dengan `.catch(err => console.error('Failed to open URL:', err))`.
- **Output**: Browser bawaan OS membuka URL eksternal.
