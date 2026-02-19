#include "SearchBar.h"
#include "core/DrugRepository.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QApplication>

namespace OncoInfo {

SearchBar::SearchBar(QWidget* parent) : QWidget(parent) {
    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    m_searchEdit = new QLineEdit();
    m_searchEdit->setObjectName("searchBar");
    m_searchEdit->setPlaceholderText(TR("home.searchPlaceholder"));
    m_searchEdit->setClearButtonEnabled(true);
    layout->addWidget(m_searchEdit);

    m_resultsList = new QListWidget();
    m_resultsList->setObjectName("searchResults");
    m_resultsList->setMaximumHeight(300);
    m_resultsList->setStyleSheet(R"(
        QListWidget {
            background-color: white;
            border: 1px solid #e2d8e6;
            border-top: none;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
        }
        QListWidget::item {
            padding: 8px 16px;
            border-bottom: 1px solid #f0ebf3;
        }
        QListWidget::item:hover {
            background-color: #f5f0f7;
        }
        QListWidget::item:selected {
            background-color: #6b2d5b;
            color: white;
        }
    )");
    m_resultsList->hide();
    layout->addWidget(m_resultsList);

    m_searchTimer = new QTimer(this);
    m_searchTimer->setSingleShot(true);
    m_searchTimer->setInterval(200);  // 200ms debounce

    connect(m_searchEdit, &QLineEdit::textChanged, this, &SearchBar::onTextChanged);
    connect(m_searchTimer, &QTimer::timeout, this, &SearchBar::onSearchTimeout);
    connect(m_resultsList, &QListWidget::itemClicked, this, &SearchBar::onResultClicked);
    connect(m_searchEdit, &QLineEdit::returnPressed, [this]() {
        emit searchRequested(m_searchEdit->text().trimmed());
        hideResults();
    });
}

void SearchBar::clear() {
    m_searchEdit->clear();
    hideResults();
}

QString SearchBar::text() const {
    return m_searchEdit->text().trimmed();
}

void SearchBar::onTextChanged(const QString& text) {
    if (text.trimmed().length() >= 2) {
        m_searchTimer->start();
    } else {
        hideResults();
    }
}

void SearchBar::onSearchTimeout() {
    showResults(m_searchEdit->text().trimmed());
}

void SearchBar::showResults(const QString& query) {
    if (query.length() < 2) { hideResults(); return; }

    DrugRepository repo;
    auto drugs = repo.search(query);

    m_resultsList->clear();
    int shown = 0;
    for (const auto& drug : drugs) {
        if (shown >= 8) break;

        QString label = drug.generic_name;
        if (!drug.brand_names.isEmpty())
            label += " (" + drug.brand_names.first() + ")";
        label += " - " + drug.drug_class;

        auto* item = new QListWidgetItem(label);
        item->setData(Qt::UserRole, drug.id);
        m_resultsList->addItem(item);
        shown++;
    }

    if (drugs.size() > 8) {
        auto* moreItem = new QListWidgetItem(
            TR("drugs.andMore", {{"count", QString::number(drugs.size() - 8)}}));
        moreItem->setForeground(QColor("#9ca3af"));
        m_resultsList->addItem(moreItem);
    }

    m_resultsList->setVisible(!drugs.isEmpty());
}

void SearchBar::hideResults() {
    m_resultsList->hide();
    m_resultsList->clear();
}

void SearchBar::onResultClicked(QListWidgetItem* item) {
    QString drugId = item->data(Qt::UserRole).toString();
    if (!drugId.isEmpty()) {
        emit drugSelected(drugId);
        hideResults();
    }
}

} // namespace OncoInfo
