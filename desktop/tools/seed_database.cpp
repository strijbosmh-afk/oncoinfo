/**
 * Database Seeder Tool
 *
 * Populates the OncoInfo SQLite database with drug data.
 * Can be used to:
 *   1. Initialize a fresh database with sample data
 *   2. Import drug data from a JSON file exported from Supabase
 *   3. Migrate data from the web app's Supabase backend
 *
 * Usage:
 *   OncoInfoSeed --init                  Initialize with sample oncology drugs
 *   OncoInfoSeed --import drugs.json     Import from JSON file
 *   OncoInfoSeed --hospital "Name"       Create a hospital entry
 *
 * Build:
 *   g++ -std=c++17 seed_database.cpp -lQt6Core -lQt6Sql -o OncoInfoSeed
 */

#include <QCoreApplication>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QFile>
#include <QUuid>
#include <QDebug>
#include <QCommandLineParser>

// Minimal drug insertion (without full framework dependency)
bool insertDrug(QSqlDatabase& db, const QJsonObject& drug) {
    QSqlQuery q(db);
    q.prepare(R"(
        INSERT OR REPLACE INTO drugs (id, generic_name, brand_names, drug_class,
            mechanism_of_action, disease_areas, approved_indications, common_regimens,
            dosing_info, administration_route, cycle_length_days, side_effects,
            contraindications, drug_interactions, monitoring_requirements,
            patient_counseling_points, ema_approval_date, fda_approval_date,
            is_on_zvz, unit_price, price_unit, reference_links, display_order)
        VALUES (:id, :gn, :bn, :dc, :moa, :da, :ai, :cr, :di, :ar, :cld, :se,
            :ci, :dint, :mr, :pcp, :ema, :fda, :zvz, :up, :pu, :rl, :do)
    )");

    QString id = drug["id"].toString();
    if (id.isEmpty()) id = QUuid::createUuid().toString(QUuid::WithoutBraces);

    q.bindValue(":id", id);
    q.bindValue(":gn", drug["generic_name"].toString());

    // Convert arrays to JSON strings
    auto arrayToJson = [](const QJsonValue& val) -> QString {
        if (val.isArray())
            return QJsonDocument(val.toArray()).toJson(QJsonDocument::Compact);
        return "[]";
    };

    q.bindValue(":bn", arrayToJson(drug["brand_names"]));
    q.bindValue(":dc", drug["drug_class"].toString());
    q.bindValue(":moa", drug["mechanism_of_action"].toString());
    q.bindValue(":da", arrayToJson(drug["disease_areas"]));
    q.bindValue(":ai", arrayToJson(drug["approved_indications"]));
    q.bindValue(":cr", arrayToJson(drug["common_regimens"]));

    // Dosing info as JSON string
    if (drug.contains("dosing_info") && drug["dosing_info"].isObject())
        q.bindValue(":di", QJsonDocument(drug["dosing_info"].toObject()).toJson(QJsonDocument::Compact));
    else
        q.bindValue(":di", "{}");

    q.bindValue(":ar", drug["administration_route"].toString());
    q.bindValue(":cld", drug["cycle_length_days"].toInt());

    if (drug.contains("side_effects") && drug["side_effects"].isObject())
        q.bindValue(":se", QJsonDocument(drug["side_effects"].toObject()).toJson(QJsonDocument::Compact));
    else
        q.bindValue(":se", "{}");

    q.bindValue(":ci", arrayToJson(drug["contraindications"]));
    q.bindValue(":dint", arrayToJson(drug["drug_interactions"]));
    q.bindValue(":mr", arrayToJson(drug["monitoring_requirements"]));
    q.bindValue(":pcp", arrayToJson(drug["patient_counseling_points"]));
    q.bindValue(":ema", drug["ema_approval_date"].toString());
    q.bindValue(":fda", drug["fda_approval_date"].toString());
    q.bindValue(":zvz", drug["is_on_zvz"].toBool() ? 1 : 0);
    q.bindValue(":up", drug["unit_price"].toDouble());
    q.bindValue(":pu", drug["price_unit"].toString());
    q.bindValue(":rl", arrayToJson(drug["reference_links"]));
    q.bindValue(":do", drug["display_order"].toInt());

    if (!q.exec()) {
        qWarning() << "Failed to insert drug:" << drug["generic_name"].toString()
                    << q.lastError().text();
        return false;
    }
    return true;
}

