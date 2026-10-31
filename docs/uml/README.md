# Dokumentasi UML & Kebutuhan Fungsional — Kudu (`com.ryyzdev.kudu`)

Folder ini berisi dokumentasi **Functional Requirements**, **Use Case Diagram**, dan **Sequence Diagram** berdasarkan implementasi kode sumber aplikasi **Kudu (Kuliah Dulu)**. Setiap dokumen dilengkapi dengan:
- **Referensi file kode sumber** (`src/app/`, `src/components/`, `src/services/`, `src/utils/`)
- **Spesifikasi aktor, kebutuhan fungsional, & relasi logika**
- **Diagram Mermaid** (dapat langsung dirender di GitHub / VS Code / Markdown Preview)
- **Diagram PlantUML** (`@startuml ... @enduml` untuk kompatibilitas tool UML standar)

---

## Struktur Direktori

```text
docs/
└── uml/
    ├── README.md
    ├── functional-requirements/
    │   ├── 00-system-overview.md       # Matriks Kebutuhan Fungsional & Traceability Keseluruhan Sistem
    │   ├── 01-home.md                  # Modul 1: Functional Requirements Home & Navigasi (FR-HOME-01..06)
    │   ├── 02-akademik.md              # Modul 2: Functional Requirements Portal Akademik & SSO (FR-AKD-01..14)
    │   ├── 03-lms.md                   # Modul 3: Functional Requirements LMS Moodle (FR-LMS-01..10)
    │   └── 04-eletter.md               # Modul 4: Functional Requirements E-Letter FST (FR-ELT-01..09)
    ├── usecase-diagrams/
    │   ├── 00-system-overview.md       # Use Case Diagram Keseluruhan Sistem Kudu
    │   ├── 01-home.md                  # Modul 1: Home & Navigasi
    │   ├── 02-akademik.md              # Modul 2: Portal Akademik & Autentikasi SSO
    │   ├── 03-lms.md                   # Modul 3: LMS Moodle
    │   └── 04-eletter.md               # Modul 4: E-Letter FST
    └── sequence-diagrams/
        ├── 01-home.md                  # Modul 1: Home, Session Gate & Routing OS
        ├── 02-akademik-auth.md         # Modul 2A: Login SSO, Token Exchange & Silent Login Interceptor
        ├── 03-akademik-krs-profile.md  # Modul 2B: KRS, Profil Mahasiswa & Logout Akademik
        ├── 04-akademik-presensi.md     # Modul 2C: Rekap Presensi, Detail Pertemuan & Input Absen Mandiri
        ├── 05-akademik-khs-tagihan.md  # Modul 2D: KHS (Nilai) & Tagihan UKT per Semester
        ├── 06-lms.md                   # Modul 3: LMS Moodle (Headless Sync, Google SSO, Search & Chunked Cache)
        └── 07-eletter.md               # Modul 4: E-Letter FST (Auto-Login, Silent Re-Login, Riwayat & Pengajuan Surat)
```
