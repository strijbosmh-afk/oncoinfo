#pragma once

#include <QWidget>

namespace OncoInfo {

class FavoritesPanel : public QWidget {
    Q_OBJECT
public:
    explicit FavoritesPanel(QWidget* parent = nullptr);
    void refresh();
signals:
    void drugSelected(const QString& drugId);
    void exportRequested();
};

} // namespace OncoInfo
