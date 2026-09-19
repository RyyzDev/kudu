# Kudu - Kuliah Dulu

## 🏗️ Arsitektur Aplikasi
Kudu adalah aplikasi *mobile* React Native yang menggunakan pendekatan **Client-Side Scraping** (memindahkan logika *Backend-For-Frontend* murni ke sisi klien). 

Aplikasi ini **tidak menggunakan backend atau server perantara**. Semua request ke sistem *Single Sign-On* (SSO), manajemen sesi, hingga *parsing* data HTML (KRS, Jadwal Kuliah, dll) dilakukan secara langsung dari dalam *smartphone* pengguna (React Native ➔ Portal Akademik Kampus).

**Keuntungan Arsitektur Ini:**
- **Anti Blokir (Bypass Rate-Limiting):** Karena *request* dikirim dari *IP Address* seluler/WiFi pengguna masing-masing, aplikasi tidak akan terkena pemblokiran massal (IP Ban) oleh sistem *firewall* kampus.
- **Tanpa Biaya Infrastruktur:** Bebas biaya server/hosting (Zero-Infrastructure).
- **Keamanan Data Mutlak:** Privasi maksimal karena tidak ada server penengah yang memproses atau mengintip data pengguna.

## 🛠️ Stack Teknologi
- **Framework**: React Native (Expo SDK 57) + Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **Networking**: Axios (dengan custom Interceptors) & Native `fetch`
- **Cookie Management**: `@react-native-cookies/cookies`
- **Scraping Engine**: `cheerio`
- **Data Security**: `expo-secure-store`

---

## 🔒 Alur Data Sensitif (NIM, Password & Sesi)
Mengingat Kudu berinteraksi langsung dengan Portal Akademik dan SSO Kampus, aplikasi didesain dengan ketat terkait penanganan data sensitif:

1. **Login SSO & Quarantine Loop:** 
   Saat pengguna menekan tombol login, NIM dan Password yang diketikkan akan diubah menjadi *payload* (POST request) dan dikirim **langsung** ke server `sso.uinjkt.ac.id`. Aplikasi memanfaatkan `fetch` Native dengan *redirect manual* untuk merunut alur karantina SSO yang rumit secara otomatis hingga sukses memperoleh tiket masuk (`PHPSESSID`).
2. **Penyimpanan Kredensial On-Device:**
   Agar fitur *Silent Login* (pemulihan sesi) bisa berjalan, NIM dan Password disimpan secara diam-diam dan aman menggunakan **`expo-secure-store`**. Teknologi ini mengenkripsi data tersebut dan menyimpannya di brankas perangkat keras (*Android Keystore* atau *iOS Keychain*).
3. **Pemulihan Sesi (Axios Interceptors):**
   Jika di tengah penggunaan aplikasi (misal saat membuka jadwal KRS) sesi akademik pengguna tiba-tiba mati, *Axios Interceptor* akan langsung mendeteksinya. Secara otomatis di balik layar, aplikasi mengambil kredensial dari brankas, melakukan *login* ulang, dan memuat data KRS tanpa memberikan jeda *error* kepada pengguna.
4. **Isolasi Cookie:**
   Semua *cookies* yang didapat dari web kampus diisolasi secara *Native* oleh OS, tidak terpapar di *Javascript global state*.

---

## 🛡️ Kebijakan Privasi (Privacy Policy)

**Privasi Anda adalah Hak Mutlak dan Prioritas Utama Kudu.**

- **Kerahasiaan Mutlak (No Middleman):** Kudu pada dasarnya hanyalah sebuah *"Peramban Otomatis (Browser)"*. Kudu **TIDAK PERNAH** mengirimkan, menyadap, mencadangkan, atau merekam NIM, Password, maupun riwayat Akademik Anda ke server pihak ketiga mana pun milik pembuat aplikasi. Semua data Anda hanya bepergian dari HP Anda menuju Server Kampus (End-to-End).
- **Penyimpanan Lokal:** Segala bentuk *cache* dan kredensial sepenuhnya diamankan secara lokal di dalam HP Anda. Jika Anda menekan tombol "Logout", menghapus data aplikasi, atau melakukan *Uninstall*, seluruh kredensial Anda akan musnah secara permanen dari perangkat.
- **Open Source Transparency:** Kudu dibangun secara transparan (*open-source*), sehingga mahasiswa atau ahli IT kampus dapat melakukan audit secara mandiri pada kode jaringan aplikasi untuk memastikan tidak ada pencurian data di belakang layar.
- **Izin Aplikasi Minimalis:** Kudu menjunjung tinggi prinsip keamanan *Zero-Trust*. Aplikasi Kudu **hanya membutuhkan izin akses INTERNET**. Kudu **tidak pernah meminta** dan tidak butuh izin untuk membaca media/file, melihat galeri, mendeteksi lokasi, atau menggunakan kamera/mikrofon Anda.

---

## 🚀 Panduan Pengembangan (Development)

Kudu menggunakan *Native Modules* (`@react-native-cookies/cookies`). Oleh karena itu, Anda **tidak dapat** menjalankannya hanya menggunakan aplikasi "Expo Go" standar. Anda wajib mem-build klien pengembangan secara native.

### Prasyarat
- Node.js (Versi terbaru)
- Android Studio / Emulator Android
- Xcode / Simulator iOS (Khusus pengguna macOS)

### Langkah Instalasi
```bash
# 1. Klon Repositori dan Install dependensi
npm install

# 2. Jalankan dan Build di Android Emulator
npx expo run:android

# 3. Jalankan dan Build di iOS Simulator
npx expo run:ios
```
