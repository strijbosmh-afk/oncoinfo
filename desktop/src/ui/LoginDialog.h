#pragma once

#include <QDialog>
#include <QLineEdit>
#include <QComboBox>
#include <QPushButton>
#include <QLabel>

namespace OncoInfo {

class LoginDialog : public QDialog {
    Q_OBJECT

public:
    explicit LoginDialog(QWidget* parent = nullptr);

private slots:
    void onLoginClicked();
    void onDomainLoginClicked();
    void onLanguageChanged(int index);
    void onHospitalChanged(int index);

private:
    void setupUi();
    void loadHospitals();
    void showError(const QString& message);

    QComboBox* m_hospitalCombo;
    QLineEdit* m_usernameEdit;
    QLineEdit* m_passwordEdit;
    QPushButton* m_loginButton;
    QPushButton* m_domainLoginButton;
    QComboBox* m_languageCombo;
    QLabel* m_errorLabel;
    QLabel* m_titleLabel;
};

} // namespace OncoInfo
