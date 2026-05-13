/**
 * Currency formatter using `Intl.NumberFormat`.
 *
 * Locale and currency code are read from Vite env vars so a fork of this
 * template can be reconfigured without touching source files:
 *   VITE_LOCALE=es-PE
 *   VITE_CURRENCY=PEN
 *
 * Both default to PEN / es-PE (Peruvian sol) when the env vars are absent
 * so the formatter is always functional in development without an .env file.
 *
 * Usage:
 *   formatCurrency(19.90)           // "S/ 19.90"
 *   formatCurrency('1234.5')        // "S/ 1,234.50"
 *   formatCurrency(99, { currency: 'USD', locale: 'en-US' }) // "$99.00"
 */

interface FormatCurrencyOptions {
    locale?: string;
    currency?: string;
}

export function formatCurrency(value: number | string, opts?: FormatCurrencyOptions): string {
    const locale = opts?.locale ?? (import.meta.env.VITE_LOCALE as string | undefined) ?? 'es-PE';
    const currency =
        opts?.currency ?? (import.meta.env.VITE_CURRENCY as string | undefined) ?? 'PEN';
    const n = typeof value === 'string' ? Number(value) : value;

    if (!Number.isFinite(n)) return '';

    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
}
