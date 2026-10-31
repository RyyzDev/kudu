# Sequence Diagram — Modul 2C: Presensi & Input Absen Mandiri (`akademik-presensi`)

## Referensi Kode Sumber
- `src/components/akademik/PresensiTab.tsx` (`PresensiContent`)
- `src/app/presensi-detail.tsx` (`PresensiDetailScreen`, `fetchDetail`, `executeSubmit`)
- `src/services/akademik/presensiService.ts` (`getDataPresensi`, `getDetailPresensi`, `submitPresensi`)
- `src/services/akademik/presensiParser.ts` (`parsePresensiHtml`, `parseDetailPresensiHtml`)

---

## 1. Alur Lihat Rekap Presensi, Detail Pertemuan & Input Absen Mandiri (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Tab as PresensiContent (PresensiTab.tsx)
    participant Detail as PresensiDetailScreen (presensi-detail.tsx)
    participant Svc as presensiService.ts
    participant Parser as presensiParser.ts
    participant Api as academicApi
    participant Akd as Server Akademik

    rect rgb(235, 248, 255)
        Note over User,Akd: 1. Lihat Rekapitulasi Presensi Mata Kuliah
        User->>Tab: Pilih Tab "Presensi"
        Tab->>Svc: getDataPresensi()
        Svc->>Api: GET PRESENSI_URL (/index.php?pModule=xsKkpZylmdSknw==...)
        Api->>Akd: GET PRESENSI_URL
        Akd-->>Api: HTML Tabel Presensi
        Api-->>Svc: res.data
        Svc->>Parser: parsePresensiHtml(res.data)
        Parser-->>Svc: PresensiItem[] (hadir, tidakHadir, persentase, canInputPresensi, inputPresensiUrl)
        Svc-->>Tab: data PresensiItem[]
        Tab-->>User: Render Daftar Presensi & Tombol "Masuk Kelas (Input)" jika aktif
    end

    rect rgb(255, 248, 220)
        Note over User,Akd: 2. Lihat Detail Pertemuan Kelas
        User->>Tab: Tap "Masuk Kelas (Input)" pada Mata Kuliah
        Tab->>Detail: router.push('/presensi-detail', { url, matkul })
        Detail->>Svc: getDetailPresensi(decodedUrl)
        Svc->>Api: GET detailUrl
        Api->>Akd: GET detailUrl
        Akd-->>Api: HTML Detail Pertemuan
        Api-->>Svc: res.data
        Svc->>Parser: parseDetailPresensiHtml(res.data)
        Parser-->>Svc: DetailPertemuanItem[] (no, tanggalRencana, dosen, statusHadir, canInput, prsId)
        Svc-->>Detail: detailList[]
        Detail-->>User: Tampilkan Daftar Pertemuan & Tombol "Isi Absen" (jika canInput == true)
    end

    rect rgb(240, 255, 240)
        Note over User,Akd: 3. Input Presensi Mandiri (Hadir='2', Izin='4', Sakit='3', Alpa='1')
        User->>Detail: Tap "Isi Absen" pada Pertemuan ke-N
        Detail-->>User: Buka Modal Pilihan Status Kehadiran
        User->>Detail: Pilih Status (Hadir '2' / Izin '4' / Sakit '3' / Alpa '1')
        Detail->>Svc: submitPresensi(decodedUrl, prsId, status)
        Svc->>Svc: Ekstrak query param 'sia' & 'kelas' (kls) dari detailUrl
        Svc->>Api: POST /_proses_ajax.php (status_hadir_mhs, prs, sia, kls, btnPresensiMhs='Simpan')
        Api->>Akd: POST /_proses_ajax.php (Referer: detailUrl)
        Akd-->>Api: 200 OK
        Api-->>Svc: res.data
        Svc-->>Detail: return true
        Detail-->>User: Alert('Sukses', 'Berhasil mengisi presensi!')
        Detail->>Svc: fetchDetail() -> getDetailPresensi(decodedUrl)
        Svc-->>Detail: detailList[] terbaru
        Detail-->>User: Perbarui Status Kehadiran Pertemuan di Layar
    end
```

---

## 2. Diagram (PlantUML)

```plantuml
@startuml Sequence_Akademik_Presensi
autonumber
actor "Mahasiswa" as User
participant "PresensiContent\n(PresensiTab.tsx)" as Tab
participant "PresensiDetailScreen\n(presensi-detail.tsx)" as Detail
participant "presensiService.ts" as Svc
participant "presensiParser.ts" as Parser
participant "academicApi" as Api
participant "Server Akademik" as Akd

== 1. Lihat Rekapitulasi Presensi Kuliah ==
User -> Tab : Pilih Tab "Presensi"
Tab -> Svc : getDataPresensi()
Svc -> Api : GET PRESENSI_URL
Api -> Akd : GET /index.php?pModule=xsKkpZylmdSknw==...
Akd --> Api : HTML Tabel Presensi
Api --> Svc : res.data
Svc -> Parser : parsePresensiHtml(res.data)
Parser --> Svc : PresensiItem[] (canInputPresensi, inputPresensiUrl)
Svc --> Tab : PresensiItem[]
Tab --> User : Tampilkan Persentase & Tombol "Masuk Kelas (Input)"

== 2. Lihat Detail Pertemuan Kelas ==
User -> Tab : Tap "Masuk Kelas (Input)"
Tab -> Detail : router.push('/presensi-detail', { url, matkul })
Detail -> Svc : getDetailPresensi(decodedUrl)
Svc -> Api : GET detailUrl
Api -> Akd : GET detailUrl
Akd --> Api : HTML Detail Pertemuan
Api --> Svc : res.data
Svc -> Parser : parseDetailPresensiHtml(res.data)
Parser --> Svc : DetailPertemuanItem[] (canInput, prsId, statusHadir)
Svc --> Detail : detailList
Detail --> User : Tampilkan Daftar Pertemuan

== 3. Input Presensi Mandiri ==
User -> Detail : Tap "Isi Absen" (setSelectedPrs)
Detail --> User : Tampilkan Modal Pilihan Kehadiran
User -> Detail : Pilih Status ('2' Hadir / '4' Izin / '3' Sakit / '1' Alpa)
Detail -> Svc : submitPresensi(decodedUrl, prsId, status)
Svc -> Svc : Parse parameter 'sia' dan 'kelas' (kls) dari detailUrl
Svc -> Api : POST /_proses_ajax.php\n(status_hadir_mhs, prs, sia, kls, btnPresensiMhs='Simpan')
Api -> Akd : POST /_proses_ajax.php
Akd --> Api : 200 OK
Api --> Svc : res.data
Svc --> Detail : true
Detail --> User : Alert('Sukses', 'Berhasil mengisi presensi!')
Detail -> Svc : getDetailPresensi(decodedUrl) (Refresh)
Svc --> Detail : Updated DetailPertemuanItem[]
Detail --> User : Render Status Kehadiran Terbaru
@enduml
```
