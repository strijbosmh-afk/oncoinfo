#include "SyncService.h"
#include "NetworkManager.h"
#include "core/SettingsManager.h"
#include "core/DrugRepository.h"
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QDebug>

namespace OncoInfo {

SyncService& SyncService::instance() {
    static SyncService svc;
    return svc;
}

SyncService::SyncService() : QObject(nullptr) {
    m_syncTimer = new QTimer(this);
    connect(m_syncTimer, &QTimer::timeout, this, &SyncService::syncNow);
}

void SyncService::startAutoSync(int intervalMs) {
    QString serverUrl = SettingsManager::instance().syncServerUrl();
    if (serverUrl.isEmpty()) {
        qDebug() << "No sync server configured, auto-sync disabled";
        return;
    }

    if (!SettingsManager::instance().autoSyncEnabled()) return;

    m_syncTimer->start(intervalMs);
    qDebug() << "Auto-sync started with interval:" << intervalMs << "ms";
}

void SyncService::stopAutoSync() {
    m_syncTimer->stop();
}

void SyncService::syncNow() {
    if (m_isSyncing) return;
    if (!NetworkManager::instance().isOnline()) return;

    QString serverUrl = SettingsManager::instance().syncServerUrl();
    if (serverUrl.isEmpty()) return;

    m_isSyncing = true;
    emit syncStarted();

    pullDrugs();
}

bool SyncService::isSyncing() const {
    return m_isSyncing;
}

QDateTime SyncService::lastSyncTime() const {
    return m_lastSync;
}

void SyncService::pullDrugs() {
    QString serverUrl = SettingsManager::instance().syncServerUrl();
    QString endpoint = serverUrl + "/api/drugs";

    // Add last sync timestamp to only get updates
    int lastSync = SettingsManager::instance().lastSyncTimestamp();
    if (lastSync > 0) {
        endpoint += "?updated_after=" + QString::number(lastSync);
    }

    NetworkManager::instance().get(endpoint, [this](const QByteArray& data, bool success) {
        if (!success) {
            m_isSyncing = false;
            emit syncCompleted(false, "Failed to connect to sync server");
            return;
        }

        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (!doc.isArray()) {
            m_isSyncing = false;
            emit syncCompleted(false, "Invalid response from server");
            return;
        }

        QJsonArray drugsArray = doc.array();
        DrugRepository repo;
        int updated = 0, added = 0;

        for (const auto& drugVal : drugsArray) {
            QJsonObject obj = drugVal.toObject();
            QString drugId = obj["id"].toString();

            auto existing = repo.getById(drugId);
            Drug drug;
            drug.id = drugId;
            drug.generic_name = obj["generic_name"].toString();
            drug.drug_class = obj["drug_class"].toString();
            // ... map all fields from JSON

            if (existing) {
                repo.update(drug);
                updated++;
            } else {
                repo.insert(drug);
                added++;
            }
        }

        m_lastSync = QDateTime::currentDateTime();
        SettingsManager::instance().setLastSyncTimestamp(m_lastSync.toSecsSinceEpoch());

        m_isSyncing = false;

        pushUserData();

        QString summary = QString("Sync complete: %1 added, %2 updated").arg(added).arg(updated);
        emit syncCompleted(true, summary);
    });
}

void SyncService::pushUserData() {
    // Push favorites and user preferences to server (if configured)
    // This enables cross-device sync when a server is available
    // Implementation depends on the specific REST API being used
    qDebug() << "User data push not yet implemented (requires server endpoint)";
}

} // namespace OncoInfo
