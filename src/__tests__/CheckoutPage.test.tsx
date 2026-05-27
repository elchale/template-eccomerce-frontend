/**
 * Tests for CheckoutPage under the order-on-payment model.
 *
 * The order is created ONLY when the payment confirms, so the page calls
 * `POST /api/checkout/pay` (via useCheckoutPay) with the card token + contact
 * details and never navigates to an order until it has an `order_number`.
 *
 * Verifies:
 * - The MercadoPago Brick renders once the cart is loaded.
 * - approved          → success toast + navigate to the new order detail.
 * - pending_challenge → mounts the Status Screen Brick (no order, no navigate);
 *   after the challenge resolves we poll the session and, on `paid`, navigate.
 * - rejected (402)    → masked {detail} toast, cart intact, no navigate.
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
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: null, pathname: '/checkout', search: '', hash: '', key: '' }),
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, opts?: Record<string, unknown>) => {
            if (opts && 'count' in opts) return `${k}:${opts.count}`;
            if (opts && 'gateway' in opts) return `${k}:${opts.gateway}`;
            return k;
        },
        i18n: { language: 'es', changeLanguage: vi.fn() },
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const mockGetUser = vi.fn(() => ({
    email: 'test@test.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
}));

vi.mock('@/stores/useAuthStore', () => ({
    useAuthStore: (selector: (s: unknown) => unknown) =>
        selector({ getUser: mockGetUser, isLogged: true }),
}));

const mockPayMutateAsync = vi.fn();
const mockUseCheckoutPay = vi.fn();
const mockUseCheckoutSessionStatus = vi.fn();
const mockUseCart = vi.fn();

vi.mock('@/api', () => ({
    useCart: () => mockUseCart(),
    useCheckoutPay: () => mockUseCheckoutPay(),
    useCheckoutSessionStatus: (uuid: string | null, enabled: boolean) =>
        mockUseCheckoutSessionStatus(uuid, enabled),
}));

vi.mock('@/api/useCart', () => ({
    CART_KEYS: { all: ['cart'] as const, detail: () => ['cart', 'detail'] as const },
}));
vi.mock('@/api/useOrders', () => ({
    ORDER_KEYS: { all: ['orders'] as const },
}));

// AddressPicker mock: fires onChange with a valid address on mount so the
// hidden `shippingAddress` field validates (zod min(1)).
vi.mock('@/components/features/AddressPicker', () => ({
    EMPTY_ADDRESS: { recipient: '', phone: '' },
    formatAddressForBackend: () => 'Av. Siempre Viva 123, Lima',
    AddressPicker: ({ onChange }: { onChange: (v: unknown) => void }) => {
        return (
            <button data-testid="fill-address" onClick={() => onChange({ phone: '999999999' })}>
                fill-address
            </button>
        );
    },
}));

// FormInput mock — minimal controlled input keyed by `name`.
vi.mock('@/components/forms/FormField/FormInput', () => ({
    FormInput: ({ name, label }: { name: string; label: string }) => (
        <label>
            {label}
            <input data-testid={`input-${name}`} name={name} />
        </label>
    ),
}));

interface FakeMpCardFormData {
    token: string;
    payment_method_id: string;
    issuer_id?: string;
    installments: number;
    payer: { email: string; identification?: { type: string; number: string } };
}

vi.mock('@/components/payments', () => ({
    MercadoPagoForm: ({
        onPaymentReady,
    }: {
        onPaymentReady: (d: FakeMpCardFormData) => Promise<void>;
    }) => (
        <div data-testid="mercadopago-form">
            <button
                onClick={() =>
                    void onPaymentReady({
                        token: 'mp_token_abc',
                        payment_method_id: 'visa',
                        issuer_id: '310',
                        installments: 1,
                        payer: {
                            email: 'test@test.com',
                            identification: { type: 'DNI', number: '12345678' },
                        },
                    }).catch(() => {
                        /* Brick re-enables submit on rejection */
                    })
                }
            >
                mp-submit-trigger
            </button>
        </div>
    ),
    MercadoPagoStatusBrick: ({
        paymentId,
        externalResourceUrl,
        creq,
        onChallengeResolved,
    }: {
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
}));

vi.mock('@/lib/mercadopago', () => ({ getDeviceId: () => 'dev-session-xyz' }));

// ── Actual import after mocks ──────────────────────────────────────────────
import { CheckoutPage } from '@/pages/CheckoutPage/CheckoutPage';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/checkout']}>
                <Routes>
                    <Route path="/checkout" element={<>{children}</>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
    return Wrapper;
}

