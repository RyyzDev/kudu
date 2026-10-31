# Sequence Diagram — Modul 3: LMS Moodle (`lms`)

## Referensi Kode Sumber
- `src/app/lms.tsx` (`LmsScreen`, `loadLocalData`, `handleRefresh`, `handleLogout`)
- `src/components/lms/LmsAuthModal.tsx` (`LmsAuthModal`)
- `src/components/lms/LmsBackgroundSyncer.tsx` (`LmsBackgroundSyncer`, `fetchUrl`)
- `src/components/lms/LmsCourseSearchTab.tsx` (`LmsCourseSearchTab`, `executeSearch`)
- `src/services/lms/lmsService.ts` (`getLmsState`, `saveLmsSyncPayload`, `setLmsDisconnected`, `clearLmsState`)
- `src/services/lms/lmsInjectedScript.ts` (`LMS_INJECTED_SCRIPT`, `fetchMoodleData`)
- `src/services/lms/lmsSearchService.ts` (`fetchLmsCourses`) & `src/services/lms/lmsParser.ts` (`parseSearchCoursesFromHtml`, `getUrgencyInfo`)
- `src/utils/storageUtils.ts` (`saveSafeStorage`, `getSafeStorage`, `deleteSafeStorage`)

---

## 1. Alur Muat Cache Lokal, Headless Background Sync & Login Google OAuth2 (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Screen as LmsScreen (lms.tsx)
    participant Svc as lmsService.ts / storageUtils.ts
    participant Syncer as LmsBackgroundSyncer (Hidden WebView)
    participant Modal as LmsAuthModal (Interactive WebView)
    participant Script as LMS_INJECTED_SCRIPT
    participant Moodle as Server LMS (lms.uinjakarta.id)
    participant Google as Google OAuth2 (accounts.google.com)

    rect rgb(235, 248, 255)
        Note over User,Svc: 1. Buka Layar LMS & Muat Cache Offline (Chunked Storage)
        User->>Screen: Buka Layar LMS (/lms)
        Screen->>Svc: loadLocalData() -> getLmsState()
        Svc->>Svc: getSafeStorage('lms_user', 'lms_courses', 'lms_assignments') (Reassemble Chunks 1800B)
        Svc-->>Screen: { isConnected, user, courses, assignments, lastSync }
        Screen->>Screen: Urutkan assignments (timesort asc) & hitung getUrgencyInfo()
        Screen-->>User: Render Daftar Tugas & Mata Kuliah dari Cache Lokal
    end

    rect rgb(255, 248, 220)
        Note over Screen,Moodle: 2. Sinkronisasi Latar Belakang Otomatis (Jika isConnected === true)
        opt isConnected === true
            Screen->>Syncer: Mount <LmsBackgroundSyncer syncKey={syncKey} />
            Syncer->>Moodle: Load https://lms.uinjakarta.id/my/ (window.__KUDU_HEADLESS__ = true)
            alt Sesi Moodle Habis (Redirect ke /login/)
                Moodle-->>Script: Halaman /login/index.php
                Script-->>Syncer: postMessage({ type: 'LMS_SESSION_EXPIRED' })
                Syncer->>Svc: setLmsDisconnected() (lms_is_connected = 'false')
                Syncer-->>Screen: onSessionExpired() -> setIsConnected(false)
                Screen-->>User: Tampilkan Banner Oranye "Sesi LMS Kedaluwarsa"
            else Sesi Moodle Masih Aktif
                Moodle-->>Script: Halaman /my/ (window.M.cfg.sesskey tersedia)
                Script->>Moodle: POST /lib/ajax/service.php (core_course_get_enrolled_courses_by_timeline_classification)
                Moodle-->>Script: JSON Enrolled Courses
                Script->>Moodle: POST /lib/ajax/service.php (core_calendar_get_action_events_by_timesort)
                Moodle-->>Script: JSON Upcoming Assignments/Events
                Script-->>Syncer: postMessage({ type: 'LMS_SYNC_SUCCESS', payload })
                Syncer->>Svc: saveLmsSyncPayload(payload) -> saveSafeStorage() (Chunk 1800B)
                Syncer-->>Screen: onSyncSuccess() -> loadLocalData()
                Screen-->>User: Perbarui UI Tugas, Kursus & Waktu Sinkronisasi
            end
        end
    end

    rect rgb(240, 255, 240)
        Note over User,Google: 3. Login Google SSO via LmsAuthModal
        User->>Screen: Tap "Hubungkan" / Banner Kedaluwarsa
        Screen->>Modal: setShowAuthModal(true)
        Modal->>Moodle: Load https://lms.uinjakarta.id/login/index.php (LMS_USER_AGENT)
        Moodle-->>Script: Render Halaman Login Moodle
        Script->>Script: Auto-click a[href*="auth/oauth2/login.php?id=1"] (setelah 400ms)
        Modal->>Google: Redirect ke Google Sign-In
        User->>Google: Pilih Akun Google Kampus (@uinjkt.ac.id)
        Google-->>Moodle: OAuth2 Callback -> Redirect ke /my/
        Moodle-->>Script: Halaman Dashboard /my/ (M.cfg.sesskey)
        Script->>Moodle: fetchMoodleData() (AJAX Courses & Calendar Events)
        Moodle-->>Script: Data Kursus & Tugas
        Script-->>Modal: postMessage({ type: 'LMS_SYNC_SUCCESS', payload })
        Modal->>Svc: saveLmsSyncPayload(payload)
        Modal-->>User: Alert('Berhasil Terhubung! 🎉')
        Modal-->>Screen: onSuccess() -> loadLocalData() & onClose()
    end
