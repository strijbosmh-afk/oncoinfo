#include "StyleSheet.h"

namespace OncoInfo {

QString StyleSheet::applicationStyle(const QColor& primaryColor) {
    QString pc = primaryColor.name();
    QString pcLight = primaryColor.lighter(150).name();
    QString pcVeryLight = primaryColor.lighter(200).name();
    QString pcDark = primaryColor.darker(130).name();

    return QString(R"(
        /* Global application style matching OncoInfo web theme */
        QMainWindow, QDialog {
            background-color: #f5f0f7;
        }

        /* Header bar */
        QToolBar#headerBar {
            background-color: %1;
            border: none;
            padding: 4px 8px;
            spacing: 8px;
            min-height: 48px;
        }
        QToolBar#headerBar QLabel {
            color: white;
            font-weight: bold;
        }
        QToolBar#headerBar QToolButton {
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
        }
        QToolBar#headerBar QToolButton:hover {
            background-color: rgba(255,255,255,0.2);
        }

        /* Navigation buttons */
        QPushButton#navButton {
            background-color: %1;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
        }
        QPushButton#navButton:hover {
            background-color: %4;
        }

        /* Primary button */
        QPushButton#primaryButton, QPushButton[objectName="primaryButton"] {
            background-color: %1;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
        }
        QPushButton#primaryButton:hover {
            background-color: %4;
        }

        /* Secondary button */
        QPushButton#secondaryButton {
            background-color: white;
            color: %1;
            border: 1px solid %1;
            padding: 8px 20px;
            border-radius: 6px;
            font-size: 13px;
        }
        QPushButton#secondaryButton:hover {
            background-color: %3;
        }

        /* Cards */
        QFrame#card {
            background-color: white;
            border: 1px solid #e2d8e6;
            border-radius: 12px;
            padding: 16px;
        }
        QFrame#card:hover {
            border-color: %2;
            background-color: #faf8fb;
        }

        /* Specialty cards on home page */
        QFrame#specialtyCard {
            background-color: white;
            border: 2px solid #e2d8e6;
            border-radius: 16px;
            padding: 20px;
            min-height: 100px;
        }
        QFrame#specialtyCard:hover {
            border-color: %1;
            background-color: %3;
        }

        /* Drug cards */
        QFrame#drugCard {
            background-color: white;
            border: 1px solid #e2d8e6;
            border-radius: 10px;
            padding: 12px;
        }
        QFrame#drugCard:hover {
            border-color: %2;
        }

        /* Combination regimen card */
        QFrame#combinationCard {
            background-color: #fffbeb;
            border: 1px solid #fbbf24;
            border-radius: 10px;
            padding: 12px;
        }

        /* Search bar */
        QLineEdit#searchBar {
            background-color: white;
            border: 2px solid #e2d8e6;
            border-radius: 24px;
            padding: 10px 20px;
            font-size: 14px;
        }
        QLineEdit#searchBar:focus {
            border-color: %1;
        }

        /* Tabs */
        QTabWidget::pane {
            border: 1px solid #e2d8e6;
            border-radius: 8px;
            background-color: white;
            padding: 12px;
        }
        QTabBar::tab {
            background-color: #f0ebf3;
            border: 1px solid #e2d8e6;
            padding: 8px 20px;
            margin-right: 2px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
        }
        QTabBar::tab:selected {
            background-color: white;
            border-bottom-color: white;
            color: %1;
            font-weight: bold;
        }
        QTabBar::tab:hover:!selected {
            background-color: %3;
        }

        /* Badges */
        QLabel#badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: bold;
        }
        QLabel#badgeGreen {
            background-color: #dcfce7;
            color: #166534;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }
        QLabel#badgeRed {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }
        QLabel#badgeAmber {
            background-color: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }

        /* Filter chips */
        QPushButton#filterChip {
            background-color: #f0ebf3;
            border: 1px solid #d4c8db;
            border-radius: 16px;
            padding: 4px 14px;
            font-size: 12px;
            color: #4a3550;
        }
        QPushButton#filterChip:checked {
            background-color: %1;
            color: white;
            border-color: %1;
        }
        QPushButton#filterChip:hover {
            background-color: %3;
        }

        /* Scroll areas */
        QScrollArea {
            border: none;
            background-color: transparent;
        }

        /* Table styling */
        QTableWidget {
            border: 1px solid #e2d8e6;
            border-radius: 8px;
            gridline-color: #f0ebf3;
            background-color: white;
        }
        QHeaderView::section {
            background-color: %3;
            color: %4;
            padding: 8px;
            border: none;
            font-weight: bold;
        }

        /* Star button (favorites) */
        QPushButton#starButton {
            border: none;
            background: transparent;
            font-size: 18px;
            padding: 4px;
        }

        /* Lightning button (most used) */
        QPushButton#lightningButton {
            border: none;
            background: transparent;
            font-size: 18px;
            padding: 4px;
        }

        /* Disclaimer banner */
        QFrame#disclaimer {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 12px;
        }

        /* Login dialog */
        QDialog#loginDialog {
            background-color: white;
        }

        /* Status bar */
        QStatusBar {
            background-color: %3;
            color: #666;
            font-size: 11px;
        }

        /* Combo box */
        QComboBox {
            border: 1px solid #d4c8db;
            border-radius: 6px;
            padding: 6px 12px;
            background-color: white;
        }
        QComboBox:focus {
            border-color: %1;
        }

        /* Group box */
        QGroupBox {
            border: 1px solid #e2d8e6;
            border-radius: 8px;
            margin-top: 12px;
            padding-top: 20px;
            font-weight: bold;
            color: %4;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 12px;
            padding: 0 4px;
        }
    )").arg(pc, pcLight, pcVeryLight, pcDark);
}

