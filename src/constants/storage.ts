/**
 * Centralized localStorage / DOM keys.
 * All storage access must go through these — no inline string literals anywhere else.
 */
export const STORAGE_KEYS = {
    // Auth
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
    VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL: 'verify_email_resend_cooldown_until',
    // i18n
    LANG: 'lang',
    // Cart (guest)
    GUEST_CART: 'guest_cart',
    // Marketing
    POPUP_DISMISSALS: 'popup_dismissals',
    // Theme
    THEME: 'site-theme',
    THEME_CUSTOM_COLORS: 'site-theme-custom-colors',
} as const;

/**
 * DOM element ids reserved by the app. Kept here so a global rename is a single edit.
 */
export const DOM_IDS = {
    THEME_OVERRIDES_STYLE: 'site-theme-overrides',
} as const;

/**
 * Default language used when no `lang` is persisted (matches backend default).
 */
export const DEFAULT_LANG = 'es' as const;
