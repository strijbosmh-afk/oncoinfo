#include "DrugDetailWidget.h"
#include "PatientFolderDialog.h"
#include "StyleSheet.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/FavoritesRepository.h"
#include "core/AuditLogger.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QScrollArea>
#include <QGroupBox>
#include <QFont>
#include <QTextBrowser>

namespace OncoInfo {

DrugDetailWidget::DrugDetailWidget(QWidget* parent) : QWidget(parent) {
    setupUi();
}

void DrugDetailWidget::setupUi() {
    auto* mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(24, 16, 24, 16);
    mainLayout->setSpacing(12);

    // Top bar
    auto* topBar = new QHBoxLayout();

    m_backButton = new QPushButton(TR("drugs.backToDrugs"));
    m_backButton->setObjectName("secondaryButton");
    m_backButton->setCursor(Qt::PointingHandCursor);
    connect(m_backButton, &QPushButton::clicked, this, &DrugDetailWidget::backRequested);
    topBar->addWidget(m_backButton);

    m_titleLabel = new QLabel();
    QFont titleFont;
    titleFont.setPointSize(20);
    titleFont.setBold(true);
    m_titleLabel->setFont(titleFont);
    m_titleLabel->setStyleSheet("color: #1f2937;");
    topBar->addWidget(m_titleLabel);

    m_classLabel = new QLabel();
    topBar->addWidget(m_classLabel);

    topBar->addStretch();

    m_favoriteButton = new QPushButton("☆ " + TR("drugs.addToFavorites"));
    m_favoriteButton->setObjectName("secondaryButton");
    m_favoriteButton->setCursor(Qt::PointingHandCursor);
    topBar->addWidget(m_favoriteButton);

    m_patientFolderButton = new QPushButton(TR("patientFolder.title"));
    m_patientFolderButton->setObjectName("primaryButton");
    m_patientFolderButton->setCursor(Qt::PointingHandCursor);
    topBar->addWidget(m_patientFolderButton);

    mainLayout->addLayout(topBar);

    // Tabs
    m_tabWidget = new QTabWidget();
    mainLayout->addWidget(m_tabWidget);
}

void DrugDetailWidget::loadDrug(const QString& drugId) {
    DrugRepository repo;
    auto drugOpt = repo.getById(drugId);
    if (!drugOpt) return;

    m_currentDrug = *drugOpt;
    const auto& drug = m_currentDrug;

    // Log view
    AuditLogger::instance().logDrugView(AuthManager::instance().currentUser(), drug.id, drug.generic_name);

    // Update header
    m_titleLabel->setText(drug.generic_name);
    if (!drug.brand_names.isEmpty()) {
        m_titleLabel->setText(drug.generic_name + " (" + drug.brand_names.join(", ") + ")");
    }

    QColor classColor = StyleSheet::drugClassColor(drug.drug_class);
    m_classLabel->setText(drug.drug_class);
    m_classLabel->setStyleSheet(QString(
        "background-color: %1; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;"
    ).arg(classColor.name()));

    // Update favorite button
    const auto& user = AuthManager::instance().currentUser();
    FavoritesRepository favRepo;
    bool isFav = favRepo.isFavorite(user.id, drug.id);
    m_favoriteButton->setText(isFav ? "★ " + TR("drugs.removeFromFavorites") : "☆ " + TR("drugs.addToFavorites"));
    disconnect(m_favoriteButton, nullptr, nullptr, nullptr);
    connect(m_favoriteButton, &QPushButton::clicked, [this]() {
        const auto& u = AuthManager::instance().currentUser();
        FavoritesRepository fr;
        if (fr.isFavorite(u.id, m_currentDrug.id)) {
            fr.removeFavorite(u.id, m_currentDrug.id);
            m_favoriteButton->setText("☆ " + TR("drugs.addToFavorites"));
        } else {
            fr.addFavorite(u.id, m_currentDrug.id);
            m_favoriteButton->setText("★ " + TR("drugs.removeFromFavorites"));
        }
    });

    // Patient folder button
    disconnect(m_patientFolderButton, nullptr, nullptr, nullptr);
    connect(m_patientFolderButton, &QPushButton::clicked, [this]() {
        auto* dialog = new PatientFolderDialog(m_currentDrug, this);
        dialog->exec();
        delete dialog;
    });

    // Rebuild tabs
    m_tabWidget->clear();
    m_tabWidget->addTab(createOverviewTab(drug), TR("drugDetail.overview"));
    m_tabWidget->addTab(createDosingTab(drug), TR("drugDetail.dosing"));
    m_tabWidget->addTab(createSideEffectsTab(drug), TR("drugDetail.sideEffects"));
    m_tabWidget->addTab(createMonitoringTab(drug), TR("drugDetail.monitoring"));
    m_tabWidget->addTab(createReferencesTab(drug), TR("drugDetail.references"));
}

QWidget* DrugDetailWidget::createOverviewTab(const Drug& drug) {
    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);

