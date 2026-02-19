#include "AdminPanel.h"
#include "auth/AuthManager.h"
#include "core/DrugRepository.h"
#include "core/UserRepository.h"
#include "core/AuditLogger.h"
#include "i18n/TranslationManager.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QTableWidget>
#include <QHeaderView>
#include <QGroupBox>
#include <QLineEdit>
#include <QComboBox>
#include <QDateEdit>
#include <QMessageBox>
#include <QFormLayout>
#include <QDialogButtonBox>
#include <QDialog>
#include <QFont>

namespace OncoInfo {

AdminPanel::AdminPanel(QWidget* parent) : QWidget(parent) {
    setupUi();
}

void AdminPanel::setupUi() {
    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(24, 16, 24, 16);

    auto* titleLabel = new QLabel(TR("admin.title"));
    QFont titleFont;
    titleFont.setPointSize(20);
    titleFont.setBold(true);
    titleLabel->setFont(titleFont);
    titleLabel->setStyleSheet("color: #4a3550;");
    layout->addWidget(titleLabel);

    auto* descLabel = new QLabel(TR("admin.description"));
    descLabel->setStyleSheet("color: #6b7280; margin-bottom: 12px;");
    layout->addWidget(descLabel);

    m_tabWidget = new QTabWidget();
    m_tabWidget->addTab(createOverviewTab(), TR("admin.overview"));
    m_tabWidget->addTab(createDrugManagementTab(), TR("admin.drugsTab"));
    m_tabWidget->addTab(createUserManagementTab(), TR("admin.userManagement"));
    m_tabWidget->addTab(createAuditLogTab(), TR("admin.activityLog"));
    layout->addWidget(m_tabWidget);
}

void AdminPanel::refresh() {
    // Rebuild tabs
    m_tabWidget->clear();
    m_tabWidget->addTab(createOverviewTab(), TR("admin.overview"));
    m_tabWidget->addTab(createDrugManagementTab(), TR("admin.drugsTab"));
    m_tabWidget->addTab(createUserManagementTab(), TR("admin.userManagement"));
    m_tabWidget->addTab(createAuditLogTab(), TR("admin.activityLog"));
}

QWidget* AdminPanel::createOverviewTab() {
    auto* widget = new QWidget();
    auto* layout = new QVBoxLayout(widget);

    DrugRepository drugRepo;

    auto* statsLayout = new QHBoxLayout();

    // Total drugs card
    auto* totalCard = new QGroupBox(TR("admin.totalDrugs"));
    auto* tcl = new QVBoxLayout(totalCard);
    auto* totalLabel = new QLabel(QString::number(drugRepo.totalCount()));
    totalLabel->setStyleSheet("font-size: 36px; font-weight: bold; color: #6b2d5b;");
    totalLabel->setAlignment(Qt::AlignCenter);
    tcl->addWidget(totalLabel);
    statsLayout->addWidget(totalCard);

    // Combination regimens
    auto* comboCard = new QGroupBox(TR("admin.combinationRegimens"));
    auto* ccl = new QVBoxLayout(comboCard);
    auto* comboLabel = new QLabel(QString::number(drugRepo.combinationCount()));
    comboLabel->setStyleSheet("font-size: 36px; font-weight: bold; color: #d97706;");
    comboLabel->setAlignment(Qt::AlignCenter);
    ccl->addWidget(comboLabel);
    statsLayout->addWidget(comboCard);

    // Individual drugs
    auto* indCard = new QGroupBox(TR("admin.individualDrugs"));
    auto* icl = new QVBoxLayout(indCard);
    auto* indLabel = new QLabel(QString::number(drugRepo.individualCount()));
    indLabel->setStyleSheet("font-size: 36px; font-weight: bold; color: #059669;");
    indLabel->setAlignment(Qt::AlignCenter);
    icl->addWidget(indLabel);
    statsLayout->addWidget(indCard);

    layout->addLayout(statsLayout);

    // Library description
    auto* desc = new QLabel(TR("admin.libraryStats", {
        {"total", QString::number(drugRepo.totalCount())},
        {"combos", QString::number(drugRepo.combinationCount())},
        {"individual", QString::number(drugRepo.individualCount())}
    }));
    desc->setWordWrap(true);
    desc->setStyleSheet("color: #6b7280; padding: 12px;");
    layout->addWidget(desc);

    layout->addStretch();
    return widget;
}

QWidget* AdminPanel::createUserManagementTab() {
    auto* widget = new QWidget();
    auto* layout = new QVBoxLayout(widget);

    const auto& currentUser = AuthManager::instance().currentUser();
    UserRepository userRepo;
    auto users = userRepo.getAllUsers(currentUser.hospital_id);

    // Header with add button
    auto* header = new QHBoxLayout();
    auto* userCount = new QLabel(QString::number(users.size()) + " " + TR("userMgmt.users"));
    userCount->setStyleSheet("color: #6b7280;");
    header->addWidget(userCount);
    header->addStretch();

    auto* addBtn = new QPushButton(TR("userMgmt.newUser"));
    addBtn->setObjectName("primaryButton");
    connect(addBtn, &QPushButton::clicked, [this]() {
        // Create user dialog
        QDialog dialog(this);
        dialog.setWindowTitle(TR("userDialog.createTitle"));
        dialog.setMinimumWidth(400);

        auto* formLayout = new QFormLayout(&dialog);

        auto* firstNameEdit = new QLineEdit();
        firstNameEdit->setPlaceholderText(TR("userDialog.firstNamePlaceholder"));
        formLayout->addRow(TR("userDialog.firstName"), firstNameEdit);

        auto* lastNameEdit = new QLineEdit();
        lastNameEdit->setPlaceholderText(TR("userDialog.lastNamePlaceholder"));
        formLayout->addRow(TR("userDialog.lastName"), lastNameEdit);

        auto* usernameEdit = new QLineEdit();
        usernameEdit->setPlaceholderText(TR("userDialog.usernamePlaceholder"));
        formLayout->addRow(TR("userDialog.username"), usernameEdit);

        auto* emailEdit = new QLineEdit();
        emailEdit->setPlaceholderText(TR("userDialog.emailPlaceholder"));
        formLayout->addRow(TR("userDialog.email"), emailEdit);

        auto* passwordEdit = new QLineEdit();
        passwordEdit->setEchoMode(QLineEdit::Password);
        formLayout->addRow(TR("userDialog.password"), passwordEdit);

        auto* functionCombo = new QComboBox();
        functionCombo->addItem(TR("userDialog.functionArts"), "arts");
        functionCombo->addItem(TR("userDialog.functionApotheek"), "apotheker");
        functionCombo->addItem(TR("userDialog.functionVerpleegkundige"), "verpleegkundige");
        functionCombo->addItem(TR("userDialog.functionOverige"), "overige");
        formLayout->addRow(TR("userDialog.function"), functionCombo);

        auto* roleCombo = new QComboBox();
        roleCombo->addItem(TR("userDialog.roleViewer"), "viewer");
        roleCombo->addItem(TR("userDialog.roleApotheker"), "apotheker");
        roleCombo->addItem(TR("userDialog.roleAdmin"), "admin");
        formLayout->addRow(TR("userDialog.role"), roleCombo);

        auto* buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel);
        connect(buttons, &QDialogButtonBox::accepted, &dialog, &QDialog::accept);
        connect(buttons, &QDialogButtonBox::rejected, &dialog, &QDialog::reject);
        formLayout->addRow(buttons);

        if (dialog.exec() == QDialog::Accepted) {
            User newUser;
            newUser.first_name = firstNameEdit->text();
            newUser.last_name = lastNameEdit->text();
            newUser.username = usernameEdit->text();
            newUser.email = emailEdit->text();
            newUser.function = functionCombo->currentData().toString();
            newUser.role = roleFromString(roleCombo->currentData().toString());
            newUser.hospital_id = AuthManager::instance().currentUser().hospital_id;

            UserRepository repo;
            if (repo.createUser(newUser, passwordEdit->text())) {
                QMessageBox::information(this, TR("common.success"), TR("userMgmt.newUser") + " created.");
                refresh();
            } else {
                QMessageBox::warning(this, TR("common.error"), "Failed to create user.");
            }
        }
    });
    header->addWidget(addBtn);
    layout->addLayout(header);

