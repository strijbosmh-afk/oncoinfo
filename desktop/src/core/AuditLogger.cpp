#include "AuditLogger.h"
#include "Database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QUuid>

namespace OncoInfo {

AuditLogger& AuditLogger::instance() {
    static AuditLogger logger;
    return logger;
}

AuditLogger::AuditLogger() : QObject(nullptr) {}

void AuditLogger::log(const QString& userId, const QString& username,
                       const QString& action, const QString& entityType,
                       const QString& entityId, const QString& entityName,
                       const QString& hospitalId, const QString& details) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO audit_log (id, user_id, username, action, entity_type, entity_id, entity_name, hospital_id, details)
        VALUES (:id, :uid, :uname, :action, :etype, :eid, :ename, :hid, :details)
    )");
    q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
    q.bindValue(":uid", userId);
    q.bindValue(":uname", username);
    q.bindValue(":action", action);
    q.bindValue(":etype", entityType);
    q.bindValue(":eid", entityId);
    q.bindValue(":ename", entityName);
    q.bindValue(":hid", hospitalId);
    q.bindValue(":details", details);
    q.exec();
}

void AuditLogger::logLogin(const User& user) {
    log(user.id, user.username, "login", "user", user.id, user.displayName(), user.hospital_id);
}

void AuditLogger::logDrugView(const User& user, const QString& drugId, const QString& drugName) {
    log(user.id, user.username, "view", "drug", drugId, drugName, user.hospital_id);
}

void AuditLogger::logDrugCreate(const User& user, const QString& drugId, const QString& drugName) {
    log(user.id, user.username, "create", "drug", drugId, drugName, user.hospital_id);
}

void AuditLogger::logDrugUpdate(const User& user, const QString& drugId, const QString& drugName) {
    log(user.id, user.username, "update", "drug", drugId, drugName, user.hospital_id);
}

void AuditLogger::logDrugDelete(const User& user, const QString& drugId, const QString& drugName) {
    log(user.id, user.username, "delete", "drug", drugId, drugName, user.hospital_id);
}

void AuditLogger::logExport(const User& user, const QString& exportType, const QString& details) {
    log(user.id, user.username, "export", exportType, "", "", user.hospital_id, details);
}

QList<AuditEntry> AuditLogger::getEntries(const QString& hospitalId,
                                             const QString& action,
                                             const QDateTime& from,
                                             const QDateTime& to,
                                             int limit, int offset) const {
    QString sql = "SELECT * FROM audit_log WHERE 1=1";
    if (!hospitalId.isEmpty()) sql += " AND hospital_id = :hid";
    if (!action.isEmpty()) sql += " AND action = :action";
    if (from.isValid()) sql += " AND created_at >= :from";
    if (to.isValid()) sql += " AND created_at <= :to";
    sql += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";

    QSqlQuery q(Database::instance().db());
    q.prepare(sql);
    if (!hospitalId.isEmpty()) q.bindValue(":hid", hospitalId);
    if (!action.isEmpty()) q.bindValue(":action", action);
    if (from.isValid()) q.bindValue(":from", from.toString(Qt::ISODate));
    if (to.isValid()) q.bindValue(":to", to.toString(Qt::ISODate));
    q.bindValue(":limit", limit);
    q.bindValue(":offset", offset);

    QList<AuditEntry> entries;
    if (q.exec()) {
        while (q.next()) {
            AuditEntry e;
            e.id = q.value("id").toString();
            e.user_id = q.value("user_id").toString();
            e.username = q.value("username").toString();
            e.action = q.value("action").toString();
            e.entity_type = q.value("entity_type").toString();
            e.entity_id = q.value("entity_id").toString();
            e.entity_name = q.value("entity_name").toString();
            e.hospital_id = q.value("hospital_id").toString();
            e.details = q.value("details").toString();
            e.created_at = QDateTime::fromString(q.value("created_at").toString(), Qt::ISODate);
            entries << e;
        }
    }
    return entries;
}

int AuditLogger::getEntryCount(const QString& hospitalId, const QString& action,
                                 const QDateTime& from, const QDateTime& to) const {
    QString sql = "SELECT COUNT(*) FROM audit_log WHERE 1=1";
    if (!hospitalId.isEmpty()) sql += " AND hospital_id = :hid";
    if (!action.isEmpty()) sql += " AND action = :action";
    if (from.isValid()) sql += " AND created_at >= :from";
    if (to.isValid()) sql += " AND created_at <= :to";

    QSqlQuery q(Database::instance().db());
    q.prepare(sql);
    if (!hospitalId.isEmpty()) q.bindValue(":hid", hospitalId);
    if (!action.isEmpty()) q.bindValue(":action", action);
    if (from.isValid()) q.bindValue(":from", from.toString(Qt::ISODate));
    if (to.isValid()) q.bindValue(":to", to.toString(Qt::ISODate));

    if (q.exec() && q.next()) return q.value(0).toInt();
    return 0;
}

} // namespace OncoInfo
