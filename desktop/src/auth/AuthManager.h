#pragma once

#include <QObject>
#include <QString>
#include <optional>
#include <memory>
#include "models/User.h"
#include "models/Hospital.h"

namespace OncoInfo {

/**
 * Authentication manager supporting two authentication methods:
 *
 * 1. LOCAL AUTH (default): Username + password stored in local SQLite.
 *    - Works fully offline
 *    - Admin creates accounts locally
 *    - No external service needed
 *
 * 2. WINDOWS DOMAIN AUTH (optional): Integrates with Active Directory via SSPI.
 *    - Users log in with their hospital Windows credentials
 *    - No separate account management needed
 *    - Falls back to local auth if domain unavailable
 *    - Ideal for hospital environments with AD
 *
 * This replaces Supabase Auth entirely, solving the hospital access restriction.
 */
class AuthManager : public QObject {
    Q_OBJECT

public:
    static AuthManager& instance();

    // Authentication
    bool login(const QString& username, const QString& password, const QString& hospitalId);
    bool loginWithDomain();  // Windows AD single sign-on
    void logout();
    bool changePassword(const QString& oldPassword, const QString& newPassword);

    // Session state
    bool isLoggedIn() const;
    const User& currentUser() const;
    const Hospital& currentHospital() const;
    bool isAdmin() const;
    bool isSuperAdmin() const;
    bool canManageDrugs() const;

    // Rate limiting
    bool isRateLimited(const QString& username, const QString& hospitalId) const;

signals:
    void loginSucceeded(const User& user);
    void loginFailed(const QString& reason);
    void loggedOut();
    void passwordChanged();
    void passwordChangeRequired();

private:
    AuthManager();
    AuthManager(const AuthManager&) = delete;

    User m_currentUser;
    Hospital m_currentHospital;
    bool m_isLoggedIn = false;

    static const int MAX_LOGIN_ATTEMPTS = 5;
    static const int RATE_LIMIT_WINDOW_MINUTES = 15;
};

} // namespace OncoInfo
