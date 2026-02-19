#pragma once

#include <QMainWindow>
#include <QStackedWidget>
#include <QToolBar>
#include <QLabel>
#include <QPushButton>
#include <QComboBox>

namespace OncoInfo {

class HomePage;
class DrugsPage;
class DrugDetailWidget;
class AdminPanel;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);

    void showHomePage();
    void showDrugsPage(const QString& category = QString());
    void showDrugDetail(const QString& drugId);
    void showAdminPanel();

private slots:
    void onLogout();
    void onNavigateHome();
    void onLanguageChanged(int index);

private:
    void setupUi();
    void setupToolBar();
    void updateUserInfo();
    void refreshStyle();

    // Navigation
    QStackedWidget* m_centralStack;
    HomePage* m_homePage;
    DrugsPage* m_drugsPage;
    DrugDetailWidget* m_drugDetailWidget;
    AdminPanel* m_adminPanel;

    // Toolbar elements
    QToolBar* m_headerBar;
    QLabel* m_logoLabel;
    QLabel* m_userLabel;
    QLabel* m_roleLabel;
    QPushButton* m_homeButton;
    QPushButton* m_drugsButton;
    QPushButton* m_adminButton;
    QPushButton* m_logoutButton;
    QComboBox* m_langCombo;
};

} // namespace OncoInfo
