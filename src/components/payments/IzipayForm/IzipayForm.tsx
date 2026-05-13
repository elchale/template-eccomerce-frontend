import KRGlue from '@lyracom/embedded-form-glue';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';

import styles from './IzipayForm.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IzipayPaymentResult {
    hash: string;
    hashAlgorithm: string;
    hashKey: string;
    answer: KRClientAnswer;
    /**
     * Raw JSON string of kr-answer. Present when Krypton exposes
     * rawClientAnswer on the callback (ADR BP2). Consumers should pass this
     * directly to /verify/ so the backend can HMAC-check exact bytes.
     * If absent, rawAvailable=false is set so the backend knows to fall back
     * to the IPN-as-authoritative path.
     */
    rawAnswer: string;
    rawAvailable: boolean;
}

interface IzipayFormProps {
    formToken: string;
    onSuccess: (result: IzipayPaymentResult) => void;
    // Krypton emits structured errors but third-party scripts can throw anything,
    // so the parent must handle the `unknown` tail.
    onError: (error: unknown) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Mounts the Izipay / Lyra Krypton smart-form.
 *
 * Key invariants (ADR §7.1):
 * - Uses `kr-smart-form` only — NOT individual kr-pan / kr-expiry etc.
 * - Captures rawClientAnswer (BP2) and passes through via onSuccess.
 * - useRef for callbacks to avoid stale closures.
 * - mounted ref guard prevents setState after unmount.
 * - KR.removeForms() called on cleanup.
 */
export function IzipayForm({ formToken, onSuccess, onError }: IzipayFormProps) {
    const { t, i18n } = useTranslation('shop');
    const [ready, setReady] = useState(false);

    // Stable refs for callbacks — avoids stale closure while keeping the
    // latest prop values accessible inside async KR event handlers.
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    // Hold KR instance for cleanup
    const krRef = useRef<KR | null>(null);

    // Map i18n language to Krypton language code
    const krLanguage = useCallback(() => {
        const lang = i18n.language?.split('-')[0];
        if (lang === 'en') return 'en-US';
        if (lang === 'pt') return 'pt-BR';
        return 'es-PE';
    }, [i18n.language]);

    const initForm = useCallback(
        async (mounted: { current: boolean }) => {
            try {
                const { KR } = await KRGlue.loadLibrary(
                    'https://static.micuentaweb.pe',
                    import.meta.env.VITE_IZIPAY_PUBLIC_KEY as string,
                );
                krRef.current = KR;

                await KR.setFormConfig({
                    formToken,
                    'kr-language': krLanguage(),
                    'kr-hide-debug-toolbar': true,
                });

                await KR.renderElements('#izipay-form');

                if (mounted.current) setReady(true);

                await KR.onSubmit((paymentResponse: KRPaymentResponse) => {
                    // BP2: capture raw bytes; fall back to JSON.stringify if absent
                    const rawAvailable = typeof paymentResponse.rawClientAnswer === 'string';
                    const rawAnswer = rawAvailable
                        ? paymentResponse.rawClientAnswer
                        : JSON.stringify(paymentResponse.clientAnswer);

                    onSuccessRef.current({
                        hash: paymentResponse.hash,
                        hashAlgorithm: paymentResponse.hashAlgorithm,
                        hashKey: paymentResponse.hashKey,
                        answer: paymentResponse.clientAnswer,
                        rawAnswer,
                        rawAvailable,
                    });
                    // Returning false prevents Krypton's default redirect behaviour
                    return false;
                });

                await KR.onError((error: KRError) => {
                    if (mounted.current) {
                        onErrorRef.current(error);
                    }
                });
            } catch (error) {
                if (mounted.current) {
                    onErrorRef.current(error);
                }
            }
        },
        // formToken and krLanguage are intentionally the only deps — we don't
        // want the effect to re-run if just the callback identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [formToken],
    );

    useEffect(() => {
        const mounted = { current: true };
        void initForm(mounted);
        return () => {
            mounted.current = false;
            void krRef.current?.removeForms();
        };
    }, [initForm]);

    return (
        <div className={styles.wrapper}>
            {/* Loading spinner while Krypton initialises */}
            {!ready && (
                <div className={styles.loading} aria-live="polite" aria-busy="true">
                    <Spinner size="md" />
                    <p className={styles.loadingText}>{t('payment_loading_form')}</p>
                </div>
            )}

            {/* Krypton smart-form container — hidden until ready.
                The "secure payment" footer is rendered by the parent page so
                it isn't duplicated below the form. */}
            <div
                id="izipay-form"
                className={styles.formContainer}
                style={{ display: ready ? 'block' : 'none' }}
                aria-label={t('payment_title')}
            >
                {/* Krypton replaces this element with the secure card form */}
                <div className="kr-smart-form" />
            </div>
        </div>
    );
}
