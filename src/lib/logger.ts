/**
 * Environment-aware logger utility
 * Prevents sensitive information from being logged in production.
 *
 * Redacts:
 *  - JWT-shaped strings (eyJ...header.payload.signature)
 *  - Refresh/access/token assignment patterns
 *  - Credit-card-shaped digit sequences (13–19 consecutive digits)
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
    enabled: boolean;
    level: LogLevel;
}

/** Patterns that identify sensitive data to be redacted before logging. */
const REDACT_PATTERNS: { pattern: RegExp; replacement: string }[] = [
    // Authorization header
    { pattern: /Bearer\s+[A-Z0-9-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
    // JWT-shaped token (three base64url segments separated by dots)
    {
        pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
        replacement: '[JWT_REDACTED]',
    },
    // Token / refresh / access key=value patterns
    {
        pattern: /(refresh|access|token)[:=]\s*[\w.-]+/gi,
        replacement: '$1: [REDACTED]',
    },
    // Legacy bearer/token/password/secret/apikey patterns
    { pattern: /token["\s:=]+[A-Z0-9-._~+/]+=*/gi, replacement: 'token: [REDACTED]' },
    { pattern: /password["\s:=]+[^\s,}]*/gi, replacement: 'password: [REDACTED]' },
    { pattern: /secret["\s:=]+[^\s,}]*/gi, replacement: 'secret: [REDACTED]' },
    { pattern: /apikey["\s:=]+[^\s,}]*/gi, replacement: 'apikey: [REDACTED]' },
    // Credit card shaped sequences (13-19 digits, optionally separated by spaces/dashes)
    { pattern: /\b(?:\d[ -]*?){13,19}\b/g, replacement: '[CC_REDACTED]' },
];

class Logger {
    private config: LoggerConfig;

    constructor(config?: Partial<LoggerConfig>) {
        this.config = {
            enabled: config?.enabled ?? import.meta.env.DEV,
            level: config?.level || 'error',
        };
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) return false;

        const levels: LogLevel[] = ['debug', 'log', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.level);
        const requestedLevelIndex = levels.indexOf(level);

        return requestedLevelIndex >= currentLevelIndex;
    }

    private sanitizeMessage(message: string): string {
        let sanitized = message;
        for (const { pattern, replacement } of REDACT_PATTERNS) {
            sanitized = sanitized.replace(pattern, replacement);
        }
        return sanitized;
    }

    /** Sanitize arbitrary value for safe logging (handles strings + objects). */
    private sanitizeValue(value: unknown): unknown {
        if (typeof value === 'string') return this.sanitizeMessage(value);
        if (value instanceof Error) {
            return new Error(this.sanitizeMessage(value.message));
        }
        try {
            const json = JSON.stringify(value);
            if (json) return JSON.parse(this.sanitizeMessage(json)) as unknown;
        } catch {
            // Fall through for non-serialisable values
        }
        return value;
    }

    log(...args: unknown[]): void {
        if (this.shouldLog('log')) {
            console.log(...args.map((a) => this.sanitizeValue(a)));
        }
    }

    info(...args: unknown[]): void {
        if (this.shouldLog('info')) {
            console.info(...args.map((a) => this.sanitizeValue(a)));
        }
    }

    warn(...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn(...args.map((a) => this.sanitizeValue(a)));
        }
    }

    error(message: string, error?: unknown): void {
        if (this.shouldLog('error')) {
            const sanitizedMessage = this.sanitizeMessage(message);

            if (import.meta.env.DEV) {
                // In development, log full error details
                console.error(sanitizedMessage, this.sanitizeValue(error));
            } else {
                // In production, log sanitized message only
                console.error(sanitizedMessage);
            }
        }
    }

    debug(...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.debug(...args.map((a) => this.sanitizeValue(a)));
        }
    }

    /**
     * Temporarily enable logging (useful for debugging production issues)
     */
    enable(): void {
        this.config.enabled = true;
    }

    /**
     * Disable logging
     */
    disable(): void {
        this.config.enabled = false;
    }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances if needed
export { Logger };
