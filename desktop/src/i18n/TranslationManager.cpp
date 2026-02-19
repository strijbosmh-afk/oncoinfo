#include "TranslationManager.h"
#include <QFile>
#include <QDir>
#include <QJsonDocument>
#include <QJsonObject>
#include <QCoreApplication>
#include <QDebug>

namespace OncoInfo {

TranslationManager& TranslationManager::instance() {
    static TranslationManager mgr;
    return mgr;
}

TranslationManager::TranslationManager() : QObject(nullptr) {}

bool TranslationManager::loadTranslations(const QString& translationsDir) {
    // Search paths for translation files
    QStringList searchPaths;
    if (!translationsDir.isEmpty()) {
        searchPaths << translationsDir;
    }
    searchPaths << QCoreApplication::applicationDirPath() + "/translations";
    searchPaths << QCoreApplication::applicationDirPath() + "/../resources/translations";
    searchPaths << ":/translations";  // Qt resource system

    QString foundDir;
    for (const auto& path : searchPaths) {
        if (QDir(path).exists()) {
            foundDir = path;
            break;
        }
    }

    if (foundDir.isEmpty()) {
        qWarning() << "Translation directory not found in any search path";
        return false;
    }

    m_translationsDir = foundDir;

    // Load all available languages
    QStringList langs = {"nl", "fr", "de", "en"};
    bool anyLoaded = false;
    for (const auto& lang : langs) {
        QString filePath = foundDir + "/" + lang + ".json";
        if (QFile::exists(filePath)) {
            if (loadLanguageFile(lang, filePath)) {
                anyLoaded = true;
                qDebug() << "Loaded translations:" << lang << "from" << filePath;
            }
        }
    }

    return anyLoaded;
}

bool TranslationManager::loadLanguageFile(const QString& langCode, const QString& filePath) {
    QFile file(filePath);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        qWarning() << "Failed to open translation file:" << filePath;
        return false;
    }

    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(file.readAll(), &error);
    file.close();

    if (error.error != QJsonParseError::NoError) {
        qWarning() << "JSON parse error in" << filePath << ":" << error.errorString();
        return false;
    }

    m_translations[langCode] = doc.object();
    return true;
}

void TranslationManager::setLanguage(const QString& langCode) {
    if (m_translations.contains(langCode) && m_currentLang != langCode) {
        m_currentLang = langCode;
        emit languageChanged(langCode);
    }
}

QString TranslationManager::currentLanguage() const {
    return m_currentLang;
}

QString TranslationManager::t(const QString& key) const {
    // Try current language first
    if (m_translations.contains(m_currentLang)) {
        QString result = resolveKey(m_translations[m_currentLang], key);
        if (!result.isEmpty()) return result;
    }

    // Fallback to Dutch
    if (m_currentLang != "nl" && m_translations.contains("nl")) {
        QString result = resolveKey(m_translations["nl"], key);
        if (!result.isEmpty()) return result;
    }

    // Fallback to English
    if (m_currentLang != "en" && m_translations.contains("en")) {
        QString result = resolveKey(m_translations["en"], key);
        if (!result.isEmpty()) return result;
    }

    // Return the key itself as last resort
    return key;
}

QString TranslationManager::t(const QString& key, const QMap<QString, QString>& params) const {
    QString result = t(key);
    for (auto it = params.constBegin(); it != params.constEnd(); ++it) {
        result.replace("{{" + it.key() + "}}", it.value());
    }
    return result;
}

QString TranslationManager::resolveKey(const QJsonObject& obj, const QString& key) const {
    // Support dotted paths like "drugs.title" or "auth.login"
    QStringList parts = key.split('.');
    QJsonObject current = obj;

    for (int i = 0; i < parts.size() - 1; i++) {
        if (current.contains(parts[i]) && current[parts[i]].isObject()) {
            current = current[parts[i]].toObject();
        } else {
            return QString();
        }
    }

    QString lastKey = parts.last();
    if (current.contains(lastKey)) {
        return current[lastKey].toString();
    }
    return QString();
}

QString TranslationManager::medicalTerm(const QString& term) const {
    return t("medicalTerms." + term);
}

QStringList TranslationManager::availableLanguages() const {
    return m_translations.keys();
}

QString TranslationManager::languageName(const QString& code) const {
    static QMap<QString, QString> names = {
        {"nl", "Nederlands"},
        {"fr", "Français"},
        {"de", "Deutsch"},
        {"en", "English"}
    };
    return names.value(code, code);
}

} // namespace OncoInfo
