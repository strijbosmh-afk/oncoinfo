#pragma once

#include <QDialog>
#include <QComboBox>
#include <QTextEdit>
#include <QPushButton>
#include <QCheckBox>
#include "models/Drug.h"

namespace OncoInfo {

class PatientFolderDialog : public QDialog {
    Q_OBJECT

public:
    explicit PatientFolderDialog(const Drug& drug, QWidget* parent = nullptr);

private slots:
    void onGenerate();
    void onExportPdf();
    void onSaveContent();
    void onResetContent();

private:
    void setupUi();
    void loadContent();
    QString generateHtml() const;

    Drug m_drug;

    // Settings
    QComboBox* m_physicianCombo;
    QComboBox* m_nurseCombo;
    QComboBox* m_languageCombo;
    QComboBox* m_folderTypeCombo;
    QCheckBox* m_includeDosing;
    QCheckBox* m_includeSideEffects;

    // Content editors
    QTextEdit* m_introEdit;
    QTextEdit* m_usageEdit;
    QTextEdit* m_dosingEdit;
    QTextEdit* m_contraEdit;
    QTextEdit* m_sideEffectsCommonEdit;
    QTextEdit* m_sideEffectsSeriousEdit;
    QTextEdit* m_tipsEdit;
    QTextEdit* m_selfCareEdit;
    QTextEdit* m_monitoringEdit;

    // Preview
    QTextEdit* m_previewArea;

    // Buttons
    QPushButton* m_generateBtn;
    QPushButton* m_exportBtn;
    QPushButton* m_saveBtn;
    QPushButton* m_resetBtn;
};

} // namespace OncoInfo
