#include "LoginDialog.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/UserRepository.h"
#include "core/SettingsManager.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QPixmap>
#include <QFont>
#include <QSpacerItem>

namespace OncoInfo {

LoginDialog::LoginDialog(QWidget* parent)
    : QDialog(parent)
{
    setObjectName("loginDialog");
    setWindowTitle("OncoInfo - Medicijnbibliotheek");
    setFixedSize(440, 580);
    setWindowFlags(windowFlags() & ~Qt::WindowContextHelpButtonHint);

    setupUi();
    loadHospitals();

    // Connect auth signals
    connect(&AuthManager::instance(), &AuthManager::loginSucceeded, this, [this](const User&) {
        accept();
    });
    connect(&AuthManager::instance(), &AuthManager::loginFailed, this, [this](const QString& reason) {
        showError(reason);
        m_loginButton->setEnabled(true);
        m_loginButton->setText(TR("auth.login"));
    });
}

void LoginDialog::setupUi() {
    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(16);
    mainLayout->setContentsMargins(40, 30, 40, 30);

    // Logo / Title
    m_titleLabel = new QLabel("OncoInfo");
    m_titleLabel->setAlignment(Qt::AlignCenter);
    QFont titleFont;
    titleFont.setPointSize(28);
    titleFont.setBold(true);
    m_titleLabel->setFont(titleFont);
    m_titleLabel->setStyleSheet("color: #6b2d5b; margin-bottom: 4px;");
    mainLayout->addWidget(m_titleLabel);

    auto* subtitleLabel = new QLabel(TR("auth.loginDescription"));
    subtitleLabel->setAlignment(Qt::AlignCenter);
    subtitleLabel->setStyleSheet("color: #8b7090; font-size: 13px; margin-bottom: 16px;");
    mainLayout->addWidget(subtitleLabel);

    // Form
    auto* formLayout = new QFormLayout();
    formLayout->setSpacing(12);
    formLayout->setLabelAlignment(Qt::AlignLeft);

    // Hospital selector
    m_hospitalCombo = new QComboBox();
    m_hospitalCombo->setMinimumHeight(38);
    m_hospitalCombo->setPlaceholderText(TR("auth.selectHospital"));
    formLayout->addRow(TR("auth.hospital"), m_hospitalCombo);

    // Username
    m_usernameEdit = new QLineEdit();
    m_usernameEdit->setMinimumHeight(38);
    m_usernameEdit->setPlaceholderText(TR("auth.usernamePlaceholder"));
    formLayout->addRow(TR("auth.username"), m_usernameEdit);

    // Password
    m_passwordEdit = new QLineEdit();
    m_passwordEdit->setEchoMode(QLineEdit::Password);
    m_passwordEdit->setMinimumHeight(38);
    m_passwordEdit->setPlaceholderText("********");
    formLayout->addRow(TR("auth.password"), m_passwordEdit);

    mainLayout->addLayout(formLayout);

    // Error label
    m_errorLabel = new QLabel();
    m_errorLabel->setStyleSheet("color: #dc2626; font-size: 12px; padding: 4px;");
    m_errorLabel->setWordWrap(true);
    m_errorLabel->hide();
    mainLayout->addWidget(m_errorLabel);

    // Login button
    m_loginButton = new QPushButton(TR("auth.login"));
    m_loginButton->setObjectName("primaryButton");
    m_loginButton->setMinimumHeight(44);
    m_loginButton->setCursor(Qt::PointingHandCursor);
    mainLayout->addWidget(m_loginButton);

    // Domain login button (Windows AD)
    m_domainLoginButton = new QPushButton(TR("auth.login") + " (Windows)");
    m_domainLoginButton->setObjectName("secondaryButton");
    m_domainLoginButton->setMinimumHeight(38);
    m_domainLoginButton->setCursor(Qt::PointingHandCursor);
    m_domainLoginButton->setToolTip("Log in with your Windows domain account");
#ifndef Q_OS_WIN
    m_domainLoginButton->hide();  // Only show on Windows
#endif
    mainLayout->addWidget(m_domainLoginButton);

    mainLayout->addStretch();

    // Language selector at bottom
    auto* langLayout = new QHBoxLayout();
    langLayout->addStretch();
    m_languageCombo = new QComboBox();
    m_languageCombo->setFixedWidth(140);
    auto& tm = TranslationManager::instance();
    for (const auto& lang : tm.availableLanguages()) {
        m_languageCombo->addItem(tm.languageName(lang), lang);
    }
    // Set current language
    int idx = m_languageCombo->findData(tm.currentLanguage());
    if (idx >= 0) m_languageCombo->setCurrentIndex(idx);
    langLayout->addWidget(m_languageCombo);
    langLayout->addStretch();
    mainLayout->addLayout(langLayout);

    // Disclaimer
    auto* disclaimerLabel = new QLabel(TR("footer.disclaimer"));
    disclaimerLabel->setWordWrap(true);
    disclaimerLabel->setAlignment(Qt::AlignCenter);
    disclaimerLabel->setStyleSheet("color: #9ca3af; font-size: 10px; margin-top: 8px;");
    mainLayout->addWidget(disclaimerLabel);

    // Connections
    connect(m_loginButton, &QPushButton::clicked, this, &LoginDialog::onLoginClicked);
    connect(m_domainLoginButton, &QPushButton::clicked, this, &LoginDialog::onDomainLoginClicked);
    connect(m_languageCombo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &LoginDialog::onLanguageChanged);
    connect(m_hospitalCombo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &LoginDialog::onHospitalChanged);
    connect(m_passwordEdit, &QLineEdit::returnPressed, this, &LoginDialog::onLoginClicked);
    connect(m_usernameEdit, &QLineEdit::returnPressed, [this]() { m_passwordEdit->setFocus(); });

    // Restore last used values
    auto& settings = SettingsManager::instance();
    m_usernameEdit->setText(settings.lastUsername());

    // Set initial focus
    if (m_usernameEdit->text().isEmpty())
        m_usernameEdit->setFocus();
    else
        m_passwordEdit->setFocus();
}

void LoginDialog::loadHospitals() {
    UserRepository repo;
    auto hospitals = repo.getAllHospitals(true);

    m_hospitalCombo->clear();
    for (const auto& h : hospitals) {
        m_hospitalCombo->addItem(h.name, h.id);
    }

    // Restore last hospital
    QString lastId = SettingsManager::instance().lastHospitalId();
    if (!lastId.isEmpty()) {
        int idx = m_hospitalCombo->findData(lastId);
        if (idx >= 0) m_hospitalCombo->setCurrentIndex(idx);
    }
}

void LoginDialog::onLoginClicked() {
    QString username = m_usernameEdit->text().trimmed();
    QString password = m_passwordEdit->text();
    QString hospitalId = m_hospitalCombo->currentData().toString();

    if (username.isEmpty() || password.isEmpty() || hospitalId.isEmpty()) {
        showError(TR("auth.loginFailed"));
        return;
    }

    m_errorLabel->hide();
    m_loginButton->setEnabled(false);
    m_loginButton->setText(TR("common.loading"));

    AuthManager::instance().login(username, password, hospitalId);
}

void LoginDialog::onDomainLoginClicked() {
    m_errorLabel->hide();
    m_domainLoginButton->setEnabled(false);
    AuthManager::instance().loginWithDomain();
    m_domainLoginButton->setEnabled(true);
}

void LoginDialog::onLanguageChanged(int index) {
    QString langCode = m_languageCombo->itemData(index).toString();
    TranslationManager::instance().setLanguage(langCode);
    SettingsManager::instance().setLanguage(langCode);

    // Refresh UI labels
    m_titleLabel->setText("OncoInfo");
    m_loginButton->setText(TR("auth.login"));
    // Full refresh would require re-setup, keeping simple for now
}

void LoginDialog::onHospitalChanged(int /*index*/) {
    // Could update language based on hospital default
}

void LoginDialog::showError(const QString& message) {
    m_errorLabel->setText(message);
    m_errorLabel->show();
}

} // namespace OncoInfo