    // Users table
    auto* table = new QTableWidget(users.size(), 6);
    table->setHorizontalHeaderLabels({
        TR("userDialog.firstName"), TR("userDialog.lastName"),
        TR("userDialog.username"), TR("userDialog.function"),
        TR("userDialog.role"), TR("userMgmt.lastLogin")
    });
    table->horizontalHeader()->setStretchLastSection(true);
    table->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    table->setSelectionBehavior(QAbstractItemView::SelectRows);
    table->setEditTriggers(QAbstractItemView::NoEditTriggers);

    for (int i = 0; i < users.size(); i++) {
        const auto& user = users[i];
        table->setItem(i, 0, new QTableWidgetItem(user.first_name));
        table->setItem(i, 1, new QTableWidgetItem(user.last_name));
        table->setItem(i, 2, new QTableWidgetItem(user.username));
        table->setItem(i, 3, new QTableWidgetItem(user.function));
        table->setItem(i, 4, new QTableWidgetItem(roleToString(user.role)));
        table->setItem(i, 5, new QTableWidgetItem(
            user.last_login.isValid() ? user.last_login.toString("dd-MM-yyyy HH:mm") : TR("userMgmt.never")
        ));
    }

    layout->addWidget(table);
    return widget;
}

QWidget* AdminPanel::createAuditLogTab() {
    auto* widget = new QWidget();
    auto* layout = new QVBoxLayout(widget);

    const auto& currentUser = AuthManager::instance().currentUser();
    auto entries = AuditLogger::instance().getEntries(currentUser.hospital_id, "", QDateTime(), QDateTime(), 100);

    auto* countLabel = new QLabel(QString::number(entries.size()) + " " + TR("auditLog.results"));
    countLabel->setStyleSheet("color: #6b7280;");
    layout->addWidget(countLabel);

    auto* table = new QTableWidget(entries.size(), 5);
    table->setHorizontalHeaderLabels({
        TR("auditLog.csvDate"), TR("auditLog.csvUser"),
        TR("auditLog.csvAction"), TR("auditLog.csvType"),
        TR("auditLog.csvName")
    });
    table->horizontalHeader()->setStretchLastSection(true);
    table->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    table->setSelectionBehavior(QAbstractItemView::SelectRows);
    table->setEditTriggers(QAbstractItemView::NoEditTriggers);

    for (int i = 0; i < entries.size(); i++) {
        const auto& e = entries[i];
        table->setItem(i, 0, new QTableWidgetItem(e.created_at.toString("dd-MM-yyyy HH:mm")));
        table->setItem(i, 1, new QTableWidgetItem(e.username));
        table->setItem(i, 2, new QTableWidgetItem(e.action));
        table->setItem(i, 3, new QTableWidgetItem(e.entity_type));
        table->setItem(i, 4, new QTableWidgetItem(e.entity_name));
    }

    layout->addWidget(table);
    return widget;
}

