#pragma once

#include <QString>
#include <QStringList>
#include <QColor>
#include <QDateTime>

namespace OncoInfo {

struct HospitalBranding {
    QColor primary_color = QColor("#6b2d5b");
    QString logo_path;  // Local path to logo file
};

struct Hospital {
    QString id;
    QString name;
    QString slug;
    QString logo_url;
    HospitalBranding branding;
    bool is_active = true;
    QString default_language = "nl";
    int display_order = 0;
    QStringList enabled_disciplines;
    QDateTime created_at;
    QDateTime updated_at;
};

struct HospitalDoctor {
    QString id;
    QString hospital_id;
    QString name;
    QString staff_type;     // doctor, nurse, pharmacist
    QString specialization;
    int display_order = 0;
    bool is_active = true;
};

} // namespace OncoInfo
