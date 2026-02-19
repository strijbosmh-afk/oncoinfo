#include "Database.h"
#include <QStandardPaths>
#include <QDir>
#include <QDebug>

namespace OncoInfo {

Database& Database::instance() {
    static Database db;
    return db;
}

Database::Database() : QObject(nullptr) {}

Database::~Database() {
    close();
}

QString Database::defaultDbPath() const {
    QString dataDir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir().mkpath(dataDir);
    return dataDir + "/oncoinfo.db";
}

bool Database::initialize(const QString& dbPath) {
    QMutexLocker lock(&m_mutex);

    if (m_isOpen) return true;

    QString path = dbPath.isEmpty() ? defaultDbPath() : dbPath;

    m_db = QSqlDatabase::addDatabase("QSQLITE", "oncoinfo_main");
    m_db.setDatabaseName(path);

    // Enable WAL mode for better concurrent read performance
    if (!m_db.open()) {
        emit errorOccurred("Failed to open database: " + m_db.lastError().text());
        return false;
    }

    // Configure SQLite for performance
    QSqlQuery q(m_db);
    q.exec("PRAGMA journal_mode=WAL");
    q.exec("PRAGMA synchronous=NORMAL");
    q.exec("PRAGMA cache_size=-64000");  // 64MB cache
    q.exec("PRAGMA foreign_keys=ON");
    q.exec("PRAGMA temp_store=MEMORY");

    if (!createSchema()) {
        emit errorOccurred("Failed to create database schema");
        return false;
    }

    if (!migrate()) {
        emit errorOccurred("Failed to run database migrations");
        return false;
    }

    m_isOpen = true;
    emit databaseOpened();
    qDebug() << "Database opened:" << path;
    return true;
}

void Database::close() {
    QMutexLocker lock(&m_mutex);
    if (m_isOpen) {
        m_db.close();
        m_isOpen = false;
        emit databaseClosed();
    }
}

bool Database::isOpen() const {
    return m_isOpen;
}

QSqlDatabase& Database::db() {
    return m_db;
}

bool Database::beginTransaction() {
    return m_db.transaction();
}

bool Database::commitTransaction() {
    return m_db.commit();
}

bool Database::rollbackTransaction() {
    return m_db.rollback();
}

int Database::schemaVersion() const {
    QSqlQuery q(m_db);
    q.exec("PRAGMA user_version");
    if (q.next()) return q.value(0).toInt();
    return 0;
}

bool Database::createSchema() {
    QSqlQuery q(m_db);

    // Hospitals table
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS hospitals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            logo_url TEXT,
            logo_data BLOB,
            branding_color TEXT DEFAULT '#6b2d5b',
            is_active INTEGER DEFAULT 1,
            default_language TEXT DEFAULT 'nl',
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create hospitals:" << q.lastError().text();
        return false;
    }

