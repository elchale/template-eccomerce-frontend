/**
 * Ambient types for the Mercado Pago SDK v2 (https://sdk.mercadopago.com/js/v2).
 *
 * Mercado Pago is the active payment gateway. The browser tokenizes the card
 * with the MP Card Payment Brick (card data never reaches our servers) and
 * we receive a single short-lived token plus card metadata on submit.
 */

/**
 * Payload delivered by the Card Payment Brick on submit.
 * Mirrors the shape returned by MP's `onSubmit` callback verbatim — these
 * fields are forwarded as-is to /api/payments/mercadopago/process/.
 */
interface MercadoPagoCardFormData {
    /** Short-lived MP card token — backend uses it to create the payment. */
    token: string;
    /** Card brand (e.g. 'visa', 'master', 'amex'). */
    payment_method_id: string;
    /** Issuer (bank) id chosen by MP for this card. */
    issuer_id?: string;
    /** Decimal amount (S/ 100.00 is 100.00, NOT céntimos). */
    transaction_amount: number;
    /** Brick's installments selection (1 = pago al contado). */
    installments: number;
    /** Card profile — MP uses 'credit_card' / 'debit_card' / 'prepaid_card'. */
    payment_method_option_id?: string;
    /** MP processing mode (always 'aggregator' for our integration). */
    processing_mode?: string;
    payer: {
        email: string;
        identification?: {
            type: string;
            number: string;
        };
    };
}

/** Brick callback signature on the MP SDK. */
type MercadoPagoBrickCallbacks = {
    onReady?: () => void;
    onSubmit: (cardFormData: MercadoPagoCardFormData) => Promise<void>;
    onError?: (error: unknown) => void;
    onBinChange?: (bin: string) => void;
};

/** Settings passed to bricks().create('cardPayment', ...). */
interface MercadoPagoCardPaymentBrickSettings {
    initialization: {
        amount: number;
        payer?: { email?: string };
    };
    customization?: {
        visual?: {
            style?: { theme?: 'default' | 'dark' | 'flat' | 'bootstrap' };
            hidePaymentButton?: boolean;
        };
        paymentMethods?: {
            maxInstallments?: number;
            minInstallments?: number;
        };
    };
    callbacks: MercadoPagoBrickCallbacks;
}

/** Controller returned by bricks().create. */
interface MercadoPagoBrickController {
    unmount: () => Promise<void> | void;
}

/** Bricks builder exposed by MercadoPago instance. */
interface MercadoPagoBricks {
    create: (
        brickName: 'cardPayment',
        containerId: string,
        settings: MercadoPagoCardPaymentBrickSettings,
    ) => Promise<MercadoPagoBrickController>;
}

/** A built MercadoPago SDK instance. */
interface MercadoPagoInstance {
    bricks: () => MercadoPagoBricks;
}

interface MercadoPagoConstructor {
    new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance;
}

interface Window {
    MercadoPago?: MercadoPagoConstructor;
    /** MP Device ID set by https://www.mercadopago.com/v2/security.js. */
    MP_DEVICE_SESSION_ID?: string;
}
