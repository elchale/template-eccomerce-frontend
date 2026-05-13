/**
 * Rate Limiter for client-side request throttling
 * Implements exponential backoff for failed authentication attempts
 */

interface RateLimitConfig {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs: number;
}

interface AttemptRecord {
    count: number;
    firstAttemptTime: number;
    blockedUntil?: number;
}

class RateLimiter {
    private attempts = new Map<string, AttemptRecord>();
    private config: RateLimitConfig;

    constructor(config?: Partial<RateLimitConfig>) {
        this.config = {
            maxAttempts: config?.maxAttempts || 5,
            windowMs: config?.windowMs || 15 * 60 * 1000, // 15 minutes
            blockDurationMs: config?.blockDurationMs || 15 * 60 * 1000, // 15 minutes
        };
    }

    /**
     * Check if an action is allowed for the given identifier
     * @param identifier - Unique identifier (e.g., email, IP, endpoint)
     * @returns Object with isAllowed status and optional retry time
     */
    checkLimit(identifier: string): {
        isAllowed: boolean;
        retryAfter?: number;
        attemptsRemaining?: number;
    } {
        const now = Date.now();
        const record = this.attempts.get(identifier);

        // No previous attempts
        if (!record) {
            return {
                isAllowed: true,
                attemptsRemaining: this.config.maxAttempts - 1,
            };
        }

        // Check if currently blocked
        if (record.blockedUntil && record.blockedUntil > now) {
            const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
            return {
                isAllowed: false,
                retryAfter,
            };
        }

        // Check if window has expired - reset attempts
        const timeSinceFirst = now - record.firstAttemptTime;
        if (timeSinceFirst > this.config.windowMs) {
            this.attempts.delete(identifier);
            return {
                isAllowed: true,
                attemptsRemaining: this.config.maxAttempts - 1,
            };
        }

        // Check if max attempts reached
        if (record.count >= this.config.maxAttempts) {
            const blockedUntil = now + this.config.blockDurationMs;
            this.attempts.set(identifier, {
                ...record,
                blockedUntil,
            });
            const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
            return {
                isAllowed: false,
                retryAfter,
            };
        }

        return {
            isAllowed: true,
            attemptsRemaining: this.config.maxAttempts - record.count - 1,
        };
    }

    /**
     * Record an attempt for the given identifier
     * @param identifier - Unique identifier
     */
    recordAttempt(identifier: string): void {
        const now = Date.now();
        const record = this.attempts.get(identifier);

        if (!record || now - record.firstAttemptTime > this.config.windowMs) {
            // First attempt or window expired
            this.attempts.set(identifier, {
                count: 1,
                firstAttemptTime: now,
            });
        } else {
            // Increment attempt count
            this.attempts.set(identifier, {
                ...record,
                count: record.count + 1,
            });
        }
    }

    /**
     * Reset attempts for the given identifier (e.g., after successful auth)
     * @param identifier - Unique identifier
     */
    reset(identifier: string): void {
        this.attempts.delete(identifier);
    }

    /**
     * Clear all rate limit records
     */
    clearAll(): void {
        this.attempts.clear();
    }

    /**
     * Get exponential backoff delay based on attempt count
     * @param attemptCount - Number of failed attempts
     * @returns Delay in milliseconds
     */
    static getExponentialBackoff(attemptCount: number): number {
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds
        const delay = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
        return delay;
    }
}

// Export singleton instances for different use cases
export const authRateLimiter = new RateLimiter({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
});

export const apiRateLimiter = new RateLimiter({
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute
});

export { RateLimiter };
