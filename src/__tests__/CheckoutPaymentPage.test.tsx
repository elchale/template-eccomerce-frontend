/**
 * Tests for CheckoutPaymentPage.
 *
 * Verifies:
 * - Loading skeleton shown while order fetches
 * - Transitions loading → ready when formToken arrives
 * - On payment success: toast shown + navigate to order detail
 * - On error: "Reintentar" button visible and triggers refetch
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import toast from 'react-hot-toast';
import type * as RouterDom from 'react-router-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks must be declared before imports that use them ───────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof RouterDom>();
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, opts?: Record<string, unknown>) => {
            if (opts && 'count' in opts) return `${k}:${opts.count}`;
            if (opts && 'reason' in opts) return `${k}:${opts.reason}`;
            return k;
        },
        i18n: { language: 'es', changeLanguage: vi.fn() },
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/api/useOrders', () => ({
    useOrderDetail: vi.fn(),
    ORDER_KEYS: {
        all: ['orders'] as const,
        detail: (n: string) => ['orders', 'detail', n] as const,
    },
}));

vi.mock('@/api/usePayments', () => ({
    useIzipayToken: vi.fn(),
    useVerifyPayment: vi.fn(),
}));

vi.mock('@/api/useCart', () => ({
    CART_KEYS: {
        all: ['cart'] as const,
        detail: () => ['cart', 'detail'] as const,
    },
}));

vi.mock('@/components/payments/IzipayForm', () => ({
    IzipayForm: ({
        onSuccess,
        onError,
    }: {
        formToken: string;
        onSuccess: (r: unknown) => void;
        onError: (e: unknown) => void;
    }) => (
        <div data-testid="izipay-form">
            <button
                onClick={() =>
                    onSuccess({
                        hash: 'abc',
                        hashAlgorithm: 'sha256',
                        hashKey: 'sha256_hmac',
                        answer: {},
                        rawAnswer: '{}',
                        rawAvailable: true,
                    })
                }
            >
                pay-success-trigger
            </button>
            <button onClick={() => onError({ errorCode: 'DECLINE', errorMessage: 'Declined' })}>
                pay-error-trigger
            </button>
        </div>
    ),
}));

// ── Actual imports after mocks ────────────────────────────────────────────
import { useOrderDetail } from '@/api/useOrders';
import { useIzipayToken, useVerifyPayment } from '@/api/usePayments';
import { CheckoutPaymentPage } from '@/pages/CheckoutPaymentPage/CheckoutPaymentPage';

// ── Test helpers ──────────────────────────────────────────────────────────

function makeWrapper() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/checkout/pay/QLCA-20260501-ABCD']}>
                <Routes>
                    <Route path="/checkout/pay/:orderNumber" element={<>{children}</>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
    return Wrapper;
}

const PENDING_ORDER = {
    id: 1,
    order_number: 'QLCA-20260501-ABCD',
    status: 'pending' as const,
    payment_status: 'unpaid' as const,
    total: '150.00',
    subtotal: '140.00',
    discount_amount: '0.00',
    item_count: 1,
    created: '2026-05-01T00:00:00Z',
    items: [
        {
            id: 1,
            product_name: 'Camiseta Azul',
            variant_info: 'M',
            price: '140.00',
            quantity: 1,
            image_url: '',
            line_total: '140.00',
        },
    ],
    shipping_address: 'Lima, Peru',
    billing_address: '',
    notes: '',
    coupon_code: null,
    email: 'test@test.com',
    phone: '',
    status_history: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CheckoutPaymentPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading skeleton (aria-hidden elements) while order is loading', () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: undefined,
            isLoading: true,
        } as unknown as ReturnType<typeof useOrderDetail>);

        vi.mocked(useIzipayToken).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useIzipayToken>);

        vi.mocked(useVerifyPayment).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useVerifyPayment>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        // Skeleton items are aria-hidden
        const skeletons = document.querySelectorAll('[aria-hidden="true"]');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders IzipayForm when token fetch succeeds (loading → ready)', async () => {
        let capturedOnSuccess: ((d: { formToken: string }) => void) | null = null;

        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        vi.mocked(useIzipayToken).mockReturnValue({
            mutate: vi.fn(
                (_params: unknown, opts: { onSuccess?: (d: { formToken: string }) => void }) => {
                    capturedOnSuccess = opts?.onSuccess ?? null;
                },
            ),
            isPending: false,
        } as unknown as ReturnType<typeof useIzipayToken>);

        vi.mocked(useVerifyPayment).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useVerifyPayment>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        await act(async () => {
            capturedOnSuccess?.({ formToken: 'test-form-token' });
        });

        await waitFor(() => {
            expect(screen.getByTestId('izipay-form')).toBeTruthy();
        });
    });

    it('shows Reintentar button on error and refetches token on click', async () => {
        let capturedOnError: (() => void) | null = null;

        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        const mockMutate = vi.fn((_params: unknown, opts: { onError?: () => void }) => {
            capturedOnError = opts?.onError ?? null;
        });

        vi.mocked(useIzipayToken).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        } as unknown as ReturnType<typeof useIzipayToken>);

        vi.mocked(useVerifyPayment).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useVerifyPayment>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        await act(async () => {
            capturedOnError?.();
        });

        await waitFor(() => {
            expect(screen.getByText('payment_retry')).toBeTruthy();
        });

        const user = userEvent.setup();
        await user.click(screen.getByText('payment_retry'));

        expect(mockMutate).toHaveBeenCalledTimes(2);
    });

    it('on payment success: calls verify, shows success toast, navigates to order detail', async () => {
        let capturedOnSuccess: ((d: { formToken: string }) => void) | null = null;

        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        vi.mocked(useIzipayToken).mockReturnValue({
            mutate: vi.fn(
                (_params: unknown, opts: { onSuccess?: (d: { formToken: string }) => void }) => {
                    capturedOnSuccess = opts?.onSuccess ?? null;
                },
            ),
            isPending: false,
        } as unknown as ReturnType<typeof useIzipayToken>);

        const mockMutateAsync = vi.fn().mockResolvedValue({
            paid: true,
            order_status: 'PAID',
            order_number: 'QLCA-20260501-ABCD',
        });

        vi.mocked(useVerifyPayment).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useVerifyPayment>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        // Advance to ready state
        await act(async () => {
            capturedOnSuccess?.({ formToken: 'tok' });
        });

        await waitFor(() => screen.getByTestId('izipay-form'));

        const user = userEvent.setup();
        await user.click(screen.getByText('pay-success-trigger'));

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('payment_success', {
                duration: 3000,
            });
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringContaining('QLCA-20260501-ABCD'),
            );
        });
    });
});
