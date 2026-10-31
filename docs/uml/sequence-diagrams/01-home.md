# Sequence Diagram — Modul 1: Home & Navigasi (`home`)

## Referensi Kode Sumber
- `src/app/index.tsx` (`EntryPoint`)
- `src/app/android/index.tsx` & `src/app/ios/index.tsx` (`HomeScreen`, `handleAkademikPress`, `openLink`)
- `src/app/layanan-fst.tsx` (`LayananFSTScreen`)

---

## 1. Alur Buka Aplikasi, Cek Sesi Akademik, & Navigasi Modul (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Mahasiswa
    participant Entry as EntryPoint (src/app/index.tsx)
    participant Home as HomeScreen (android/ios index.tsx)
    participant Store as SecureStore (expo-secure-store)
    participant Router as Expo Router
    participant Linking as Expo Linking

    User->>Entry: Buka Aplikasi Kudu
    alt Platform.OS === 'android'
        Entry->>Router: <Redirect href="/android" />
    else Platform.OS === 'ios'
        Entry->>Router: <Redirect href="/ios" />
    end
    Router-->>Home: Render HomeScreen

    rect rgb(255, 248, 220)
        Note over User,Router: Akses Modul Portal Akademik (Session Gate)
        User->>Home: Tap Kartu "Akademik" (handleAkademikPress)
        Home->>Store: getItemAsync('akademik_nim') || getItemAsync('nim')
        Store-->>Home: nim
        Home->>Store: getItemAsync('akademik_phpSessId') || getItemAsync('phpSessId')
        Store-->>Home: phpSessId

        alt nim && phpSessId tersedia
            Home->>Router: router.push('/akademik')
        else sesi belum tersedia
            Home->>Router: router.push('/android/login' | '/ios/login')
        end
    end

    rect rgb(235, 248, 255)
        Note over User,Router: Akses Modul LMS Moodle / E-Letter FST / Layanan FST
        alt Tap Kartu "LMS"
            User->>Home: Tap Kartu "LMS"
            Home->>Router: router.push('/lms')
        else Tap Kartu "E-Letter FST"
            User->>Home: Tap Kartu "E-Letter FST"
            Home->>Router: router.push('/eletter')
        else Tap Kartu "Layanan FST"
            User->>Home: Tap Kartu "Layanan FST"
            Home->>Router: router.push('/layanan-fst')
        end
    end

    rect rgb(240, 255, 240)
        Note over User,Linking: Buka Tautan Eksternal (Trakteer / GitHub)
        User->>Home: Tap "Traktir Kopi" / "GitHub" (openLink(url))
        Home->>Linking: Linking.openURL(url)
    end
```

---

## 2. Diagram (PlantUML)

```plantuml
@startuml Sequence_Home_Navigation
autonumber
actor "Mahasiswa" as User
participant "EntryPoint\n(src/app/index.tsx)" as Entry
participant "HomeScreen\n(android/ios index.tsx)" as Home
database "SecureStore\n(expo-secure-store)" as Store
participant "Expo Router" as Router
participant "Expo Linking" as Linking

User -> Entry : Buka Aplikasi
alt Platform.OS === 'android'
  Entry -> Router : <Redirect href="/android" />
else Platform.OS === 'ios'
  Entry -> Router : <Redirect href="/ios" />
end
Router --> Home : Render HomeScreen

group Akses Layanan Akademik (handleAkademikPress)
  User -> Home : Tap Kartu "Akademik"
  Home -> Store : getItemAsync('akademik_nim') || getItemAsync('nim')
  Store --> Home : nim
  Home -> Store : getItemAsync('akademik_phpSessId') || getItemAsync('phpSessId')
  Store --> Home : phpSessId

  alt nim && phpSessId tersedia
    Home -> Router : router.push('/akademik')
  else sesi kosong
    Home -> Router : router.push('/android/login' | '/ios/login')
  end
end

group Akses Layanan Lainnya
  alt Tap "LMS"
    User -> Home : Tap Kartu "LMS"
    Home -> Router : router.push('/lms')
  else Tap "E-Letter FST"
    User -> Home : Tap Kartu "E-Letter FST"
    Home -> Router : router.push('/eletter')
  else Tap "Layanan FST"
    User -> Home : Tap Kartu "Layanan FST"
    Home -> Router : router.push('/layanan-fst')
  end
end

group Tautan Eksternal (openLink)
  User -> Home : Tap "Traktir Kopi" / "GitHub"
  Home -> Linking : Linking.openURL(url)
end
@enduml
```
