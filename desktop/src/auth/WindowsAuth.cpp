#include "WindowsAuth.h"

#ifdef Q_OS_WIN
#include <windows.h>
#include <lm.h>
#include <security.h>
#include <sddl.h>
#pragma comment(lib, "Secur32.lib")
#pragma comment(lib, "Netapi32.lib")
#endif

#include <QProcessEnvironment>
#include <QDebug>

namespace OncoInfo {

WindowsAuth::WindowsAuth() {}

QString WindowsAuth::getCurrentDomainUser() const {
#ifdef Q_OS_WIN
    WCHAR buffer[256];
    DWORD size = 256;
    if (GetUserNameExW(NameSamCompatible, buffer, &size)) {
        return QString::fromWCharArray(buffer, size - 1);
    }
#endif
    // Fallback: use environment variables
    auto env = QProcessEnvironment::systemEnvironment();
    QString domain = env.value("USERDOMAIN", "");
    QString user = env.value("USERNAME", "");
    if (!domain.isEmpty() && !user.isEmpty())
        return domain + "\\" + user;
    return user;
}

QString WindowsAuth::getCurrentUsername() const {
    QString full = getCurrentDomainUser();
    int sep = full.indexOf('\\');
    if (sep >= 0) return full.mid(sep + 1);
    return full;
}

QString WindowsAuth::getCurrentDomain() const {
    QString full = getCurrentDomainUser();
    int sep = full.indexOf('\\');
    if (sep >= 0) return full.left(sep);
    return QString();
}

bool WindowsAuth::validateCredentials(const QString& username, const QString& password, const QString& domain) {
#ifdef Q_OS_WIN
    HANDLE token = nullptr;
    BOOL result = LogonUserW(
        reinterpret_cast<LPCWSTR>(username.utf16()),
        domain.isEmpty() ? nullptr : reinterpret_cast<LPCWSTR>(domain.utf16()),
        reinterpret_cast<LPCWSTR>(password.utf16()),
        LOGON32_LOGON_NETWORK,
        LOGON32_PROVIDER_DEFAULT,
        &token
    );

    if (token) CloseHandle(token);
    return result != 0;
#else
    Q_UNUSED(username);
    Q_UNUSED(password);
    Q_UNUSED(domain);
    qDebug() << "Windows domain auth not available on this platform";
    return false;
#endif
}

bool WindowsAuth::isDomainJoined() const {
#ifdef Q_OS_WIN
    LPWSTR nameBuffer = nullptr;
    NETSETUP_JOIN_STATUS status;
    NET_API_STATUS nStatus = NetGetJoinInformation(nullptr, &nameBuffer, &status);
    if (nameBuffer) NetApiBufferFree(nameBuffer);
    return (nStatus == NERR_Success && status == NetSetupDomainName);
#else
    return false;
#endif
}

QString WindowsAuth::getDisplayName(const QString& username) const {
#ifdef Q_OS_WIN
    Q_UNUSED(username);
    WCHAR buffer[256];
    DWORD size = 256;
    if (GetUserNameExW(NameDisplay, buffer, &size)) {
        return QString::fromWCharArray(buffer, size - 1);
    }
#else
    Q_UNUSED(username);
#endif
    return QString();
}

QString WindowsAuth::getEmail(const QString& username) const {
#ifdef Q_OS_WIN
    Q_UNUSED(username);
    WCHAR buffer[256];
    DWORD size = 256;
    if (GetUserNameExW(NameUserPrincipal, buffer, &size)) {
        return QString::fromWCharArray(buffer, size - 1);
    }
#else
    Q_UNUSED(username);
#endif
    return QString();
}

} // namespace OncoInfo
