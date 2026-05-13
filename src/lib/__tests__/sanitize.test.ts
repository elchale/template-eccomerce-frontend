import { describe, it, expect } from 'vitest';

import {
    sanitizeString,
    sanitizeName,
    sanitizeEmail,
    sanitizeUrl,
    stripHtml,
    escapeHtml,
    containsMaliciousPatterns,
} from '../sanitize';

describe('sanitizeString', () => {
    it('removes < and > characters', () => {
        expect(sanitizeString('<script>')).toBe('script');
        expect(sanitizeString('hello <world>')).toBe('hello world');
    });

    it('removes javascript: protocol', () => {
        expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('removes event handlers', () => {
        expect(sanitizeString('onclick=foo')).toBe('foo');
    });

    it('returns empty string for null/undefined', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
    });
});

describe('sanitizeName', () => {
    it('allows safe characters', () => {
        expect(sanitizeName("O'Brien")).toBe("O'Brien");
        expect(sanitizeName('José García')).toBe('José García');
    });

    it('removes dangerous characters', () => {
        expect(sanitizeName('<script>alert</script>')).toBe('scriptalertscript');
    });

    it('collapses multiple spaces', () => {
        expect(sanitizeName('John   Doe')).toBe('John Doe');
    });
});

describe('sanitizeEmail', () => {
    it('returns valid email', () => {
        expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('returns empty for invalid email', () => {
        expect(sanitizeEmail('not-an-email')).toBe('');
        expect(sanitizeEmail('<script>@x.com')).toBe('');
    });
});

describe('sanitizeUrl', () => {
    it('allows safe URLs', () => {
        expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
        expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
    });

    it('blocks javascript: protocol', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('blocks data: protocol', () => {
        expect(sanitizeUrl('data:text/html,<script>')).toBe('');
    });
});

describe('stripHtml - DOMPurify backed', () => {
    it('strips all HTML tags leaving plain text', () => {
        const result = stripHtml('<p>Hello <b>world</b></p>');
        expect(result).toBe('Hello world');
    });

    it('neutralises XSS payload', () => {
        const xss = '<img src=x onerror=alert(1)>';
        const result = stripHtml(xss);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('<img');
    });

    it('returns empty string for null/undefined', () => {
        expect(stripHtml(null)).toBe('');
        expect(stripHtml(undefined)).toBe('');
    });
});

describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
        const result = escapeHtml('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;');
    });
});

describe('containsMaliciousPatterns', () => {
    it('detects script injection', () => {
        expect(containsMaliciousPatterns('<script>alert(1)</script>')).toBe(true);
    });

    it('detects javascript: protocol', () => {
        expect(containsMaliciousPatterns('javascript:void(0)')).toBe(true);
    });

    it('returns false for clean input', () => {
        expect(containsMaliciousPatterns('Hello world!')).toBe(false);
    });
});
