#include "DrugRepository.h"
#include "Database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QUuid>
#include <QDebug>

namespace OncoInfo {

DrugRepository::DrugRepository(QObject* parent) : QObject(parent) {}

QStringList DrugRepository::jsonArrayToStringList(const QString& json) const {
    if (json.isEmpty()) return {};
    QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
    QStringList list;
    for (const auto& v : doc.array()) list << v.toString();
    return list;
}

QString DrugRepository::stringListToJson(const QStringList& list) const {
    QJsonArray arr;
    for (const auto& s : list) arr.append(s);
    return QJsonDocument(arr).toJson(QJsonDocument::Compact);
}

Drug DrugRepository::drugFromQuery(const QSqlQuery& q) const {
    Drug d;
    d.id = q.value("id").toString();
    d.generic_name = q.value("generic_name").toString();
    d.brand_names = jsonArrayToStringList(q.value("brand_names").toString());
    d.drug_class = q.value("drug_class").toString();
    d.mechanism_of_action = q.value("mechanism_of_action").toString();
    d.disease_areas = jsonArrayToStringList(q.value("disease_areas").toString());
    d.approved_indications = jsonArrayToStringList(q.value("approved_indications").toString());
    d.common_regimens = jsonArrayToStringList(q.value("common_regimens").toString());

    QString dosingJson = q.value("dosing_info").toString();
    if (!dosingJson.isEmpty()) {
        QJsonDocument doc = QJsonDocument::fromJson(dosingJson.toUtf8());
        d.dosing_info = DosingInfo::fromJson(doc.object());
    }

    d.administration_route = q.value("administration_route").toString();
    d.cycle_length_days = q.value("cycle_length_days").toInt();

    QString seJson = q.value("side_effects").toString();
    if (!seJson.isEmpty()) {
        QJsonDocument doc = QJsonDocument::fromJson(seJson.toUtf8());
        d.side_effects = SideEffects::fromJson(doc.object());
    }

    d.contraindications = jsonArrayToStringList(q.value("contraindications").toString());
    d.drug_interactions = jsonArrayToStringList(q.value("drug_interactions").toString());
    d.monitoring_requirements = jsonArrayToStringList(q.value("monitoring_requirements").toString());
    d.patient_counseling_points = jsonArrayToStringList(q.value("patient_counseling_points").toString());
    d.ema_approval_date = q.value("ema_approval_date").toString();
    d.fda_approval_date = q.value("fda_approval_date").toString();
    d.is_on_zvz = q.value("is_on_zvz").toBool();
    d.unit_price = q.value("unit_price").toDouble();
    d.price_unit = q.value("price_unit").toString();
    d.reference_links = jsonArrayToStringList(q.value("reference_links").toString());
    d.display_order = q.value("display_order").toInt();
    d.is_archived = q.value("is_archived").toBool();
    d.hospital_id = q.value("hospital_id").toString();
    d.created_at = QDateTime::fromString(q.value("created_at").toString(), Qt::ISODate);
    d.updated_at = QDateTime::fromString(q.value("updated_at").toString(), Qt::ISODate);

    return d;
}

void DrugRepository::bindDrugValues(QSqlQuery& q, const Drug& drug) const {
    q.bindValue(":generic_name", drug.generic_name);
    q.bindValue(":brand_names", stringListToJson(drug.brand_names));
    q.bindValue(":drug_class", drug.drug_class);
    q.bindValue(":mechanism_of_action", drug.mechanism_of_action);
    q.bindValue(":disease_areas", stringListToJson(drug.disease_areas));
    q.bindValue(":approved_indications", stringListToJson(drug.approved_indications));
    q.bindValue(":common_regimens", stringListToJson(drug.common_regimens));
    q.bindValue(":dosing_info", QJsonDocument(drug.dosing_info.toJson()).toJson(QJsonDocument::Compact));
    q.bindValue(":administration_route", drug.administration_route);
    q.bindValue(":cycle_length_days", drug.cycle_length_days);
    q.bindValue(":side_effects", QJsonDocument(drug.side_effects.toJson()).toJson(QJsonDocument::Compact));
    q.bindValue(":contraindications", stringListToJson(drug.contraindications));
    q.bindValue(":drug_interactions", stringListToJson(drug.drug_interactions));
    q.bindValue(":monitoring_requirements", stringListToJson(drug.monitoring_requirements));
    q.bindValue(":patient_counseling_points", stringListToJson(drug.patient_counseling_points));
    q.bindValue(":ema_approval_date", drug.ema_approval_date);
    q.bindValue(":fda_approval_date", drug.fda_approval_date);
    q.bindValue(":is_on_zvz", drug.is_on_zvz ? 1 : 0);
    q.bindValue(":unit_price", drug.unit_price);
    q.bindValue(":price_unit", drug.price_unit);
    q.bindValue(":reference_links", stringListToJson(drug.reference_links));
    q.bindValue(":display_order", drug.display_order);
    q.bindValue(":is_archived", drug.is_archived ? 1 : 0);
    q.bindValue(":hospital_id", drug.hospital_id);
}

QList<Drug> DrugRepository::getAll(bool includeArchived) const {
    QSqlQuery q(Database::instance().db());
    if (includeArchived)
        q.prepare("SELECT * FROM drugs ORDER BY display_order, generic_name");
    else
        q.prepare("SELECT * FROM drugs WHERE is_archived = 0 ORDER BY display_order, generic_name");

    QList<Drug> drugs;
    if (q.exec()) {
        while (q.next()) drugs << drugFromQuery(q);
    }
    return drugs;
}

std::optional<Drug> DrugRepository::getById(const QString& id) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM drugs WHERE id = :id");
    q.bindValue(":id", id);
    if (q.exec() && q.next()) return drugFromQuery(q);
    return std::nullopt;
}

