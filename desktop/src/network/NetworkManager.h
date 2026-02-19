#pragma once

#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>

namespace OncoInfo {

/**
 * Network manager for optional online features.
 * All core functionality works offline.
 * When online, enables:
 *   - Drug database sync with central server
 *   - PubMed article lookups
 *   - ClinicalTrials.gov integration
 */
class NetworkManager : public QObject {
    Q_OBJECT

public:
    static NetworkManager& instance();

    bool isOnline() const;
    void checkConnectivity();

    // HTTP helpers
    void get(const QString& url, std::function<void(const QByteArray&, bool)> callback);
    void post(const QString& url, const QByteArray& data,
              std::function<void(const QByteArray&, bool)> callback);

signals:
    void connectivityChanged(bool online);

private:
    NetworkManager();
    NetworkManager(const NetworkManager&) = delete;

    QNetworkAccessManager* m_manager;
    bool m_isOnline = false;
};

} // namespace OncoInfo