const CART = {
    id: 1,
    item_count: 1,
    subtotal: '150.00',
    items: [
        {
            id: 1,
            product: 1,
            product_name: 'Camiseta Azul',
            product_slug: 'camiseta-azul',
            product_image: null,
            variant: null,
            variant_info: 'M',
            quantity: 1,
            unit_price: '150.00',
            line_total: '150.00',
        },
    ],
};

function setSessionStatus(data: unknown) {
    mockUseCheckoutSessionStatus.mockReturnValue({ data });
}

async function fillAddressAndSubmit() {
    const user = userEvent.setup();
    // Populate the address so the hidden shippingAddress field validates.
    await user.click(screen.getByTestId('fill-address'));
    await user.click(screen.getByText('mp-submit-trigger'));
    return user;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('CheckoutPage (order-on-payment)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCart.mockReturnValue({ data: CART, isLoading: false });
        mockUseCheckoutSessionStatus.mockReturnValue({ data: undefined });
        mockUseCheckoutPay.mockReturnValue({
            mutateAsync: mockPayMutateAsync,
            isPending: false,
        });
    });

    it('renders the MercadoPago Brick once the cart is loaded', async () => {
        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPage />
            </Wrapper>,
        );
        await waitFor(() => expect(screen.getByTestId('mercadopago-form')).toBeTruthy());
    });

    it('on approved: shows success toast and navigates to the new order detail', async () => {
        // Real backend approved shape: paid:true + OrderDetail (its `status` is
        // the order status "confirmed", not "approved").
        mockPayMutateAsync.mockResolvedValue({
            paid: true,
            session_uuid: 'sess-1',
            order_number: 'QLCA-20260501-ABCD',
            status: 'confirmed',
            payment_status: 'paid',
        });

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        await fillAddressAndSubmit();

        await waitFor(() => expect(mockPayMutateAsync).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('payment_success', {
                duration: 3000,
            }),
        );
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringContaining('QLCA-20260501-ABCD'),
            ),
        );
    });

    it('on pending_challenge: mounts the Status Screen Brick with three_ds, no order navigation', async () => {
        mockPayMutateAsync.mockResolvedValue({
            status: 'pending_challenge',
            session_uuid: 'sess-3ds-123',
            payment_id: '777777',
            three_ds: {
                external_resource_url: 'https://acs.bank.example/challenge',
                creq: 'eyJjcmVxIjoiZGF0YSJ9',
            },
        });

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        await fillAddressAndSubmit();

        const statusBrick = await screen.findByTestId('mercadopago-status-brick');
        expect(statusBrick.getAttribute('data-payment-id')).toBe('777777');
        expect(statusBrick.getAttribute('data-external-resource-url')).toBe(
            'https://acs.bank.example/challenge',
        );
        expect(statusBrick.getAttribute('data-creq')).toBe('eyJjcmVxIjoiZGF0YSJ9');

        expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('after the challenge resolves and the session polls paid: navigates to the order', async () => {
        mockPayMutateAsync.mockResolvedValue({
            status: 'pending_challenge',
            session_uuid: 'sess-3ds-123',
            payment_id: '777777',
            three_ds: {
                external_resource_url: 'https://acs.bank.example/challenge',
                creq: 'eyJjcmVxIjoiZGF0YSJ9',
            },
        });
        // The poll resolves to paid with the new order number.
        setSessionStatus({ status: 'paid', order_number: 'QLCA-20260501-PAID' });

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        const user = await fillAddressAndSubmit();

        const statusBrick = await screen.findByTestId('mercadopago-status-brick');
        expect(statusBrick).toBeTruthy();

        await user.click(screen.getByText('mp-challenge-resolved-trigger'));

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith(
                expect.stringContaining('QLCA-20260501-PAID'),
            ),
        );
    });

    it('on rejected (402): shows the masked detail toast and does NOT navigate (cart intact)', async () => {
        mockPayMutateAsync.mockRejectedValue({
            response: {
                status: 402,
                data: {
                    detail: 'No pudimos validar la verificación de seguridad de tu banco.',
                    code: 'declined',
                },
            },
        });

        const Wrapper = makeWrapper();
        render(
            <Wrapper>
                <CheckoutPage />
            </Wrapper>,
        );

        await screen.findByTestId('mercadopago-form');
        await fillAddressAndSubmit();

        await waitFor(() => expect(mockPayMutateAsync).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'No pudimos validar la verificación de seguridad de tu banco.',
                { duration: 8000 },
            ),
        );
        expect(screen.queryByTestId('mercadopago-status-brick')).toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
