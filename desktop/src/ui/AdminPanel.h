#pragma once

#include <QWidget>
#include <QTabWidget>

namespace OncoInfo {

class AdminPanel : public QWidget {
    Q_OBJECT

public:
    explicit AdminPanel(QWidget* parent = nullptr);
    void refresh();

private:
    void setupUi();
    QWidget* createOverviewTab();
    QWidget* createUserManagementTab();
    QWidget* createAuditLogTab();
    QWidget* createDrugManagementTab();

    QTabWidget* m_tabWidget;
};

} // namespace OncoInfo