    // Hospital disciplines
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS hospital_disciplines (
            id TEXT PRIMARY KEY,
            hospital_id TEXT NOT NULL REFERENCES hospitals(id),
            disease_area TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(hospital_id, disease_area)
        )
    )")) {
        qDebug() << "Failed to create hospital_disciplines:" << q.lastError().text();
        return false;
    }

    // Hospital doctors/staff
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS hospital_doctors (
            id TEXT PRIMARY KEY,
            hospital_id TEXT NOT NULL REFERENCES hospitals(id),
            name TEXT NOT NULL,
            staff_type TEXT DEFAULT 'doctor',
            specialization TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create hospital_doctors:" << q.lastError().text();
        return false;
    }

    // Users table (replaces Supabase auth + profiles)
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            function TEXT,
            role TEXT DEFAULT 'viewer',
            hospital_id TEXT REFERENCES hospitals(id),
            is_physician INTEGER DEFAULT 0,
            can_add_treatments INTEGER DEFAULT 0,
            can_modify_treatments INTEGER DEFAULT 0,
            can_delete_treatments INTEGER DEFAULT 0,
            password_changed INTEGER DEFAULT 0,
            dedicated_nurse_id TEXT,
            auth_method TEXT DEFAULT 'local',
            domain_username TEXT,
            last_login TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(username, hospital_id)
        )
    )")) {
        qDebug() << "Failed to create users:" << q.lastError().text();
        return false;
    }

    // Drugs table
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS drugs (
            id TEXT PRIMARY KEY,
            generic_name TEXT NOT NULL,
            brand_names TEXT,
            drug_class TEXT NOT NULL,
            mechanism_of_action TEXT,
            disease_areas TEXT,
            approved_indications TEXT,
            common_regimens TEXT,
            dosing_info TEXT,
            administration_route TEXT,
            cycle_length_days INTEGER,
            side_effects TEXT,
            contraindications TEXT,
            drug_interactions TEXT,
            monitoring_requirements TEXT,
            patient_counseling_points TEXT,
            ema_approval_date TEXT,
            fda_approval_date TEXT,
            is_on_zvz INTEGER DEFAULT 0,
            unit_price REAL,
            price_unit TEXT,
            reference_links TEXT,
            display_order INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            hospital_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create drugs:" << q.lastError().text();
        return false;
    }

    // User favorites
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS user_favorites (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            drug_id TEXT NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, drug_id)
        )
    )")) {
        qDebug() << "Failed to create user_favorites:" << q.lastError().text();
        return false;
    }

    // User most used
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS user_most_used (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            drug_id TEXT NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, drug_id)
        )
    )")) {
        qDebug() << "Failed to create user_most_used:" << q.lastError().text();
        return false;
    }

    // User drug order
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS user_drug_order (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            drug_id TEXT NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
            display_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, drug_id)
        )
    )")) {
        qDebug() << "Failed to create user_drug_order:" << q.lastError().text();
        return false;
    }

    // User specialty order
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS user_specialty_order (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            specialty_keys TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id)
        )
    )")) {
        qDebug() << "Failed to create user_specialty_order:" << q.lastError().text();
        return false;
    }

    // Patient folder content
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS patient_folder_content (
            id TEXT PRIMARY KEY,
            drug_id TEXT NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
            hospital_id TEXT,
            introduction TEXT,
            usage_info TEXT,
            dosing_info TEXT,
            contraindications TEXT,
            side_effects_common TEXT,
            side_effects_serious TEXT,
            tips TEXT,
            self_care_tips TEXT,
            monitoring TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(drug_id, hospital_id)
        )
    )")) {
        qDebug() << "Failed to create patient_folder_content:" << q.lastError().text();
        return false;
    }

    // Audit log
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            username TEXT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            entity_name TEXT,
            hospital_id TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create audit_log:" << q.lastError().text();
        return false;
    }

    // Login attempts (for rate limiting)
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL,
            attempted_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create login_attempts:" << q.lastError().text();
        return false;
    }

    // Settings table (app configuration)
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    )")) {
        qDebug() << "Failed to create settings:" << q.lastError().text();
        return false;
    }

    // Sync metadata (for online sync tracking)
    if (!q.exec(R"(
        CREATE TABLE IF NOT EXISTS sync_metadata (
            table_name TEXT PRIMARY KEY,
            last_sync_at TEXT,
            sync_version INTEGER DEFAULT 0
        )
    )")) {
        qDebug() << "Failed to create sync_metadata:" << q.lastError().text();
        return false;
    }

    // Create indexes for performance
    q.exec("CREATE INDEX IF NOT EXISTS idx_drugs_class ON drugs(drug_class)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(generic_name)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_drugs_archived ON drugs(is_archived)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_most_used_user ON user_most_used(user_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_audit_hospital ON audit_log(hospital_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(identifier, attempted_at)");

    // Full-text search index for drugs
    q.exec(R"(
        CREATE VIRTUAL TABLE IF NOT EXISTS drugs_fts USING fts5(
            generic_name, brand_names, common_regimens, drug_class, disease_areas,
            content='drugs', content_rowid='rowid'
        )
    )");

    // Set initial schema version
    if (schemaVersion() == 0) {
        q.exec("PRAGMA user_version = 1");
    }

    return true;
}

bool Database::migrate() {
    int version = schemaVersion();
    // Future migrations go here
    // if (version < 2) runMigration(2);
    // if (version < 3) runMigration(3);
    (void)version;
    return true;
}

bool Database::runMigration(int fromVersion) {
    QSqlQuery q(m_db);
    // Placeholder for future migrations
    q.exec(QString("PRAGMA user_version = %1").arg(fromVersion));
    emit migrationCompleted(fromVersion);
    return true;
}

} // namespace OncoInfo
