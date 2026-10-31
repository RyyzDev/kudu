# Use Case Diagram — Modul 1: Home & Navigasi (`home`)

## Referensi Kode Sumber
- `src/app/_layout.tsx`
- `src/app/index.tsx` (`EntryPoint`)
- `src/app/android/index.tsx` & `src/app/ios/index.tsx` (`HomeScreen`)
- `src/app/layanan-fst.tsx` (`LayananFSTScreen`)

## Spesifikasi Use Case

| ID | Nama Use Case | Aktor | Relasi (`<<include>>` / `<<extend>>`) | Deskripsi Logika |
| :--- | :--- | :--- | :--- | :--- |
| **UC-HOME-01** | Buka Aplikasi & Routing OS Otomatis | Mahasiswa | - | `EntryPoint` memeriksa `Platform.OS` dan mengarahkan ke `/android` atau `/ios`. |
| **UC-HOME-02** | Akses Layanan Akademik | Mahasiswa, SecureStore | `<<include>>` **UC-HOME-02A**<br>`<<extend>>` **UC-HOME-02B**, **UC-HOME-02C** | Saat kartu "Akademik" ditekan, aplikasi memeriksa keberadaan sesi Akademik di penyimpanan lokal. |
| **UC-HOME-02A** | Cek Sesi Akademik Lokal | SecureStore | Included by **UC-HOME-02** | Membaca `akademik_nim` (`nim`) dan `akademik_phpSessId` (`phpSessId`) dari `SecureStore`. |
| **UC-HOME-02B** | Arahkan ke Dashboard Akademik | Mahasiswa | Extends **UC-HOME-02** `[nim && phpSessId tersedia]` | Navigasi langsung ke `/akademik`. |
| **UC-HOME-02C** | Arahkan ke Login Akademik | Mahasiswa | Extends **UC-HOME-02** `[sesi belum ada]` | Navigasi ke `/android/login` atau `/ios/login`. |
| **UC-HOME-03** | Akses Layanan LMS Moodle | Mahasiswa | - | Navigasi ke layar `/lms`. |
| **UC-HOME-04** | Akses Layanan E-Letter FST | Mahasiswa | - | Navigasi ke layar `/eletter`. |
| **UC-HOME-05** | Akses Layanan FST | Mahasiswa | - | Navigasi ke layar `/layanan-fst` (halaman informasi fitur segera hadir). |
| **UC-HOME-06** | Buka Tautan Eksternal (Trakteer / GitHub) | Mahasiswa, Browser Eksternal | - | Memanggil `Linking.openURL()` untuk membuka halaman Trakteer atau repositori GitHub. |

---

## Diagram (Mermaid)

```mermaid
flowchart LR
    MHS(["👤 Mahasiswa"])
    STORE[("🔒 SecureStore")]
    BROWSER[["🌐 Browser Eksternal (Linking)"]]

    subgraph MOD_HOME["Modul Home & Navigasi"]
        UC01(["UC-HOME-01: Buka Aplikasi & Routing OS Otomatis"])
        UC02(["UC-HOME-02: Akses Layanan Akademik"])
        UC02A(["UC-HOME-02A: Cek Sesi Akademik Lokal"])
        UC02B(["UC-HOME-02B: Arahkan ke Dashboard Akademik"])
        UC02C(["UC-HOME-02C: Arahkan ke Login Akademik"])
        UC03(["UC-HOME-03: Akses Layanan LMS Moodle"])
        UC04(["UC-HOME-04: Akses Layanan E-Letter FST"])
        UC05(["UC-HOME-05: Akses Layanan FST"])
        UC06(["UC-HOME-06: Buka Tautan Eksternal (Trakteer / GitHub)"])
    end

    MHS --> UC01
    MHS --> UC02
    MHS --> UC03
    MHS --> UC04
    MHS --> UC05
    MHS --> UC06

    UC02 -. "<<include>>" .-> UC02A
    UC02B -. "<<extend>> [sesi tersedia]" .-> UC02
    UC02C -. "<<extend>> [sesi kosong]" .-> UC02

    UC02A --> STORE
    UC06 --> BROWSER
```

---

## Diagram (PlantUML)

```plantuml
@startuml UseCase_Home
left to right direction
skinparam packageStyle rectangle

actor "Mahasiswa" as MHS
actor "SecureStore" as STORE <<System>>
actor "Browser Eksternal\n(Expo Linking)" as BROWSER <<System>>

rectangle "Modul 1: Home & Navigasi" {
  usecase "UC-HOME-01: Buka Aplikasi &\nRouting OS Otomatis" as UC01
  usecase "UC-HOME-02: Akses Layanan Akademik" as UC02
  usecase "UC-HOME-02A: Cek Sesi Akademik Lokal\n(nim & phpSessId)" as UC02A
  usecase "UC-HOME-02B: Arahkan ke\nDashboard Akademik (/akademik)" as UC02B
  usecase "UC-HOME-02C: Arahkan ke\nHalaman Login (/login)" as UC02C
  usecase "UC-HOME-03: Akses Layanan LMS Moodle (/lms)" as UC03
  usecase "UC-HOME-04: Akses Layanan E-Letter FST (/eletter)" as UC04
  usecase "UC-HOME-05: Akses Layanan FST (/layanan-fst)" as UC05
  usecase "UC-HOME-06: Buka Tautan Eksternal\n(Trakteer / GitHub)" as UC06
}

MHS --> UC01
MHS --> UC02
MHS --> UC03
MHS --> UC04
MHS --> UC05
MHS --> UC06

UC02 ..> UC02A : <<include>>
UC02B ..> UC02 : <<extend>>\n[nim && phpSessId ada]
UC02C ..> UC02 : <<extend>>\n[sesi tidak ditemukan]

UC02A --> STORE
UC06 --> BROWSER
@enduml
```
