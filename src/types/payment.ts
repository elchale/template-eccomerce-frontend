/**
 * State machine for the checkout payment page. Drives which subview is rendered
 * (loading skeleton, embedded form, post-pay confirmation, error retry).
 */
export type PaymentStep = 'loading' | 'ready' | 'processing' | 'error';
