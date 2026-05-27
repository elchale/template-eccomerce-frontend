/**
 * Tests for CheckoutPaymentPage.
 *
 * Mercado Pago is the active payment gateway (VITE_PAYMENT_GATEWAY defaults
 * to 'mercadopago'), so these tests exercise the MP flow. The Culqi + Izipay
 * paths are kept dormant — see usePayments / IzipayForm tests for those.
 *
 * Verifies:
 * - Loading skeleton shown while order fetches
 * - MercadoPagoForm renders once the order is loaded (no separate prep step)
 * - On Brick submit: backend processes payment, success toast shown, navigate to order
 * - On in_process status: navigates with ?verifying=1
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
            if (opts && 'gateway' in opts) return `${k}:${opts.gateway}`;
            if (opts && 'amount' in opts) return `${k}:${opts.amount}`;
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
    useMercadoPagoProcess: vi.fn(),
    useCulqiOrder: vi.fn(),
    useCulqiCharge: vi.fn(),
    useIzipayToken: vi.fn(),
    useVerifyPayment: vi.fn(),
}));

vi.mock('@/api/useCart', () => ({
    CART_KEYS: {
        all: ['cart'] as const,
        detail: () => ['cart', 'detail'] as const,
    },
}));

// Card form data shape returned by the MP Brick on submit.
interface FakeMpCardFormData {
    token: string;
    payment_method_id: string;
    issuer_id?: string;
    installments: number;
    transaction_amount: number;
    payer: {
        email: string;
        identification?: { type: string; number: string };
    };
}

vi.mock('@/components/payments', () => ({
    MercadoPagoForm: ({
        onPaymentReady,
        onError,
    }: {
        publicKey: string;
        amount: number;
        email: string;
        onPaymentReady: (d: FakeMpCardFormData) => Promise<void>;
        onError: (m: string) => void;
    }) => (
        <div data-testid="mercadopago-form">
            <button
                onClick={() =>
                    // The real Card Payment Brick awaits onSubmit and swallows
                    // the rejection (it re-throws only to re-enable its button).
                    // Mirror that so a rejected submit doesn't surface as an
                    // unhandled rejection in the test environment.
                    void onPaymentReady({
                        token: 'mp_token_abc',
                        payment_method_id: 'visa',
                        issuer_id: '310',
                        installments: 1,
                        transaction_amount: 150,
                        payer: {
                            email: 'test@test.com',
                            identification: { type: 'DNI', number: '12345678' },
                        },
                    }).catch(() => {
                        /* handled by the page; Brick re-enables submit */
                    })
                }
            >
                mp-submit-trigger
            </button>
            <button onClick={() => onError('Tarjeta rechazada')}>mp-error-trigger</button>
        </div>
    ),
    // The Status Screen Brick renders the 3DS challenge. We expose the
    // externalResourceURL + creq it was mounted with so tests can assert the
    // backend `three_ds` data was forwarded, plus a trigger to simulate the
    // buyer completing the challenge.
    MercadoPagoStatusBrick: ({
        paymentId,
        externalResourceUrl,
        creq,
        onChallengeResolved,
    }: {
        publicKey: string;
        paymentId: string;
        externalResourceUrl: string;
        creq: string;
        onChallengeResolved: () => void;
        onError: (m: string) => void;
    }) => (
        <div
            data-testid="mercadopago-status-brick"
            data-payment-id={paymentId}
            data-external-resource-url={externalResourceUrl}
            data-creq={creq}
        >
            <button onClick={() => onChallengeResolved()}>mp-challenge-resolved-trigger</button>
        </div>
    ),
    CulqiForm: () => <div data-testid="culqi-form" />,
    IzipayForm: () => <div data-testid="izipay-form" />,
}));

// ── Actual imports after mocks ────────────────────────────────────────────
import { useOrderDetail } from '@/api/useOrders';
import { useMercadoPagoProcess } from '@/api/usePayments';
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

