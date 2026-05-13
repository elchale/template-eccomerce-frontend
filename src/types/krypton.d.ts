/**
 * Ambient type declarations for the Izipay / Lyra Krypton client SDK.
 * The SDK is loaded via a <script> tag in index.html (neon theme) and exposed
 * as globals KR and KRGlue. These declarations give TypeScript enough surface
 * to type-check the payment form integration.
 *
 * The critical addition vs. impresiones is `rawClientAnswer?: string` on
 * KRPaymentResponse — required by ADR BP2 (pass raw bytes to verify endpoint,
 * not a re-serialised dict).
 */

interface KRClientAnswer {
    orderStatus: string;
    orderDetails: {
        orderId: string;
        orderTotalAmount: number;
        orderEffectiveAmount: number;
        orderCurrency: string;
        [key: string]: unknown;
    };
    transactions: Array<{
        uuid: string;
        paymentMethodType: string;
        transactionDetails: Record<string, unknown>;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

interface KRPaymentResponse {
    /** HMAC hex digest over kr-answer */
    hash: string;
    /** Algorithm used — always 'sha256_hmac' in production */
    hashAlgorithm: string;
    /** Key identifier sent by Krypton — 'sha256_hmac' */
    hashKey: string;
    /** Parsed client answer object */
    clientAnswer: KRClientAnswer;
    /**
     * Raw JSON string of kr-answer as received from Krypton, before any
     * parsing. Required by ADR BP2: pass to /verify/ so the backend can
     * HMAC-check exact bytes without re-serialisation drift.
     * May be undefined on older SDK versions; fall back to
     * JSON.stringify(clientAnswer) when absent.
     */
    rawClientAnswer?: string;
}

interface KRError {
    errorCode: string;
    errorMessage: string;
    detailedErrorCode?: string;
    detailedErrorMessage?: string;
    [key: string]: unknown;
}

interface KRFormConfig {
    formToken?: string;
    'kr-language'?: string;
    'kr-hide-debug-toolbar'?: boolean;
    [key: string]: unknown;
}

interface KR {
    setFormConfig(config: KRFormConfig): Promise<{ KR: KR }>;
    renderElements(selector: string): Promise<{ KR: KR }>;
    onSubmit(callback: (paymentResponse: KRPaymentResponse) => boolean | void): Promise<{ KR: KR }>;
    onError(callback: (error: KRError) => void): Promise<{ KR: KR }>;
    removeForms(): Promise<void>;
}

interface KRGlueStatic {
    loadLibrary(host: string, publicKey: string): Promise<{ KR: KR }>;
}

declare module '@lyracom/embedded-form-glue' {
    const KRGlue: KRGlueStatic;
    export default KRGlue;
}
