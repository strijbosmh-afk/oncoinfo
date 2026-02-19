#include "MainWindow.h"
#include "HomePage.h"
#include "DrugsPage.h"
#include "DrugDetailWidget.h"
#include "AdminPanel.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/SettingsManager.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QStatusBar>
#include <QToolButton>
#include <QMessageBox>

namespace OncoInfo {

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
{
    setWindowTitle("OncoInfo - Medicijnbibliotheek");
    setMinimumSize(1200, 800);
    resize(1400, 900);

    setupUi();
    setupToolBar();
    updateUserInfo();
    refreshStyle();

    // Connect language changes
    connect(&TranslationManager::instance(), &TranslationManager::languageChanged, [this]() {
        updateUserInfo();
    });

    showHomePage();
}

void MainWindow::setupUi() {
    // Central stacked widget for page navigation
    m_centralStack = new QStackedWidget();

    // Create pages
    m_homePage = new HomePage(this);
    m_drugsPage = new DrugsPage(this);
    m_drugDetailWidget = new DrugDetailWidget(this);
    m_adminPanel = new AdminPanel(this);

    m_centralStack->addWidget(m_homePage);
    m_centralStack->addWidget(m_drugsPage);
    m_centralStack->addWidget(m_drugDetailWidget);
    m_centralStack->addWidget(m_adminPanel);

    setCentralWidget(m_centralStack);

    // Connect navigation signals
    connect(m_homePage, &HomePage::categorySelected, this, &MainWindow::showDrugsPage);
    connect(m_homePage, &HomePage::drugSelected, this, &MainWindow::showDrugDetail);
    connect(m_drugsPage, &DrugsPage::drugSelected, this, &MainWindow::showDrugDetail);
    connect(m_drugsPage, &DrugsPage::backRequested, this, &MainWindow::showHomePage);
    connect(m_drugDetailWidget, &DrugDetailWidget::backRequested, [this]() {
        m_centralStack->setCurrentWidget(m_drugsPage);
    });

    // Status bar
    statusBar()->showMessage(TR("footer.disclaimer"));
}

void MainWindow::setupToolBar() {
    m_headerBar = new QToolBar("Header");
    m_headerBar->setObjectName("headerBar");
    m_headerBar->setMovable(false);
    m_headerBar->setFloatable(false);
    addToolBar(Qt::TopToolBarArea, m_headerBar);

    // Logo/title
    m_logoLabel = new QLabel("  OncoInfo  ");
    QFont logoFont;
    logoFont.setPointSize(16);
    logoFont.setBold(true);
    m_logoLabel->setFont(logoFont);
    m_headerBar->addWidget(m_logoLabel);

    m_headerBar->addSeparator();

    // Navigation buttons
    m_homeButton = new QPushButton(TR("home.chooseSpecialty"));
    m_homeButton->setFlat(true);
    m_homeButton->setStyleSheet("color: white; font-weight: bold; padding: 6px 12px;");
    m_homeButton->setCursor(Qt::PointingHandCursor);
    connect(m_homeButton, &QPushButton::clicked, this, &MainWindow::onNavigateHome);
    m_headerBar->addWidget(m_homeButton);

    m_drugsButton = new QPushButton(TR("nav.drugs"));
    m_drugsButton->setFlat(true);
    m_drugsButton->setStyleSheet("color: white; padding: 6px 12px;");
    m_drugsButton->setCursor(Qt::PointingHandCursor);
    connect(m_drugsButton, &QPushButton::clicked, [this]() { showDrugsPage(); });
    m_headerBar->addWidget(m_drugsButton);

    // Admin button (visible only for admins)
    m_adminButton = new QPushButton(TR("nav.admin"));
    m_adminButton->setFlat(true);
    m_adminButton->setStyleSheet("color: white; padding: 6px 12px;");
    m_adminButton->setCursor(Qt::PointingHandCursor);
    connect(m_adminButton, &QPushButton::clicked, this, &MainWindow::showAdminPanel);
    m_headerBar->addWidget(m_adminButton);

    // Spacer
    auto* spacer = new QWidget();
    spacer->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    m_headerBar->addWidget(spacer);

    // Language selector
    m_langCombo = new QComboBox();
    m_langCombo->setStyleSheet("QComboBox { color: white; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 2px 8px; }");
    auto& tm = TranslationManager::instance();
    for (const auto& lang : tm.availableLanguages()) {
        m_langCombo->addItem(tm.languageName(lang), lang);
    }
    int langIdx = m_langCombo->findData(tm.currentLanguage());
    if (langIdx >= 0) m_langCombo->setCurrentIndex(langIdx);
    connect(m_langCombo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &MainWindow::onLanguageChanged);
    m_headerBar->addWidget(m_langCombo);

    // User info
    m_userLabel = new QLabel();
    m_headerBar->addWidget(m_userLabel);

    m_roleLabel = new QLabel();
    m_roleLabel->setStyleSheet("color: rgba(255,255,255,0.8); font-size: 11px; margin-left: 4px;");
    m_headerBar->addWidget(m_roleLabel);

    // Logout button
    m_logoutButton = new QPushButton(TR("auth.logout"));
    m_logoutButton->setFlat(true);
    m_logoutButton->setStyleSheet("color: white; padding: 6px 12px; font-weight: bold;");
    m_logoutButton->setCursor(Qt::PointingHandCursor);
    connect(m_logoutButton, &QPushButton::clicked, this, &MainWindow::onLogout);
    m_headerBar->addWidget(m_logoutButton);
}

void MainWindow::updateUserInfo() {
    const auto& user = AuthManager::instance().currentUser();
    const auto& hospital = AuthManager::instance().currentHospital();

    m_userLabel->setText("  " + user.displayName() + "  ");
    m_roleLabel->setText("[" + TR("roles." + roleToString(user.role)) + "]");

    // Show/hide admin button
    m_adminButton->setVisible(user.canManageDrugs());

    // Update window title with hospital name
    if (!hospital.name.isEmpty()) {
        setWindowTitle("OncoInfo - " + hospital.name);
    }
}

void MainWindow::refreshStyle() {
    const auto& hospital = AuthManager::instance().currentHospital();
    QColor primaryColor = hospital.branding.primary_color.isValid()
        ? hospital.branding.primary_color
        : QColor("#6b2d5b");
    setStyleSheet(StyleSheet::applicationStyle(primaryColor));
}

void MainWindow::showHomePage() {
    m_homePage->refresh();
    m_centralStack->setCurrentWidget(m_homePage);
}

void MainWindow::showDrugsPage(const QString& category) {
    m_drugsPage->setCategory(category);
    m_centralStack->setCurrentWidget(m_drugsPage);
}

void MainWindow::showDrugDetail(const QString& drugId) {
    m_drugDetailWidget->loadDrug(drugId);
    m_centralStack->setCurrentWidget(m_drugDetailWidget);
}

void MainWindow::showAdminPanel() {
    m_adminPanel->refresh();
    m_centralStack->setCurrentWidget(m_adminPanel);
}

void MainWindow::onLogout() {
    AuthManager::instance().logout();
    close();
}

void MainWindow::onNavigateHome() {
    showHomePage();
}

void MainWindow::onLanguageChanged(int index) {
    QString lang = m_langCombo->itemData(index).toString();
    TranslationManager::instance().setLanguage(lang);
    SettingsManager::instance().setLanguage(lang);
}

} // namespace OncoInfo
