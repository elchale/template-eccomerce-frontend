/**
 * Types for the EmailLog admin feature.
 * Mirrors the EmailLog model and API contract from the ADR.
 *
 * `EmailLogStatus` — four lifecycle states the backend tracks.
 * `EmailLogPurpose` — the six email-event types (business "objectives").
 * `EmailLog` — full serializer response shape including is_retryable.
 */

export type EmailLogStatus = 'pending' | 'retrying' | 'confirmed' | 'failed';

export type EmailLogPurpose =
    | 'customer_payment_received'
    | 'customer_status_update'
    | 'customer_refund'
    | 'admin_new_paid_order'
    | 'admin_status_update'
    | 'admin_amount_mismatch';

export interface EmailLog {
    id: number;
    /** Machine value, e.g. "customer_payment_received" */
    email_type: EmailLogPurpose;
    /** Spanish friendly label, e.g. "Pago confirmado — cliente" */
    email_type_display: string;
    /** Raw template path — detail-view only */
    template_name: string;
    /** Celery task name — detail-view only */
    task_name: string;
    subject: string;
    recipient_email: string;
    recipient_user: number | null;
    order: number | null;
    order_number: string | null;
    status: EmailLogStatus;
    /** Spanish status label, e.g. "Pendiente" */
    status_display: string;
    /** Non-empty when status === 'failed' — detail-view only */
    error_message: string;
    attempts: number;
    sent_at: string | null;
    last_attempt_at: string | null;
    /**
     * Server-computed retryability — the frontend drives the Retry button
     * visibility exclusively off this boolean.  Do NOT recompute time math
     * on the client.
     */
    is_retryable: boolean;
    created: string;
    updated: string;
}
