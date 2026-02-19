#pragma once

#include <QObject>
#include <QString>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QMutex>
#include <memory>

namespace OncoInfo {

/**
 * Database manager using SQLite for fully offline operation.
 * All drug data, user accounts, favorites, and settings are stored locally.
 * This replaces Supabase entirely for hospital environments with restricted internet.
 */
class Database : public QObject {
    Q_OBJECT

public:
    static Database& instance();

    bool initialize(const QString& dbPath = QString());
    void close();
    bool isOpen() const;

    QSqlDatabase& db();

    // Transaction helpers
    bool beginTransaction();
    bool commitTransaction();
    bool rollbackTransaction();

    // Schema version management
    int schemaVersion() const;
    bool migrate();

signals:
    void databaseOpened();
    void databaseClosed();
    void migrationCompleted(int version);
    void errorOccurred(const QString& error);

private:
    Database();
    ~Database();
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    bool createSchema();
    bool runMigration(int fromVersion);
    QString defaultDbPath() const;

    QSqlDatabase m_db;
    QMutex m_mutex;
    bool m_isOpen = false;
};

} // namespace OncoInfo