    auto* content = new QWidget();
    auto* layout = new QVBoxLayout(content);
    layout->setSpacing(16);

    // Mechanism of action
    if (!drug.mechanism_of_action.isEmpty()) {
        auto* group = new QGroupBox(TR("drugDetail.mechanism"));
        auto* gl = new QVBoxLayout(group);
        auto* text = new QLabel(drug.mechanism_of_action);
        text->setWordWrap(true);
        text->setStyleSheet("font-size: 13px; line-height: 1.5;");
        gl->addWidget(text);
        layout->addWidget(group);
    }

    // Approved indications
    if (!drug.approved_indications.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.indications"), drug.approved_indications));
    }

    // Disease areas
    if (!drug.disease_areas.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.diseaseAreas"), drug.disease_areas));
    }

    // Common regimens
    if (!drug.common_regimens.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.commonRegimens"), drug.common_regimens));
    }

    // Key info
    QList<QPair<QString, QString>> keyInfo;
    keyInfo << qMakePair(TR("drugDetail.overview"), drug.administration_route);
    if (drug.cycle_length_days > 0)
        keyInfo << qMakePair(TR("drugDetail.cycleDuration"), QString::number(drug.cycle_length_days) + " " + TR("drugDetail.days"));
    if (!drug.ema_approval_date.isEmpty())
        keyInfo << qMakePair("EMA", drug.ema_approval_date);
    if (!drug.fda_approval_date.isEmpty())
        keyInfo << qMakePair("FDA", drug.fda_approval_date);
    keyInfo << qMakePair(TR("drugs.riziv"), drug.is_on_zvz ? "✓" : "✗");
    if (drug.unit_price > 0)
        keyInfo << qMakePair("Prijs", QString("€%1/%2").arg(drug.unit_price, 0, 'f', 2).arg(drug.price_unit));

    if (!keyInfo.isEmpty()) {
        layout->addWidget(buildKeyValueSection(TR("drugDetail.overview"), keyInfo));
    }

    layout->addStretch();
    scroll->setWidget(content);
    return scroll;
}

QWidget* DrugDetailWidget::createDosingTab(const Drug& drug) {
    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);

    auto* content = new QWidget();
    auto* layout = new QVBoxLayout(content);
    layout->setSpacing(16);

    const auto& dosing = drug.dosing_info;

    QList<QPair<QString, QString>> dosingInfo;
    if (!dosing.standard_dose.isEmpty())
        dosingInfo << qMakePair(TR("drugDetail.standardDose"), dosing.standard_dose);
    if (!dosing.frequency.isEmpty())
        dosingInfo << qMakePair(TR("drugDetail.frequency"), dosing.frequency);
    if (!dosing.duration.isEmpty())
        dosingInfo << qMakePair(TR("drugDetail.duration"), dosing.duration);
    if (!dosing.max_dose.isEmpty())
        dosingInfo << qMakePair(TR("drugDetail.maxDose"), dosing.max_dose);

    if (!dosingInfo.isEmpty()) {
        layout->addWidget(buildKeyValueSection(TR("drugDetail.dosingInfo"), dosingInfo));
    }

    // Dose adjustments
    if (!dosing.dose_adjustments.empty()) {
        auto* group = new QGroupBox(TR("drugDetail.doseAdjustments"));
        auto* gl = new QVBoxLayout(group);
        for (const auto& adj : dosing.dose_adjustments) {
            auto* row = new QLabel(QString("<b>%1:</b> %2").arg(adj.condition, adj.adjustment));
            row->setWordWrap(true);
            row->setTextFormat(Qt::RichText);
            gl->addWidget(row);
        }
        layout->addWidget(group);
    }

    if (dosingInfo.isEmpty() && dosing.dose_adjustments.empty()) {
        auto* emptyLabel = new QLabel(TR("drugDetail.noDosingInfo"));
        emptyLabel->setAlignment(Qt::AlignCenter);
        emptyLabel->setStyleSheet("color: #9ca3af; padding: 40px;");
        layout->addWidget(emptyLabel);
    }

    layout->addStretch();
    scroll->setWidget(content);
    return scroll;
}

