import type { OrderStatus } from '@/types/order';

/**
 * Order pipeline stages, in display order. Drives the visual status bar in OrderDetailPage.
 * Note: `cancelled` is intentionally NOT a step — it's a terminal state shown separately.
 */
export const ORDER_STATUS_STEPS: readonly OrderStatus[] = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
] as const;
