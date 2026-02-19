#pragma once

#include <QObject>
#include <QString>
#include <QList>
#include <optional>
#include "models/Drug.h"

namespace OncoInfo {

class DrugRepository : public QObject {
    Q_OBJECT

public:
    explicit DrugRepository(QObject* parent = nullptr);

    // CRUD operations
    QList<Drug> getAll(bool includeArchived = false) const;
    std::optional<Drug> getById(const QString& id) const;
    QList<Drug> getByCategory(const QString& categoryKey) const;
    QList<Drug> getByDiseaseArea(const QString& diseaseArea) const;
    QList<Drug> getByDrugClass(const QString& drugClass) const;

    bool insert(const Drug& drug);
    bool update(const Drug& drug);
    bool archive(const QString& id);
    bool unarchive(const QString& id);
    bool remove(const QString& id);

    // Search
    QList<Drug> search(const QString& query) const;
    QList<Drug> searchWithFilters(const QString& query,
                                   const QStringList& drugClasses,
                                   const QStringList& diseaseAreas,
                                   const QString& administrationRoute) const;

    // Combination regimens
    QList<Drug> getCombinations() const;
    QList<Drug> getIndividualDrugs() const;

    // Display order
    bool updateDisplayOrder(const QString& drugId, int order);

    // Patient folder content
    std::optional<PatientFolderContent> getPatientFolderContent(const QString& drugId,
                                                                  const QString& hospitalId = QString()) const;
    bool savePatientFolderContent(const PatientFolderContent& content);
    bool deletePatientFolderContent(const QString& drugId, const QString& hospitalId = QString());

    // Statistics
    int totalCount(bool includeArchived = false) const;
    int combinationCount() const;
    int individualCount() const;

    // Bulk operations (for data import/sync)
    bool bulkInsert(const QList<Drug>& drugs);
    void rebuildSearchIndex();

signals:
    void drugAdded(const QString& drugId);
    void drugUpdated(const QString& drugId);
    void drugArchived(const QString& drugId);
    void drugDeleted(const QString& drugId);

private:
    Drug drugFromQuery(const QSqlQuery& q) const;
    void bindDrugValues(QSqlQuery& q, const Drug& drug) const;
    QStringList jsonArrayToStringList(const QString& json) const;
    QString stringListToJson(const QStringList& list) const;
};

} // namespace OncoInfo
