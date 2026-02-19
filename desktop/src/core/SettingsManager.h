#pragma once

#include <QObject>
#include <QString>
#include <QVariant>

namespace OncoInfo {

class SettingsManager : public QObject {
    Q_OBJECT

public:
    static SettingsManager& instance();

    // Generic key-value settings stored in SQLite
    QString get(const QString& key, const QString& defaultValue = QString()) const;
    void set(const QString& key, const QString& value);
    bool has(const QString& key) const;
    void remove(const QString& key);

    // Convenience accessors
    QString lastHospitalId() const;
    void setLastHospitalId(const QString& id);

    QString lastUsername() const;
    void setLastUsername(const QString& username);

    QString language() const;
    void setLanguage(const QString& lang);

    QString syncServerUrl() const;
    void setSyncServerUrl(const QString& url);

    bool useDomainAuth() const;
    void setUseDomainAuth(bool use);

    bool autoSyncEnabled() const;
    void setAutoSyncEnabled(bool enabled);

    int lastSyncTimestamp() const;
    void setLastSyncTimestamp(int timestamp);

signals:
    void settingChanged(const QString& key, const QString& value);

private:
    SettingsManager();
    SettingsManager(const SettingsManager&) = delete;
};

} // namespace OncoInfo
