import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGE_KEY = 'language';
const LANGUAGE_SELECTED_KEY = 'languageSelected';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const fallbackLang = localStorage.getItem(LANGUAGE_SELECTED_KEY) === '1'
    ? (localStorage.getItem(LANGUAGE_KEY) || 'vi')
    : 'vi';
  const currentLang = i18n?.language || fallbackLang;
  const isVi = currentLang.startsWith('vi');

  const toggleLanguage = () => {
    const newLang = isVi ? 'en' : 'vi';
    if (i18n?.changeLanguage) {
      i18n.changeLanguage(newLang);
    }
    localStorage.setItem(LANGUAGE_KEY, newLang);
    localStorage.setItem(LANGUAGE_SELECTED_KEY, '1');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="relative z-20 pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      title={isVi ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Globe className="w-4 h-4" />
      <span>{isVi ? 'EN' : 'VI'}</span>
    </button>
  );
}
