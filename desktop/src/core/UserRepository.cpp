#include "UserRepository.h"
#include "Database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QCryptographicHash>
#include <QUuid>
#include <QRandomGenerator>
#include <QDebug>

namespace OncoInfo {

UserRepository::UserRepository(QObject* parent) : QObject(parent) {}

QString UserRepository::generateId() const {
    return QUuid::createUuid().toString(QUuid::WithoutBraces);
}

QString UserRepository::generateSalt() const {
    QByteArray salt;
    for (int i = 0; i < 32; i++)
        salt.append(static_cast<char>(QRandomGenerator::global()->bounded(256)));
    return salt.toBase64();
}

QString UserRepository::hashPassword(const QString& password, const QString& salt) const {
    // SHA-256 with salt, iterated 10000 times (PBKDF2-like)
    QByteArray data = (password + salt).toUtf8();
    for (int i = 0; i < 10000; i++) {
        data = QCryptographicHash::hash(data + salt.toUtf8(), QCryptographicHash::Sha256);
    }
    return data.toBase64();
}

User UserRepository::userFromQuery(const QSqlQuery& q) const {
    User u;
    u.id = q.value("id").toString();
    u.username = q.value("username").toString();
    u.email = q.value("email").toString();
    u.first_name = q.value("first_name").toString();
    u.last_name = q.value("last_name").toString();
    u.function = q.value("function").toString();
    u.role = roleFromString(q.value("role").toString());
    u.hospital_id = q.value("hospital_id").toString();
    u.permissions.is_physician = q.value("is_physician").toBool();
    u.permissions.can_add_treatments = q.value("can_add_treatments").toBool();
    u.permissions.can_modify_treatments = q.value("can_modify_treatments").toBool();
    u.permissions.can_delete_treatments = q.value("can_delete_treatments").toBool();
    u.password_changed = q.value("password_changed").toBool();
    u.dedicated_nurse_id = q.value("dedicated_nurse_id").toString();
    if (!q.value("last_login").isNull())
        u.last_login = QDateTime::fromString(q.value("last_login").toString(), Qt::ISODate);
    u.created_at = QDateTime::fromString(q.value("created_at").toString(), Qt::ISODate);
    return u;
}

QList<User> UserRepository::getAllUsers(const QString& hospitalId) const {
    QSqlQuery q(Database::instance().db());
    if (hospitalId.isEmpty())
        q.prepare("SELECT * FROM users WHERE is_active = 1 ORDER BY last_name, first_name");
    else {
        q.prepare("SELECT * FROM users WHERE hospital_id = :hid AND is_active = 1 ORDER BY last_name, first_name");
        q.bindValue(":hid", hospitalId);
    }

    QList<User> users;
    if (q.exec()) {
        while (q.next()) users << userFromQuery(q);
    }
    return users;
}

std::optional<User> UserRepository::getUserById(const QString& id) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM users WHERE id = :id");
    q.bindValue(":id", id);
    if (q.exec() && q.next()) return userFromQuery(q);
    return std::nullopt;
}

std::optional<User> UserRepository::getUserByUsername(const QString& username, const QString& hospitalId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM users WHERE username = :uname AND hospital_id = :hid AND is_active = 1");
    q.bindValue(":uname", username);
    q.bindValue(":hid", hospitalId);
    if (q.exec() && q.next()) return userFromQuery(q);
    return std::nullopt;
}

bool UserRepository::createUser(User& user, const QString& password) {
    if (user.id.isEmpty()) user.id = generateId();
    QString salt = generateSalt();
    QString hash = hashPassword(password, salt);

    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO users (id, username, email, password_hash, salt, first_name, last_name,
            function, role, hospital_id, is_physician, can_add_treatments,
            can_modify_treatments, can_delete_treatments, password_changed, dedicated_nurse_id, auth_method)
        VALUES (:id, :username, :email, :hash, :salt, :fn, :ln,
            :func, :role, :hid, :phys, :add, :mod, :del, :pwc, :nurse, :auth)
    )");

    q.bindValue(":id", user.id);
    q.bindValue(":username", user.username);
    q.bindValue(":email", user.email);
    q.bindValue(":hash", hash);
    q.bindValue(":salt", salt);
    q.bindValue(":fn", user.first_name);
    q.bindValue(":ln", user.last_name);
    q.bindValue(":func", user.function);
    q.bindValue(":role", roleToString(user.role));
    q.bindValue(":hid", user.hospital_id);
    q.bindValue(":phys", user.permissions.is_physician ? 1 : 0);
    q.bindValue(":add", user.permissions.can_add_treatments ? 1 : 0);
    q.bindValue(":mod", user.permissions.can_modify_treatments ? 1 : 0);
    q.bindValue(":del", user.permissions.can_delete_treatments ? 1 : 0);
    q.bindValue(":pwc", user.password_changed ? 1 : 0);
    q.bindValue(":nurse", user.dedicated_nurse_id);
    q.bindValue(":auth", "local");

    if (!q.exec()) {
        qDebug() << "Failed to create user:" << q.lastError().text();
        return false;
    }

    emit userCreated(user.id);
    return true;
}