```

---

## 2. Alur Cari & Filter Katalog Kursus + Putuskan Akun LMS (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant SearchUI as LmsCourseSearchTab.tsx
    participant SearchSvc as lmsSearchService.ts / lmsParser.ts
    participant Syncer as LmsBackgroundSyncer (fetchUrl Ref)
    participant Moodle as Server LMS (lms.uinjakarta.id)
    participant Screen as LmsScreen (lms.tsx)
    participant Svc as lmsService.ts / storageUtils.ts

    rect rgb(235, 248, 255)
        Note over User,Moodle: 1. Cari & Filter Katalog Kursus (Direct Fetch + Fallback WebView)
        User->>SearchUI: Buka Tab "Cari Kursus" / Input Kata Kunci / Pilih Kategori
        SearchUI->>SearchSvc: fetchLmsCourses(query, categoryId, syncerRef.current?.fetchUrl)
        SearchSvc->>Moodle: Attempt 1: Native fetch(targetUrl, { headers: { 'User-Agent': LMS_USER_AGENT } })
        Moodle-->>SearchSvc: HTTP Response Text

        alt Response bukan halaman login (!isRedirectedToLogin)
            SearchSvc->>SearchSvc: Gunakan HTML dari Native Fetch
        else Diredirect ke /login/ & webViewFetcher tersedia
            SearchSvc->>Syncer: Attempt 2: syncerRef.current.fetchUrl(targetUrl)
            Syncer->>Moodle: Injeksi fetch(targetUrl) di dalam konteks Cookie WebView
            Moodle-->>Syncer: LMS_FETCH_URL_RESULT { requestId, html }
            Syncer-->>SearchSvc: Resolve Promise(html)
        end

        SearchSvc->>SearchSvc: parseSearchCoursesFromHtml(html) (Scrape .coursebox & ikon .fa-key)
        SearchSvc-->>SearchUI: LmsSearchCourseItem[] (id, name, url, infoUrl, isSelfEnrol, summary)
        SearchUI-->>User: Render Katalog Kursus & Badge "Self Enrolment"
    end

    rect rgb(255, 235, 238)
        Note over User,Svc: 2. Putuskan Akun LMS (Logout)
        User->>Screen: Tap Tombol Logout -> Konfirmasi "Putuskan"
        Screen->>Svc: clearLmsState()
        Svc->>Svc: deleteSafeStorage('lms_user', 'lms_courses', 'lms_assignments') & hapus lms_sesskey
        Svc-->>Screen: Selesai
        Screen-->>User: Reset State (user=null, courses=[], assignments=[], isConnected=false)
    end
```

