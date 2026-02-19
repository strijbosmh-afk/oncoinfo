#pragma once

#include <QObject>
#include <QString>
#include <QStringList>
#include <QList>
#include <QPair>

namespace OncoInfo {

/**
 * Manages user favorites and most-used drugs.
 * All data stored in local SQLite — works fully offline.
 */
class FavoritesRepository : public QObject {
    Q_OBJECT

public:
    explicit FavoritesRepository(QObject* parent = nullptr);

    // Favorites
    QStringList getFavorites(const QString& userId) const;
    bool addFavorite(const QString& userId, const QString& drugId);
    bool removeFavorite(const QString& userId, const QString& drugId);
    bool isFavorite(const QString& userId, const QString& drugId) const;
    int favoritesCount(const QString& userId) const;

    // Most used (max 8)
    QList<QPair<QString, int>> getMostUsed(const QString& userId) const;  // drugId, order
    bool addMostUsed(const QString& userId, const QString& drugId);
    bool removeMostUsed(const QString& userId, const QString& drugId);
    bool isMostUsed(const QString& userId, const QString& drugId) const;
    bool updateMostUsedOrder(const QString& userId, const QStringList& drugIds);
    int mostUsedCount(const QString& userId) const;
    static const int MAX_MOST_USED = 8;

    // User drug order (custom sorting within categories)
    QList<QPair<QString, int>> getUserDrugOrder(const QString& userId) const;
    bool setUserDrugOrder(const QString& userId, const QStringList& drugIds);
    bool clearUserDrugOrder(const QString& userId);

    // User specialty order (home page category ordering)
    QStringList getSpecialtyOrder(const QString& userId) const;
    bool setSpecialtyOrder(const QString& userId, const QStringList& specialtyKeys);

signals:
    void favoriteAdded(const QString& drugId);
    void favoriteRemoved(const QString& drugId);
    void mostUsedChanged();
    void drugOrderChanged();
    void specialtyOrderChanged();
};

} // namespace OncoInfo