bool UserRepository::updateUser(const User& user) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        UPDATE users SET username = :username, email = :email, first_name = :fn,
            last_name = :ln, function = :func, role = :role, hospital_id = :hid,
            is_physician = :phys, can_add_treatments = :add,
            can_modify_treatments = :mod, can_delete_treatments = :del,
            dedicated_nurse_id = :nurse, updated_at = datetime('now')
        WHERE id = :id
    )");

    q.bindValue(":id", user.id);
    q.bindValue(":username", user.username);
    q.bindValue(":email", user.email);
    q.bindValue(":fn", user.first_name);
    q.bindValue(":ln", user.last_name);
    q.bindValue(":func", user.function);
    q.bindValue(":role", roleToString(user.role));
    q.bindValue(":hid", user.hospital_id);
    q.bindValue(":phys", user.permissions.is_physician ? 1 : 0);
    q.bindValue(":add", user.permissions.can_add_treatments ? 1 : 0);
    q.bindValue(":mod", user.permissions.can_modify_treatments ? 1 : 0);
    q.bindValue(":del", user.permissions.can_delete_treatments ? 1 : 0);
    q.bindValue(":nurse", user.dedicated_nurse_id);

    if (!q.exec()) {
        qDebug() << "Failed to update user:" << q.lastError().text();
        return false;
    }

    emit userUpdated(user.id);
    return true;
}

bool UserRepository::updatePassword(const QString& userId, const QString& newPassword) {
    QString salt = generateSalt();
    QString hash = hashPassword(newPassword, salt);

    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE users SET password_hash = :hash, salt = :salt, password_changed = 1, updated_at = datetime('now') WHERE id = :id");
    q.bindValue(":hash", hash);
    q.bindValue(":salt", salt);
    q.bindValue(":id", userId);
    return q.exec();
}

bool UserRepository::deleteUser(const QString& userId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = :id");
    q.bindValue(":id", userId);
    if (!q.exec()) return false;
    emit userDeleted(userId);
    return true;
}

bool UserRepository::setPasswordChanged(const QString& userId, bool changed) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE users SET password_changed = :pc WHERE id = :id");
    q.bindValue(":pc", changed ? 1 : 0);
    q.bindValue(":id", userId);
    return q.exec();
}

bool UserRepository::updateLastLogin(const QString& userId) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE users SET last_login = datetime('now') WHERE id = :id");
    q.bindValue(":id", userId);
    return q.exec();
}

bool UserRepository::verifyPassword(const QString& username, const QString& hospitalId, const QString& password) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT password_hash, salt FROM users WHERE username = :uname AND hospital_id = :hid AND is_active = 1");
    q.bindValue(":uname", username);
    q.bindValue(":hid", hospitalId);

    if (!q.exec() || !q.next()) return false;

    QString storedHash = q.value("password_hash").toString();
    QString salt = q.value("salt").toString();
    QString computedHash = hashPassword(password, salt);

    return storedHash == computedHash;
}

int UserRepository::getRecentLoginAttempts(const QString& identifier, int minutesWindow) const {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        SELECT COUNT(*) FROM login_attempts
        WHERE identifier = :id AND attempted_at > datetime('now', :window)
    )");
    q.bindValue(":id", identifier);
    q.bindValue(":window", QString("-%1 minutes").arg(minutesWindow));
    if (q.exec() && q.next()) return q.value(0).toInt();
    return 0;
}

void UserRepository::recordLoginAttempt(const QString& identifier) {
    QSqlQuery q(Database::instance().db());
    q.prepare("INSERT INTO login_attempts (identifier) VALUES (:id)");
    q.bindValue(":id", identifier);
    q.exec();
}

