#pragma once

#include <QObject>
#include <QString>
#include <QList>
#include <optional>
#include "models/User.h"
#include "models/Hospital.h"

namespace OncoInfo {

class UserRepository : public QObject {
    Q_OBJECT

public:
    explicit UserRepository(QObject* parent = nullptr);

    // User CRUD
    QList<User> getAllUsers(const QString& hospitalId = QString()) const;
    std::optional<User> getUserById(const QString& id) const;
    std::optional<User> getUserByUsername(const QString& username, const QString& hospitalId) const;
    bool createUser(User& user, const QString& password);
    bool updateUser(const User& user);
    bool updatePassword(const QString& userId, const QString& newPassword);
    bool deleteUser(const QString& userId);
    bool setPasswordChanged(const QString& userId, bool changed);
    bool updateLastLogin(const QString& userId);

    // Hospital CRUD
    QList<Hospital> getAllHospitals(bool activeOnly = true) const;
    std::optional<Hospital> getHospitalById(const QString& id) const;
    std::optional<Hospital> getHospitalBySlug(const QString& slug) const;
    bool createHospital(Hospital& hospital);
    bool updateHospital(const Hospital& hospital);
    bool deleteHospital(const QString& id);

    // Hospital disciplines
    QStringList getEnabledDisciplines(const QString& hospitalId) const;
    bool setDisciplineEnabled(const QString& hospitalId, const QString& diseaseArea, bool enabled);

    // Hospital staff
    QList<HospitalDoctor> getHospitalStaff(const QString& hospitalId, const QString& staffType = QString()) const;
    bool addHospitalStaff(HospitalDoctor& doctor);
    bool updateHospitalStaff(const HospitalDoctor& doctor);
    bool removeHospitalStaff(const QString& id);

    // Password verification
    bool verifyPassword(const QString& username, const QString& hospitalId, const QString& password) const;

    // Rate limiting
    int getRecentLoginAttempts(const QString& identifier, int minutesWindow = 15) const;
    void recordLoginAttempt(const QString& identifier);
    void clearOldLoginAttempts(int olderThanMinutes = 60);

    // Seed default admin
    bool ensureDefaultAdmin(const QString& hospitalId);

signals:
    void userCreated(const QString& userId);
    void userUpdated(const QString& userId);
    void userDeleted(const QString& userId);

private:
    User userFromQuery(const QSqlQuery& q) const;
    QString hashPassword(const QString& password, const QString& salt) const;
    QString generateSalt() const;
    QString generateId() const;
};

} // namespace OncoInfo
