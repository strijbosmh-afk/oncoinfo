#pragma once

#include <QString>
#include <QColor>

namespace OncoInfo {

/**
 * Application stylesheet matching the web app's theme.
 * Primary color: #6b2d5b (deep purple/magenta)
 * Supports dynamic hospital branding colors.
 */
class StyleSheet {
public:
    static QString applicationStyle(const QColor& primaryColor = QColor("#6b2d5b"));
    static QString drugCardStyle(const QString& drugClass);
    static QColor drugClassColor(const QString& drugClass);
    static QString categoryIcon(const QString& categoryKey);
};

} // namespace OncoInfo
