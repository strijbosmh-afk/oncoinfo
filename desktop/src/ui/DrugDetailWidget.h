#pragma once

#include <QWidget>
#include <QTabWidget>
#include <QLabel>
#include <QPushButton>
#include "models/Drug.h"

namespace OncoInfo {

class DrugDetailWidget : public QWidget {
    Q_OBJECT

public:
    explicit DrugDetailWidget(QWidget* parent = nullptr);
    void loadDrug(const QString& drugId);

signals:
    void backRequested();

private:
    void setupUi();
    QWidget* createOverviewTab(const Drug& drug);
    QWidget* createDosingTab(const Drug& drug);
    QWidget* createSideEffectsTab(const Drug& drug);
    QWidget* createMonitoringTab(const Drug& drug);
    QWidget* createReferencesTab(const Drug& drug);
    QWidget* buildSection(const QString& title, const QStringList& items);
    QWidget* buildKeyValueSection(const QString& title, const QList<QPair<QString, QString>>& pairs);

    QTabWidget* m_tabWidget;
    QLabel* m_titleLabel;
    QLabel* m_classLabel;
    QPushButton* m_backButton;
    QPushButton* m_favoriteButton;
    QPushButton* m_patientFolderButton;

    Drug m_currentDrug;
};

} // namespace OncoInfo
