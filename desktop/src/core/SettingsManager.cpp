#include "SettingsManager.h"
#include "Database.h"
#include <QSqlQuery>
#include <QSqlError>

namespace OncoInfo {

SettingsManager& SettingsManager::instance() {
    static SettingsManager mgr;
    return mgr;
}

SettingsManager::SettingsManager() : QObject(nullptr) {}

QString SettingsManager::get(const QString& key, const QString& defaultValue) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT value FROM settings WHERE key = :key");
    q.bindValue(":key", key);
    if (q.exec() && q.next()) return q.value(0).toString();
    return defaultValue;
}

void SettingsManager::set(const QString& key, const QString& value) {
    QSqlQuery q(Database::instance().db());
    q.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (:key, :val, datetime('now'))");
    q.bindValue(":key", key);
    q.bindValue(":val", value);
    q.exec();
    emit settingChanged(key, value);
}

bool SettingsManager::has(const QString& key) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM settings WHERE key = :key");
    q.bindValue(":key", key);
    if (q.exec() && q.next()) return q.value(0).toInt() > 0;
    return false;
}

void SettingsManager::remove(const QString& key) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM settings WHERE key = :key");
    q.bindValue(":key", key);
    q.exec();
}

QString SettingsManager::lastHospitalId() const { return get("last_hospital_id"); }
void SettingsManager::setLastHospitalId(const QString& id) { set("last_hospital_id", id); }

QString SettingsManager::lastUsername() const { return get("last_username"); }
void SettingsManager::setLastUsername(const QString& username) { set("last_username", username); }

QString SettingsManager::language() const { return get("language", "nl"); }
void SettingsManager::setLanguage(const QString& lang) { set("language", lang); }

QString SettingsManager::syncServerUrl() const { return get("sync_server_url"); }
void SettingsManager::setSyncServerUrl(const QString& url) { set("sync_server_url", url); }

bool SettingsManager::useDomainAuth() const { return get("use_domain_auth", "0") == "1"; }
void SettingsManager::setUseDomainAuth(bool use) { set("use_domain_auth", use ? "1" : "0"); }

bool SettingsManager::autoSyncEnabled() const { return get("auto_sync_enabled", "0") == "1"; }
void SettingsManager::setAutoSyncEnabled(bool enabled) { set("auto_sync_enabled", enabled ? "1" : "0"); }

int SettingsManager::lastSyncTimestamp() const { return get("last_sync_timestamp", "0").toInt(); }
void SettingsManager::setLastSyncTimestamp(int timestamp) { set("last_sync_timestamp", QString::number(timestamp)); }

} // namespace OncoInfo
