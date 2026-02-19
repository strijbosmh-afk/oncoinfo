# OncoInfo Desktop - Build Instructions

## Prerequisites

### Windows (Target Platform)
1. **Visual Studio 2022** (Community edition is free)
   - Workload: "Desktop development with C++"
2. **Qt 6.6+** (Open Source / LGPL)
   - Download from: https://www.qt.io/download-qt-installer
   - Required modules: Core, Widgets, Sql, Network, PrintSupport
3. **CMake 3.16+** (included with Visual Studio)

### Linux (Development/Cross-compilation)
```bash
sudo apt install qt6-base-dev qt6-tools-dev cmake g++ libsqlite3-dev
```

## Building

### Windows (Visual Studio)
```powershell
# Open Developer Command Prompt for VS 2022
cd desktop
cmake -B build -DCMAKE_PREFIX_PATH=C:/Qt/6.6.0/msvc2019_64
cmake --build build --config Release
```

### Windows (MinGW)
```powershell
cd desktop
cmake -B build -G "MinGW Makefiles" -DCMAKE_PREFIX_PATH=C:/Qt/6.6.0/mingw_64
cmake --build build
```

### Linux
```bash
cd desktop
cmake -B build
cmake --build build -j$(nproc)
```

## First Run

On first launch, the application will:
1. Create a SQLite database in `%APPDATA%/OncoInfo/oncoinfo.db`
2. Create a default hospital ("My Hospital")
3. Create a default admin account:
   - **Username:** admin
   - **Password:** OncoInfo2024!

## Seeding Drug Data

### From Supabase (existing web app data)
```bash
# Export from Supabase
python tools/migrate_from_supabase.py \
    --url https://your-project.supabase.co \
    --key your-anon-key \
    --output drugs.json \
    --hospitals \
    --patient-folders

# Import into desktop app
./OncoInfoSeed --import drugs.json --db path/to/oncoinfo.db
```

### Sample data
```bash
./OncoInfoSeed --init --db path/to/oncoinfo.db
```

## Creating the Installer

1. Install [Inno Setup](https://jrsoftware.org/isinfo.php)
2. Build the Release configuration
3. Run `windeployqt` on the executable:
   ```powershell
   windeployqt build/Release/OncoInfo.exe
   ```
4. Open `installer/oncoinfo.iss` in Inno Setup and compile

## Architecture

```
┌─────────────────────────────────────────────┐
│                  OncoInfo.exe                │
├─────────────────────────────────────────────┤
│  UI Layer (Qt Widgets)                      │
│  ├── LoginDialog        (authentication)    │
│  ├── MainWindow         (navigation shell)  │
│  ├── HomePage           (specialty cards)   │
│  ├── DrugsPage          (drug browsing)     │
│  ├── DrugDetailWidget   (drug info tabs)    │
│  ├── PatientFolderDialog(PDF generation)    │
│  └── AdminPanel         (user/drug mgmt)   │
├─────────────────────────────────────────────┤
│  Auth Layer                                 │
│  ├── AuthManager        (login/session)     │
│  └── WindowsAuth        (AD/SSPI - optional)│
├─────────────────────────────────────────────┤
│  Core Layer                                 │
│  ├── Database           (SQLite manager)    │
│  ├── DrugRepository     (drug CRUD)         │
│  ├── UserRepository     (user/hospital CRUD)│
│  ├── FavoritesRepository(favorites/order)   │
│  ├── AuditLogger        (activity tracking) │
│  └── SettingsManager    (app config)        │
├─────────────────────────────────────────────┤
│  i18n Layer                                 │
│  └── TranslationManager (NL/FR/DE/EN JSON)  │
├─────────────────────────────────────────────┤
│  Network Layer (optional)                   │
│  ├── NetworkManager     (HTTP client)       │
│  └── SyncService        (data sync)         │
├─────────────────────────────────────────────┤
│  SQLite Database (oncoinfo.db)              │
│  ├── drugs, hospitals, users                │
│  ├── user_favorites, user_most_used         │
│  ├── patient_folder_content, audit_log      │
│  └── settings, sync_metadata                │
└─────────────────────────────────────────────┘
```

## User Management (Solving Supabase Restriction)

The desktop app provides three authentication methods:

### 1. Local Authentication (Default)
- Users stored in local SQLite database
- Password hashing with PBKDF2 (SHA-256, 10000 iterations)
- Admin creates accounts within the app
- No internet connection required

### 2. Windows Active Directory (Optional)
- Integrates with hospital AD via SSPI
- Users log in with Windows domain credentials
- Automatic SSO when app starts
- No separate account management needed
- Works within hospital network

### 3. Hybrid Mode
- Tries Windows AD first
- Falls back to local accounts if AD unavailable
- Best of both worlds for hospital environments

## Offline Capabilities

All core features work 100% offline:
- Drug browsing and search
- Favorites and most-used
- Custom drug ordering
- Patient folder generation and PDF export
- User management
- Audit logging

Online features (when available):
- Drug database synchronization
- PubMed article lookup
- ClinicalTrials.gov integration
