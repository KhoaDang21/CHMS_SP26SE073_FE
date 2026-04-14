declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
          },
          elementId: string
        ) => unknown;
      };
    };
  }
}

const GOOGLE_TRANS_COOKIE = 'googtrans';
const MAX_RETRIES = 15;
const RETRY_INTERVAL_MS = 250;

function setCookie(name: string, value: string) {
  const encodedValue = encodeURIComponent(value);
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodedValue}; path=/; max-age=${maxAge}`;
}

function setCookieForCurrentHost(name: string, value: string) {
  const encodedValue = encodeURIComponent(value);
  const hostname = window.location.hostname;
  if (!hostname || hostname === 'localhost') return;
  document.cookie = `${name}=${encodedValue}; domain=${hostname}; path=/`;
}

function setGoogleComboValue(lang: 'vi' | 'en') {
  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (!combo) return false;

  combo.value = lang;
  combo.dispatchEvent(new Event('change'));
  return true;
}

function tryApplyWithRetry(lang: 'vi' | 'en', attempt = 0) {
  if (setGoogleComboValue(lang)) return;
  if (attempt >= MAX_RETRIES) return;

  window.setTimeout(() => {
    tryApplyWithRetry(lang, attempt + 1);
  }, RETRY_INTERVAL_MS);
}

export function applyGoogleTranslate(lang: 'vi' | 'en') {
  const translateValue = `/vi/${lang}`;

  // Google widget relies on this cookie to keep language selection.
  setCookie(GOOGLE_TRANS_COOKIE, translateValue);
  setCookieForCurrentHost(GOOGLE_TRANS_COOKIE, translateValue);
  tryApplyWithRetry(lang);
}
