#pragma once

#include <QWidget>
#include <QVBoxLayout>
#include <QScrollArea>
#include <QComboBox>
#include <QPushButton>
#include <QLabel>
#include <QListWidget>

namespace OncoInfo {

class SearchBar;

class DrugsPage : public QWidget {
    Q_OBJECT

public:
    explicit DrugsPage(QWidget* parent = nullptr);
    void setCategory(const QString& categoryKey);
    void setSearchQuery(const QString& query);

signals:
    void drugSelected(const QString& drugId);
    void backRequested();

private slots:
    void onFilterChanged();
    void onSearchChanged(const QString& query);

private:
    void setupUi();
    void loadDrugs();
    QWidget* createDrugCard(const struct Drug& drug);

    // UI elements
    SearchBar* m_searchBar;
    QComboBox* m_classFilter;
    QComboBox* m_routeFilter;
    QScrollArea* m_scrollArea;
    QWidget* m_drugsContainer;
    QVBoxLayout* m_drugsLayout;
    QLabel* m_titleLabel;
    QLabel* m_countLabel;
    QPushButton* m_backButton;
    QPushButton* m_favoritesExportBtn;

    // Sections
    QWidget* m_combinationsSection;
    QWidget* m_individualsSection;

    // State
    QString m_currentCategory;
    QString m_searchQuery;
    QStringList m_classFilters;
    QString m_routeFilter_val;
};

} // namespace OncoInfo