void UserRepository::clearOldLoginAttempts(int olderThanMinutes) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', :window)");
    q.bindValue(":window", QString("-%1 minutes").arg(olderThanMinutes));
    q.exec();
}

// Hospital operations

QList<Hospital> UserRepository::getAllHospitals(bool activeOnly) const {
    QSqlQuery q(Database::instance().db());
    if (activeOnly)
        q.prepare("SELECT * FROM hospitals WHERE is_active = 1 ORDER BY display_order, name");
    else
        q.prepare("SELECT * FROM hospitals ORDER BY display_order, name");

    QList<Hospital> hospitals;
    if (q.exec()) {
        while (q.next()) {
            Hospital h;
            h.id = q.value("id").toString();
            h.name = q.value("name").toString();
            h.slug = q.value("slug").toString();
            h.logo_url = q.value("logo_url").toString();
            h.branding.primary_color = QColor(q.value("branding_color").toString());
            h.is_active = q.value("is_active").toBool();
            h.default_language = q.value("default_language").toString();
            h.display_order = q.value("display_order").toInt();
            h.created_at = QDateTime::fromString(q.value("created_at").toString(), Qt::ISODate);
            h.updated_at = QDateTime::fromString(q.value("updated_at").toString(), Qt::ISODate);
            hospitals << h;
        }
    }
    return hospitals;
}

std::optional<Hospital> UserRepository::getHospitalById(const QString& id) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM hospitals WHERE id = :id");
    q.bindValue(":id", id);
    if (q.exec() && q.next()) {
        Hospital h;
        h.id = q.value("id").toString();
        h.name = q.value("name").toString();
        h.slug = q.value("slug").toString();
        h.logo_url = q.value("logo_url").toString();
        h.branding.primary_color = QColor(q.value("branding_color").toString());
        h.is_active = q.value("is_active").toBool();
        h.default_language = q.value("default_language").toString();
        h.display_order = q.value("display_order").toInt();
        return h;
    }
    return std::nullopt;
}

std::optional<Hospital> UserRepository::getHospitalBySlug(const QString& slug) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM hospitals WHERE slug = :slug");
    q.bindValue(":slug", slug);
    if (q.exec() && q.next()) {
        Hospital h;
        h.id = q.value("id").toString();
        h.name = q.value("name").toString();
        h.slug = q.value("slug").toString();
        h.branding.primary_color = QColor(q.value("branding_color").toString());
        h.is_active = q.value("is_active").toBool();
        h.default_language = q.value("default_language").toString();
        return h;
    }
    return std::nullopt;
}

bool UserRepository::createHospital(Hospital& hospital) {
    if (hospital.id.isEmpty()) hospital.id = generateId();

    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO hospitals (id, name, slug, logo_url, branding_color, is_active, default_language, display_order)
        VALUES (:id, :name, :slug, :logo, :color, :active, :lang, :order)
    )");
    q.bindValue(":id", hospital.id);
    q.bindValue(":name", hospital.name);
    q.bindValue(":slug", hospital.slug);
    q.bindValue(":logo", hospital.logo_url);
    q.bindValue(":color", hospital.branding.primary_color.name());
    q.bindValue(":active", hospital.is_active ? 1 : 0);
    q.bindValue(":lang", hospital.default_language);
    q.bindValue(":order", hospital.display_order);

    return q.exec();
}

bool UserRepository::updateHospital(const Hospital& hospital) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        UPDATE hospitals SET name = :name, slug = :slug, logo_url = :logo,
            branding_color = :color, is_active = :active, default_language = :lang,
            display_order = :order, updated_at = datetime('now')
        WHERE id = :id
    )");
    q.bindValue(":id", hospital.id);
    q.bindValue(":name", hospital.name);
    q.bindValue(":slug", hospital.slug);
    q.bindValue(":logo", hospital.logo_url);
    q.bindValue(":color", hospital.branding.primary_color.name());
    q.bindValue(":active", hospital.is_active ? 1 : 0);
    q.bindValue(":lang", hospital.default_language);
    q.bindValue(":order", hospital.display_order);
    return q.exec();
}

bool UserRepository::deleteHospital(const QString& id) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM hospitals WHERE id = :id");
    q.bindValue(":id", id);
    return q.exec();
}