describe('CheckoutPaymentPage (Mercado Pago — active gateway)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading skeleton (aria-hidden elements) while order is loading', () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: undefined,
            isLoading: true,
        } as unknown as ReturnType<typeof useOrderDetail>);

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        const skeletons = document.querySelectorAll('[aria-hidden="true"]');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders MercadoPagoForm once the order is loaded (no separate prep step)', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('mercadopago-form')).toBeTruthy();
        });
    });

    it('on Brick submit (paid): processes payment, shows success toast, navigates to order detail', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        const mockMutateAsync = vi.fn(async () => ({
            paid: true,
            order_number: 'QLCA-20260501-ABCD',
            payment_id: '999999',
            status: 'approved',
        }));

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        const brickForm = await screen.findByTestId('mercadopago-form');
        expect(brickForm).toBeTruthy();

        const user = userEvent.setup();
        await user.click(screen.getByText('mp-submit-trigger'));

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

    it('on Brick submit (in_process): navigates with verifying=1 instead of success', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        const mockMutateAsync = vi.fn(async () => ({
            paid: false,
            order_number: 'QLCA-20260501-ABCD',
            payment_id: '999999',
            status: 'in_process',
        }));

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        const brickForm = await screen.findByTestId('mercadopago-form');
        expect(brickForm).toBeTruthy();

        const user = userEvent.setup();
        await user.click(screen.getByText('mp-submit-trigger'));

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringMatching(/QLCA-20260501-ABCD\?verifying=1$/),
            );
        });
    });

    it('on Brick submit (pending_challenge): mounts the Status Screen Brick with the returned externalResourceURL + creq', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        const mockMutateAsync = vi.fn(async () => ({
            paid: false,
            order_number: 'QLCA-20260501-ABCD',
            payment_id: '777777',
            status: 'pending_challenge',
            three_ds: {
                external_resource_url: 'https://acs.bank.example/challenge',
                creq: 'eyJjcmVxIjoiZGF0YSJ9',
            },
        }));

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        const brickForm = await screen.findByTestId('mercadopago-form');
        expect(brickForm).toBeTruthy();

        const user = userEvent.setup();
        await user.click(screen.getByText('mp-submit-trigger'));

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

        // The Status Screen Brick is mounted with the backend three_ds data.
        const statusBrick = await screen.findByTestId('mercadopago-status-brick');
        expect(statusBrick.getAttribute('data-payment-id')).toBe('777777');
        expect(statusBrick.getAttribute('data-external-resource-url')).toBe(
            'https://acs.bank.example/challenge',
        );
        expect(statusBrick.getAttribute('data-creq')).toBe('eyJjcmVxIjoiZGF0YSJ9');

        // No success toast / navigation yet — the challenge is still in flight.
        expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('after the 3DS challenge resolves: navigates to order detail with verifying=1', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        const mockMutateAsync = vi.fn(async () => ({
            paid: false,
            order_number: 'QLCA-20260501-ABCD',
            payment_id: '777777',
            status: 'pending_challenge',
            three_ds: {
                external_resource_url: 'https://acs.bank.example/challenge',
                creq: 'eyJjcmVxIjoiZGF0YSJ9',
            },
        }));

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        const user = userEvent.setup();
        await user.click(screen.getByText('mp-submit-trigger'));

        const statusBrick = await screen.findByTestId('mercadopago-status-brick');
        expect(statusBrick).toBeTruthy();

        await user.click(screen.getByText('mp-challenge-resolved-trigger'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringMatching(/QLCA-20260501-ABCD\?verifying=1$/),
            );
        });
    });

    it('on Brick submit (rejected): shows masked error toast and does NOT navigate', async () => {
        vi.mocked(useOrderDetail).mockReturnValue({
            data: PENDING_ORDER,
            isLoading: false,
        } as unknown as ReturnType<typeof useOrderDetail>);

        // A rejection comes back as a 402 with a safe {detail} body.
        const mockMutateAsync = vi.fn(async () => {
            throw {
                response: {
                    status: 402,
                    data: {
                        detail: 'No pudimos validar la verificación de seguridad de tu banco.',
                        code: 'declined',
                    },
                },
            };
        });

        vi.mocked(useMercadoPagoProcess).mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useMercadoPagoProcess>);

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPaymentPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        const user = userEvent.setup();
        await user.click(screen.getByText('mp-submit-trigger'));

        await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

        // The masked backend detail is surfaced; no challenge brick, no navigation.
        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'No pudimos validar la verificación de seguridad de tu banco.',
                { duration: 8000 },
            );
        });
        expect(screen.queryByTestId('mercadopago-status-brick')).toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
