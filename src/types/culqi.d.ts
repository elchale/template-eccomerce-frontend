/**
 * Ambient types for Culqi Checkout Custom (https://js.culqi.com/checkout-js).
 *
 * Culqi is the active payment gateway. The browser tokenizes the card with
 * Culqi (card data never reaches our servers) and we receive a token, an
 * order, or an error on the global checkout instance.
 */

/** Token produced for card / Yape payments — sent to the backend to charge. */
interface CulqiToken {
    id: string;
    email: string;
    card_number: string;
    last_four: string;
}

/** Order result produced when an asynchronous method (PagoEfectivo, etc.) is used. */
interface CulqiOrderResult {
    id: string;
    state?: string;
}

/** Error object exposed when tokenization / payment fails. */
interface CulqiErrorResult {
    object: string;
    type?: string;
    code?: string;
    merchant_message?: string;
    user_message?: string;
}

interface CulqiCheckoutConfig {
    settings: {
        title: string;
        currency: string;
        /** Amount in céntimos (S/ 1.00 = 100). */
        amount: number;
        /** Culqi Order id (ord_…) — required to enable non-card methods. */
        order?: string;
    };
    client?: { email?: string };
    options?: Record<string, unknown>;
    appearance?: Record<string, unknown>;
}

/** A built Culqi Checkout instance. */
interface CulqiCheckoutInstance {
    token: CulqiToken | null;
    order: CulqiOrderResult | null;
    error: CulqiErrorResult | null;
    /** Callback invoked by Culqi after the user finishes the checkout. */
    culqi: () => void;
    open: () => void;
    close: () => void;
}

interface CulqiCheckoutConstructor {
    new (publicKey: string, config: CulqiCheckoutConfig): CulqiCheckoutInstance;
}

interface Window {
    CulqiCheckout?: CulqiCheckoutConstructor;
}
