#pragma once

#include <QObject>
#include <QTimer>

namespace OncoInfo {

/**
 * Sync service for bidirectional data synchronization.
 * When a server URL is configured and the network is available:
 *   - Pulls new/updated drugs from central server
 *   - Pushes local changes (favorites, user data) to server
 *   - Handles conflict resolution (server wins for drug data, local wins for user prefs)
 *
 * All sync is optional — the app works fully offline.
 * Can sync with a simple REST API hosted within the hospital network
 * (no Supabase or external cloud needed).
 */
class SyncService : public QObject {
    Q_OBJECT

public:
    static SyncService& instance();

    void startAutoSync(int intervalMs = 300000);  // Default: 5 minutes
    void stopAutoSync();

    void syncNow();
    bool isSyncing() const;
    QDateTime lastSyncTime() const;

signals:
    void syncStarted();
    void syncCompleted(bool success, const QString& summary);
    void syncProgress(int current, int total, const QString& message);

private:
    SyncService();
    SyncService(const SyncService&) = delete;

    void pullDrugs();
    void pushUserData();

    QTimer* m_syncTimer;
    bool m_isSyncing = false;
    QDateTime m_lastSync;
};

} // namespace OncoInfo
