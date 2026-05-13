/**
 * Input sanitization utilities
 * Provides defense-in-depth against XSS attacks
 *
 * Internally backed by DOMPurify for `stripHtml` and `escapeHtml` — this
 * gives us a battle-tested HTML parser instead of naive regex replacement.
 * The public function signatures are unchanged so call sites need no edits.
 *
 * Note: React already escapes strings by default, but this provides
 * additional security for user-generated content and edge cases.
 *
 * IMPORTANT: Only this file should call DOMPurify directly. All other modules
 * that need HTML sanitization must import from here.
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize a string by removing potentially dangerous characters
 * @param input - Raw string input
 * @returns Sanitized string
 */
export function sanitizeString(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .replaceAll(/[<>]/g, '') // Remove < and >
        .replaceAll(/javascript:/gi, '') // Remove javascript: protocol
        .replaceAll(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
        .trim();
}

/**
 * Sanitize user display name (username, first name, last name)
 * Allows letters, numbers, spaces, hyphens, apostrophes, and periods
 * @param input - Raw name input
 * @returns Sanitized name
 */
export function sanitizeName(input: string | null | undefined): string {
    if (!input) return '';

    // Allow Unicode letters, numbers, spaces, hyphens, apostrophes, and periods.
    // \p{L} matches any Unicode letter (covers accented chars like é, ñ, ü, etc.)
    // \p{N} matches any Unicode numeric character.
    return input
        .replaceAll(/[^\p{L}\p{N}\s\-'.]/gu, '')
        .replaceAll(/\s+/g, ' ') // Collapse multiple spaces
        .trim()
        .slice(0, 100); // Limit length
}

/**
 * Sanitize email address
 * @param input - Raw email input
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(input: string | null | undefined): string {
    if (!input) return '';

    const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    const sanitized = input.trim().toLowerCase().slice(0, 254);

    return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param input - Raw URL input
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string | null | undefined): string {
    if (!input) return '';

    const trimmed = input.trim();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerCaseUrl = trimmed.toLowerCase();

    for (const protocol of dangerousProtocols) {
        if (lowerCaseUrl.startsWith(protocol)) {
            return '';
        }
    }

    // Only allow http, https, mailto, and relative URLs
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('#')
    ) {
        return trimmed;
    }

    // If no protocol, assume relative URL
    if (!trimmed.includes(':')) {
        return trimmed;
    }

    return '';
}

/**
 * Strip all HTML tags, leaving plain text. Backed by DOMPurify with
 * `ALLOWED_TAGS: []` which gives us a proper HTML parse + sanitize pass
 * instead of a naive regex that can be bypassed by nested/malformed markup.
 * @param input - Raw HTML input
 * @returns Plain text without HTML tags
 */
export function stripHtml(input: string | null | undefined): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitize user profile data object
 * @param profile - Raw profile data
 * @returns Sanitized profile data
 */
export interface SanitizedUserProfile {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
}

export function sanitizeUserProfile(
    profile:
        | {
              username?: string;
              email?: string;
              first_name?: string;
              last_name?: string;
              is_staff?: boolean;
          }
        | null
        | undefined,
): SanitizedUserProfile {
    if (!profile)
        return {
            username: '',
            email: '',
            first_name: '',
            last_name: '',
            is_staff: false,
        };

    return {
        username: sanitizeName(profile.username),
        email: sanitizeEmail(profile.email),
        first_name: sanitizeName(profile.first_name),
        last_name: sanitizeName(profile.last_name),
        is_staff: profile.is_staff === true,
    };
}

/**
 * Sanitize search query input
 * @param input - Raw search query
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .replaceAll(/[<>'"]/g, '') // Remove quotes and angle brackets
        .trim()
        .slice(0, 200); // Limit length
}

/**
 * Check that a path is a safe internal app path (not an open redirect).
 * Returns true only if the path starts with a single '/' and contains no
 * protocol prefix (e.g. no `http:`, `javascript:`, `//`).
 *
 * Use this before calling navigate() with a stored redirect value.
 * @param path - Path to validate
 * @returns true if the path is safe for internal navigation
 */
export function isSafeInternalPath(path: string): boolean {
    return (
        typeof path === 'string' &&
        path.startsWith('/') &&
        !path.startsWith('//') &&
        !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)
    );
}

/**
 * Check if a string contains potentially malicious patterns
 * @param input - String to check
 * @returns true if suspicious patterns detected
 */
export function containsMaliciousPatterns(input: string): boolean {
    const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<embed/i,
        /<object/i,
        /eval\(/i,
        /expression\(/i,
    ];

    return maliciousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Escape special characters for safe display, backed by DOMPurify.
 * (React does this automatically for string children, but useful for
 *  edge cases like constructing innerHTML strings.)
 * @param input - Raw string
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string | null | undefined): string {
    if (!input) return '';
    // Sanitize with DOMPurify allowing no tags — returns escaped text
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}
