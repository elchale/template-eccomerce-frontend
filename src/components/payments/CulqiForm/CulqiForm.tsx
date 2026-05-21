import { CreditCard, Lock } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Spinner } from '@/components/ui';
import { loadCulqiCheckout } from '@/lib/culqi';
import { formatCurrency } from '@/lib/formatCurrency';
import { logger } from '@/lib/logger';

import styles from './CulqiForm.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CulqiFormProps {
    /** Culqi Order id (ord_…) — enables every payment method, not just cards. */
    culqiOrderId: string;
    /** Culqi public key (pk_test_… / pk_live_…), provided by the backend. */
    publicKey: string;
    /** Amount to charge, in céntimos (S/ 1.00 = 100). */
    amount: number;
    /** Currency code, always 'PEN'. */
    currency: string;
    /** Customer email — pre-fills the Culqi form. */
    email: string;
    /** Card / Yape token created — the caller charges it on the backend. */
    onToken: (tokenId: string) => void;
    /** An async method (PagoEfectivo, etc.) was used — payment is pending. */
    onOrderPending: () => void;
    /** Tokenization / payment failed. */
    onError: (message: string) => void;
}

// Brand green — Culqi styles a third-party modal we cannot reach with CSS
// modules, so its appearance config necessarily takes literal color values.
const BRAND_COLOR = '#008060';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Culqi Checkout Custom payment component.
 *
 * Renders a single "Pagar" button that opens the Culqi modal with every
 * payment method enabled (card, Yape, wallets, bank apps, agents, Cuotéalo).
 * Culqi3DS authentication runs inside the modal automatically.
 */
export function CulqiForm({
    culqiOrderId,
    publicKey,
    amount,
    currency,
    email,
    onToken,
    onOrderPending,
    onError,
}: CulqiFormProps) {
    const { t } = useTranslation('shop');
    const [ready, setReady] = useState(false);
    const [processing, setProcessing] = useState(false);
    const culqiRef = useRef<CulqiCheckoutInstance | null>(null);

    // Stable refs for callbacks — avoids stale closures inside the Culqi
    // event handler while keeping the latest prop values accessible.
    const onTokenRef = useRef(onToken);
    const onOrderPendingRef = useRef(onOrderPending);
    const onErrorRef = useRef(onError);
    onTokenRef.current = onToken;
    onOrderPendingRef.current = onOrderPending;
    onErrorRef.current = onError;

    useEffect(() => {
        const mounted = { current: true };

        const handleCulqiEvent = () => {
            const culqi = culqiRef.current;
            if (!culqi) return;
            if (culqi.token) {
                if (mounted.current) setProcessing(true);
                onTokenRef.current(culqi.token.id);
            } else if (culqi.order) {
                onOrderPendingRef.current();
            } else if (culqi.error) {
                onErrorRef.current(
                    culqi.error.user_message || t('payment_error_generic'),
                );
            }
        };

        loadCulqiCheckout()
            .then(() => {
                if (!mounted.current) return;
                if (!window.CulqiCheckout) {
                    throw new Error('Culqi no está disponible');
                }
                const instance = new window.CulqiCheckout(publicKey, {
                    settings: {
                        title: 'Qolca Solutions',
                        currency,
                        amount,
                        order: culqiOrderId,
                    },
                    client: { email },
                    options: {
                        lang: 'auto',
                        installments: true,
                        modal: true,
                        paymentMethods: {
                            tarjeta: true,
                            yape: true,
                            billetera: true,
                            bancaMovil: true,
                            agente: true,
                            cuotealo: true,
                        },
                    },
                    appearance: {
                        theme: 'default',
                        hiddenCulqiLogo: false,
                        menuType: 'sidebar',
                        defaultStyle: {
                            bannerColor: BRAND_COLOR,
                            buttonBackground: BRAND_COLOR,
                            menuColor: BRAND_COLOR,
                            linksColor: BRAND_COLOR,
                        },
                    },
                });
                instance.culqi = handleCulqiEvent;
                culqiRef.current = instance;
                setReady(true);
            })
            .catch((err) => {
                logger.error('Culqi checkout init failed', err);
                if (mounted.current) {
                    onErrorRef.current(t('payment_culqi_load_failed'));
                }
            });

        return () => {
            mounted.current = false;
            try {
                culqiRef.current?.close();
            } catch {
                /* instance may not be open — safe to ignore */
            }
        };
    }, [culqiOrderId, publicKey, amount, currency, email, t]);

    const handlePay = useCallback(() => {
        culqiRef.current?.open();
    }, []);

    const soles = formatCurrency(amount / 100);

    return (
        <div className={styles.wrapper}>
            {!ready && (
                <div className={styles.loading} aria-live="polite" aria-busy="true">
                    <Spinner size="md" />
                    <p className={styles.loadingText}>{t('payment_culqi_preparing')}</p>
                </div>
            )}

            {ready && (
                <div className={styles.content}>
                    <p className={styles.amount}>
                        {t('payment_culqi_amount')} <strong>{soles}</strong>
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handlePay}
                        disabled={processing}
                    >
                        <CreditCard size={18} weight="bold" aria-hidden="true" />
                        {t('payment_culqi_pay', { amount: soles })}
                    </Button>
                    <p className={styles.methods}>{t('payment_culqi_methods')}</p>
                    <p className={styles.securityNote}>
                        <Lock size={14} weight="bold" aria-hidden="true" className={styles.lockIcon} />
                        {t('payment_secure_note_gateway', { gateway: 'Culqi' })}
                    </p>
                </div>
            )}

            {processing && (
                <div className={styles.processingOverlay} aria-live="polite" aria-busy="true">
                    <div className={styles.processingCard}>
                        <Spinner size="lg" />
                        <p className={styles.processingTitle}>
                            {t('payment_culqi_processing_title')}
                        </p>
                        <p className={styles.processingText}>
                            {t('payment_culqi_processing_text')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
