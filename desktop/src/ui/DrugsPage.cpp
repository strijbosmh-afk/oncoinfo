#include "DrugsPage.h"
#include "SearchBar.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/FavoritesRepository.h"
#include "i18n/TranslationManager.h"
#include "models/Drug.h"
#include <QHBoxLayout>
#include <QFrame>
#include <QGridLayout>
#include <QFont>
#include <QScrollBar>

namespace OncoInfo {

DrugsPage::DrugsPage(QWidget* parent) : QWidget(parent) {
    setupUi();
}

void DrugsPage::setupUi() {
    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(24, 16, 24, 16);
    mainLayout->setSpacing(12);

    // Top bar: back button + title + count
    auto* topBar = new QHBoxLayout();

    m_backButton = new QPushButton(TR("drugs.backToCategories"));
    m_backButton->setObjectName("secondaryButton");
    m_backButton->setCursor(Qt::PointingHandCursor);
    connect(m_backButton, &QPushButton::clicked, this, &DrugsPage::backRequested);
    topBar->addWidget(m_backButton);

    m_titleLabel = new QLabel(TR("drugs.library"));
    QFont titleFont;
    titleFont.setPointSize(18);
    titleFont.setBold(true);
    m_titleLabel->setFont(titleFont);
    m_titleLabel->setStyleSheet("color: #4a3550;");
    topBar->addWidget(m_titleLabel);

    topBar->addStretch();

    m_countLabel = new QLabel();
    m_countLabel->setStyleSheet("color: #6b7280; font-size: 13px;");
    topBar->addWidget(m_countLabel);

    m_favoritesExportBtn = new QPushButton(TR("drugs.exportPdf"));
    m_favoritesExportBtn->setObjectName("secondaryButton");
    m_favoritesExportBtn->setCursor(Qt::PointingHandCursor);
    topBar->addWidget(m_favoritesExportBtn);

    mainLayout->addLayout(topBar);

    // Search bar
    m_searchBar = new SearchBar(this);
    connect(m_searchBar, &SearchBar::searchRequested, this, &DrugsPage::onSearchChanged);
    connect(m_searchBar, &SearchBar::drugSelected, this, &DrugsPage::drugSelected);
    mainLayout->addWidget(m_searchBar);

    // Filter bar
    auto* filterBar = new QHBoxLayout();

    auto* filterLabel = new QLabel(TR("drugs.filters") + ":");
    filterLabel->setStyleSheet("color: #6b7280; font-weight: bold;");
    filterBar->addWidget(filterLabel);

    m_classFilter = new QComboBox();
    m_classFilter->addItem(TR("drugs.allClasses"), "");
    // Drug classes will be populated in setCategory
    m_classFilter->setMinimumWidth(180);
    connect(m_classFilter, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &DrugsPage::onFilterChanged);
    filterBar->addWidget(m_classFilter);

    m_routeFilter = new QComboBox();
    m_routeFilter->addItem(TR("common.all"), "");
    m_routeFilter->addItem("Oraal", "Oraal");
    m_routeFilter->addItem("Intraveneus", "Intraveneus");
    m_routeFilter->addItem("Subcutaan", "Subcutaan");
    m_routeFilter->addItem("Intramusculair", "Intramusculair");
    m_routeFilter->addItem("Intravesicaal", "Intravesicaal");
    m_routeFilter->setMinimumWidth(150);
    connect(m_routeFilter, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &DrugsPage::onFilterChanged);
    filterBar->addWidget(m_routeFilter);

    filterBar->addStretch();
    mainLayout->addLayout(filterBar);

    // Scrollable drug list
    m_scrollArea = new QScrollArea();
    m_scrollArea->setWidgetResizable(true);
    m_scrollArea->setFrameShape(QFrame::NoFrame);
    m_scrollArea->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    m_drugsContainer = new QWidget();
    m_drugsLayout = new QVBoxLayout(m_drugsContainer);
    m_drugsLayout->setContentsMargins(0, 0, 0, 0);
    m_drugsLayout->setSpacing(8);
    m_scrollArea->setWidget(m_drugsContainer);

    mainLayout->addWidget(m_scrollArea);
}

void DrugsPage::setCategory(const QString& categoryKey) {
    m_currentCategory = categoryKey;
    m_searchQuery.clear();
    m_searchBar->clear();

    // Update title
    if (!categoryKey.isEmpty()) {
        m_titleLabel->setText(TR("home." + categoryKey));
    } else {
        m_titleLabel->setText(TR("drugs.library"));
    }

    // Populate class filter based on category
    m_classFilter->clear();
    m_classFilter->addItem(TR("drugs.allClasses"), "");

    auto categories = getDrugCategories();
    for (const auto& cat : categories) {
        if (cat.key == categoryKey) {
            for (const auto& cls : cat.drugClasses) {
                m_classFilter->addItem(cls, cls);
            }
            break;
        }
    }

    loadDrugs();
}

void DrugsPage::setSearchQuery(const QString& query) {
    m_searchQuery = query;
    loadDrugs();
}

void DrugsPage::onFilterChanged() {
    loadDrugs();
}

void DrugsPage::onSearchChanged(const QString& query) {
    m_searchQuery = query;
    loadDrugs();
}

void DrugsPage::loadDrugs() {
    // Clear existing cards
    QLayoutItem* item;
    while ((item = m_drugsLayout->takeAt(0)) != nullptr) {
        if (item->widget()) delete item->widget();
        delete item;
    }

    DrugRepository repo;
    QList<Drug> drugs;

    QString classFilter = m_classFilter->currentData().toString();
    QString routeFilter = m_routeFilter->currentData().toString();

    if (!m_searchQuery.isEmpty()) {
        drugs = repo.searchWithFilters(m_searchQuery,
            classFilter.isEmpty() ? QStringList() : QStringList{classFilter},
            QStringList(), routeFilter);
    } else if (!m_currentCategory.isEmpty()) {
        drugs = repo.getByCategory(m_currentCategory);
        // Apply local filters
        if (!classFilter.isEmpty() || !routeFilter.isEmpty()) {
            QList<Drug> filtered;
            for (const auto& d : drugs) {
                bool matchClass = classFilter.isEmpty() || d.drug_class == classFilter;
                bool matchRoute = routeFilter.isEmpty() || d.administration_route == routeFilter;
                if (matchClass && matchRoute) filtered << d;
            }
            drugs = filtered;
        }
    } else {
        drugs = repo.getAll();
    }

    m_countLabel->setText(TR("drugs.totalFound", {{"count", QString::number(drugs.size())}}));

    // Separate combinations and individual drugs
    QList<Drug> combinations, individuals;
    for (const auto& d : drugs) {
        if (d.isCombination()) combinations << d;
        else individuals << d;
    }

    // Favorites section
    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;
    QStringList favIds = favRepo.getFavorites(user.id);

    QList<Drug> favDrugs;
    for (const auto& d : drugs) {
        if (favIds.contains(d.id)) favDrugs << d;
    }

    if (!favDrugs.isEmpty()) {
        auto* favLabel = new QLabel(TR("drugs.favorites") + " (" + QString::number(favDrugs.size()) + ")");
        QFont favFont;
        favFont.setPointSize(14);
        favFont.setBold(true);
        favLabel->setFont(favFont);
        favLabel->setStyleSheet("color: #6b2d5b; margin-top: 8px;");
        m_drugsLayout->addWidget(favLabel);

        for (const auto& drug : favDrugs) {
            m_drugsLayout->addWidget(createDrugCard(drug));
        }
    }

    // Combinations section
    if (!combinations.isEmpty()) {
        auto* combLabel = new QLabel(TR("drugs.combinations") + " (" + QString::number(combinations.size()) + ")");
        QFont combFont;
        combFont.setPointSize(14);
        combFont.setBold(true);
        combLabel->setFont(combFont);
        combLabel->setStyleSheet("color: #92400e; margin-top: 12px;");
        m_drugsLayout->addWidget(combLabel);

        for (const auto& drug : combinations) {
            m_drugsLayout->addWidget(createDrugCard(drug));
        }
    }

    // Individual drugs section
    if (!individuals.isEmpty()) {
        auto* indLabel = new QLabel(TR("drugs.individualDrugs") + " (" + QString::number(individuals.size()) + ")");
        QFont indFont;
        indFont.setPointSize(14);
        indFont.setBold(true);
        indLabel->setFont(indFont);
        indLabel->setStyleSheet("color: #4a3550; margin-top: 12px;");
        m_drugsLayout->addWidget(indLabel);

        for (const auto& drug : individuals) {
            m_drugsLayout->addWidget(createDrugCard(drug));
        }
    }

    if (drugs.isEmpty()) {
        auto* emptyLabel = new QLabel(TR("drugs.noDrugsFound"));
        emptyLabel->setAlignment(Qt::AlignCenter);
        emptyLabel->setStyleSheet("color: #9ca3af; font-size: 16px; padding: 60px;");
        m_drugsLayout->addWidget(emptyLabel);
    }

    m_drugsLayout->addStretch();
    m_scrollArea->verticalScrollBar()->setValue(0);
}

QWidget* DrugsPage::createDrugCard(const Drug& drug) {
    auto* card = new QFrame();
    card->setObjectName(drug.isCombination() ? "combinationCard" : "drugCard");
    card->setCursor(Qt::PointingHandCursor);
    card->setStyleSheet(card->styleSheet() + StyleSheet::drugCardStyle(drug.drug_class));

    auto* cardLayout = new QHBoxLayout(card);
    cardLayout->setContentsMargins(12, 10, 12, 10);
    cardLayout->setSpacing(12);

    // Drug info (left side)
    auto* infoLayout = new QVBoxLayout();
    infoLayout->setSpacing(4);

    // Name + brand
    auto* nameLabel = new QLabel(drug.generic_name);
    nameLabel->setStyleSheet("font-weight: bold; font-size: 14px; color: #1f2937;");
    infoLayout->addWidget(nameLabel);

    if (!drug.brand_names.isEmpty()) {
        auto* brandLabel = new QLabel(drug.brand_names.join(", "));
        brandLabel->setStyleSheet("color: #6b7280; font-size: 12px; font-style: italic;");
        infoLayout->addWidget(brandLabel);
    }

    // Drug class badge
    auto* classRow = new QHBoxLayout();
    auto* classBadge = new QLabel(drug.drug_class);
    QColor classColor = StyleSheet::drugClassColor(drug.drug_class);
    classBadge->setStyleSheet(QString(
        "background-color: %1; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;"
    ).arg(classColor.name()));
    classRow->addWidget(classBadge);

    // RIZIV badge
    if (drug.is_on_zvz) {
        auto* rizivBadge = new QLabel(TR("drugs.riziv") + " ✓");
        rizivBadge->setObjectName("badgeGreen");
        classRow->addWidget(rizivBadge);
    }

    // Route badge
    if (!drug.administration_route.isEmpty()) {
        auto* routeBadge = new QLabel(drug.administration_route);
        routeBadge->setStyleSheet("color: #6b7280; font-size: 11px; padding: 2px 6px; background: #f3f4f6; border-radius: 8px;");
        classRow->addWidget(routeBadge);
    }

    classRow->addStretch();
    infoLayout->addLayout(classRow);

    // Indications preview
    if (!drug.approved_indications.isEmpty()) {
        QString indText = drug.approved_indications.mid(0, 2).join(" | ");
        if (drug.approved_indications.size() > 2) indText += " ...";
        auto* indLabel = new QLabel(indText);
        indLabel->setStyleSheet("color: #9ca3af; font-size: 11px;");
        indLabel->setWordWrap(true);
        infoLayout->addWidget(indLabel);
    }

    cardLayout->addLayout(infoLayout, 1);

    // Action buttons (right side)
    auto* actionsLayout = new QVBoxLayout();
    actionsLayout->setAlignment(Qt::AlignTop);

    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;

    // Favorite star button
    bool isFav = favRepo.isFavorite(user.id, drug.id);
    auto* starBtn = new QPushButton(isFav ? "★" : "☆");
    starBtn->setObjectName("starButton");
    starBtn->setToolTip(isFav ? TR("drugs.removeFromFavorites") : TR("drugs.addToFavorites"));
    QString drugId = drug.id;
    connect(starBtn, &QPushButton::clicked, [this, starBtn, drugId]() {
        const auto& u = AuthManager::instance().currentUser();
        FavoritesRepository fr;
        if (fr.isFavorite(u.id, drugId)) {
            fr.removeFavorite(u.id, drugId);
            starBtn->setText("☆");
        } else {
            fr.addFavorite(u.id, drugId);
            starBtn->setText("★");
        }
    });
    actionsLayout->addWidget(starBtn);

    // Most used lightning button
    bool isMostUsed = favRepo.isMostUsed(user.id, drug.id);
    auto* lightningBtn = new QPushButton(isMostUsed ? "⚡" : "↯");
    lightningBtn->setObjectName("lightningButton");
    lightningBtn->setToolTip(TR("home.mostUsed"));
    connect(lightningBtn, &QPushButton::clicked, [lightningBtn, drugId]() {
        const auto& u = AuthManager::instance().currentUser();
        FavoritesRepository fr;
        if (fr.isMostUsed(u.id, drugId)) {
            fr.removeMostUsed(u.id, drugId);
            lightningBtn->setText("↯");
        } else {
            fr.addMostUsed(u.id, drugId);
            lightningBtn->setText("⚡");
        }
    });
    actionsLayout->addWidget(lightningBtn);

    cardLayout->addLayout(actionsLayout);

    // Click to open detail
    auto* clickArea = new QPushButton(card);
    clickArea->setFlat(true);
    clickArea->setStyleSheet("background: transparent; border: none;");
    clickArea->setGeometry(0, 0, card->width() - 60, card->height());
    clickArea->lower();
    connect(clickArea, &QPushButton::clicked, [this, drugId]() {
        emit drugSelected(drugId);
    });

    return card;
}

} // namespace OncoInfo
