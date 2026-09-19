# Kudu - Kuliah Dulu

<div align="center">
  <table>
    <tr>
      <td align="center">
        <b>Homepage Screen</b><br><br>
        <img width="300" alt="Homepage Screen Visual" src="https://github.com/user-attachments/assets/125e9b74-85c4-4136-8381-260c5f37031c" />
      </td>
      <td align="center">
        <b>Academic Module Screen</b><br><br>
        <img width="300" alt="Academic Module Screen Visual" src="https://github.com/user-attachments/assets/ddbec8a1-743c-4c48-b6cd-45819599e387" />
      </td>
    </tr>
  </table>
</div>

## 📖 Latar Belakang

Pernahkah kamu merasa lelah karena harus melompat dari satu portal web kampus ke web lainnya hanya untuk mengecek informasi yang seharusnya bisa diakses di satu tempat? Belum lagi masalah sesi (*session*) yang sangat cepat habis. Baru ditinggal sebentar, web sudah meminta kita untuk mengetik ulang NIM dan *password*. Rutinitas *login* yang berulang-ulang ini tentu sangat menguras waktu dan bikin capek.

Berangkat dari rasa frustrasi tersebut, **Kudu (Kuliah Dulu)** lahir. 

Kudu dirancang sebagai "Pusat Kendali Akademik" di genggamanmu, mengatasi kerumitan sistem kampus dengan dua pilar utama:

✨ **Silent Login (Regenerasi Sesi Tanpa Henti)**
Tidak ada lagi cerita "Logout secara otomatis". Ketika sesi login web akademik kedaluwarsa di latar belakang, Kudu akan secara otomatis dan senyap melakukan regenerasi sesi (re-login) dalam hitungan milidetik *sebelum* notifikasi error muncul di layar. Kamu bisa membuka aplikasi kapan saja dan langsung melihat datamu tanpa hambatan.

🎯 **Centralized & Curated (Terpusat & Esensial)**
Kudu menyatukan layanan akademik yang berserakan menjadi satu ekosistem yang kohesif. Kami membuang semua "fitur pajangan" yang jarang dipakai di web aslinya, dan hanya menyisakan fitur-fitur esensial yang *benar-benar* dibutuhkan oleh mahasiswa sehari-hari (seperti Jadwal, KRS, dan Nilai). Lebih cepat, lebih bersih, dan langsung pada intinya.

---

## 🚀 Instalasi & Download (Khusus Android)

Saat ini, Kudu tersedia secara eksklusif untuk perangkat **Android** dalam format `.apk`. 

Kamu tidak perlu melakukan *build* atau kompilasi kode sendiri untuk mencoba aplikasinya. Cukup unduh file APK terbaru yang telah di-generate oleh server Expo melalui tombol di bawah ini:

<div align="center" style="margin: 20px 0;">
  <a href="LINK_EXPO_DOWNLOAD_DISINI" target="_blank" style="text-decoration: none;">
    <div style="background-color: #000000; color: #ffffff; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;">
      ⬇️ Download APK via Expo
    </div>
  </a>
</div>

**Langkah Instalasi APK:**
1. Klik tombol **Download APK** di atas.
2. Setelah file `.apk` selesai diunduh, buka file tersebut.
3. Jika muncul peringatan keamanan, masuk ke **Pengaturan (Settings)** HP kamu dan aktifkan izin **"Install from Unknown Sources"** (Instal dari Sumber Tidak Dikenal).
4. Lanjutkan instalasi hingga selesai, dan Kudu siap digunakan!

---

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

---

## 🔮 Rencana Pengembangan Selanjutnya (Roadmap)

Kudu dirancang untuk terus berkembang menyesuaikan kebutuhan mahasiswa. Berikut adalah beberapa fitur dan proyeksi teknologi yang masuk dalam agenda pengembangan mendatang:

*   **🏛️ Integrasi Web Layanan FST:** Menghubungkan portal akademik umum dengan ekosistem sistem informasi/layanan khusus Fakultas Sains dan Teknologi (FST).
*   **📱 Implementasi Widget Android:** Pengalaman akses cepat (*at-a-glance*) melalui Home Screen HP untuk melihat jadwal kuliah hari ini tanpa perlu membuka aplikasi.
*   **🤖 Automasi Agentic AI untuk WAR KRS:** Pemanfaatan *agentic automation* pintar untuk membantu mahasiswa dalam proses pemilihan/pengambilan mata kuliah (KRS) dengan lebih presisi, efisien, dan otomatis.
*   **🚀 Dan Masih Banyak Lagi...** Penyesuaian performa, fitur *caching* offline lanjutan, serta peningkatan pengalaman pengguna (*UX*) secara berkala.