QWidget* DrugDetailWidget::createSideEffectsTab(const Drug& drug) {
    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);

    auto* content = new QWidget();
    auto* layout = new QVBoxLayout(content);
    layout->setSpacing(16);

    if (!drug.side_effects.common.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.commonSideEffects"), drug.side_effects.common));
    }

    if (!drug.side_effects.serious.isEmpty()) {
        auto* group = new QGroupBox(TR("drugDetail.seriousSideEffects"));
        group->setStyleSheet("QGroupBox { border-color: #ef4444; } QGroupBox::title { color: #dc2626; }");
        auto* gl = new QVBoxLayout(group);
        for (const auto& se : drug.side_effects.serious) {
            auto* item = new QLabel("⚠ " + se);
            item->setWordWrap(true);
            item->setStyleSheet("color: #991b1b; font-size: 13px; padding: 2px 0;");
            gl->addWidget(item);
        }
        layout->addWidget(group);
    }

    // Contraindications
    if (!drug.contraindications.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.contraindications"), drug.contraindications));
    }

    // Drug interactions
    if (!drug.drug_interactions.isEmpty()) {
        auto* group = new QGroupBox(TR("drugDetail.drugInteractions"));
        auto* gl = new QVBoxLayout(group);
        auto* warning = new QLabel(TR("drugDetail.interactionWarning"));
        warning->setStyleSheet("color: #f59e0b; font-style: italic; font-size: 12px;");
        warning->setWordWrap(true);
        gl->addWidget(warning);
        for (const auto& di : drug.drug_interactions) {
            auto* item = new QLabel("• " + di);
            item->setWordWrap(true);
            gl->addWidget(item);
        }
        layout->addWidget(group);
    }

    // Side effect management
    if (!drug.side_effects.management.empty()) {
        QList<QPair<QString, QString>> mgmtPairs;
        for (const auto& [k, v] : drug.side_effects.management) {
            mgmtPairs << qMakePair(k, v);
        }
        layout->addWidget(buildKeyValueSection(TR("drugDetail.sideEffectManagement"), mgmtPairs));
    }

    if (drug.side_effects.common.isEmpty() && drug.side_effects.serious.isEmpty()) {
        auto* emptyLabel = new QLabel(TR("drugDetail.noSideEffects"));
        emptyLabel->setAlignment(Qt::AlignCenter);
        emptyLabel->setStyleSheet("color: #9ca3af; padding: 40px;");
        layout->addWidget(emptyLabel);
    }

    layout->addStretch();
    scroll->setWidget(content);
    return scroll;
}

QWidget* DrugDetailWidget::createMonitoringTab(const Drug& drug) {
    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);

    auto* content = new QWidget();
    auto* layout = new QVBoxLayout(content);
    layout->setSpacing(16);

    if (!drug.monitoring_requirements.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.monitoringRequirements"), drug.monitoring_requirements));
    }

    if (!drug.patient_counseling_points.isEmpty()) {
        layout->addWidget(buildSection(TR("drugDetail.patientCounseling"), drug.patient_counseling_points));
    }

    if (drug.monitoring_requirements.isEmpty() && drug.patient_counseling_points.isEmpty()) {
        auto* emptyLabel = new QLabel(TR("drugDetail.noMonitoring"));
        emptyLabel->setAlignment(Qt::AlignCenter);
        emptyLabel->setStyleSheet("color: #9ca3af; padding: 40px;");
        layout->addWidget(emptyLabel);
    }

    layout->addStretch();
    scroll->setWidget(content);
    return scroll;
}

QWidget* DrugDetailWidget::createReferencesTab(const Drug& drug) {
    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);

    auto* content = new QWidget();
    auto* layout = new QVBoxLayout(content);
    layout->setSpacing(12);

    if (!drug.reference_links.isEmpty()) {
        auto* group = new QGroupBox(TR("drugDetail.references"));
        auto* gl = new QVBoxLayout(group);
        for (const auto& link : drug.reference_links) {
            auto* linkLabel = new QLabel(QString("<a href=\"%1\">%1</a>").arg(link));
            linkLabel->setOpenExternalLinks(true);
            linkLabel->setWordWrap(true);
            gl->addWidget(linkLabel);
        }
        layout->addWidget(group);
    } else {
        auto* emptyLabel = new QLabel("No references available.");
        emptyLabel->setStyleSheet("color: #9ca3af; padding: 40px;");
        emptyLabel->setAlignment(Qt::AlignCenter);
        layout->addWidget(emptyLabel);
    }

    layout->addStretch();
    scroll->setWidget(content);
    return scroll;
}

QWidget* DrugDetailWidget::buildSection(const QString& title, const QStringList& items) {
    auto* group = new QGroupBox(title);
    auto* gl = new QVBoxLayout(group);
    for (const auto& item : items) {
        auto* label = new QLabel("• " + item);
        label->setWordWrap(true);
        label->setStyleSheet("font-size: 13px; padding: 2px 0;");
        gl->addWidget(label);
    }
    return group;
}

QWidget* DrugDetailWidget::buildKeyValueSection(const QString& title, const QList<QPair<QString, QString>>& pairs) {
    auto* group = new QGroupBox(title);
    auto* gl = new QVBoxLayout(group);
    for (const auto& [key, value] : pairs) {
        auto* row = new QHBoxLayout();
        auto* keyLabel = new QLabel(key + ":");
        keyLabel->setStyleSheet("font-weight: bold; color: #4b5563; min-width: 150px;");
        row->addWidget(keyLabel);
        auto* valLabel = new QLabel(value);
        valLabel->setWordWrap(true);
        valLabel->setStyleSheet("color: #1f2937;");
        row->addWidget(valLabel, 1);
        gl->addLayout(row);
    }
    return group;
}

} // namespace OncoInfo
