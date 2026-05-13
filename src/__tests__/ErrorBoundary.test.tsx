import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { ErrorBoundary } from '../components/features/ErrorBoundary/ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) throw new Error('Test error message');
    return <div>OK</div>;
};

describe('ErrorBoundary', () => {
    // Suppress console.error for expected error boundary logs
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Todo bien</div>
            </ErrorBoundary>,
        );
        expect(screen.getByText('Todo bien')).toBeTruthy();
    });

    it('renders fallback UI on error', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow />
            </ErrorBoundary>,
        );
        // Without i18n init, `t('key')` echoes the key — assert on key, not translation.
        expect(screen.getByText('error_generic_title')).toBeTruthy();
        expect(screen.getByText('Test error message')).toBeTruthy();
        consoleSpy.mockRestore();
    });

    it('retries on button click', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow />
            </ErrorBoundary>,
        );
        fireEvent.click(screen.getByText('retry'));
        // After reset, the boundary should try to render children again
        // ThrowError still throws so fallback renders again
        expect(screen.getByText('error_generic_title')).toBeTruthy();
        consoleSpy.mockRestore();
    });
});
