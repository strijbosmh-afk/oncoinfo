#pragma once

#include <QWidget>
#include <QGridLayout>
#include <QVBoxLayout>
#include <QScrollArea>

namespace OncoInfo {

class SearchBar;

class HomePage : public QScrollArea {
    Q_OBJECT

public:
    explicit HomePage(QWidget* parent = nullptr);
    void refresh();

signals:
    void categorySelected(const QString& categoryKey);
    void drugSelected(const QString& drugId);

private:
    void buildMostUsedSection(QVBoxLayout* layout);
    void buildSpecialtyGrid(QVBoxLayout* layout);
    void buildSearchSection(QVBoxLayout* layout);
    QWidget* createSpecialtyCard(const QString& key, const QString& name, const QString& description);

    QWidget* m_contentWidget;
    SearchBar* m_searchBar;
};

} // namespace OncoInfo
