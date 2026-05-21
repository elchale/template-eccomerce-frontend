/**
 * Tests for useAdminEmailLogs and useRetryEmailLog hooks.
 *
 * Covers:
 *  - List query hits the correct endpoint with status filter + pagination params
 *  - Query key shape matches EMAIL_LOG_KEYS factory
 *  - useRetryEmailLog POSTs to the retry URL
 *  - onSuccess invalidates EMAIL_LOG_KEYS.all
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import { useAdminEmailLogs, useRetryEmailLog, EMAIL_LOG_KEYS } from '@/api/useAdminEmailLogs';
import { api } from '@/lib/axios';
import type { EmailLog } from '@/types/emailLog';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const mockLog: EmailLog = {
    id: 1,
    email_type: 'customer_payment_received',
    email_type_display: 'Pago confirmado — cliente',
    template_name: 'orders/payment_received.html',
    task_name: 'orders.tasks.send_payment_received_email',
    subject: 'Pago confirmado — Pedido #QLCA-001',
    recipient_email: 'customer@example.com',
    recipient_user: 42,
    order: 99,
    order_number: 'QLCA-001',
    status: 'confirmed',
    status_display: 'Confirmado',
    error_message: '',
    attempts: 1,
    sent_at: '2026-05-16T10:00:00Z',
    last_attempt_at: '2026-05-16T10:00:00Z',
    is_retryable: false,
    created: '2026-05-16T09:59:00Z',
    updated: '2026-05-16T10:00:00Z',
};

const mockPaginatedResponse = {
    count: 1,
    next: null,
    previous: null,
    results: [mockLog],
};

// ── EMAIL_LOG_KEYS shape ──────────────────────────────────────────────────────

describe('EMAIL_LOG_KEYS', () => {
    it('all key matches expected shape', () => {
        expect(EMAIL_LOG_KEYS.all).toEqual(['admin', 'email-logs']);
    });

    it('list key includes params', () => {
        const params = { status: 'failed', limit: '10' };
        const key = EMAIL_LOG_KEYS.list(params);
        expect(key[0]).toBe('admin');
        expect(key[1]).toBe('email-logs');
        expect(key[2]).toBe('list');
        expect(key[3]).toEqual(params);
    });

    it('list key without params includes undefined', () => {
        const key = EMAIL_LOG_KEYS.list();
        expect(key).toEqual(['admin', 'email-logs', 'list', undefined]);
    });
});

// ── useAdminEmailLogs ─────────────────────────────────────────────────────────

describe('useAdminEmailLogs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GETs the email-logs endpoint and returns data', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useAdminEmailLogs(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(api.get).toHaveBeenCalledWith(
            '/api/admin/email-logs/',
            expect.objectContaining({ params: undefined }),
        );
        expect(result.current.data?.count).toBe(1);
        expect(result.current.data?.results[0]?.email_type_display).toBe('Pago confirmado — cliente');
    });

    it('passes status filter param to the API', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { ...mockPaginatedResponse, results: [] } });

        const params = { status: 'failed', limit: '10', offset: '0' };
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useAdminEmailLogs(params), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(api.get).toHaveBeenCalledWith(
            '/api/admin/email-logs/',
            expect.objectContaining({ params }),
        );
    });

    it('uses EMAIL_LOG_KEYS.list as query key', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: mockPaginatedResponse });

        const params = { status: 'pending' };
        const { Wrapper, qc } = createWrapper();
        renderHook(() => useAdminEmailLogs(params), { wrapper: Wrapper });

        await waitFor(() => {
            const cachedData = qc.getQueryData(EMAIL_LOG_KEYS.list(params));
            return cachedData !== undefined;
        });

        const cached = qc.getQueryData(EMAIL_LOG_KEYS.list(params));
        expect(cached).toEqual(mockPaginatedResponse);
    });

    it('propagates API errors', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useAdminEmailLogs(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeInstanceOf(Error);
    });
});

// ── useRetryEmailLog ──────────────────────────────────────────────────────────

describe('useRetryEmailLog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POSTs to the retry URL with the correct id', async () => {
        const updatedLog = { ...mockLog, status: 'pending', attempts: 2 };
        vi.mocked(api.post).mockResolvedValueOnce({ data: updatedLog });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useRetryEmailLog(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate(1);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(api.post).toHaveBeenCalledWith('/api/admin/email-logs/1/retry/', {});
        expect(result.current.data?.status).toBe('pending');
        expect(result.current.data?.attempts).toBe(2);
    });

    it('invalidates EMAIL_LOG_KEYS.all on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: mockLog });

        const { Wrapper, qc } = createWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useRetryEmailLog(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate(1);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const calls = invalidateSpy.mock.calls;
        expect(
            calls.some((c) => JSON.stringify(c[0]).includes('email-logs')),
        ).toBe(true);
    });

    it('propagates errors without invalidating', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            response: { status: 409, data: { detail: 'Not retryable' } },
        });

        const { Wrapper, qc } = createWrapper();
        const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useRetryEmailLog(), { wrapper: Wrapper });

        act(() => {
            result.current.mutate(99);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        // onSuccess not called, so no invalidation
        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});
