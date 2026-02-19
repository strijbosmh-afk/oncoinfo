#include "AuthManager.h"
#include "WindowsAuth.h"
#include "core/UserRepository.h"
#include "core/AuditLogger.h"
#include "core/SettingsManager.h"
#include <QDebug>

namespace OncoInfo {

AuthManager& AuthManager::instance() {
    static AuthManager mgr;
    return mgr;
}

AuthManager::AuthManager() : QObject(nullptr) {}

bool AuthManager::login(const QString& username, const QString& password, const QString& hospitalId) {
    UserRepository repo;

    // Rate limiting check
    if (isRateLimited(username, hospitalId)) {
        emit loginFailed(tr("Too many login attempts. Please wait 15 minutes."));
        return false;
    }

    // Record the attempt
    QString identifier = username + ":" + hospitalId;
    repo.recordLoginAttempt(identifier);

    // Verify credentials
    if (!repo.verifyPassword(username, hospitalId, password)) {
        emit loginFailed(tr("Username or password is incorrect."));
        return false;
    }

    // Get user profile
    auto userOpt = repo.getUserByUsername(username, hospitalId);
    if (!userOpt) {
        emit loginFailed(tr("User account not found."));
        return false;
    }

    m_currentUser = *userOpt;

    // Get hospital info
    auto hospitalOpt = repo.getHospitalById(hospitalId);
    if (hospitalOpt) {
        m_currentHospital = *hospitalOpt;
    }

    // Update last login
    repo.updateLastLogin(m_currentUser.id);

    m_isLoggedIn = true;

    // Save last login info
    SettingsManager::instance().setLastHospitalId(hospitalId);
    SettingsManager::instance().setLastUsername(username);

    // Audit log
    AuditLogger::instance().logLogin(m_currentUser);

    emit loginSucceeded(m_currentUser);

    // Check if password change needed
    if (!m_currentUser.password_changed) {
        emit passwordChangeRequired();
    }

    return true;
}

bool AuthManager::loginWithDomain() {
#ifdef Q_OS_WIN
    WindowsAuth winAuth;
    QString domainUser = winAuth.getCurrentDomainUser();

    if (domainUser.isEmpty()) {
        emit loginFailed(tr("Could not determine Windows domain user."));
        return false;
    }

    // Look up user by domain username
    UserRepository repo;
    // Try to find user with matching domain_username across all hospitals
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM users WHERE domain_username = :du AND is_active = 1");
    q.bindValue(":du", domainUser);

    if (q.exec() && q.next()) {
        // User found - proceed with login
        auto userOpt = repo.getUserById(q.value("id").toString());
        if (userOpt) {
            m_currentUser = *userOpt;
            auto hospitalOpt = repo.getHospitalById(m_currentUser.hospital_id);
            if (hospitalOpt) m_currentHospital = *hospitalOpt;

            repo.updateLastLogin(m_currentUser.id);
            m_isLoggedIn = true;

            AuditLogger::instance().logLogin(m_currentUser);
            emit loginSucceeded(m_currentUser);
            return true;
        }
    }

    emit loginFailed(tr("No OncoInfo account linked to your Windows account: %1").arg(domainUser));
    return false;
#else
    emit loginFailed(tr("Windows domain authentication is only available on Windows."));
    return false;
#endif
}

void AuthManager::logout() {
    m_currentUser = User();
    m_currentHospital = Hospital();
    m_isLoggedIn = false;
    emit loggedOut();
}

bool AuthManager::changePassword(const QString& oldPassword, const QString& newPassword) {
    if (!m_isLoggedIn) return false;

    UserRepository repo;
    if (!repo.verifyPassword(m_currentUser.username, m_currentUser.hospital_id, oldPassword))
        return false;

    if (!repo.updatePassword(m_currentUser.id, newPassword))
        return false;

    m_currentUser.password_changed = true;
    repo.setPasswordChanged(m_currentUser.id, true);

    emit passwordChanged();
    return true;
}

bool AuthManager::isLoggedIn() const { return m_isLoggedIn; }
const User& AuthManager::currentUser() const { return m_currentUser; }
const Hospital& AuthManager::currentHospital() const { return m_currentHospital; }
bool AuthManager::isAdmin() const { return m_isLoggedIn && m_currentUser.isAdmin(); }
bool AuthManager::isSuperAdmin() const { return m_isLoggedIn && m_currentUser.isSuperAdmin(); }
bool AuthManager::canManageDrugs() const { return m_isLoggedIn && m_currentUser.canManageDrugs(); }

bool AuthManager::isRateLimited(const QString& username, const QString& hospitalId) const {
    UserRepository repo;
    QString identifier = username + ":" + hospitalId;
    int attempts = repo.getRecentLoginAttempts(identifier, RATE_LIMIT_WINDOW_MINUTES);
    return attempts >= MAX_LOGIN_ATTEMPTS;
}

} // namespace OncoInfo
