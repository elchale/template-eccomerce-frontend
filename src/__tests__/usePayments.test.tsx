/**
 * Tests for useIzipayToken and useVerifyPayment hooks.
 *
 * Verifies:
 * - Correct endpoint called with correct payload
 * - onSuccess invalidates ORDER_KEYS.all and CART_KEYS.all
 * - Error propagation
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the axios instance ────────────────────────────────────────────────
vi.mock('@/lib/axios', () => ({
    api: {
        post: vi.fn(),
    },
}));

import { useIzipayToken, useVerifyPayment } from '@/api/usePayments';
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