QWidget* AdminPanel::createDrugManagementTab() {
    auto* widget = new QWidget();
    auto* layout = new QVBoxLayout(widget);

    auto* desc = new QLabel(TR("admin.manageDrugsDesc"));
    desc->setStyleSheet("color: #6b7280; margin-bottom: 8px;");
    layout->addWidget(desc);

    DrugRepository repo;
    auto drugs = repo.getAll(true);

    auto* searchEdit = new QLineEdit();
    searchEdit->setPlaceholderText(TR("drugs.searchPlaceholder"));
    searchEdit->setObjectName("searchBar");
    layout->addWidget(searchEdit);

    auto* table = new QTableWidget(drugs.size(), 5);
    table->setHorizontalHeaderLabels({
        "Generic Name", "Drug Class", "Route", "RIZIV", "Archived"
    });
    table->horizontalHeader()->setStretchLastSection(true);
    table->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    table->setSelectionBehavior(QAbstractItemView::SelectRows);
    table->setEditTriggers(QAbstractItemView::NoEditTriggers);

    for (int i = 0; i < drugs.size(); i++) {
        const auto& d = drugs[i];
        table->setItem(i, 0, new QTableWidgetItem(d.generic_name));
        table->setItem(i, 1, new QTableWidgetItem(d.drug_class));
        table->setItem(i, 2, new QTableWidgetItem(d.administration_route));
        table->setItem(i, 3, new QTableWidgetItem(d.is_on_zvz ? "✓" : "✗"));
        table->setItem(i, 4, new QTableWidgetItem(d.is_archived ? "Yes" : "No"));
    }

    // Filter table by search
    connect(searchEdit, &QLineEdit::textChanged, [table](const QString& text) {
        for (int i = 0; i < table->rowCount(); i++) {
            bool match = text.isEmpty();
            if (!match) {
                for (int j = 0; j < table->columnCount(); j++) {
                    auto* item = table->item(i, j);
                    if (item && item->text().contains(text, Qt::CaseInsensitive)) {
                        match = true;
                        break;
                    }
                }
            }
            table->setRowHidden(i, !match);
        }
    });

    layout->addWidget(table);
    return widget;
}

} // namespace OncoInfo