---

## 3. Diagram (PlantUML)

```plantuml
@startuml Sequence_LMS_Moodle
autonumber
actor "Mahasiswa" as User
participant "LmsScreen\n(lms.tsx)" as Screen
participant "lmsService &\nstorageUtils" as Svc
participant "LmsBackgroundSyncer\n(Hidden WebView)" as Syncer
participant "LmsAuthModal\n(WebView Modal)" as Modal
participant "LmsCourseSearchTab &\nlmsSearchService" as Search
participant "LMS Moodle\n(lms.uinjakarta.id)" as Moodle
participant "Google OAuth2\n(accounts.google.com)" as Google

== 1. Buka Layar LMS & Sinkronisasi Latar Belakang ==
User -> Screen : Buka /lms
Screen -> Svc : getLmsState() (Reassemble Chunked Storage)
Svc --> Screen : { isConnected, user, courses, assignments, lastSync }
Screen --> User : Tampilkan Tugas (beserta Urgensi) & Kursus

opt isConnected == true
  Screen -> Syncer : Mount <LmsBackgroundSyncer />
  Syncer -> Moodle : GET /my/ (inject LMS_INJECTED_SCRIPT)
  alt Redirected ke /login/
    Moodle --> Syncer : LMS_SESSION_EXPIRED
    Syncer -> Svc : setLmsDisconnected()
    Syncer --> Screen : onSessionExpired()
    Screen --> User : Tampilkan Banner "Sesi LMS Kedaluwarsa"
  else Sesi Valid (M.cfg.sesskey)
    Syncer -> Moodle : POST /lib/ajax/service.php (Enrolled Courses & Calendar Events)
    Moodle --> Syncer : JSON Courses & Assignments
    Syncer -> Svc : saveLmsSyncPayload(payload) (Chunk 1800B)
    Syncer --> Screen : onSyncSuccess() -> loadLocalData()
    Screen --> User : Perbarui Data Tugas & Kursus
  end
end

== 2. Hubungkan Akun LMS via Google OAuth2 ==
User -> Screen : Tap "Hubungkan"
Screen -> Modal : visible = true
Modal -> Moodle : GET /login/index.php
Modal -> Modal : Auto-click a[href*="auth/oauth2/login.php?id=1"]
Modal -> Google : Redirect ke Google OAuth2
User -> Google : Login Akun Google Kampus
Google --> Moodle : Callback OAuth2 -> /my/
Modal -> Moodle : fetchMoodleData() via Moodle AJAX
Moodle --> Modal : LMS_SYNC_SUCCESS (payload)
Modal -> Svc : saveLmsSyncPayload(payload)
Modal --> Screen : onSuccess() & onClose()

== 3. Cari & Filter Katalog Kursus ==
User -> Search : Input Keyword / Pilih Kategori
Search -> Moodle : Attempt 1: Native fetch(targetUrl)
alt Native fetch diredirect ke /login/
  Search -> Syncer : Attempt 2: fetchUrl(targetUrl) via Hidden WebView
  Syncer -> Moodle : Injected fetch(targetUrl) dengan Cookie Moodle
  Moodle --> Syncer : HTML Katalog Kursus
  Syncer --> Search : return html
end
Search -> Search : parseSearchCoursesFromHtml(html)
Search --> User : Tampilkan Hasil Kursus & Status Self-Enrolment

== 4. Putuskan Akun LMS ==
User -> Screen : Tap Logout -> Konfirmasi "Putuskan"
Screen -> Svc : clearLmsState() (Hapus semua chunk & sesskey)
Screen --> User : Reset tampilan LMS
@enduml
```