QList<Drug> DrugRepository::getByCategory(const QString& categoryKey) const {
    auto categories = getDrugCategories();
    QStringList diseaseAreas;

    for (const auto& cat : categories) {
        if (cat.key == categoryKey) {
            for (const auto& da : cat.diseaseAreas)
                diseaseAreas << da.label;
            break;
        }
    }

    if (diseaseAreas.isEmpty()) return getAll();

    QList<Drug> result;
    auto allDrugs = getAll();
    for (const auto& drug : allDrugs) {
        for (const auto& area : drug.disease_areas) {
            if (diseaseAreas.contains(area)) {
                result << drug;
                break;
            }
        }
    }
    return result;
}

QList<Drug> DrugRepository::getByDiseaseArea(const QString& diseaseArea) const {
    QList<Drug> result;
    auto allDrugs = getAll();
    for (const auto& drug : allDrugs) {
        if (drug.disease_areas.contains(diseaseArea))
            result << drug;
    }
    return result;
}

QList<Drug> DrugRepository::getByDrugClass(const QString& drugClass) const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM drugs WHERE drug_class = :dc AND is_archived = 0 ORDER BY display_order, generic_name");
    q.bindValue(":dc", drugClass);

    QList<Drug> drugs;
    if (q.exec()) {
        while (q.next()) drugs << drugFromQuery(q);
    }
    return drugs;
}

bool DrugRepository::insert(const Drug& drug) {
    QSqlQuery q(Database::instance().db());
    QString id = drug.id.isEmpty() ? QUuid::createUuid().toString(QUuid::WithoutBraces) : drug.id;

    q.prepare(R"(
        INSERT INTO drugs (id, generic_name, brand_names, drug_class, mechanism_of_action,
            disease_areas, approved_indications, common_regimens, dosing_info,
            administration_route, cycle_length_days, side_effects, contraindications,
            drug_interactions, monitoring_requirements, patient_counseling_points,
            ema_approval_date, fda_approval_date, is_on_zvz, unit_price, price_unit,
            reference_links, display_order, is_archived, hospital_id)
        VALUES (:id, :generic_name, :brand_names, :drug_class, :mechanism_of_action,
            :disease_areas, :approved_indications, :common_regimens, :dosing_info,
            :administration_route, :cycle_length_days, :side_effects, :contraindications,
            :drug_interactions, :monitoring_requirements, :patient_counseling_points,
            :ema_approval_date, :fda_approval_date, :is_on_zvz, :unit_price, :price_unit,
            :reference_links, :display_order, :is_archived, :hospital_id)
    )");

    q.bindValue(":id", id);
    bindDrugValues(q, drug);

    if (!q.exec()) {
        qDebug() << "Failed to insert drug:" << q.lastError().text();
        return false;
    }

    emit drugAdded(id);
    return true;
}

bool DrugRepository::update(const Drug& drug) {
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        UPDATE drugs SET generic_name = :generic_name, brand_names = :brand_names,
            drug_class = :drug_class, mechanism_of_action = :mechanism_of_action,
            disease_areas = :disease_areas, approved_indications = :approved_indications,
            common_regimens = :common_regimens, dosing_info = :dosing_info,
            administration_route = :administration_route, cycle_length_days = :cycle_length_days,
            side_effects = :side_effects, contraindications = :contraindications,
            drug_interactions = :drug_interactions, monitoring_requirements = :monitoring_requirements,
            patient_counseling_points = :patient_counseling_points,
            ema_approval_date = :ema_approval_date, fda_approval_date = :fda_approval_date,
            is_on_zvz = :is_on_zvz, unit_price = :unit_price, price_unit = :price_unit,
            reference_links = :reference_links, display_order = :display_order,
            is_archived = :is_archived, hospital_id = :hospital_id,
            updated_at = datetime('now')
        WHERE id = :id
    )");

    q.bindValue(":id", drug.id);
    bindDrugValues(q, drug);

    if (!q.exec()) {
        qDebug() << "Failed to update drug:" << q.lastError().text();
        return false;
    }

    emit drugUpdated(drug.id);
    return true;
}