void seedSampleDrugs(QSqlDatabase& db) {
    qDebug() << "Seeding sample oncology drugs...";

    // Sample drugs covering major categories
    QJsonArray drugs = QJsonDocument::fromJson(R"([
        {
            "generic_name": "Pembrolizumab",
            "brand_names": ["Keytruda"],
            "drug_class": "Immunotherapie (IO/ICI)",
            "mechanism_of_action": "Anti-PD-1 monoklonaal antilichaam. Blokkeert de PD-1 receptor op T-cellen, waardoor het immuunsysteem tumorcellen effectiever kan aanvallen.",
            "disease_areas": ["NSCLC", "Melanoom", "Hoofd-halscarcinoom", "Niercelcarcinoom", "Blaaskanker"],
            "approved_indications": ["Gevorderd NSCLC met PD-L1 >= 50%", "Melanoom adjuvant en gemetastaseerd", "Hoofd-halscarcinoom", "Niercelcarcinoom", "Urotheelcarcinoom"],
            "common_regimens": ["Pembrolizumab monotherapie", "Pembrolizumab + chemotherapie", "Pembrolizumab + lenvatinib"],
            "dosing_info": {
                "standard_dose": "200 mg IV q3w of 400 mg IV q6w",
                "frequency": "Elke 3 of 6 weken",
                "duration": "Tot 2 jaar of progressie",
                "max_dose": "400 mg q6w"
            },
            "administration_route": "Intraveneus",
            "cycle_length_days": 21,
            "side_effects": {
                "common": ["Vermoeidheid", "Huiduitslag", "Pruritus", "Diarree", "Misselijkheid", "Artralgie"],
                "serious": ["Pneumonitis", "Colitis", "Hepatitis", "Nefritis", "Endocrinopathie", "Myocarditis"]
            },
            "contraindications": ["Overgevoeligheid voor pembrolizumab", "Actieve auto-immuunziekte"],
            "drug_interactions": ["Systemische corticosteroiden (kan effectiviteit verminderen)"],
            "monitoring_requirements": ["Schildklierfunctie voor en tijdens behandeling", "Leverfunctie", "Nierfunctie", "Bijnierfunctie"],
            "patient_counseling_points": ["Meld onmiddellijk koorts, hoesten, kortademigheid", "Meld huidveranderingen", "Meld buikpijn of diarree > 3 keer per dag"],
            "ema_approval_date": "2015-07-17",
            "is_on_zvz": true,
            "display_order": 1
        },
        {
            "generic_name": "Enzalutamide",
            "brand_names": ["Xtandi"],
            "drug_class": "ARPI",
            "mechanism_of_action": "Androgeenreceptor-remmer. Blokkeert de androgeenreceptor, remt nucleaire translocatie en DNA-binding.",
            "disease_areas": ["Prostaatkanker"],
            "approved_indications": ["mCRPC", "mHSPC", "nmCRPC"],
            "common_regimens": ["Enzalutamide monotherapie", "Enzalutamide + ADT"],
            "dosing_info": {
                "standard_dose": "160 mg per os 1x daags",
                "frequency": "Dagelijks",
                "duration": "Tot progressie"
            },
            "administration_route": "Oraal",
            "cycle_length_days": 28,
            "side_effects": {
                "common": ["Vermoeidheid", "Warmteopwellingen", "Hoofdpijn", "Hypertensie"],
                "serious": ["Convulsies", "Posterieur reversibel encefalopathie syndroom"]
            },
            "contraindications": ["Overgevoeligheid", "Vrouwen die zwanger zijn of kunnen worden"],
            "monitoring_requirements": ["Bloeddruk", "PSA", "Leverfunctie"],
            "ema_approval_date": "2013-06-21",
            "is_on_zvz": true,
            "display_order": 2
        },
        {
            "generic_name": "Olaparib",
            "brand_names": ["Lynparza"],
            "drug_class": "PARPi",
            "mechanism_of_action": "PARP-remmer. Remt poly (ADP-ribose) polymerase enzymen, waardoor DNA-herstel in tumorcellen met BRCA-mutaties wordt verhinderd.",
            "disease_areas": ["Ovariumcarcinoom", "Borstkanker", "Prostaatkanker", "Pancreascarcinoom"],
            "approved_indications": ["BRCA-gemuteerd ovariumcarcinoom", "HRD+ ovariumcarcinoom", "gBRCA borstkanker", "mCRPC met BRCA-mutatie"],
            "common_regimens": ["Olaparib monotherapie", "Olaparib + bevacizumab"],
            "dosing_info": {
                "standard_dose": "300 mg per os 2x daags",
                "frequency": "Tweemaal daags",
                "duration": "Tot progressie of maximaal 2 jaar"
            },
            "administration_route": "Oraal",
            "cycle_length_days": 28,
            "side_effects": {
                "common": ["Misselijkheid", "Vermoeidheid", "Anemie", "Braken", "Diarree"],
                "serious": ["Myelodysplastisch syndroom (MDS)", "Acute myeloïde leukemie (AML)", "Pneumonitis"]
            },
            "contraindications": ["Borstvoeding"],
            "monitoring_requirements": ["Compleet bloedbeeld maandelijks eerste 12 maanden", "Nierfunctie"],
            "ema_approval_date": "2014-12-16",
            "is_on_zvz": true,
            "display_order": 3
        },
        {
            "generic_name": "Trastuzumab + Pertuzumab",
            "brand_names": ["Herceptin + Perjeta", "Phesgo (SC)"],
            "drug_class": "Combinatietherapie",
            "mechanism_of_action": "Dubbele HER2-blokkade: Trastuzumab bindt subdomein IV, Pertuzumab bindt subdomein II van HER2.",
            "disease_areas": ["Borstkanker"],
            "approved_indications": ["HER2+ borstkanker neoadjuvant", "HER2+ borstkanker adjuvant", "HER2+ gemetastaseerd borstkanker"],
            "common_regimens": ["THP (Trastuzumab + Pertuzumab + Docetaxel)", "TCHP"],
            "dosing_info": {
                "standard_dose": "Phesgo SC: loading 1200mg/600mg, maintenance 600mg/600mg q3w",
                "frequency": "Elke 3 weken"
            },
            "administration_route": "Subcutaan",
            "cycle_length_days": 21,
            "side_effects": {
                "common": ["Diarree", "Alopecia", "Misselijkheid", "Vermoeidheid", "Neutropenie"],
                "serious": ["Cardiotoxiciteit (LVEF daling)", "Infuusreactie", "Interstitiële longziekte"]
            },
            "monitoring_requirements": ["LVEF elke 3 maanden", "Compleet bloedbeeld"],
            "ema_approval_date": "2013-03-04",
            "is_on_zvz": true,
            "display_order": 4
        },
        {
            "generic_name": "Osimertinib",
            "brand_names": ["Tagrisso"],
            "drug_class": "EGFR-remmer",
            "mechanism_of_action": "Derde generatie EGFR-TKI. Selectief voor EGFR-mutaties inclusief T790M resistentiemutatie.",
            "disease_areas": ["NSCLC"],
            "approved_indications": ["EGFR-gemuteerd NSCLC eerstelijns", "EGFR T790M+ NSCLC", "Adjuvant na resectie"],
            "dosing_info": {
                "standard_dose": "80 mg per os 1x daags",
                "frequency": "Dagelijks"
            },
            "administration_route": "Oraal",
            "cycle_length_days": 28,
            "side_effects": {
                "common": ["Diarree", "Huiduitslag", "Droge huid", "Paronychia", "Stomatitis"],
                "serious": ["Interstitiële longziekte", "QTc-verlenging", "Cardiomyopathie"]
            },
            "monitoring_requirements": ["ECG bij start", "LVEF bij risicofactoren"],
            "ema_approval_date": "2016-02-02",
            "is_on_zvz": true,
            "display_order": 5
        }
    ])").array();

    int count = 0;
    for (const auto& drug : drugs) {
        if (insertDrug(db, drug.toObject())) count++;
    }
    qDebug() << "Seeded" << count << "sample drugs";
}

