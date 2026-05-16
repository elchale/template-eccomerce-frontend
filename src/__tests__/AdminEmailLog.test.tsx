/**
 * Tests for AdminEmailLog page and EmailLogDetailModal.
 *
 * Covers (per ADR Test Plan):
 *  - TableSkeleton shown while loading
 *  - EmptyState shown when no logs (unfiltered)
 *  - EmptyState shown when filtered but no results (with "Quitar filtro" CTA)
 *  - Table renders with friendly email_type_display
 *  - Raw template_name is NOT rendered in the list
 *  - Retry button shown when is_retryable=true, hidden when false
 *  - Clicking Retry fires the mutation and shows success toast
 *  - 409 response shows the specific 409 toast
 *  - EmailLogDetailModal renders raw template_name and error_message
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string) => k,
        i18n: { language: 'es' },
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn(),
    }),
}));

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();

vi.mock('@/stores', () => ({
    useModalStore: () => ({
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        isOpen: false,
        isClosing: false,
        content: null,
    }),
}));

// Provide minimal i18n that just echoes keys
vi.mock('@/lib/i18n', () => ({}));

// Mock the API hooks so we control their output
const mockUseAdminEmailLogs = vi.fn();
const mockUseRetryEmailLog = vi.fn();

vi.mock('@/api', () => ({
    useAdminEmailLogs: (...args: unknown[]) => mockUseAdminEmailLogs(...args),
    useRetryEmailLog: () => mockUseRetryEmailLog(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import toast from 'react-hot-toast';
import { AdminEmailLog } from '@/pages/admin/AdminEmailLog/AdminEmailLog';
import { EmailLogDetailModal } from '@/pages/admin/AdminEmailLog/EmailLogDetailModal';
import type { EmailLog } from '@/types/emailLog';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeLog = (overrides: Partial<EmailLog> = {}): EmailLog => ({
    id: 1,
    email_type: 'customer_payment_received',
    email_type_display: 'Pago confirmado — cliente',
    template_name: 'orders/payment_received.html',
    task_name: 'orders.tasks.send_payment_received_email',
    subject: 'Pago confirmado — Pedido #QLCA-001',
    recipient_email: 'test@example.com',
    recipient_user: 10,
    order: 5,
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
    ...overrides,
});

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={qc}>
            <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
    );
    return { qc, Wrapper };
}

// ── AdminEmailLog page ────────────────────────────────────────────────────────

describe('AdminEmailLog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseRetryEmailLog.mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        });
    });

    it('renders TableSkeleton while loading', () => {
        mockUseAdminEmailLogs.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        // TableSkeleton renders skeleton rows — check no table body with real data
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('renders EmptyState when no logs (unfiltered)', () => {
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 0, results: [], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        // t() echoes the key — check for empty state key
        expect(screen.getByText('email_log_empty_title')).toBeTruthy();
        expect(screen.getByText('email_log_empty_message')).toBeTruthy();
        // No "Quitar filtro" button for unfiltered empty
        expect(screen.queryByText('email_log_empty_filtered_cta')).toBeNull();
    });

    it('renders EmptyState with "Quitar filtro" when filtered but empty', async () => {
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 0, results: [], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        // The Select component renders a custom dropdown (role="button" trigger).
        // Open it, then click the "failed" option.
        const trigger = screen.getByRole('button', { name: /email_log_filter_all/i });
        fireEvent.click(trigger);

        // Click the "failed" option in the dropdown
        const failedOption = screen.getByRole('option', { name: 'email_log_status_failed' });
        fireEvent.click(failedOption);

        await waitFor(() => {
            expect(screen.getByText('email_log_empty_filtered_title')).toBeTruthy();
        });
        expect(screen.getByText('email_log_empty_filtered_cta')).toBeTruthy();
    });

    it('renders friendly email_type_display in the table (not raw template_name)', () => {
        const log = makeLog({ is_retryable: false });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        // Friendly display label is visible
        expect(screen.getByText('Pago confirmado — cliente')).toBeTruthy();
        // Raw template_name is NOT shown in the list
        expect(screen.queryByText('orders/payment_received.html')).toBeNull();
    });

    it('shows Retry button when is_retryable=true', () => {
        const log = makeLog({ is_retryable: true, status: 'failed', status_display: 'Fallido' });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        // Retry button text comes from the translation key
        expect(screen.getByText('email_log_retry_btn')).toBeTruthy();
    });

    it('hides Retry button when is_retryable=false', () => {
        const log = makeLog({ is_retryable: false });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        expect(screen.queryByText('email_log_retry_btn')).toBeNull();
    });

    it('fires retry mutation and shows success toast on success', async () => {
        const log = makeLog({ is_retryable: true, status: 'failed' });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        // Simulate a successful mutation by calling onSuccess callback immediately
        const mutate = vi.fn((id: number, callbacks?: { onSuccess?: () => void }) => {
            callbacks?.onSuccess?.();
        });
        mockUseRetryEmailLog.mockReturnValue({ mutate, isPending: false });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        const retryBtn = screen.getByText('email_log_retry_btn');
        fireEvent.click(retryBtn);

        expect(mutate).toHaveBeenCalledWith(log.id, expect.any(Object));
        expect(toast.success).toHaveBeenCalledWith('email_log_retry_success');
    });

    it('shows 409 error toast on retry conflict', () => {
        const log = makeLog({ is_retryable: true, status: 'failed' });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const mutate = vi.fn(
            (id: number, callbacks?: { onError?: (err: unknown) => void }) => {
                callbacks?.onError?.({ response: { status: 409 } });
            },
        );
        mockUseRetryEmailLog.mockReturnValue({ mutate, isPending: false });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        const retryBtn = screen.getByText('email_log_retry_btn');
        fireEvent.click(retryBtn);

        expect(toast.error).toHaveBeenCalledWith(
            'email_log_retry_409',
            expect.objectContaining({ duration: 8000 }),
        );
    });

    it('shows generic error toast on network/500 retry failure', () => {
        const log = makeLog({ is_retryable: true, status: 'failed' });
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const mutate = vi.fn(
            (id: number, callbacks?: { onError?: (err: unknown) => void }) => {
                callbacks?.onError?.({ response: { status: 500 } });
            },
        );
        mockUseRetryEmailLog.mockReturnValue({ mutate, isPending: false });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        fireEvent.click(screen.getByText('email_log_retry_btn'));

        expect(toast.error).toHaveBeenCalledWith(
            'email_log_retry_error',
            expect.objectContaining({ duration: 8000 }),
        );
    });

    it('opens detail modal when Inspeccionar is clicked', () => {
        const log = makeLog();
        mockUseAdminEmailLogs.mockReturnValue({
            data: { count: 1, results: [log], next: null, previous: null },
            isLoading: false,
            error: null,
        });

        const { Wrapper } = createWrapper();
        render(<AdminEmailLog />, { wrapper: Wrapper });

        const inspectBtn = screen.getByTitle('email_log_inspect');
        fireEvent.click(inspectBtn);

        expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });
});

// ── EmailLogDetailModal ───────────────────────────────────────────────────────

describe('EmailLogDetailModal', () => {
    it('renders the raw template_name (only visible here)', () => {
        const log = makeLog({ template_name: 'orders/payment_received.html' });

        const { Wrapper } = createWrapper();
        render(<EmailLogDetailModal log={log} />, { wrapper: Wrapper });

        expect(screen.getByText('orders/payment_received.html')).toBeTruthy();
    });

    it('renders the task_name', () => {
        const log = makeLog({ task_name: 'orders.tasks.send_payment_received_email' });

        const { Wrapper } = createWrapper();
        render(<EmailLogDetailModal log={log} />, { wrapper: Wrapper });

        expect(screen.getByText('orders.tasks.send_payment_received_email')).toBeTruthy();
    });

    it('renders error_message when present', () => {
        const log = makeLog({
            error_message: 'SMTP connection refused',
            status: 'failed',
        });

        const { Wrapper } = createWrapper();
        render(<EmailLogDetailModal log={log} />, { wrapper: Wrapper });

        expect(screen.getByText('SMTP connection refused')).toBeTruthy();
    });

    it('renders friendly email_type_display', () => {
        const log = makeLog({ email_type_display: 'Pago confirmado — cliente' });

        const { Wrapper } = createWrapper();
        render(<EmailLogDetailModal log={log} />, { wrapper: Wrapper });

        expect(screen.getByText('Pago confirmado — cliente')).toBeTruthy();
    });

    it('calls handleClose and closeModal when close button clicked', () => {
        const handleClose = vi.fn();
        const log = makeLog();

        const { Wrapper } = createWrapper();
        render(<EmailLogDetailModal log={log} handleClose={handleClose} />, {
            wrapper: Wrapper,
        });

        // Click the × button in the header
        const closeBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('✕'));
        if (closeBtn) fireEvent.click(closeBtn);

        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });
});
