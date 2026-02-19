#include "NetworkManager.h"
#include <QNetworkRequest>
#include <QUrl>

namespace OncoInfo {

NetworkManager& NetworkManager::instance() {
    static NetworkManager mgr;
    return mgr;
}

NetworkManager::NetworkManager() : QObject(nullptr) {
    m_manager = new QNetworkAccessManager(this);
}

bool NetworkManager::isOnline() const {
    return m_isOnline;
}

void NetworkManager::checkConnectivity() {
    QNetworkRequest request(QUrl("https://www.google.com/generate_204"));
    request.setTransferTimeout(5000);

    auto* reply = m_manager->head(request);
    connect(reply, &QNetworkReply::finished, [this, reply]() {
        bool wasOnline = m_isOnline;
        m_isOnline = (reply->error() == QNetworkReply::NoError);
        if (wasOnline != m_isOnline) {
            emit connectivityChanged(m_isOnline);
        }
        reply->deleteLater();
    });
}

void NetworkManager::get(const QString& url, std::function<void(const QByteArray&, bool)> callback) {
    QNetworkRequest request(QUrl(url));
    request.setTransferTimeout(30000);

    auto* reply = m_manager->get(request);
    connect(reply, &QNetworkReply::finished, [reply, callback]() {
        bool success = (reply->error() == QNetworkReply::NoError);
        callback(reply->readAll(), success);
        reply->deleteLater();
    });
}

void NetworkManager::post(const QString& url, const QByteArray& data,
                           std::function<void(const QByteArray&, bool)> callback) {
    QNetworkRequest request(QUrl(url));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setTransferTimeout(30000);

    auto* reply = m_manager->post(request, data);
    connect(reply, &QNetworkReply::finished, [reply, callback]() {
        bool success = (reply->error() == QNetworkReply::NoError);
        callback(reply->readAll(), success);
        reply->deleteLater();
    });
}

} // namespace OncoInfo
