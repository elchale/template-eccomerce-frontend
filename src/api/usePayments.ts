import { useMutation, useQueryClient } from '@tanstack/react-query';

import { CART_KEYS } from '@/api/useCart';
import { ORDER_KEYS } from '@/api/useOrders';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';

export const PAYMENT_KEYS = {
    all: ['payments'] as const,
} as const;

// ─── Mercado Pago (active gateway) ───────────────────────────────────────────

export interface MercadoPagoProcessPayload {
    /** Django order number (preferred). */
    orderNumber: string;
    /** Card token produced by the MP Card Payment Brick. */
    token: string;
    /** Card brand (e.g. 'visa', 'master', 'amex'). */
    paymentMethodId: string;
    /** Issuer (bank) id — optional, supplied by the Brick when known. */
    issuerId?: string | undefined;
    /** Installments count (1 = pago al contado). */
    installments: number;
    /** Payer email captured by the Brick. */
    payerEmail: string;
    /** Identification type (DNI, CE, RUC). Optional but recommended. */
    payerIdType?: string | undefined;
    /** Identification number. Optional but recommended. */
    payerIdNumber?: string | undefined;
    /** MP Device ID (window.MP_DEVICE_SESSION_ID) — improves approval rates. */
    deviceId?: string | undefined;
}

/**
 * 3DS challenge payload returned by the backend on a `pending_challenge`
 * response (HTTP 200). It carries exactly what the MP Status Screen Brick
 * needs to render the bank challenge — no raw MP body, no secrets.
 */
export interface MercadoPagoThreeDs {
    /** Bank ACS challenge URL — forwarded as `externalResourceURL` to the Brick. */
    external_resource_url: string;
    /** Challenge request token — forwarded as `creq` to the Brick. */
    creq: string;
}

/**
 * Response from /api/payments/mercadopago/process/.
 *
 * - `approved` (paid=true) → existing success path.
 * - `pending_challenge` → mount the Status Screen Brick with `three_ds` data;
 *   the order stays unconfirmed until the challenge resolves (webhook is the
 *   source of truth).
 * - `in_process` / `pending` (other) → existing "confirm by email" path.
 * - rejected → 402 with a safe `{detail}` body (handled in the error branch).
 */
export interface MercadoPagoProcessResponse {
    paid: boolean;
    order_number: string;
    payment_id: string;
    /**
     * MP payment status — 'approved' | 'pending_challenge' | 'in_process'
     * | 'pending' | other.
     */
    status: string;
    /** Present only when status === 'pending_challenge'. */
    three_ds?: MercadoPagoThreeDs;
}

/**
 * POST /api/payments/mercadopago/process/ → creates an MP payment for an
 * order using the Brick-produced card token. The MP API call is synchronous
 * and authoritative when status='approved'; status='in_process' means the
 * final outcome arrives later via the /pay webhook.
 *
 * On success the backend has already marked the order paid and cleared the
 * cart, so we invalidate both caches.
 */
export const useMercadoPagoProcess = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderNumber,
            token,
            paymentMethodId,
            issuerId,
            installments,
            payerEmail,
            payerIdType,
            payerIdNumber,
            deviceId,
        }: MercadoPagoProcessPayload): Promise<MercadoPagoProcessResponse> => {
            const { data } = await api.post<MercadoPagoProcessResponse>(
                API_ROUTES.mercadopagoProcess,
                {
                    order_number: orderNumber,
                    token,
                    payment_method_id: paymentMethodId,
                    issuer_id: issuerId,
                    installments,
                    device_id: deviceId,
                    payer: {
                        email: payerEmail,
                        identification:
                            payerIdType && payerIdNumber
                                ? { type: payerIdType, number: payerIdNumber }
                                : undefined,
                    },
                },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            queryClient.invalidateQueries({ queryKey: CART_KEYS.all });
        },
    });
};

// ─── Culqi (dormant gateway — kept for fallback) ────────────────────────────

export interface CulqiOrderResponse {
    culqi_order_id: string;
    public_key: string;
    /** Amount in céntimos (S/ 1.00 = 100). */
    amount: number;
    currency: string;
    email: string;
    order_number: string;
}

export interface CulqiChargeResponse {
    paid: boolean;
    order_number: string;
    charge_id: string;
}

/**
 * POST /api/payments/culqi/order/ → creates (or reuses) a Culqi Order for the
 * given Django order. The Culqi Order is what enables every payment method
 * (card, Yape, PagoEfectivo, wallets, banca móvil, agentes, Cuotéalo).
 *
 * No toast on success: the Culqi Order is an internal step; the user-visible
 * signal is the payment form rendering, not a notification.
 */
export const useCulqiOrder = () => {
    return useMutation({
        mutationFn: async ({
            orderNumber,
        }: {
            orderNumber: string;
        }): Promise<CulqiOrderResponse> => {
            const { data } = await api.post<CulqiOrderResponse>(API_ROUTES.culqiOrder, {
                order_number: orderNumber,
            });
            return data;
        },
    });
};

/**
 * POST /api/payments/culqi/charge/ → charges a Culqi card/Yape token for an
 * order. The charge is synchronous and authoritative. On success, invalidates
 * orders and cart — the backend has marked the order paid and cleared the cart.
 */
export const useCulqiCharge = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orderNumber,
            tokenId,
        }: {
            orderNumber: string;
            tokenId: string;
        }): Promise<CulqiChargeResponse> => {
            const { data } = await api.post<CulqiChargeResponse>(API_ROUTES.culqiCharge, {
                order_number: orderNumber,
                token_id: tokenId,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            queryClient.invalidateQueries({ queryKey: CART_KEYS.all });
        },
    });
};

// ─── Izipay (dormant gateway — kept for fallback) ────────────────────────────

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
