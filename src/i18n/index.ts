import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './locales/nl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import en from './locales/en.json';

const savedLanguage = localStorage.getItem('app-language') || 'nl';

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    fr: { translation: fr },
    de: { translation: de },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng);
});

export default i18n;
