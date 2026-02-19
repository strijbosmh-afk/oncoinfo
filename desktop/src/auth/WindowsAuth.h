#pragma once

#include <QString>

namespace OncoInfo {

/**
 * Windows Active Directory integration via SSPI/LDAP.
 * Allows hospital users to authenticate with their Windows domain credentials.
 *
 * This solves the Supabase access problem:
 * - No external cloud service needed
 * - Uses existing hospital infrastructure (Active Directory)
 * - Works within hospital network without internet
 * - Automatic SSO when the app starts
 */
class WindowsAuth {
public:
    WindowsAuth();

    // Get current Windows domain user (DOMAIN\username)
    QString getCurrentDomainUser() const;

    // Get just the username part
    QString getCurrentUsername() const;

    // Get the domain name
    QString getCurrentDomain() const;

    // Validate credentials against Active Directory
    bool validateCredentials(const QString& username, const QString& password, const QString& domain = QString());

    // Check if machine is domain-joined
    bool isDomainJoined() const;

    // Get display name from AD
    QString getDisplayName(const QString& username) const;

    // Get email from AD
    QString getEmail(const QString& username) const;
};

} // namespace OncoInfo
