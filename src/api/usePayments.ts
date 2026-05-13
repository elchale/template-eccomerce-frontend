import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CART_KEYS } from '@/api/useCart';
import { ORDER_KEYS } from '@/api/useOrders';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';

export const PAYMENT_KEYS = {
    all: ['payments'] as const,
} as const;

// ─── Request / Response shapes ───────────────────────────────────────────────

export interface IzipayTokenResponse {
    formToken: string;
}

export interface VerifyPaymentPayload {
    /** HMAC hex digest from KRPaymentResponse.hash */
    kr_hash: string;
    /** Key identifier — must be 'sha256_hmac' (ADR BP1) */
    kr_hash_key: string;
    /**
     * Raw client-answer string captured from KRPaymentResponse.rawClientAnswer.
     * Passing the exact raw bytes avoids re-serialisation drift (ADR BP2).
     */
    kr_answer_raw: string;
}

export interface VerifyPaymentResponse {
    paid: boolean;
    order_status: string;
    order_number: string;
    /** Set to 'no_raw' if backend could not verify because raw string was absent */
    reason?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/izipay/create-token/ → returns the Krypton formToken JWT
 * that initialises the embedded payment form. Token creation also stamps the
 * order's `izipay_form_token_created_at`, so invalidate that order's cache.
 *
 * No toast on success: the token is an internal step; the user-visible signal
 * is the payment form rendering, not a notification.
 */
export const useIzipayToken = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderNumber,
        }: {
            orderNumber: string;
        }): Promise<IzipayTokenResponse> => {
            const { data } = await api.post<IzipayTokenResponse>(API_ROUTES.izipayCreateToken, {
                order_number: orderNumber,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
        },
    });
};

/**
 * POST /api/payments/izipay/verify/ with the raw HMAC fields from Krypton.
 * On success, invalidates orders and cart — the IPN may have already cleared
 * cart server-side, and the client should re-render against ground truth.
 */
export const useVerifyPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
            const { data } = await api.post<VerifyPaymentResponse>(
                API_ROUTES.izipayVerify,
                payload,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            queryClient.invalidateQueries({ queryKey: CART_KEYS.all });
        },
    });
};
