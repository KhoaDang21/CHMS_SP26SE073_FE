import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import viTranslations from '../locales/vi.json';
import enTranslations from '../locales/en.json';

const resources = {
  vi: { translation: viTranslations },
  en: { translation: enTranslations },
};

const LANGUAGE_KEY = 'language';
const LANGUAGE_SELECTED_KEY = 'languageSelected';

// Lấy ngôn ngữ từ localStorage hoặc browser, mặc định là vi
const getInitialLanguage = () => {
  const isUserSelected = localStorage.getItem(LANGUAGE_SELECTED_KEY) === '1';
  if (!isUserSelected) return 'vi';

  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === 'en' || saved === 'vi') return saved;
  return 'vi';
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
