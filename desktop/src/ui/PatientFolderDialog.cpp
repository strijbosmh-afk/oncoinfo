#include "PatientFolderDialog.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/UserRepository.h"
#include "core/AuditLogger.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QGroupBox>
#include <QTabWidget>
#include <QLabel>
#include <QScrollArea>
#include <QFileDialog>
#include <QMessageBox>
#include <QPrinter>
#include <QTextDocument>

namespace OncoInfo {

PatientFolderDialog::PatientFolderDialog(const Drug& drug, QWidget* parent)
    : QDialog(parent), m_drug(drug)
{
    setWindowTitle(TR("patientFolder.title") + " - " + drug.generic_name);
    setMinimumSize(900, 700);
    resize(1000, 750);

    setupUi();
    loadContent();
}

void PatientFolderDialog::setupUi() {
    auto* mainLayout = new QHBoxLayout(this);

    // Left panel: settings and content editor
    auto* leftPanel = new QWidget();
    leftPanel->setMaximumWidth(500);
    auto* leftLayout = new QVBoxLayout(leftPanel);

    // Settings group
    auto* settingsGroup = new QGroupBox(TR("patientFolder.settings"));
    auto* settingsForm = new QFormLayout(settingsGroup);

    // Physician selector
    m_physicianCombo = new QComboBox();
    m_physicianCombo->addItem(TR("patientFolder.select"), "");
    UserRepository userRepo;
    const auto& hospital = AuthManager::instance().currentHospital();
    auto doctors = userRepo.getHospitalStaff(hospital.id, "doctor");
    for (const auto& doc : doctors) {
        m_physicianCombo->addItem(doc.name, doc.id);
    }
    settingsForm->addRow(TR("patientFolder.physician"), m_physicianCombo);

    // Nurse selector
    m_nurseCombo = new QComboBox();
    m_nurseCombo->addItem(TR("patientFolder.select"), "");
    auto nurses = userRepo.getHospitalStaff(hospital.id, "nurse");
    for (const auto& nurse : nurses) {
        m_nurseCombo->addItem(nurse.name, nurse.id);
    }
    m_nurseCombo->addItem(TR("patientFolder.otherNurse"), "other");
    settingsForm->addRow(TR("patientFolder.nurse"), m_nurseCombo);

    // Language
    m_languageCombo = new QComboBox();
    auto& tm = TranslationManager::instance();
    for (const auto& lang : tm.availableLanguages()) {
        m_languageCombo->addItem(tm.languageName(lang), lang);
    }
    settingsForm->addRow(TR("patientFolder.language"), m_languageCombo);

    // Folder type
    m_folderTypeCombo = new QComboBox();
    m_folderTypeCombo->addItem(TR("patientFolder.compact"), "compact");
    m_folderTypeCombo->addItem(TR("patientFolder.extended"), "extended");
    settingsForm->addRow(TR("patientFolder.folderType"), m_folderTypeCombo);

    // Options
    m_includeDosing = new QCheckBox(TR("patientFolder.includeDosing"));
    m_includeDosing->setChecked(true);
    settingsForm->addRow("", m_includeDosing);

    m_includeSideEffects = new QCheckBox(TR("patientFolder.includeSideEffects"));
    m_includeSideEffects->setChecked(true);
    settingsForm->addRow("", m_includeSideEffects);

    leftLayout->addWidget(settingsGroup);

    // Content editors in tabs
    auto* contentTabs = new QTabWidget();

    auto createEditor = [](QTextEdit*& edit, const QString& placeholder) -> QWidget* {
        auto* w = new QWidget();
        auto* l = new QVBoxLayout(w);
        l->setContentsMargins(4, 4, 4, 4);
        edit = new QTextEdit();
        edit->setPlaceholderText(placeholder);
        edit->setMaximumHeight(120);
        l->addWidget(edit);
        return w;
    };

    contentTabs->addTab(createEditor(m_introEdit, TR("patientFolder.introPlaceholder")),
                         TR("patientFolder.fieldIntroduction", {{"name", m_drug.generic_name}}));
    contentTabs->addTab(createEditor(m_usageEdit, TR("patientFolder.indicationPlaceholder")),
                         TR("patientFolder.fieldUsage"));
    contentTabs->addTab(createEditor(m_dosingEdit, TR("patientFolder.dosingPlaceholder")),
                         TR("patientFolder.fieldDosing"));
    contentTabs->addTab(createEditor(m_contraEdit, TR("patientFolder.contraPlaceholder")),
                         TR("patientFolder.fieldContraindications"));
    contentTabs->addTab(createEditor(m_sideEffectsCommonEdit, TR("patientFolder.sideEffectPlaceholder")),
                         TR("patientFolder.fieldCommonSideEffects"));
    contentTabs->addTab(createEditor(m_sideEffectsSeriousEdit, TR("patientFolder.sideEffectPlaceholder")),
                         TR("patientFolder.fieldSeriousSideEffects"));
    contentTabs->addTab(createEditor(m_tipsEdit, TR("patientFolder.tipsPlaceholder")),
                         TR("patientFolder.fieldTips"));
    contentTabs->addTab(createEditor(m_selfCareEdit, TR("patientFolder.selfCarePlaceholder")),
                         TR("patientFolder.fieldSelfCare"));
    contentTabs->addTab(createEditor(m_monitoringEdit, TR("patientFolder.monitoringPlaceholder")),
                         TR("patientFolder.fieldMonitoring"));

    leftLayout->addWidget(contentTabs);

    // Buttons
    auto* btnLayout = new QHBoxLayout();
    m_saveBtn = new QPushButton(TR("common.save"));
    m_saveBtn->setObjectName("secondaryButton");
    connect(m_saveBtn, &QPushButton::clicked, this, &PatientFolderDialog::onSaveContent);
    btnLayout->addWidget(m_saveBtn);

    m_resetBtn = new QPushButton(TR("patientFolder.reset"));
    connect(m_resetBtn, &QPushButton::clicked, this, &PatientFolderDialog::onResetContent);
    btnLayout->addWidget(m_resetBtn);

    btnLayout->addStretch();

    m_generateBtn = new QPushButton(TR("patientFolder.generate"));
    m_generateBtn->setObjectName("primaryButton");
    connect(m_generateBtn, &QPushButton::clicked, this, &PatientFolderDialog::onGenerate);
    btnLayout->addWidget(m_generateBtn);

    m_exportBtn = new QPushButton(TR("patientFolder.downloadPdf"));
    m_exportBtn->setObjectName("primaryButton");
    m_exportBtn->setEnabled(false);
    connect(m_exportBtn, &QPushButton::clicked, this, &PatientFolderDialog::onExportPdf);
    btnLayout->addWidget(m_exportBtn);

    leftLayout->addLayout(btnLayout);
    mainLayout->addWidget(leftPanel);

    // Right panel: preview
    auto* rightPanel = new QWidget();
    auto* rightLayout = new QVBoxLayout(rightPanel);

    auto* previewLabel = new QLabel(TR("patientFolder.preview"));
    previewLabel->setStyleSheet("font-weight: bold; font-size: 14px; color: #4a3550;");
    rightLayout->addWidget(previewLabel);

    m_previewArea = new QTextEdit();
    m_previewArea->setReadOnly(true);
    m_previewArea->setStyleSheet("background-color: white; border: 1px solid #e2d8e6; border-radius: 8px; padding: 16px;");
    rightLayout->addWidget(m_previewArea);

    mainLayout->addWidget(rightPanel, 1);
}

void PatientFolderDialog::loadContent() {
    DrugRepository repo;
    const auto& hospital = AuthManager::instance().currentHospital();
    auto content = repo.getPatientFolderContent(m_drug.id, hospital.id);

    if (content) {
        m_introEdit->setPlainText(content->introduction);
        m_usageEdit->setPlainText(content->usage_info);
        m_dosingEdit->setPlainText(content->dosing_info);
        m_contraEdit->setPlainText(content->contraindications);
        m_sideEffectsCommonEdit->setPlainText(content->side_effects_common);
        m_sideEffectsSeriousEdit->setPlainText(content->side_effects_serious);
        m_tipsEdit->setPlainText(content->tips);
        m_selfCareEdit->setPlainText(content->self_care_tips);
        m_monitoringEdit->setPlainText(content->monitoring);
    } else {
        // Auto-populate from drug data
        m_introEdit->setPlainText(m_drug.mechanism_of_action);
        m_usageEdit->setPlainText(m_drug.approved_indications.join("\n"));

        QString dosing;
        if (!m_drug.dosing_info.standard_dose.isEmpty())
            dosing += TR("drugDetail.standardDose") + ": " + m_drug.dosing_info.standard_dose + "\n";
        if (!m_drug.dosing_info.frequency.isEmpty())
            dosing += TR("drugDetail.frequency") + ": " + m_drug.dosing_info.frequency + "\n";
        m_dosingEdit->setPlainText(dosing);

        m_contraEdit->setPlainText(m_drug.contraindications.join("\n"));
        m_sideEffectsCommonEdit->setPlainText(m_drug.side_effects.common.join("\n"));
        m_sideEffectsSeriousEdit->setPlainText(m_drug.side_effects.serious.join("\n"));
        m_tipsEdit->setPlainText(m_drug.patient_counseling_points.join("\n"));
        m_monitoringEdit->setPlainText(m_drug.monitoring_requirements.join("\n"));
    }
}

QString PatientFolderDialog::generateHtml() const {
    const auto& hospital = AuthManager::instance().currentHospital();
    QString color = hospital.branding.primary_color.name();

    auto formatBullets = [](const QString& text) -> QString {
        QString html;
        for (const auto& line : text.split('\n', Qt::SkipEmptyParts)) {
            QString trimmed = line.trimmed();
            if (trimmed.startsWith("•") || trimmed.startsWith("-"))
                trimmed = trimmed.mid(1).trimmed();
            html += "<li>" + trimmed + "</li>";
        }
        return "<ul>" + html + "</ul>";
    };

    QString html = QString(R"(
<!DOCTYPE html>
<html>
<head><style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; color: #333; margin: 20px; }
    h1 { color: %1; font-size: 22pt; border-bottom: 3px solid %1; padding-bottom: 8px; }
    h2 { color: %1; font-size: 14pt; margin-top: 16px; }
    .header { display: flex; margin-bottom: 16px; }
    .hospital-name { color: %1; font-size: 10pt; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .warning-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .green-box { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin: 8px 0; }
    .red-box { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px; margin: 8px 0; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9pt; color: #666; }
    .contact { background: #f5f0f7; border-radius: 8px; padding: 12px; margin: 12px 0; }
</style></head>
<body>
    <p class="hospital-name">%2</p>
    <h1>%3</h1>
)").arg(color, hospital.name, m_drug.generic_name);

    if (!m_drug.brand_names.isEmpty()) {
        html += "<p><em>" + m_drug.brand_names.join(", ") + "</em></p>";
    }

    // Contact info
    QString physician = m_physicianCombo->currentText();
    QString nurse = m_nurseCombo->currentText();
    if (physician != TR("patientFolder.select") || nurse != TR("patientFolder.select")) {
        html += "<div class='contact'>";
        if (physician != TR("patientFolder.select"))
            html += "<p><strong>" + TR("patientFolder.physician") + ":</strong> " + physician + "</p>";
        if (nurse != TR("patientFolder.select"))
            html += "<p><strong>" + TR("patientFolder.nurse") + ":</strong> " + nurse + "</p>";
        html += "</div>";
    }

    // Content sections
    if (!m_introEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldIntroduction", {{"name", m_drug.generic_name}}) + "</h2>";
        html += "<div class='info-box'>" + m_introEdit->toPlainText().replace("\n", "<br>") + "</div>";
    }

    if (!m_usageEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldUsage") + "</h2>";
        html += formatBullets(m_usageEdit->toPlainText());
    }

    if (m_includeDosing->isChecked() && !m_dosingEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldDosing") + "</h2>";
        html += "<div class='info-box'>" + m_dosingEdit->toPlainText().replace("\n", "<br>") + "</div>";
    }

    if (!m_contraEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldContraindications") + "</h2>";
        html += "<div class='warning-box'>" + formatBullets(m_contraEdit->toPlainText()) + "</div>";
    }

    if (m_includeSideEffects->isChecked()) {
        if (!m_sideEffectsCommonEdit->toPlainText().isEmpty()) {
            html += "<h2>" + TR("patientFolder.fieldCommonSideEffects") + "</h2>";
            html += formatBullets(m_sideEffectsCommonEdit->toPlainText());
        }
        if (!m_sideEffectsSeriousEdit->toPlainText().isEmpty()) {
            html += "<h2>" + TR("patientFolder.fieldSeriousSideEffects") + "</h2>";
            html += "<div class='red-box'>" + formatBullets(m_sideEffectsSeriousEdit->toPlainText()) + "</div>";
        }
    }

    if (!m_tipsEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldTips") + "</h2>";
        html += formatBullets(m_tipsEdit->toPlainText());
    }

    if (!m_selfCareEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldSelfCare") + "</h2>";
        html += "<div class='green-box'>" + formatBullets(m_selfCareEdit->toPlainText()) + "</div>";
    }

    if (!m_monitoringEdit->toPlainText().isEmpty()) {
        html += "<h2>" + TR("patientFolder.fieldMonitoring") + "</h2>";
        html += formatBullets(m_monitoringEdit->toPlainText());
    }

    html += "<div class='footer'>" + TR("footer.disclaimerFull") + "</div>";
    html += "</body></html>";

    return html;
}

void PatientFolderDialog::onGenerate() {
    QString html = generateHtml();
    m_previewArea->setHtml(html);
    m_exportBtn->setEnabled(true);

    AuditLogger::instance().logExport(
        AuthManager::instance().currentUser(), "patient_folder",
        m_drug.generic_name);
}

void PatientFolderDialog::onExportPdf() {
    QString fileName = QFileDialog::getSaveFileName(this,
        TR("patientFolder.downloadPdf"),
        m_drug.generic_name + "_patient_folder.pdf",
        "PDF (*.pdf)");

    if (fileName.isEmpty()) return;

    QPrinter printer(QPrinter::HighResolution);
    printer.setOutputFormat(QPrinter::PdfFormat);
    printer.setOutputFileName(fileName);
    printer.setPageSize(QPageSize::A4);
    printer.setPageMargins(QMarginsF(15, 15, 15, 15), QPageLayout::Millimeter);

    QTextDocument doc;
    doc.setHtml(generateHtml());
    doc.print(&printer);

    QMessageBox::information(this, TR("common.success"), TR("patientFolder.downloaded"));
}

void PatientFolderDialog::onSaveContent() {
    PatientFolderContent content;
    content.drug_id = m_drug.id;
    content.hospital_id = AuthManager::instance().currentHospital().id;
    content.introduction = m_introEdit->toPlainText();
    content.usage_info = m_usageEdit->toPlainText();
    content.dosing_info = m_dosingEdit->toPlainText();
    content.contraindications = m_contraEdit->toPlainText();
    content.side_effects_common = m_sideEffectsCommonEdit->toPlainText();
    content.side_effects_serious = m_sideEffectsSeriousEdit->toPlainText();
    content.tips = m_tipsEdit->toPlainText();
    content.self_care_tips = m_selfCareEdit->toPlainText();
    content.monitoring = m_monitoringEdit->toPlainText();

    DrugRepository repo;
    if (repo.savePatientFolderContent(content)) {
        QMessageBox::information(this, TR("common.success"), TR("patientFolder.contentSaved"));
    } else {
        QMessageBox::warning(this, TR("common.error"), TR("patientFolder.saveError"));
    }
}

void PatientFolderDialog::onResetContent() {
    auto result = QMessageBox::question(this, TR("patientFolder.reset"), TR("patientFolder.resetConfirm"));
    if (result == QMessageBox::Yes) {
        DrugRepository repo;
        repo.deletePatientFolderContent(m_drug.id, AuthManager::instance().currentHospital().id);
        loadContent();
    }
}

} // namespace OncoInfo
