import { describe, it, expect, beforeEach } from 'vitest';

import { formatCurrency } from '../formatCurrency';

describe('formatCurrency', () => {
    beforeEach(() => {
        // Ensure env defaults are in place for tests
        import.meta.env.VITE_LOCALE = 'es-PE';
        import.meta.env.VITE_CURRENCY = 'PEN';
    });

    it('formats a number using default locale/currency', () => {
        const result = formatCurrency(10);
        // Intl.NumberFormat for es-PE PEN produces "S/ 10.00" or "S/\xa010.00"
        expect(result).toContain('10');
        expect(result.length).toBeGreaterThan(2);
    });

    it('formats a string number', () => {
        const result = formatCurrency('1234.50');
        expect(result).toContain('1');
        expect(Number.isNaN(Number('1234.50'))).toBe(false);
    });

    it('returns empty string for non-finite values', () => {
        expect(formatCurrency(Number.NaN)).toBe('');
        expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('');
    });

    it('accepts explicit locale and currency override', () => {
        const result = formatCurrency(99, { locale: 'en-US', currency: 'USD' });
        expect(result).toContain('99');
        expect(result).toContain('$');
    });

    it('handles zero', () => {
        const result = formatCurrency(0);
        expect(result).toContain('0');
    });
});
