/**
 * Loader for Culqi Checkout Custom (https://js.culqi.com/checkout-js).
 *
 * The script is loaded lazily — only when the checkout page mounts — and
 * cached so it is fetched at most once per session.
 */

const CULQI_CHECKOUT_SRC = 'https://js.culqi.com/checkout-js';

let scriptPromise: Promise<void> | null = null;

/** Load the Culqi Checkout Custom script. Resolves once `window.CulqiCheckout` exists. */
export function loadCulqiCheckout(): Promise<void> {
    if (window.CulqiCheckout) return Promise.resolve();
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${CULQI_CHECKOUT_SRC}"]`,
        );
        if (existing) {
            if (window.CulqiCheckout) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () =>
                reject(new Error('No se pudo cargar Culqi')),
            );
            return;
        }

        const script = document.createElement('script');
        script.src = CULQI_CHECKOUT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            scriptPromise = null;
            reject(new Error('No se pudo cargar Culqi'));
        };
        document.head.appendChild(script);
    });

    return scriptPromise;
}
