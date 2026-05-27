/**
 * Tests for the payment hooks.
 *
 * Verifies:
 * - useCheckoutPay (order-on-payment): POSTs the card + contact payload to
 *   /api/checkout/pay and models the approved / pending_challenge / rejected
 *   response branches. The order only exists once the payment confirms.
 * - useCheckoutSessionStatus: GETs the session status (polled after a 3DS
 *   challenge resolves) and models the paid / failed terminal states.
 * - useIzipayToken / useVerifyPayment (dormant gateway): endpoint + payload.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the axios instance ────────────────────────────────────────────────
vi.mock('@/lib/axios', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

import {
    useIzipayToken,
    useVerifyPayment,
    useCheckoutPay,
    useCheckoutSessionStatus,
} from '@/api/usePayments';
import { api } from '@/lib/axios';

// ── Helper: wrap hooks in a fresh QueryClient ─────────────────────────────

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return { qc, Wrapper };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useIzipayToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POSTs to izipayCreateToken with order_number payload', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockResolvedValueOnce({ data: { formToken: 'test-jwt-token' } });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useIzipayToken(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({ orderNumber: 'QLCA-20260501-ABCD' });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith('/api/payments/izipay/create-token/', {
            order_number: 'QLCA-20260501-ABCD',
        });
        expect(result.current.data?.formToken).toBe('test-jwt-token');
    });

    it('surfaces errors from the API', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockRejectedValueOnce(new Error('Network error'));

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useIzipayToken(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({ orderNumber: 'QLCA-20260501-FAIL' });
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeInstanceOf(Error);
    });
});

describe('useCheckoutPay (order-on-payment)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POSTs the contact + card payload to /api/checkout/pay and returns the approved order', async () => {
        const mockPost = vi.mocked(api.post);
        // Real backend approved shape: paid:true + spread OrderDetail (whose own
        // `status` is the ORDER status like "confirmed", NOT "approved").
        mockPost.mockResolvedValueOnce({
            data: {
                paid: true,
                session_uuid: 'sess-1',
                order_number: 'QLCA-20260501-ABCD',
                status: 'confirmed',
                payment_status: 'paid',
            },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCheckoutPay(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                shippingAddress: 'Lima, Peru',
                email: 'test@test.com',
                phone: '999999999',
                couponCode: 'WELCOME10',
                token: 'mp_token_abc',
                paymentMethodId: 'visa',
                issuerId: '310',
                installments: 1,
                payerEmail: 'test@test.com',
                payerIdType: 'DNI',
                payerIdNumber: '12345678',
                deviceId: 'dev-session-xyz',
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockPost).toHaveBeenCalledWith('/api/checkout/pay', {
            shipping_address: 'Lima, Peru',
            email: 'test@test.com',
            phone: '999999999',
            coupon_code: 'WELCOME10',
            token: 'mp_token_abc',
            payment_method_id: 'visa',
            issuer_id: '310',
            installments: 1,
            device_id: 'dev-session-xyz',
            payer: {
                email: 'test@test.com',
                identification: { type: 'DNI', number: '12345678' },
            },
        });
        const data = result.current.data;
        expect(data && 'paid' in data ? data.paid : undefined).toBe(true);
        expect(data && 'order_number' in data ? data.order_number : undefined).toBe(
            'QLCA-20260501-ABCD',
        );
    });

    it('models the pending_challenge response (no order yet) with session_uuid + three_ds', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockResolvedValueOnce({
            data: {
                status: 'pending_challenge',
                session_uuid: 'sess-3ds-123',
                payment_id: '123456789',
                three_ds: {
                    external_resource_url: 'https://acs.bank.example/challenge',
                    creq: 'eyJjcmVxIjoiZGF0YSJ9',
                },
            },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCheckoutPay(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                shippingAddress: 'Lima, Peru',
                email: 'test@test.com',
                token: 'mp_token_3ds',
                paymentMethodId: 'master',
                installments: 1,
                payerEmail: 'test@test.com',
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Narrow to the pending_challenge branch via an assertion so the
        // subsequent expects are unconditional (vitest/no-conditional-expect).
        const data = result.current.data as Extract<
            typeof result.current.data,
            { status: 'pending_challenge' }
        >;
        expect(data?.status).toBe('pending_challenge');
        expect(data.session_uuid).toBe('sess-3ds-123');
        expect(data.three_ds.external_resource_url).toBe('https://acs.bank.example/challenge');
        expect(data.three_ds.creq).toBe('eyJjcmVxIjoiZGF0YSJ9');
    });

    it('surfaces the safe {detail, code} error body on a 402 rejection (cart stays intact)', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockRejectedValueOnce({
            response: {
                status: 402,
                data: {
                    detail: 'Tu tarjeta no tiene saldo suficiente. Intenta con otra.',
                    code: 'insufficient_funds',
                },
            },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCheckoutPay(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                shippingAddress: 'Lima, Peru',
                email: 'test@test.com',
                token: 'mp_token_bad',
                paymentMethodId: 'visa',
                installments: 1,
                payerEmail: 'test@test.com',
            });
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        const err = result.current.error as {
            response?: { data?: { detail?: string; code?: string } };
        };
        expect(err.response?.data?.detail).toContain('saldo suficiente');
        expect(err.response?.data?.code).toBe('insufficient_funds');
    });

    it('invalidates ORDER_KEYS and CART_KEYS on settle (approved clears the cart server-side)', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockResolvedValueOnce({
            data: { paid: true, session_uuid: 'sess-1', order_number: 'QLCA-20260501-ABCD' },
        });

        const { qc, Wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useCheckoutPay(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                shippingAddress: 'Lima, Peru',
                email: 'test@test.com',
                token: 'mp_token_abc',
                paymentMethodId: 'visa',
                installments: 1,
                payerEmail: 'test@test.com',
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const calls = invalidateSpy.mock.calls;
        expect(calls.some((c) => JSON.stringify(c[0]).includes('orders'))).toBe(true);
        expect(calls.some((c) => JSON.stringify(c[0]).includes('cart'))).toBe(true);
    });
});

describe('useCheckoutSessionStatus (3DS poll)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GETs the session status endpoint and returns paid + order_number', async () => {
        const mockGet = vi.mocked(api.get);
        mockGet.mockResolvedValueOnce({
            data: { status: 'paid', order_number: 'QLCA-20260501-ABCD' },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCheckoutSessionStatus('sess-3ds-123', true), {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockGet).toHaveBeenCalledWith('/api/checkout/session/sess-3ds-123/status');
        expect(result.current.data?.status).toBe('paid');
        expect(result.current.data?.order_number).toBe('QLCA-20260501-ABCD');
    });

    it('models the failed terminal state (no order created)', async () => {
        const mockGet = vi.mocked(api.get);
        mockGet.mockResolvedValueOnce({ data: { status: 'failed' } });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCheckoutSessionStatus('sess-fail', true), {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.status).toBe('failed');
        expect(result.current.data?.order_number).toBeUndefined();
    });

    it('does not fetch while disabled (no uuid yet)', async () => {
        const mockGet = vi.mocked(api.get);

        const { Wrapper } = createWrapper();
        renderHook(() => useCheckoutSessionStatus(null, false), { wrapper: Wrapper });

        // Give react-query a tick — the query is disabled, so no request fires.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mockGet).not.toHaveBeenCalled();
    });
});

describe('useVerifyPayment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POSTs to izipayVerify with correct payload including kr_answer_raw', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockResolvedValueOnce({
            data: { paid: true, order_status: 'PAID', order_number: 'QLCA-20260501-ABCD' },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useVerifyPayment(), { wrapper: Wrapper });

        const payload = {
            kr_hash: 'abc123deadbeef',
            kr_hash_key: 'sha256_hmac',
            kr_answer_raw: '{"orderStatus":"PAID"}',
        };

        act(() => {
            result.current.mutate(payload);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(mockPost).toHaveBeenCalledWith('/api/payments/izipay/verify/', payload);
        expect(result.current.data?.paid).toBe(true);
        expect(result.current.data?.order_number).toBe('QLCA-20260501-ABCD');
    });

    it('invalidates ORDER_KEYS and CART_KEYS on success', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockResolvedValueOnce({
            data: { paid: true, order_status: 'PAID', order_number: 'QLCA-20260501-ABCD' },
        });

        const { qc, Wrapper } = createWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useVerifyPayment(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                kr_hash: 'abc',
                kr_hash_key: 'sha256_hmac',
                kr_answer_raw: '{}',
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Should have invalidated both orders and cart
        const calls = invalidateSpy.mock.calls;
        expect(calls.some((c) => JSON.stringify(c[0]).includes('orders'))).toBe(true);
        expect(calls.some((c) => JSON.stringify(c[0]).includes('cart'))).toBe(true);
    });

    it('surfaces errors from the verify API', async () => {
        const mockPost = vi.mocked(api.post);
        mockPost.mockRejectedValueOnce({
            response: { status: 400, data: { detail: 'Firma inválida.' } },
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useVerifyPayment(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate({
                kr_hash: 'bad',
                kr_hash_key: 'sha256_hmac',
                kr_answer_raw: '{}',
            });
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
