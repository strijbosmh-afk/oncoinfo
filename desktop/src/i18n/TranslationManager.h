#pragma once

#include <QObject>
#include <QString>
#include <QMap>
#include <QJsonObject>

namespace OncoInfo {

/**
 * Translation manager that loads JSON translation files matching the web app format.
 * Supports Dutch (nl), French (fr), German (de), English (en).
 * Works fully offline — all translations are embedded/shipped with the app.
 */
class TranslationManager : public QObject {
    Q_OBJECT

public:
    static TranslationManager& instance();

    bool loadTranslations(const QString& translationsDir = QString());
    void setLanguage(const QString& langCode);
    QString currentLanguage() const;

    // Get translated string by dotted key path (e.g., "drugs.title", "auth.login")
    QString t(const QString& key) const;

    // Get translated string with parameter substitution
    // e.g., t("drugs.found", {{"count", "42"}}) => "42 drugs found"
    QString t(const QString& key, const QMap<QString, QString>& params) const;

    // Get medical term translation
    QString medicalTerm(const QString& term) const;

    // Available languages
    QStringList availableLanguages() const;
    QString languageName(const QString& code) const;

signals:
    void languageChanged(const QString& langCode);

private:
    TranslationManager();
    TranslationManager(const TranslationManager&) = delete;

    bool loadLanguageFile(const QString& langCode, const QString& filePath);
    QString resolveKey(const QJsonObject& obj, const QString& key) const;

    QMap<QString, QJsonObject> m_translations;  // langCode -> JSON tree
    QString m_currentLang = "nl";
    QString m_translationsDir;
};

// Convenience macro for translation
#define TR(key) OncoInfo::TranslationManager::instance().t(key)
#define TR_P(key, params) OncoInfo::TranslationManager::instance().t(key, params)

} // namespace OncoInfo
