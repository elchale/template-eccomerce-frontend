/**
 * i18next initialization for the storefront and admin panel.
 *
 * Languages: ES (default), EN, PT. Region tags collapse to language only
 * (`es-419` → `es`) so we don't fragment cache per locale.
 *
 * Translation files live in `public/locales/{lang}/{ns}.json` and are
 * fetched lazily by `HttpBackend`. Namespaces:
 *   - `common` shared atoms (buttons, validation, generic copy)
 *   - `shop`   storefront pages
 *   - `admin`  back office
 *   - `auth`   login/register/reset/verify
 *   - `legal`  Terms & Privacy
 *
 * Detection order: localStorage (`LANG` key) → navigator. Selection is
 * persisted to localStorage by `LanguageSwitcher`, which also invalidates
 * the query cache so server data refetches with the new `Accept-Language`.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANG, STORAGE_KEYS } from '@/constants/storage';

i18n.use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        supportedLngs: ['es', 'en', 'pt'],
        fallbackLng: DEFAULT_LANG,
        load: 'languageOnly', // 'es-419' → 'es', 'en-US' → 'en'
        defaultNS: 'common',
        ns: ['common', 'shop', 'admin', 'auth', 'legal'],
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: STORAGE_KEYS.LANG,
            caches: ['localStorage'],
            convertDetectedLanguage: (lng) => lng.split('-')[0] ?? lng,
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

/**
 * Returns the active UI language from localStorage, falling back to {@link DEFAULT_LANG}.
 * Single source of truth — do not read `localStorage.getItem('lang')` directly.
 */
export const getLang = (): string => {
    if (typeof window === 'undefined') return DEFAULT_LANG;
    return localStorage.getItem(STORAGE_KEYS.LANG) || DEFAULT_LANG;
};

export default i18n;
