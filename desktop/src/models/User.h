#pragma once

#include <QString>
#include <QDateTime>

namespace OncoInfo {

enum class UserRole {
    Viewer,
    Admin,
    Apotheker,   // Pharmacist
    SuperAdmin,
    Arts,        // Physician
    Verpleegkundige  // Nurse
};

inline QString roleToString(UserRole role) {
    switch (role) {
        case UserRole::Viewer: return "viewer";
        case UserRole::Admin: return "admin";
        case UserRole::Apotheker: return "apotheker";
        case UserRole::SuperAdmin: return "super_admin";
        case UserRole::Arts: return "arts";
        case UserRole::Verpleegkundige: return "verpleegkundige";
    }
    return "viewer";
}

inline UserRole roleFromString(const QString& s) {
    if (s == "admin") return UserRole::Admin;
    if (s == "apotheker") return UserRole::Apotheker;
    if (s == "super_admin") return UserRole::SuperAdmin;
    if (s == "arts") return UserRole::Arts;
    if (s == "verpleegkundige") return UserRole::Verpleegkundige;
    return UserRole::Viewer;
}

struct UserPermissions {
    bool is_physician = false;
    bool can_add_treatments = false;
    bool can_modify_treatments = false;
    bool can_delete_treatments = false;
};

struct User {
    QString id;
    QString username;
    QString email;
    QString first_name;
    QString last_name;
    QString function;       // arts, apotheker, verpleegkundige, overige
    UserRole role = UserRole::Viewer;
    UserPermissions permissions;
    QString hospital_id;
    bool password_changed = false;
    QString dedicated_nurse_id;
    QDateTime created_at;
    QDateTime last_login;

    QString displayName() const {
        if (!first_name.isEmpty() && !last_name.isEmpty())
            return first_name + " " + last_name;
        if (!username.isEmpty()) return username;
        return email;
    }

    bool isAdmin() const {
        return role == UserRole::Admin || role == UserRole::SuperAdmin;
    }

    bool isSuperAdmin() const {
        return role == UserRole::SuperAdmin;
    }

    bool canManageDrugs() const {
        return isAdmin() || role == UserRole::Apotheker;
    }
};

struct AuditEntry {
    QString id;
    QString user_id;
    QString username;
    QString action;       // login, create, update, delete
    QString entity_type;  // drug, user, patient_folder
    QString entity_id;
    QString entity_name;
    QString hospital_id;
    QString details;      // JSON details string
    QDateTime created_at;
};

} // namespace OncoInfo
