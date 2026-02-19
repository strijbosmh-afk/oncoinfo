#pragma once

#include <QString>
#include <QStringList>
#include <QJsonObject>
#include <QJsonArray>
#include <QDateTime>
#include <QVariant>
#include <vector>
#include <map>

namespace OncoInfo {

struct DosingInfo {
    QString standard_dose;
    QString max_dose;
    QString frequency;
    QString duration;
    struct Adjustment {
        QString condition;
        QString adjustment;
    };
    std::vector<Adjustment> dose_adjustments;

    static DosingInfo fromJson(const QJsonObject& obj) {
        DosingInfo info;
        info.standard_dose = obj["standard_dose"].toString();
        info.max_dose = obj["max_dose"].toString();
        info.frequency = obj["frequency"].toString();
        info.duration = obj["duration"].toString();
        if (obj.contains("dose_adjustments")) {
            for (const auto& adj : obj["dose_adjustments"].toArray()) {
                auto a = adj.toObject();
                info.dose_adjustments.push_back({
                    a["condition"].toString(),
                    a["adjustment"].toString()
                });
            }
        }
        return info;
    }

    QJsonObject toJson() const {
        QJsonObject obj;
        obj["standard_dose"] = standard_dose;
        obj["max_dose"] = max_dose;
        obj["frequency"] = frequency;
        obj["duration"] = duration;
        QJsonArray adjs;
        for (const auto& a : dose_adjustments) {
            QJsonObject adj;
            adj["condition"] = a.condition;
            adj["adjustment"] = a.adjustment;
            adjs.append(adj);
        }
        obj["dose_adjustments"] = adjs;
        return obj;
    }
};

struct SideEffects {
    QStringList common;
    QStringList serious;
    std::map<QString, QString> management;

    static SideEffects fromJson(const QJsonObject& obj) {
        SideEffects se;
        auto toList = [](const QJsonArray& arr) {
            QStringList list;
            for (const auto& v : arr) list << v.toString();
            return list;
        };
        if (obj.contains("common")) se.common = toList(obj["common"].toArray());
        if (obj.contains("veel_voorkomend")) se.common = toList(obj["veel_voorkomend"].toArray());
        if (obj.contains("serious")) se.serious = toList(obj["serious"].toArray());
        if (obj.contains("ernstig")) se.serious = toList(obj["ernstig"].toArray());
        if (obj.contains("management")) {
            auto mgmt = obj["management"].toObject();
            for (auto it = mgmt.begin(); it != mgmt.end(); ++it) {
                se.management[it.key()] = it.value().toString();
            }
        }
        return se;
    }

    QJsonObject toJson() const {
        QJsonObject obj;
        QJsonArray c, s;
        for (const auto& v : common) c.append(v);
        for (const auto& v : serious) s.append(v);
        obj["common"] = c;
        obj["serious"] = s;
        QJsonObject mgmt;
        for (const auto& [k, v] : management) mgmt[k] = v;
        obj["management"] = mgmt;
        return obj;
    }
};

struct Drug {
    QString id;
    QString generic_name;
    QStringList brand_names;
    QString drug_class;
    QString mechanism_of_action;
    QStringList disease_areas;
    QStringList approved_indications;
    QStringList common_regimens;
    DosingInfo dosing_info;
    QString administration_route;
    int cycle_length_days = 0;
    SideEffects side_effects;
    QStringList contraindications;
    QStringList drug_interactions;
    QStringList monitoring_requirements;
    QStringList patient_counseling_points;
    QString ema_approval_date;
    QString fda_approval_date;
    bool is_on_zvz = false;
    double unit_price = 0.0;
    QString price_unit;
    QStringList reference_links;
    int display_order = 0;
    bool is_archived = false;
    QString hospital_id;
    QDateTime created_at;
    QDateTime updated_at;