QStringList UserRepository::getEnabledDisciplines(const QString& hospitalId) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT disease_area FROM hospital_disciplines WHERE hospital_id = :hid AND is_enabled = 1");
    q.bindValue(":hid", hospitalId);
    QStringList disciplines;
    if (q.exec()) {
        while (q.next()) disciplines << q.value(0).toString();
    }
    return disciplines;
}

bool UserRepository::setDisciplineEnabled(const QString& hospitalId, const QString& diseaseArea, bool enabled) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO hospital_disciplines (id, hospital_id, disease_area, is_enabled)
        VALUES (:id, :hid, :da, :en)
        ON CONFLICT(hospital_id, disease_area) DO UPDATE SET is_enabled = :en2
    )");
    q.bindValue(":id", generateId());
    q.bindValue(":hid", hospitalId);
    q.bindValue(":da", diseaseArea);
    q.bindValue(":en", enabled ? 1 : 0);
    q.bindValue(":en2", enabled ? 1 : 0);
    return q.exec();
}

QList<HospitalDoctor> UserRepository::getHospitalStaff(const QString& hospitalId, const QString& staffType) const {
    QSqlQuery q(Database::instance().db());
    if (staffType.isEmpty()) {
        q.prepare("SELECT * FROM hospital_doctors WHERE hospital_id = :hid AND is_active = 1 ORDER BY display_order, name");
    } else {
        q.prepare("SELECT * FROM hospital_doctors WHERE hospital_id = :hid AND staff_type = :st AND is_active = 1 ORDER BY display_order, name");
        q.bindValue(":st", staffType);
    }
    q.bindValue(":hid", hospitalId);

    QList<HospitalDoctor> staff;
    if (q.exec()) {
        while (q.next()) {
            HospitalDoctor d;
            d.id = q.value("id").toString();
            d.hospital_id = q.value("hospital_id").toString();
            d.name = q.value("name").toString();
            d.staff_type = q.value("staff_type").toString();
            d.specialization = q.value("specialization").toString();
            d.display_order = q.value("display_order").toInt();
            d.is_active = q.value("is_active").toBool();
            staff << d;
        }
    }
    return staff;
}

bool UserRepository::addHospitalStaff(HospitalDoctor& doctor) {
    if (doctor.id.isEmpty()) doctor.id = generateId();
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        INSERT INTO hospital_doctors (id, hospital_id, name, staff_type, specialization, display_order)
        VALUES (:id, :hid, :name, :type, :spec, :order)
    )");
    q.bindValue(":id", doctor.id);
    q.bindValue(":hid", doctor.hospital_id);
    q.bindValue(":name", doctor.name);
    q.bindValue(":type", doctor.staff_type);
    q.bindValue(":spec", doctor.specialization);
    q.bindValue(":order", doctor.display_order);
    return q.exec();
}

bool UserRepository::updateHospitalStaff(const HospitalDoctor& doctor) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        UPDATE hospital_doctors SET name = :name, staff_type = :type,
            specialization = :spec, display_order = :order, is_active = :active
        WHERE id = :id
    )");
    q.bindValue(":id", doctor.id);
    q.bindValue(":name", doctor.name);
    q.bindValue(":type", doctor.staff_type);
    q.bindValue(":spec", doctor.specialization);
    q.bindValue(":order", doctor.display_order);
    q.bindValue(":active", doctor.is_active ? 1 : 0);
    return q.exec();
}

bool UserRepository::removeHospitalStaff(const QString& id) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE hospital_doctors SET is_active = 0 WHERE id = :id");
    q.bindValue(":id", id);
    return q.exec();
}

bool UserRepository::ensureDefaultAdmin(const QString& hospitalId) {
    // Check if any admin exists for this hospital
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT COUNT(*) FROM users WHERE hospital_id = :hid AND role IN ('admin', 'super_admin') AND is_active = 1");
    q.bindValue(":hid", hospitalId);
    if (q.exec() && q.next() && q.value(0).toInt() > 0)
        return true;  // Admin already exists

    // Create default admin
    User admin;
    admin.username = "admin";
    admin.email = "admin@oncoinfo.local";
    admin.first_name = "System";
    admin.last_name = "Administrator";
    admin.function = "overige";
    admin.role = UserRole::Admin;
    admin.hospital_id = hospitalId;
    admin.permissions.can_add_treatments = true;
    admin.permissions.can_modify_treatments = true;
    admin.permissions.can_delete_treatments = true;

    return createUser(admin, "OncoInfo2024!");
}

} // namespace OncoInfo
