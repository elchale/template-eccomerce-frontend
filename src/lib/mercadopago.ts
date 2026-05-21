/**
 * Loader for the Mercado Pago SDK v2 (https://sdk.mercadopago.com/js/v2).
 *
 * The script is loaded lazily — only when the checkout page mounts — and
 * cached so it is fetched at most once per session.
 */

const MERCADOPAGO_SDK_SRC = 'https://sdk.mercadopago.com/js/v2';

let scriptPromise: Promise<void> | null = null;

/** Load the Mercado Pago SDK v2 script. Resolves once `window.MercadoPago` exists. */
export function loadMercadoPagoSdk(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${MERCADOPAGO_SDK_SRC}"]`,
        );
        if (existing) {
            if (window.MercadoPago) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () =>
                reject(new Error('No se pudo cargar Mercado Pago')),
            );
            return;
        }

        const script = document.createElement('script');
        script.src = MERCADOPAGO_SDK_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error('No se pudo cargar Mercado Pago'));
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
}
