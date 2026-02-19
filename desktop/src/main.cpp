#include <QApplication>
#include <QMessageBox>
#include <QDir>
#include <QDebug>

#include "core/Database.h"
#include "core/UserRepository.h"
#include "core/SettingsManager.h"
#include "auth/AuthManager.h"
#include "i18n/TranslationManager.h"
#include "network/NetworkManager.h"
#include "network/SyncService.h"
#include "ui/LoginDialog.h"
#include "ui/MainWindow.h"
#include "ui/StyleSheet.h"

using namespace OncoInfo;

/**
 * OncoInfo Desktop - Standalone Windows Application
 *
 * Architecture:
 *   - C++ / Qt6 native application
 *   - SQLite embedded database (no external server needed)
 *   - Local authentication (replaces Supabase)
 *   - Optional Windows AD integration for hospital SSO
 *   - Optional network sync when server is available
 *   - Works 100% offline with all core features
 *
 * User Management (solving the Supabase restriction):
 *   1. LOCAL AUTH: Users created by admin in the app, stored in SQLite
 *   2. WINDOWS AD: Optional integration with hospital Active Directory
 *   3. HYBRID: Tries AD first, falls back to local accounts
 *
 * Build:
 *   cmake -B build -DCMAKE_PREFIX_PATH=/path/to/Qt6
 *   cmake --build build --config Release
 */
int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    app.setApplicationName("OncoInfo");
    app.setApplicationVersion("1.0.0");
    app.setOrganizationName("DRMSoftware");
    app.setOrganizationDomain("drmsoftware.com");

    // Set default style
    app.setStyleSheet(StyleSheet::applicationStyle());

    // Initialize database
    if (!Database::instance().initialize()) {
        QMessageBox::critical(nullptr, "Database Error",
            "Failed to initialize the local database.\n"
            "Please check disk space and permissions.");
        return 1;
    }

    // Load translations
    TranslationManager::instance().loadTranslations();
    QString savedLang = SettingsManager::instance().language();
    if (!savedLang.isEmpty()) {
        TranslationManager::instance().setLanguage(savedLang);
    }

    // Ensure at least one hospital exists
    UserRepository userRepo;
    auto hospitals = userRepo.getAllHospitals(false);
    if (hospitals.isEmpty()) {
        // Create a default hospital on first run
        Hospital defaultHospital;
        defaultHospital.name = "My Hospital";
        defaultHospital.slug = "my-hospital";
        defaultHospital.default_language = "nl";
        defaultHospital.branding.primary_color = QColor("#6b2d5b");
        userRepo.createHospital(defaultHospital);

        // Create default admin account
        userRepo.ensureDefaultAdmin(defaultHospital.id);

        qDebug() << "First run: created default hospital and admin account";
        qDebug() << "Default login: admin / OncoInfo2024!";
    } else {
        // Ensure each hospital has an admin
        for (const auto& h : hospitals) {
            userRepo.ensureDefaultAdmin(h.id);
        }
    }

    // Check network connectivity (non-blocking)
    NetworkManager::instance().checkConnectivity();

    // Application loop: login -> main window -> logout -> login again
    while (true) {
        LoginDialog loginDialog;
        if (loginDialog.exec() != QDialog::Accepted) {
            break;  // User closed login dialog
        }

        // Check if password change is needed
        if (!AuthManager::instance().currentUser().password_changed) {
            // Show password change dialog (simplified — would be a dedicated dialog)
            // For now, just proceed
        }

        // Start optional auto-sync
        SyncService::instance().startAutoSync();

        // Show main window
        MainWindow mainWindow;
        mainWindow.show();

        app.exec();

        // Stop sync when main window closes
        SyncService::instance().stopAutoSync();

        // If user logged out (not quit), show login again
        if (!AuthManager::instance().isLoggedIn()) {
            continue;
        }

        break;
    }

    // Cleanup
    Database::instance().close();
    return 0;
}
