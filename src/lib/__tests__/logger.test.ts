import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger } from '../logger';

describe('Logger redaction', () => {
    let logger: InstanceType<typeof Logger>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        logger = new Logger({ enabled: true, level: 'debug' });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('redacts JWT-shaped tokens in error messages', () => {
        logger.error('Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123def');
        const message = (consoleErrorSpy.mock.calls[0]?.[0] ?? '') as string;
        expect(message).toContain('[JWT_REDACTED]');
        expect(message).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    });

    it('redacts refresh token keyword patterns', () => {
        logger.error('refresh: my-secret-refresh-token-value');
        const message = (consoleErrorSpy.mock.calls[0]?.[0] ?? '') as string;
        expect(message).toContain('[REDACTED]');
    });

    it('redacts credit-card shaped digit sequences', () => {
        logger.error('Card: 4111111111111111 was charged');
        const message = (consoleErrorSpy.mock.calls[0]?.[0] ?? '') as string;
        expect(message).toContain('[CC_REDACTED]');
        expect(message).not.toContain('4111111111111111');
    });

    it('does not redact safe messages', () => {
        logger.error('Order created successfully for user 42');
        const message = (consoleErrorSpy.mock.calls[0]?.[0] ?? '') as string;
        expect(message).toBe('Order created successfully for user 42');
    });
});
