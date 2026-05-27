import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CART_KEYS } from '@/api/useCart';
import { ORDER_KEYS } from '@/api/useOrders';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';

export const PAYMENT_KEYS = {
    all: ['payments'] as const,
} as const;

// ─── Order-on-payment checkout (active flow) ─────────────────────────────────
//
// The order is created ONLY when the payment confirms. `POST /api/checkout/pay`
// creates a CheckoutSession (a payment attempt against the durable cart), runs
// the MP payment, and returns the order only once it exists. The cart stays
// intact until an order is created (rejection, abandonment, etc.), so the buyer
// can resume from the cart on any device.

/** 3DS challenge data — what the MP Status Screen Brick needs (no secrets). */
export interface CheckoutThreeDs {
    /** Bank ACS challenge URL — forwarded as `externalResourceURL` to the Brick. */
    external_resource_url: string;
    /** Challenge request token — forwarded as `creq` to the Brick. */
    creq: string;
}

/** Card + contact payload for `POST /api/checkout/pay`. */
export interface CheckoutPayPayload {
    /** Assembled shipping address string. */
    shippingAddress: string;
    /** Optional billing address (omitted when same as shipping). */
    billingAddress?: string | undefined;
    /** Contact email. */
    email: string;
    /** Contact phone (optional). */
    phone?: string | undefined;
    /** Order notes (optional). */
    notes?: string | undefined;
    /** Applied coupon code (optional). */
    couponCode?: string | undefined;
    /** Short-lived card token produced by the MP Card Payment Brick. */
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
 * Discriminated response from `POST /api/checkout/pay` (HTTP 200 for every
 * branch except a hard rejection, which is a 402 with a safe `{detail, code}`
 * body handled in the catch branch).
 *
 * - approved (`paid: true`) → the order now exists; navigate to `order_number`.
 *   The backend spreads the full OrderDetail (which carries its own `status`
 *   like "confirmed"), so success is discriminated by `paid === true`, NOT by
 *   a `status: 'approved'` field.
 * - `pending_challenge` → no order yet; mount the Status Screen Brick with
 *   `three_ds`, then poll `session/<session_uuid>/status` for the outcome.
 * - `pending` / `in_process` / `processing` → MP is reviewing or a payment is
 *   already in flight; "te confirmaremos por correo".
 */
export type CheckoutPayResponse =
    | {
          /** Approved: the order exists. Backend also spreads OrderDetail. */
          paid: true;
          order_number: string;
          session_uuid?: string;
      }
    | {
          status: 'pending_challenge';
          session_uuid: string;
          three_ds: CheckoutThreeDs;
          /** MP payment id — needed to mount the Status Screen Brick. */
          payment_id?: string;
      }
    | {
          status: 'pending' | 'in_process' | 'processing';
          session_uuid: string;
      };

/**
 * POST /api/checkout/pay — the single entry point for placing an order. It
 * creates a payment against the durable cart and only materialises the order
 * once the payment confirms. We invalidate cart + orders on every settle so
 * the storefront reflects ground truth (an approved payment clears the cart
 * server-side and creates the order).
 */
export const useCheckoutPay = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CheckoutPayPayload): Promise<CheckoutPayResponse> => {
            const { data } = await api.post<CheckoutPayResponse>(API_ROUTES.checkoutPay, {
                shipping_address: payload.shippingAddress,
                ...(payload.billingAddress
                    ? { billing_address: payload.billingAddress }
                    : {}),
                email: payload.email,
                ...(payload.phone ? { phone: payload.phone } : {}),
                ...(payload.notes ? { notes: payload.notes } : {}),
                ...(payload.couponCode ? { coupon_code: payload.couponCode } : {}),
                token: payload.token,
                payment_method_id: payload.paymentMethodId,
                issuer_id: payload.issuerId,
                installments: payload.installments,
                device_id: payload.deviceId,
                payer: {
                    email: payload.payerEmail,
                    identification:
                        payload.payerIdType && payload.payerIdNumber
                            ? { type: payload.payerIdType, number: payload.payerIdNumber }
                            : undefined,
                },
            });
            return data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            queryClient.invalidateQueries({ queryKey: CART_KEYS.all });
        },
    });
};

/** Status of a checkout session, polled after a 3DS challenge resolves. */
export interface CheckoutSessionStatusResponse {
    status: 'processing' | 'paid' | 'failed' | 'expired';
    /** Present once the order exists (status === 'paid'). */
    order_number?: string;
}

/**
 * GET /api/checkout/session/<uuid>/status — single fetch of a session's
 * current state. The challenge flow polls this via `refetchInterval` until the
 * session reaches a terminal state (`paid` → order exists; `failed` → no order,
 * cart intact). Disabled until a `uuid` and `enabled` flag are provided.
 */
export const useCheckoutSessionStatus = (uuid: string | null, enabled: boolean) => {
    return useQuery({
        queryKey: [...PAYMENT_KEYS.all, 'session', uuid] as const,
        queryFn: async (): Promise<CheckoutSessionStatusResponse> => {
            const { data } = await api.get<CheckoutSessionStatusResponse>(
                API_ROUTES.checkoutSessionStatus(uuid!),
            );
            return data;
        },
        enabled: enabled && !!uuid,
        // Poll while the session is still processing; stop once terminal.
        refetchInterval: (query): number | false => {
            const status = query.state.data?.status;
            const terminal = status === 'paid' || status === 'failed' || status === 'expired';
            return terminal ? false : 2500;
        },
        // Always hit the network — the session state changes server-side.
        staleTime: 0,
        gcTime: 0,
        retry: false,
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
