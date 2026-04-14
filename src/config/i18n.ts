import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import viTranslations from '../locales/vi.json';
import enTranslations from '../locales/en.json';

const resources = {
  vi: { translation: viTranslations },
  en: { translation: enTranslations },
};

// Lấy ngôn ngữ từ localStorage hoặc browser, mặc định là vi
const getInitialLanguage = () => {
  const saved = localStorage.getItem('language');
  if (saved) return saved;
  
  const browserLang = navigator.language.split('-')[0];
  return browserLang === 'en' ? 'en' : 'vi';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React đã protect từ XSS
    },
  });

export default i18n;
