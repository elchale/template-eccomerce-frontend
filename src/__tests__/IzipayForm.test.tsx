/**
 * Tests for IzipayForm component.
 *
 * Verifies:
 * - Component mounts and shows loading state initially
 * - KRGlue.loadLibrary is called with the correct host and public key
 * - onSuccess is called with the right shape (including rawAnswer / rawAvailable)
 * - KR.removeForms is called on unmount (cleanup)
 */
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock i18next ───────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string) => k,
        i18n: { language: 'es-PE', changeLanguage: vi.fn() },
    }),
}));

// ── Mock @lyracom/embedded-form-glue ────────────────────────────────────────
// vi.mock is hoisted so the factory must not reference top-level let/const.
// We use vi.hoisted() to create the mocks before the hoist boundary.
const { mockLoadLibrary, mockKrOnSubmit, mockKrOnError, mockKrRemoveForms } = vi.hoisted(() => {
    const mockKrRemoveForms = vi.fn().mockResolvedValue(undefined);
    const mockKrRenderElements = vi.fn().mockResolvedValue({ KR: {} });
    const mockKrSetFormConfig = vi.fn().mockResolvedValue({ KR: {} });
    const mockKrOnSubmit = vi.fn();
    const mockKrOnError = vi.fn();

    const mockKR = {
        setFormConfig: mockKrSetFormConfig,
        renderElements: mockKrRenderElements,
        onSubmit: mockKrOnSubmit,
        onError: mockKrOnError,
        removeForms: mockKrRemoveForms,
    };

    const mockLoadLibrary = vi.fn().mockResolvedValue({ KR: mockKR });

    return { mockLoadLibrary, mockKrOnSubmit, mockKrOnError, mockKrRemoveForms };
});

vi.mock('@lyracom/embedded-form-glue', () => ({
    default: { loadLibrary: mockLoadLibrary },
}));

// ── Import subject under test ─────────────────────────────────────────────
import { IzipayForm } from '@/components/payments/IzipayForm/IzipayForm';

// ── Captured callbacks ────────────────────────────────────────────────────
let capturedOnSubmit: ((pr: unknown) => boolean | void) | null = null;
let capturedOnError: ((err: unknown) => void) | null = null;

// ── Tests ─────────────────────────────────────────────────────────────────

describe('IzipayForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnSubmit = null;
        capturedOnError = null;

        // Re-wire callbacks after clearAllMocks
        mockKrOnSubmit.mockImplementation((cb: (pr: unknown) => boolean | void) => {
            capturedOnSubmit = cb;
            return Promise.resolve({ KR: {} });
        });
        mockKrOnError.mockImplementation((cb: (err: unknown) => void) => {
            capturedOnError = cb;
            return Promise.resolve({ KR: {} });
        });
    });

    it('shows loading text while Krypton initialises', () => {
        render(<IzipayForm formToken="tok_loading" onSuccess={vi.fn()} onError={vi.fn()} />);
        expect(screen.getByText('payment_loading_form')).toBeTruthy();
    });

    it('calls KRGlue.loadLibrary with the correct host', async () => {
        render(<IzipayForm formToken="tok_lib" onSuccess={vi.fn()} onError={vi.fn()} />);

        await waitFor(() => expect(mockLoadLibrary).toHaveBeenCalledTimes(1));

        expect(mockLoadLibrary).toHaveBeenCalledWith(
            'https://static.micuentaweb.pe',
            expect.any(String),
        );
    });

    it('calls onSuccess with rawAnswer and rawAvailable=true when rawClientAnswer is present', async () => {
        const onSuccess = vi.fn();

        render(<IzipayForm formToken="tok_submit" onSuccess={onSuccess} onError={vi.fn()} />);

        await waitFor(() => expect(capturedOnSubmit).not.toBeNull());

        const fakePaymentResponse = {
            hash: 'deadbeef',
            hashAlgorithm: 'sha256_hmac',
            hashKey: 'sha256_hmac',
            clientAnswer: { orderStatus: 'PAID' },
            rawClientAnswer: '{"orderStatus":"PAID"}',
        };

        act(() => {
            capturedOnSubmit!(fakePaymentResponse);
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
        const result = onSuccess.mock.calls[0]?.[0] as {
            hash: string;
            rawAnswer: string;
            rawAvailable: boolean;
        };
        expect(result.hash).toBe('deadbeef');
        expect(result.rawAnswer).toBe('{"orderStatus":"PAID"}');
        expect(result.rawAvailable).toBe(true);
    });

    it('calls onSuccess with rawAvailable=false when rawClientAnswer is absent (BP2 fallback)', async () => {
        const onSuccess = vi.fn();

        render(<IzipayForm formToken="tok_no_raw" onSuccess={onSuccess} onError={vi.fn()} />);

        await waitFor(() => expect(capturedOnSubmit).not.toBeNull());

        // rawClientAnswer intentionally absent
        const fakePaymentResponse = {
            hash: 'aabbcc',
            hashAlgorithm: 'sha256_hmac',
            hashKey: 'sha256_hmac',
            clientAnswer: { orderStatus: 'PAID' },
        };

        act(() => {
            capturedOnSubmit!(fakePaymentResponse);
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
        const result = onSuccess.mock.calls[0]?.[0] as { rawAvailable: boolean; rawAnswer: string };
        expect(result.rawAvailable).toBe(false);
        expect(typeof result.rawAnswer).toBe('string');
        expect(result.rawAnswer).toContain('PAID');
    });

    it('calls onError when KR emits an error', async () => {
        const onError = vi.fn();

        render(<IzipayForm formToken="tok_error" onSuccess={vi.fn()} onError={onError} />);

        await waitFor(() => expect(capturedOnError).not.toBeNull());

        const fakeError = { errorCode: 'PSP_100', errorMessage: 'Card declined' };

        act(() => {
            capturedOnError!(fakeError);
        });

        expect(onError).toHaveBeenCalledWith(fakeError);
    });

    it('calls KR.removeForms on unmount (cleanup)', async () => {
        const { unmount } = render(
            <IzipayForm formToken="tok_cleanup" onSuccess={vi.fn()} onError={vi.fn()} />,
        );

        await waitFor(() => expect(mockLoadLibrary).toHaveBeenCalledTimes(1));

        unmount();

        await waitFor(() => expect(mockKrRemoveForms).toHaveBeenCalledTimes(1));
    });
});