QColor StyleSheet::drugClassColor(const QString& drugClass) {
    static QMap<QString, QColor> colors = {
        {"Immunotherapie (IO/ICI)", QColor("#3b82f6")},
        {"PARPi", QColor("#8b5cf6")},
        {"ARPI", QColor("#f97316")},
        {"Chemotherapie", QColor("#ef4444")},
        {"TKI", QColor("#06b6d4")},
        {"ADC", QColor("#ec4899")},
        {"Radioligand Therapie", QColor("#f59e0b")},
        {"Hormonale Therapie", QColor("#10b981")},
        {"Antiresorptiva", QColor("#6366f1")},
        {"Combinatietherapie", QColor("#d97706")},
        {"Supportive Care", QColor("#64748b")},
        {"HER2-remmers", QColor("#e11d48")},
        {"CDK4/6i", QColor("#7c3aed")},
        {"ALK-remmer", QColor("#0891b2")},
        {"EGFR-remmer", QColor("#059669")},
        {"Angiogeneseremmer", QColor("#0284c7")},
        {"BRAF/MEK-remmer", QColor("#ca8a04")},
        {"KRAS-remmer", QColor("#9333ea")},
        {"FGFR-remmer", QColor("#0d9488")}
    };
    return colors.value(drugClass, QColor("#6b7280"));
}

QString StyleSheet::drugCardStyle(const QString& drugClass) {
    QColor color = drugClassColor(drugClass);
    if (drugClass == "Combinatietherapie") {
        return QString("QFrame { background-color: #fffbeb; border-left: 4px solid %1; }").arg(color.name());
    }
    return QString("QFrame { border-left: 4px solid %1; }").arg(color.name());
}

QString StyleSheet::categoryIcon(const QString& categoryKey) {
    static QMap<QString, QString> icons = {
        {"breast", "B"},
        {"urology", "U"},
        {"gynecology", "G"},
        {"respiratory", "R"},
        {"digestive", "D"},
        {"skin", "S"},
        {"head_neck", "H"},
        {"other", "O"}
    };
    return icons.value(categoryKey, "?");
}

} // namespace OncoInfo
