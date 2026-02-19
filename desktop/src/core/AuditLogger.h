#pragma once

#include <QObject>
#include <QString>
#include <QList>
#include <QDateTime>
#include "models/User.h"

namespace OncoInfo {

class AuditLogger : public QObject {
    Q_OBJECT

public:
    static AuditLogger& instance();

    void log(const QString& userId, const QString& username,
             const QString& action, const QString& entityType = QString(),
             const QString& entityId = QString(), const QString& entityName = QString(),
             const QString& hospitalId = QString(), const QString& details = QString());

    void logLogin(const User& user);
    void logDrugView(const User& user, const QString& drugId, const QString& drugName);
    void logDrugCreate(const User& user, const QString& drugId, const QString& drugName);
    void logDrugUpdate(const User& user, const QString& drugId, const QString& drugName);
    void logDrugDelete(const User& user, const QString& drugId, const QString& drugName);
    void logExport(const User& user, const QString& exportType, const QString& details);

    QList<AuditEntry> getEntries(const QString& hospitalId = QString(),
                                   const QString& action = QString(),
                                   const QDateTime& from = QDateTime(),
                                   const QDateTime& to = QDateTime(),
                                   int limit = 100, int offset = 0) const;

    int getEntryCount(const QString& hospitalId = QString(),
                      const QString& action = QString(),
                      const QDateTime& from = QDateTime(),
                      const QDateTime& to = QDateTime()) const;

private:
    AuditLogger();
    AuditLogger(const AuditLogger&) = delete;
};

} // namespace OncoInfo
