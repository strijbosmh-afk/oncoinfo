#include "FavoritesRepository.h"
#include "Database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QUuid>
#include <QJsonDocument>
#include <QJsonArray>
#include <QDebug>

namespace OncoInfo {

FavoritesRepository::FavoritesRepository(QObject* parent) : QObject(parent) {}

// --- Favorites ---

QStringList FavoritesRepository::getFavorites(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT drug_id FROM user_favorites WHERE user_id = :uid ORDER BY created_at");
    q.bindValue(":uid", userId);
    QStringList ids;
    if (q.exec()) {
        while (q.next()) ids << q.value(0).toString();
    }
    return ids;
}

bool FavoritesRepository::addFavorite(const QString& userId, const QString& drugId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("INSERT OR IGNORE INTO user_favorites (id, user_id, drug_id) VALUES (:id, :uid, :did)");
    q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    if (!q.exec()) return false;
    emit favoriteAdded(drugId);
    return true;
}

bool FavoritesRepository::removeFavorite(const QString& userId, const QString& drugId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM user_favorites WHERE user_id = :uid AND drug_id = :did");
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    if (!q.exec()) return false;
    emit favoriteRemoved(drugId);
    return true;
}

bool FavoritesRepository::isFavorite(const QString& userId, const QString& drugId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM user_favorites WHERE user_id = :uid AND drug_id = :did");
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    if (q.exec() && q.next()) return q.value(0).toInt() > 0;
    return false;
}

int FavoritesRepository::favoritesCount(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM user_favorites WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    if (q.exec() && q.next()) return q.value(0).toInt();
    return 0;
}

// --- Most Used ---

QList<QPair<QString, int>> FavoritesRepository::getMostUsed(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT drug_id, display_order FROM user_most_used WHERE user_id = :uid ORDER BY display_order");
    q.bindValue(":uid", userId);
    QList<QPair<QString, int>> result;
    if (q.exec()) {
        while (q.next())
            result << qMakePair(q.value(0).toString(), q.value(1).toInt());
    }
    return result;
}

bool FavoritesRepository::addMostUsed(const QString& userId, const QString& drugId) {
    if (mostUsedCount(userId) >= MAX_MOST_USED) return false;

    int maxOrder = 0;
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT MAX(display_order) FROM user_most_used WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    if (q.exec() && q.next()) maxOrder = q.value(0).toInt() + 1;

    q.prepare("INSERT OR IGNORE INTO user_most_used (id, user_id, drug_id, display_order) VALUES (:id, :uid, :did, :order)");
    q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    q.bindValue(":order", maxOrder);
    if (!q.exec()) return false;
    emit mostUsedChanged();
    return true;
}

bool FavoritesRepository::removeMostUsed(const QString& userId, const QString& drugId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM user_most_used WHERE user_id = :uid AND drug_id = :did");
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    if (!q.exec()) return false;
    emit mostUsedChanged();
    return true;
}

bool FavoritesRepository::isMostUsed(const QString& userId, const QString& drugId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM user_most_used WHERE user_id = :uid AND drug_id = :did");
    q.bindValue(":uid", userId);
    q.bindValue(":did", drugId);
    if (q.exec() && q.next()) return q.value(0).toInt() > 0;
    return false;
}

bool FavoritesRepository::updateMostUsedOrder(const QString& userId, const QStringList& drugIds) {
    Database::instance().beginTransaction();
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM user_most_used WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    q.exec();

    for (int i = 0; i < drugIds.size() && i < MAX_MOST_USED; i++) {
        q.prepare("INSERT INTO user_most_used (id, user_id, drug_id, display_order) VALUES (:id, :uid, :did, :order)");
        q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
        q.bindValue(":uid", userId);
        q.bindValue(":did", drugIds[i]);
        q.bindValue(":order", i);
        if (!q.exec()) {
            Database::instance().rollbackTransaction();
            return false;
        }
    }

    Database::instance().commitTransaction();
    emit mostUsedChanged();
    return true;
}

int FavoritesRepository::mostUsedCount(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM user_most_used WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    if (q.exec() && q.next()) return q.value(0).toInt();
    return 0;
}

// --- User Drug Order ---

QList<QPair<QString, int>> FavoritesRepository::getUserDrugOrder(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT drug_id, display_order FROM user_drug_order WHERE user_id = :uid ORDER BY display_order");
    q.bindValue(":uid", userId);
    QList<QPair<QString, int>> result;
    if (q.exec()) {
        while (q.next())
            result << qMakePair(q.value(0).toString(), q.value(1).toInt());
    }
    return result;
}

bool FavoritesRepository::setUserDrugOrder(const QString& userId, const QStringList& drugIds) {
    Database::instance().beginTransaction();
    clearUserDrugOrder(userId);

    QSqlQuery q(Database::instance().db());
    for (int i = 0; i < drugIds.size(); i++) {
        q.prepare("INSERT INTO user_drug_order (id, user_id, drug_id, display_order) VALUES (:id, :uid, :did, :order)");
        q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
        q.bindValue(":uid", userId);
        q.bindValue(":did", drugIds[i]);
        q.bindValue(":order", i);
        if (!q.exec()) {
            Database::instance().rollbackTransaction();
            return false;
        }
    }

    Database::instance().commitTransaction();
    emit drugOrderChanged();
    return true;
}

bool FavoritesRepository::clearUserDrugOrder(const QString& userId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM user_drug_order WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    return q.exec();
}

// --- Specialty Order ---

QStringList FavoritesRepository::getSpecialtyOrder(const QString& userId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT specialty_keys FROM user_specialty_order WHERE user_id = :uid");
    q.bindValue(":uid", userId);
    if (q.exec() && q.next()) {
        QString json = q.value(0).toString();
        QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
        QStringList keys;
        for (const auto& v : doc.array()) keys << v.toString();
        return keys;
    }
    // Default order
    return {"breast", "urology", "gynecology", "respiratory", "digestive", "skin", "head_neck", "other"};
}

bool FavoritesRepository::setSpecialtyOrder(const QString& userId, const QStringList& specialtyKeys) {
    QJsonArray arr;
    for (const auto& k : specialtyKeys) arr.append(k);
    QString json = QJsonDocument(arr).toJson(QJsonDocument::Compact);

    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO user_specialty_order (id, user_id, specialty_keys, updated_at)
        VALUES (:id, :uid, :keys, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET specialty_keys = :keys2, updated_at = datetime('now')
    )");
    q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
    q.bindValue(":uid", userId);
    q.bindValue(":keys", json);
    q.bindValue(":keys2", json);

    if (!q.exec()) return false;
    emit specialtyOrderChanged();
    return true;
}

} // namespace OncoInfo