int main(int argc, char* argv[]) {
    QCoreApplication app(argc, argv);
    app.setApplicationName("OncoInfoSeed");

    QCommandLineParser parser;
    parser.setApplicationDescription("OncoInfo Database Seeder");
    parser.addHelpOption();

    QCommandLineOption initOption("init", "Initialize database with sample drugs");
    parser.addOption(initOption);

    QCommandLineOption importOption("import", "Import drugs from JSON file", "file");
    parser.addOption(importOption);

    QCommandLineOption dbOption("db", "Database file path", "path", "oncoinfo.db");
    parser.addOption(dbOption);

    QCommandLineOption hospitalOption("hospital", "Create a hospital entry", "name");
    parser.addOption(hospitalOption);

    parser.process(app);

    // Open database
    QString dbPath = parser.value(dbOption);
    QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE");
    db.setDatabaseName(dbPath);

    if (!db.open()) {
        qCritical() << "Failed to open database:" << db.lastError().text();
        return 1;
    }

    qDebug() << "Opened database:" << dbPath;

    if (parser.isSet(hospitalOption)) {
        QString name = parser.value(hospitalOption);
        QString slug = name.toLower().replace(' ', '-').replace(QRegularExpression("[^a-z0-9-]"), "");
        QSqlQuery q(db);
        q.prepare("INSERT INTO hospitals (id, name, slug) VALUES (:id, :name, :slug)");
        q.bindValue(":id", QUuid::createUuid().toString(QUuid::WithoutBraces));
        q.bindValue(":name", name);
        q.bindValue(":slug", slug);
        if (q.exec()) {
            qDebug() << "Created hospital:" << name;
        } else {
            qWarning() << "Failed:" << q.lastError().text();
        }
    }

    if (parser.isSet(initOption)) {
        seedSampleDrugs(db);
    }

    if (parser.isSet(importOption)) {
        QString filePath = parser.value(importOption);
        QFile file(filePath);
        if (!file.open(QIODevice::ReadOnly)) {
            qCritical() << "Cannot open file:" << filePath;
            return 1;
        }

        QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
        file.close();

        if (!doc.isArray()) {
            qCritical() << "Expected JSON array in file";
            return 1;
        }

        int count = 0;
        db.transaction();
        for (const auto& drug : doc.array()) {
            if (insertDrug(db, drug.toObject())) count++;
        }
        db.commit();
        qDebug() << "Imported" << count << "drugs from" << filePath;
    }

    db.close();
    return 0;
}
