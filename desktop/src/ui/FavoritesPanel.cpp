#include "FavoritesPanel.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/FavoritesRepository.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QFrame>

namespace OncoInfo {

FavoritesPanel::FavoritesPanel(QWidget* parent) : QWidget(parent) {
    refresh();
}

void FavoritesPanel::refresh() {
    // Clear existing layout
    if (layout()) {
        QLayoutItem* item;
        while ((item = layout()->takeAt(0)) != nullptr) {
            if (item->widget()) delete item->widget();
            delete item;
        }
        delete layout();
    }

    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    mainLayout->setSpacing(8);

    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;
    DrugRepository drugRepo;

    QStringList favIds = favRepo.getFavorites(user.id);

    auto* header = new QHBoxLayout();
    auto* titleLabel = new QLabel(TR("drugs.favorites") + " (" + QString::number(favIds.size()) + ")");
    titleLabel->setStyleSheet("font-weight: bold; font-size: 14px; color: #6b2d5b;");
    header->addWidget(titleLabel);
    header->addStretch();

    auto* exportBtn = new QPushButton(TR("drugs.exportPdf"));
    exportBtn->setObjectName("secondaryButton");
    exportBtn->setEnabled(!favIds.isEmpty());
    connect(exportBtn, &QPushButton::clicked, this, &FavoritesPanel::exportRequested);
    header->addWidget(exportBtn);

    mainLayout->addLayout(header);

    for (const auto& drugId : favIds) {
        auto drugOpt = drugRepo.getById(drugId);
        if (!drugOpt) continue;
        const auto& drug = *drugOpt;

        auto* card = new QFrame();
        card->setObjectName("drugCard");
        card->setCursor(Qt::PointingHandCursor);
        auto* cardLayout = new QHBoxLayout(card);
        cardLayout->setContentsMargins(8, 6, 8, 6);

        auto* nameLabel = new QLabel(drug.generic_name);
        nameLabel->setStyleSheet("font-weight: bold; font-size: 12px;");
        cardLayout->addWidget(nameLabel);

        auto* classLabel = new QLabel(drug.drug_class);
        QColor color = StyleSheet::drugClassColor(drug.drug_class);
        classLabel->setStyleSheet(QString("color: %1; font-size: 11px;").arg(color.name()));
        cardLayout->addWidget(classLabel);

        cardLayout->addStretch();

        auto* removeBtn = new QPushButton("★");
        removeBtn->setObjectName("starButton");
        QString did = drug.id;
        connect(removeBtn, &QPushButton::clicked, [this, did]() {
            const auto& u = AuthManager::instance().currentUser();
            FavoritesRepository fr;
            fr.removeFavorite(u.id, did);
            refresh();
        });
        cardLayout->addWidget(removeBtn);

        auto* openBtn = new QPushButton("→");
        openBtn->setFlat(true);
        connect(openBtn, &QPushButton::clicked, [this, did]() { emit drugSelected(did); });
        cardLayout->addWidget(openBtn);

        mainLayout->addWidget(card);
    }

    if (favIds.isEmpty()) {
        auto* emptyLabel = new QLabel(TR("drugs.noDrugsFound"));
        emptyLabel->setAlignment(Qt::AlignCenter);
        emptyLabel->setStyleSheet("color: #9ca3af; padding: 20px;");
        mainLayout->addWidget(emptyLabel);
    }

    mainLayout->addStretch();
}

} // namespace OncoInfo