bool DrugRepository::archive(const QString& id) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE drugs SET is_archived = 1, updated_at = datetime('now') WHERE id = :id");
    q.bindValue(":id", id);
    if (!q.exec()) return false;
    emit drugArchived(id);
    return true;
}

bool DrugRepository::unarchive(const QString& id) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE drugs SET is_archived = 0, updated_at = datetime('now') WHERE id = :id");
    q.bindValue(":id", id);
    return q.exec();
}

bool DrugRepository::remove(const QString& id) {
    QSqlQuery q(Database::instance().db());
    q.prepare("DELETE FROM drugs WHERE id = :id");
    q.bindValue(":id", id);
    if (!q.exec()) return false;
    emit drugDeleted(id);
    return true;
}

QList<Drug> DrugRepository::search(const QString& query) const {
    if (query.trimmed().length() < 2) return {};

    QString pattern = "%" + query.trimmed() + "%";
    QSqlQuery q(Database::instance().db());
    q.prepare(R"(
        SELECT * FROM drugs
        WHERE is_archived = 0 AND (
            generic_name LIKE :q1 COLLATE NOCASE
            OR brand_names LIKE :q2 COLLATE NOCASE
            OR common_regimens LIKE :q3 COLLATE NOCASE
            OR drug_class LIKE :q4 COLLATE NOCASE
        )
        ORDER BY
            CASE WHEN generic_name LIKE :q5 COLLATE NOCASE THEN 0 ELSE 1 END,
            generic_name
        LIMIT 50
    )");
    q.bindValue(":q1", pattern);
    q.bindValue(":q2", pattern);
    q.bindValue(":q3", pattern);
    q.bindValue(":q4", pattern);
    q.bindValue(":q5", pattern);

    QList<Drug> drugs;
    if (q.exec()) {
        while (q.next()) drugs << drugFromQuery(q);
    }
    return drugs;
}

QList<Drug> DrugRepository::searchWithFilters(const QString& query,
                                                const QStringList& drugClasses,
                                                const QStringList& diseaseAreas,
                                                const QString& administrationRoute) const {
    auto drugs = query.isEmpty() ? getAll() : search(query);

    QList<Drug> result;
    for (const auto& drug : drugs) {
        bool matchClass = drugClasses.isEmpty() || drugClasses.contains(drug.drug_class);
        bool matchArea = diseaseAreas.isEmpty();
        if (!matchArea) {
            for (const auto& area : drug.disease_areas) {
                if (diseaseAreas.contains(area)) { matchArea = true; break; }
            }
        }
        bool matchRoute = administrationRoute.isEmpty() || drug.administration_route == administrationRoute;

        if (matchClass && matchArea && matchRoute)
            result << drug;
    }
    return result;
}

QList<Drug> DrugRepository::getCombinations() const {
    return getByDrugClass("Combinatietherapie");
}

QList<Drug> DrugRepository::getIndividualDrugs() const {
    QSqlQuery q(Database::instance().db());
    q.prepare("SELECT * FROM drugs WHERE drug_class != 'Combinatietherapie' AND is_archived = 0 ORDER BY display_order, generic_name");
    QList<Drug> drugs;
    if (q.exec()) {
        while (q.next()) drugs << drugFromQuery(q);
    }
    return drugs;
}

bool DrugRepository::updateDisplayOrder(const QString& drugId, int order) {
    QSqlQuery q(Database::instance().db());
    q.prepare("UPDATE drugs SET display_order = :order WHERE id = :id");
    q.bindValue(":order", order);
    q.bindValue(":id", drugId);
    return q.exec();
}