    bool isCombination() const {
        return drug_class == "Combinatietherapie";
    }
};

struct PatientFolderContent {
    QString id;
    QString drug_id;
    QString hospital_id;
    QString introduction;
    QString usage_info;
    QString dosing_info;
    QString contraindications;
    QString side_effects_common;
    QString side_effects_serious;
    QString tips;
    QString self_care_tips;
    QString monitoring;
    QDateTime created_at;
    QDateTime updated_at;
};

// Drug category definitions matching the web app
struct CategorySubtype {
    QString key;
    QString label;
    QString description;
};

struct DrugCategory {
    QString key;
    QString name;
    std::vector<CategorySubtype> subtypes;
    std::vector<CategorySubtype> stages;
    std::vector<CategorySubtype> diseaseAreas;
    std::vector<CategorySubtype> subcategories;
    QStringList drugClasses;
};

inline std::vector<DrugCategory> getDrugCategories() {
    return {
        {"breast", "Borstkanker",
            {{"hr_positive", "Hormoongevoelig (HR+)", "ER+ en/of PR+ tumoren"},
             {"her2_positive", "HER2-positief", "HER2-overexpressie of -amplificatie"},
             {"triple_negative", "Triple negatief", "ER-, PR-, HER2-"}},
            {{"neoadjuvant_adjuvant", "Neoadjuvant/Adjuvant", "Vroeg stadium"},
             {"metastatic", "Gemetastaseerd", "Stadium IV"}},
            {}, {},
            {"Chemotherapie", "Hormoontherapie", "HER2-remmers", "CDK4/6i", "IO/ICI", "ADC", "PARPi"}},
        {"urology", "Urologie",
            {}, {},
            {{"prostate", "Prostaatkanker", "mCRPC, mHSPC, gelokaliseerd"},
             {"bladder", "Blaaskanker", "NMIBC, MIBC, gemetastaseerd"},
             {"kidney", "Niercelcarcinoom", "Heldercellig, niet-heldercellig"},
             {"testis", "Testiskanker", "Seminoom, non-seminoom"},
             {"penile", "Peniskanker", "Plaveiselcelcarcinoom"}},
            {},
            {"ARPI", "Chemotherapie", "IO/ICI", "TKI", "PARPi", "Radioligand Therapie", "Hormonale Therapie", "Antiresorptiva"}},
        {"gynecology", "Gynaecologie",
            {}, {},
            {{"ovarian", "Ovariumcarcinoom", "Epitheliaal, kiemcel"},
             {"endometrial", "Endometriumcarcinoom", "Type I en II"},
             {"cervical", "Cervixcarcinoom", "Plaveiselcel, adenocarcinoom"},
             {"vulvar", "Vulvacarcinoom", "Plaveiselcelcarcinoom"}},
            {},
            {"Chemotherapie", "PARPi", "Antiangiogenese", "IO/ICI", "Hormoontherapie"}},
        {"respiratory", "Respiratoire",
            {}, {},
            {{"nsclc", "NSCLC", "Niet-kleincellig longcarcinoom"},
             {"sclc", "SCLC", "Kleincellig longcarcinoom"},
             {"mesothelioma", "Mesothelioom", "Pleuraal mesothelioom"}},
            {},
            {"Chemotherapie", "IO/ICI", "ALK-remmer", "EGFR-remmer", "TKI", "Angiogeneseremmer", "Combinatietherapie"}},
        {"digestive", "Digestieve",
            {}, {},
            {{"colorectal", "Colorectaal carcinoom", "Colon- en rectumcarcinoom"},
             {"gastric", "Maagcarcinoom", "Maag- en slokdarmkanker"},
             {"esophageal", "Oesofaguscarcinoom", "Slokdarmkanker"},
             {"pancreatic", "Pancreascarcinoom", "Alvleesklierkanker"},
             {"hepatocellular", "Hepatocellulair carcinoom", "Levercelkanker (HCC)"},
             {"biliary", "Galwegcarcinoom", "Galweg- en galblaaskanker"}},
            {},
            {"Chemotherapie", "IO/ICI", "EGFR-remmer", "Angiogeneseremmer", "TKI", "Combinatietherapie", "HER2-remmers", "PARPi"}},
        {"skin", "Huid",
            {}, {},
            {{"melanoma", "Melanoom", "Cutaan melanoom"},
             {"merkel", "Merkelcelcarcinoom", "Merkelcelcarcinoom"},
             {"cutaneous_scc", "Cutaan plaveiselcelcarcinoom", "Cutaan SCC"}},
            {},
            {"IO/ICI", "BRAF/MEK-remmer", "Combinatietherapie"}},
        {"head_neck", "Hoofd & Hals",
            {}, {},
            {{"hnscc", "Hoofd-halscarcinoom", "Plaveiselcelcarcinoom hoofd-hals"},
             {"nasopharyngeal", "Nasofarynxcarcinoom", "Nasofarynxcarcinoom"},
             {"salivary", "Speekselkliercarcinoom", "Speekselklierkanker"}},
            {},
            {"Chemotherapie", "IO/ICI", "EGFR-remmer", "Combinatietherapie"}},
        {"other", "Overige",
            {}, {}, {},
            {{"antiresorptive", "Antiresorptiva", "Botbeschermende medicatie"},
             {"antiemetic", "Anti-emetica", "Misselijkheidsbehandeling"},
             {"gcsf", "G-CSF", "Groeifactoren"},
             {"erythropoietin", "Erytropoietines", "Erytropoiese-stimulerende middelen"},
             {"thrombopoietin", "Trombopoietine-agonisten", "Trombocytenstimulatie"},
             {"supportive", "Overige supportive care", "Overige ondersteunende medicatie"}},
            {"Antiresorptiva", "Supportive Care"}}
    };
}

} // namespace OncoInfo
