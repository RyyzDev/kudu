# Use Case Diagram — Global System Overview (Kudu)

Dokumen ini menggambarkan **Use Case Diagram Keseluruhan Sistem** pada aplikasi **Kudu (`com.ryyzdev.kudu`)** yang menyatukan 4 modul utama: **Home & Navigasi**, **Portal Akademik (e-Semesta & SSO)**, **LMS Moodle**, dan **E-Letter FST**.

## Daftar Aktor

| Aktor | Tipe | Deskripsi |
| :--- | :--- | :--- |
| **Mahasiswa** | Primary Actor | Pengguna utama aplikasi Kudu untuk mengakses layanan kampus UIN Syarif Hidayatullah Jakarta. |
| **SecureStore (Lokal)** | Secondary Actor | Penyimpanan terenkripsi lokal (`expo-secure-store` & `storageUtils.ts`) untuk kredensial, token sesi, dan cache chunked. |
| **Keycloak SSO Server** | Secondary Actor | Server autentikasi tunggal UIN Jakarta (`sso.uinjkt.ac.id`). |
| **Portal Akademik Server** | Secondary Actor | Server AIS / e-Semesta (`akademik.uinjkt.ac.id`) penyedia data KRS, Presensi, KHS, Tagihan, dan Profil. |
| **LMS Moodle & Google OAuth** | Secondary Actor | Server e-learning (`lms.uinjakarta.id`) dan Google OAuth2 (`accounts.google.com`). |
| **E-Letter FST Server** | Secondary Actor | Server persuratan Fakultas Sains dan Teknologi (`e-letter.fst.uinjkt.ac.id`). |

---

## Diagram (Mermaid)

```mermaid
flowchart LR
    MHS(["👤 Mahasiswa"])
    STORE[("🔒 SecureStore")]
    SSO[["🌐 Keycloak SSO"]]
    AKD[["🏛️ Server Akademik"]]
    LMS[["📚 Server LMS & Google OAuth"]]
    ELT[["✉️ Server E-Letter FST"]]

    subgraph SYS["Sistem Aplikasi Kudu (Kuliah Dulu)"]
        direction TB

        subgraph MOD_HOME["1. Modul Home & Navigasi"]
            UC_H1(["Buka Dashboard & Routing OS"])
            UC_H2(["Akses Modul Layanan Kampus"])
            UC_H3(["Buka Tautan Eksternal"])
        end

        subgraph MOD_AKD["2. Modul Portal Akademik"]
            UC_A1(["Login SSO & Silent Login Akademik"])
            UC_A2(["Lihat KRS & Profil Mahasiswa"])
            UC_A3(["Lihat Presensi & Input Absen Mandiri"])
            UC_A4(["Lihat KHS (Nilai) per Semester"])
            UC_A5(["Lihat Tagihan UKT per Semester"])
            UC_A6(["Logout Portal Akademik"])
        end

        subgraph MOD_LMS["3. Modul LMS Moodle"]
            UC_L1(["Hubungkan Akun LMS via Google SSO"])
            UC_L2(["Sinkronisasi Tugas & Mata Kuliah (Headless)"])
            UC_L3(["Lihat Tugas, Deadline & Mata Kuliah"])
            UC_L4(["Cari & Filter Katalog Kursus"])
            UC_L5(["Putuskan Akun LMS"])
        end

        subgraph MOD_ELT["4. Modul E-Letter FST"]
            UC_E1(["Login & Auto-Login E-Letter"])
            UC_E2(["Lihat Riwayat & Cetak Surat PDF"])
            UC_E3(["Ajukan Surat Baru (Elektronik/Manual)"])
            UC_E4(["Logout E-Letter"])
        end
    end

    MHS --> UC_H1
    MHS --> UC_H2
    MHS --> UC_H3
    MHS --> UC_A1
    MHS --> UC_A2
    MHS --> UC_A3
    MHS --> UC_A4
    MHS --> UC_A5
    MHS --> UC_A6
    MHS --> UC_L1
    MHS --> UC_L3
    MHS --> UC_L4
    MHS --> UC_L5
    MHS --> UC_E1
    MHS --> UC_E2
    MHS --> UC_E3
    MHS --> UC_E4

    UC_H2 --> STORE
    UC_A1 --> SSO
    UC_A1 --> AKD
    UC_A1 --> STORE
    UC_A2 --> AKD
    UC_A3 --> AKD
    UC_A4 --> AKD
    UC_A5 --> AKD
    UC_L1 --> LMS
    UC_L2 --> LMS
    UC_L2 --> STORE
    UC_L4 --> LMS
    UC_E1 --> ELT
    UC_E1 --> STORE
    UC_E2 --> ELT
    UC_E3 --> ELT
```

