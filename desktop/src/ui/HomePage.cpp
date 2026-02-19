#include "HomePage.h"
#include "SearchBar.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/FavoritesRepository.h"
#include "i18n/TranslationManager.h"
#include "models/Drug.h"
#include <QLabel>
#include <QPushButton>
#include <QFrame>
#include <QHBoxLayout>
#include <QFont>
#include <QGraphicsDropShadowEffect>

namespace OncoInfo {

HomePage::HomePage(QWidget* parent) : QScrollArea(parent) {
    setWidgetResizable(true);
    setFrameShape(QFrame::NoFrame);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    m_contentWidget = new QWidget();
    setWidget(m_contentWidget);
}

void HomePage::refresh() {
    // Clear existing layout
    if (m_contentWidget->layout()) {
        QLayoutItem* item;
        while ((item = m_contentWidget->layout()->takeAt(0)) != nullptr) {
            if (item->widget()) delete item->widget();
            delete item;
        }
        delete m_contentWidget->layout();
    }

    auto* mainLayout = new QVBoxLayout(m_contentWidget);
    mainLayout->setContentsMargins(40, 24, 40, 24);
    mainLayout->setSpacing(24);

    // Welcome header
    auto* headerLabel = new QLabel("OncoInfo");
    QFont headerFont;
    headerFont.setPointSize(24);
    headerFont.setBold(true);
    headerLabel->setFont(headerFont);
    headerLabel->setStyleSheet("color: #6b2d5b;");
    mainLayout->addWidget(headerLabel);

    auto* subLabel = new QLabel(TR("auth.welcome"));
    subLabel->setStyleSheet("color: #8b7090; font-size: 14px; margin-bottom: 8px;");
    mainLayout->addWidget(subLabel);

    // Most Used section
    buildMostUsedSection(mainLayout);

    // Specialty grid
    auto* specialtyTitle = new QLabel(TR("home.chooseSpecialty"));
    QFont titleFont;
    titleFont.setPointSize(16);
    titleFont.setBold(true);
    specialtyTitle->setFont(titleFont);
    specialtyTitle->setStyleSheet("color: #4a3550; margin-top: 8px;");
    mainLayout->addWidget(specialtyTitle);

    buildSpecialtyGrid(mainLayout);

    // Search section
    auto* searchTitle = new QLabel(TR("home.orChooseDrug"));
    searchTitle->setStyleSheet("color: #6b7280; font-size: 13px; margin-top: 8px;");
    mainLayout->addWidget(searchTitle);

    buildSearchSection(mainLayout);

    mainLayout->addStretch();

    // Disclaimer
    auto* disclaimer = new QFrame();
    disclaimer->setObjectName("disclaimer");
    auto* disclaimerLayout = new QVBoxLayout(disclaimer);
    auto* disclaimerText = new QLabel(TR("footer.disclaimerFull"));
    disclaimerText->setWordWrap(true);
    disclaimerText->setStyleSheet("color: #92400e; font-size: 11px;");
    disclaimerLayout->addWidget(disclaimerText);
    mainLayout->addWidget(disclaimer);
}

void HomePage::buildMostUsedSection(QVBoxLayout* layout) {
    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;
    auto mostUsed = favRepo.getMostUsed(user.id);

    if (mostUsed.isEmpty()) return;

    auto* sectionLabel = new QLabel(TR("home.mostUsed"));
    QFont sectionFont;
    sectionFont.setPointSize(14);
    sectionFont.setBold(true);
    sectionLabel->setFont(sectionFont);
    sectionLabel->setStyleSheet("color: #4a3550;");
    layout->addWidget(sectionLabel);

    auto* container = new QWidget();
    auto* hLayout = new QHBoxLayout(container);
    hLayout->setContentsMargins(0, 0, 0, 0);
    hLayout->setSpacing(12);

    DrugRepository drugRepo;
    for (const auto& [drugId, order] : mostUsed) {
        auto drugOpt = drugRepo.getById(drugId);
        if (!drugOpt) continue;
        const auto& drug = *drugOpt;

        auto* card = new QFrame();
        card->setObjectName("card");
        card->setCursor(Qt::PointingHandCursor);
        card->setFixedHeight(80);
        card->setMinimumWidth(140);

        auto* cardLayout = new QVBoxLayout(card);
        cardLayout->setContentsMargins(12, 8, 12, 8);

        auto* nameLabel = new QLabel(drug.generic_name);
        nameLabel->setStyleSheet("font-weight: bold; font-size: 12px; color: #1f2937;");
        nameLabel->setWordWrap(true);
        cardLayout->addWidget(nameLabel);

        if (!drug.brand_names.isEmpty()) {
            auto* brandLabel = new QLabel(drug.brand_names.first());
            brandLabel->setStyleSheet("color: #6b7280; font-size: 10px;");
            cardLayout->addWidget(brandLabel);
        }

        auto* classLabel = new QLabel(drug.drug_class);
        QColor classColor = StyleSheet::drugClassColor(drug.drug_class);
        classLabel->setStyleSheet(QString("color: %1; font-size: 10px; font-weight: bold;").arg(classColor.name()));
        cardLayout->addWidget(classLabel);

        // Click handler
        QString id = drug.id;
        card->installEventFilter(this);
        connect(card, &QFrame::destroyed, [](){});  // prevent warnings
        // Use mouse press event via eventFilter or custom clickable frame
        auto* clickBtn = new QPushButton(card);
        clickBtn->setFlat(true);
        clickBtn->setStyleSheet("background: transparent; border: none;");
        clickBtn->setGeometry(0, 0, 200, 80);
        connect(clickBtn, &QPushButton::clicked, [this, id]() {
            emit drugSelected(id);
        });

        hLayout->addWidget(card);
    }

    hLayout->addStretch();
    layout->addWidget(container);
}

void HomePage::buildSpecialtyGrid(QVBoxLayout* layout) {
    auto* gridWidget = new QWidget();
    auto* grid = new QGridLayout(gridWidget);
    grid->setContentsMargins(0, 0, 0, 0);
    grid->setSpacing(16);

    // Get user's specialty order
    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;
    QStringList order = favRepo.getSpecialtyOrder(user.id);

    auto categories = getDrugCategories();
    int col = 0, row = 0;

    for (const auto& key : order) {
        for (const auto& cat : categories) {
            if (cat.key == key) {
                QString translatedName = TR("home." + key);
                QString translatedDesc = TR("home." + key + "Desc");
                auto* card = createSpecialtyCard(key, translatedName, translatedDesc);
                grid->addWidget(card, row, col);

                col++;
                if (col >= 4) { col = 0; row++; }
                break;
            }
        }
    }

    layout->addWidget(gridWidget);
}

QWidget* HomePage::createSpecialtyCard(const QString& key, const QString& name, const QString& description) {
    auto* card = new QFrame();
    card->setObjectName("specialtyCard");
    card->setCursor(Qt::PointingHandCursor);
    card->setMinimumSize(220, 120);

    auto* cardLayout = new QVBoxLayout(card);
    cardLayout->setContentsMargins(16, 16, 16, 16);

    // Icon placeholder (letter)
    auto* iconLabel = new QLabel(StyleSheet::categoryIcon(key));
    QFont iconFont;
    iconFont.setPointSize(24);
    iconFont.setBold(true);
    iconLabel->setFont(iconFont);
    iconLabel->setStyleSheet("color: #6b2d5b;");
    cardLayout->addWidget(iconLabel);

    auto* nameLabel = new QLabel(name);
    nameLabel->setStyleSheet("font-weight: bold; font-size: 14px; color: #1f2937;");
    cardLayout->addWidget(nameLabel);

    auto* descLabel = new QLabel(description);
    descLabel->setStyleSheet("color: #6b7280; font-size: 11px;");
    descLabel->setWordWrap(true);
    cardLayout->addWidget(descLabel);

    cardLayout->addStretch();

    // Click handler
    auto* clickBtn = new QPushButton(card);
    clickBtn->setFlat(true);
    clickBtn->setStyleSheet("background: transparent; border: none;");
    clickBtn->setGeometry(0, 0, 300, 150);
    connect(clickBtn, &QPushButton::clicked, [this, key]() {
        emit categorySelected(key);
    });

    return card;
}

void HomePage::buildSearchSection(QVBoxLayout* layout) {
    m_searchBar = new SearchBar(this);
    connect(m_searchBar, &SearchBar::drugSelected, this, &HomePage::drugSelected);
    connect(m_searchBar, &SearchBar::searchRequested, [this](const QString&) {
        // Could navigate to drugs page with search query
    });
    layout->addWidget(m_searchBar);
}

} // namespace OncoInfo
