#pragma once

#include <QWidget>
#include <QLineEdit>
#include <QListWidget>
#include <QTimer>

namespace OncoInfo {

class SearchBar : public QWidget {
    Q_OBJECT

public:
    explicit SearchBar(QWidget* parent = nullptr);
    void clear();
    QString text() const;

signals:
    void searchRequested(const QString& query);
    void drugSelected(const QString& drugId);

private slots:
    void onTextChanged(const QString& text);
    void onSearchTimeout();
    void onResultClicked(QListWidgetItem* item);

private:
    void showResults(const QString& query);
    void hideResults();

    QLineEdit* m_searchEdit;
    QListWidget* m_resultsList;
    QTimer* m_searchTimer;
};

} // namespace OncoInfo