---

## Diagram (PlantUML)

```plantuml
@startuml UseCase_Global_Kudu
left to right direction
skinparam packageStyle rectangle

actor "Mahasiswa" as MHS
actor "SecureStore" as STORE <<System>>
actor "Keycloak SSO\n(sso.uinjkt.ac.id)" as SSO <<System>>
actor "Portal Akademik\n(akademik.uinjkt.ac.id)" as AKD <<System>>
actor "LMS Moodle & Google OAuth\n(lms.uinjakarta.id)" as LMS <<System>>
actor "E-Letter FST\n(e-letter.fst.uinjkt.ac.id)" as ELT <<System>>

rectangle "Aplikasi Kudu (Kuliah Dulu)" {
  package "1. Modul Home & Navigasi" {
    usecase "Buka Aplikasi & Routing OS" as UC_H1
    usecase "Pilih Layanan Kampus" as UC_H2
    usecase "Buka Tautan Eksternal" as UC_H3
  }

  package "2. Modul Portal Akademik" {
    usecase "Login SSO Akademik" as UC_A1
    usecase "Silent Login (Auto Re-Auth)" as UC_A1_S
    usecase "Lihat KRS & Profil Mahasiswa" as UC_A2
    usecase "Lihat Presensi & Input Absen Mandiri" as UC_A3
    usecase "Lihat KHS (Nilai) & IP/IPK" as UC_A4
    usecase "Lihat Tagihan UKT/SPP" as UC_A5
    usecase "Logout Akademik" as UC_A6
  }

  package "3. Modul LMS Moodle" {
    usecase "Hubungkan Akun LMS via Google SSO" as UC_L1
    usecase "Sinkronisasi Latar Belakang (Headless)" as UC_L2
    usecase "Lihat Tugas, Deadline & Mata Kuliah" as UC_L3
    usecase "Cari & Filter Katalog Kursus" as UC_L4
    usecase "Putuskan Akun LMS" as UC_L5
  }

  package "4. Modul E-Letter FST" {
    usecase "Login & Auto-Login E-Letter" as UC_E1
    usecase "Lihat Riwayat & Cetak Surat PDF" as UC_E2
    usecase "Ajukan Surat Baru" as UC_E3
    usecase "Logout E-Letter" as UC_E4
  }
}

MHS --> UC_H1
MHS --> UC_H2
MHS --> UC_H3
MHS --> UC_A1
MHS --> UC_A2
MHS --> UC_A3
MHS --> UC_A4
MHS --> UC_A5
MHS --> UC_A6
MHS --> UC_L1
MHS --> UC_L3
MHS --> UC_L4
MHS --> UC_L5
MHS --> UC_E1
MHS --> UC_E2
MHS --> UC_E3
MHS --> UC_E4

UC_A1_S .> UC_A2 : <<extend>>\n[sesi kedaluwarsa]
UC_A1_S .> UC_A3 : <<extend>>\n[sesi kedaluwarsa]
UC_A1_S .> UC_A4 : <<extend>>\n[sesi kedaluwarsa]
UC_A1_S .> UC_A5 : <<extend>>\n[sesi kedaluwarsa]

UC_H2 --> STORE
UC_A1 --> SSO
UC_A1 --> AKD
UC_A1 --> STORE
UC_A1_S --> SSO
UC_A1_S --> AKD
UC_A2 --> AKD
UC_A3 --> AKD
UC_A4 --> AKD
UC_A5 --> AKD
UC_L1 --> LMS
UC_L2 --> LMS
UC_L2 --> STORE
UC_L4 --> LMS
UC_E1 --> ELT
UC_E1 --> STORE
UC_E2 --> ELT
UC_E3 --> ELT
@enduml
```