std::optional<PatientFolderContent> DrugRepository::getPatientFolderContent(
    const QString& drugId, const QString& hospitalId) const {
    QSqlQuery q(Database::instance().db());
    if (hospitalId.isEmpty())
        q.prepare("SELECT * FROM patient_folder_content WHERE drug_id = :did AND hospital_id IS NULL");
    else {
        q.prepare("SELECT * FROM patient_folder_content WHERE drug_id = :did AND (hospital_id = :hid OR hospital_id IS NULL) ORDER BY hospital_id DESC LIMIT 1");
        q.bindValue(":hid", hospitalId);
    }
    q.bindValue(":did", drugId);

    if (q.exec() && q.next()) {
        PatientFolderContent pfc;
        pfc.id = q.value("id").toString();
        pfc.drug_id = q.value("drug_id").toString();
        pfc.hospital_id = q.value("hospital_id").toString();
        pfc.introduction = q.value("introduction").toString();
        pfc.usage_info = q.value("usage_info").toString();
        pfc.dosing_info = q.value("dosing_info").toString();
        pfc.contraindications = q.value("contraindications").toString();
        pfc.side_effects_common = q.value("side_effects_common").toString();
        pfc.side_effects_serious = q.value("side_effects_serious").toString();
        pfc.tips = q.value("tips").toString();
        pfc.self_care_tips = q.value("self_care_tips").toString();
        pfc.monitoring = q.value("monitoring").toString();
        return pfc;
    }
    return std::nullopt;
}

bool DrugRepository::savePatientFolderContent(const PatientFolderContent& content) {
    QSqlQuery q(Database::instance().db());
    QString id = content.id.isEmpty() ? QUuid::createUuid().toString(QUuid::WithoutBraces) : content.id;

    q.prepare(R"(
        INSERT OR REPLACE INTO patient_folder_content
            (id, drug_id, hospital_id, introduction, usage_info, dosing_info,
             contraindications, side_effects_common, side_effects_serious,
             tips, self_care_tips, monitoring, updated_at)
        VALUES (:id, :drug_id, :hospital_id, :introduction, :usage_info, :dosing_info,
             :contraindications, :side_effects_common, :side_effects_serious,
             :tips, :self_care_tips, :monitoring, datetime('now'))
    )");

    q.bindValue(":id", id);
    q.bindValue(":drug_id", content.drug_id);
    q.bindValue(":hospital_id", content.hospital_id.isEmpty() ? QVariant() : content.hospital_id);
    q.bindValue(":introduction", content.introduction);
    q.bindValue(":usage_info", content.usage_info);
    q.bindValue(":dosing_info", content.dosing_info);
    q.bindValue(":contraindications", content.contraindications);
    q.bindValue(":side_effects_common", content.side_effects_common);
    q.bindValue(":side_effects_serious", content.side_effects_serious);
    q.bindValue(":tips", content.tips);
    q.bindValue(":self_care_tips", content.self_care_tips);
    q.bindValue(":monitoring", content.monitoring);

    return q.exec();
}

bool DrugRepository::deletePatientFolderContent(const QString& drugId, const QString& hospitalId) {
    QSqlQuery q(Database::instance().db());
    if (hospitalId.isEmpty())
        q.prepare("DELETE FROM patient_folder_content WHERE drug_id = :did AND hospital_id IS NULL");
    else {
        q.prepare("DELETE FROM patient_folder_content WHERE drug_id = :did AND hospital_id = :hid");
        q.bindValue(":hid", hospitalId);
    }
    q.bindValue(":did", drugId);
    return q.exec();
}

int DrugRepository::totalCount(bool includeArchived) const {
    QSqlQuery q(Database::instance().db());
    if (includeArchived)
        q.exec("SELECT COUNT(*) FROM drugs");
    else
        q.exec("SELECT COUNT(*) FROM drugs WHERE is_archived = 0");
    if (q.next()) return q.value(0).toInt();
    return 0;
}

int DrugRepository::combinationCount() const {
    QSqlQuery q(Database::instance().db());
    q.exec("SELECT COUNT(*) FROM drugs WHERE drug_class = 'Combinatietherapie' AND is_archived = 0");
    if (q.next()) return q.value(0).toInt();
    return 0;
}

int DrugRepository::individualCount() const {
    QSqlQuery q(Database::instance().db());
    q.exec("SELECT COUNT(*) FROM drugs WHERE drug_class != 'Combinatietherapie' AND is_archived = 0");
    if (q.next()) return q.value(0).toInt();
    return 0;
}

bool DrugRepository::bulkInsert(const QList<Drug>& drugs) {
    Database::instance().beginTransaction();
    for (const auto& drug : drugs) {
        if (!insert(drug)) {
            Database::instance().rollbackTransaction();
            return false;
        }
    }
    return Database::instance().commitTransaction();
}

void DrugRepository::rebuildSearchIndex() {
    QSqlQuery q(Database::instance().db());
    q.exec("DELETE FROM drugs_fts");
    q.exec(R"(
        INSERT INTO drugs_fts(rowid, generic_name, brand_names, common_regimens, drug_class, disease_areas)
        SELECT rowid, generic_name, brand_names, common_regimens, drug_class, disease_areas FROM drugs
    )");
}

} // namespace OncoInfo
