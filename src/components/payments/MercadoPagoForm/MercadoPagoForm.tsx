import { Lock } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';
import { logger } from '@/lib/logger';
import { loadMercadoPagoSdk } from '@/lib/mercadopago';

import styles from './MercadoPagoForm.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MercadoPagoFormProps {
    /** Mercado Pago public key (APP_USR-… / TEST-…), provided by the backend env. */
    publicKey: string;
    /** Amount to charge as a DECIMAL — S/ 100.00 is sent as 100.00, NOT 10000. */
    amount: number;
    /** Customer email — pre-fills the MP Brick payer form. */
    email: string;
    /** Card tokenised — the caller charges it on the backend. */
    onPaymentReady: (formData: MercadoPagoCardFormData) => Promise<void>;
    /** Tokenisation / payment failed. */
    onError: (message: string) => void;
}

// Stable container id for the MP Brick. The Brick mounts itself inside the
// element with this id, so it must exist before `bricks.create` is called.
const BRICK_CONTAINER_ID = 'mercadopago-card-payment-brick-container';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Mercado Pago Card Payment Brick component.
 *
 * Renders the MP Brick inside a stable container; the Brick provides its
 * own card-number / CVC / expiry inputs, installments picker and submit
 * button. 3DS authentication runs inside the Brick automatically.
 *
 * Card data never reaches us: the Brick produces a short-lived token that
 * the parent forwards to /api/payments/mercadopago/process/.
 */
export function MercadoPagoForm({
    publicKey,
    amount,
    email,
    onPaymentReady,
    onError,
}: MercadoPagoFormProps) {
    const { t, i18n } = useTranslation('shop');
    const [ready, setReady] = useState(false);
    const controllerRef = useRef<MercadoPagoBrickController | null>(null);

    // Stable refs for callbacks — avoids stale closures inside the Brick
    // event handlers while keeping the latest prop values accessible.
    const onPaymentReadyRef = useRef(onPaymentReady);
    const onErrorRef = useRef(onError);
    onPaymentReadyRef.current = onPaymentReady;
    onErrorRef.current = onError;

    useEffect(() => {
        const mounted = { current: true };

        // Map i18n language to MP locales — MP expects es-PE for Peru-specific
        // copy and installments labels.
        const lang = i18n.language ?? '';
        const locale = lang.startsWith('pt')
            ? 'pt-BR'
            : lang.startsWith('en')
              ? 'en-US'
              : 'es-PE';

        const handleSubmit = (cardFormData: MercadoPagoCardFormData): Promise<void> => {
            // The parent shows the backend-safe message and re-throws; we let
            // the rejection propagate so the Brick re-enables its submit
            // button. We do NOT surface the raw error here (would double-toast
            // / leak codes).
            return onPaymentReadyRef.current(cardFormData);
        };

        const handleBrickError = () => {
            // Map any Brick-side error to a friendly generic message — never
            // pass MP's raw error.message to the UI, and do not dump the raw
            // error object to the console.
            logger.error('Mercado Pago Brick error');
            onErrorRef.current(t('payment_error_contact'));
        };

        loadMercadoPagoSdk()
            .then(async () => {
                if (!mounted.current) return;
                if (!window.MercadoPago) {
                    throw new Error('Mercado Pago no está disponible');
                }
                const mp = new window.MercadoPago(publicKey, { locale });
                const bricks = mp.bricks();
                const controller = await bricks.create(
                    'cardPayment',
                    BRICK_CONTAINER_ID,
                    {
                        initialization: {
                            amount,
                            payer: { email },
                        },
                        customization: {
                            visual: {
                                style: { theme: 'default' },
                            },
                            paymentMethods: {
                                maxInstallments: 12,
                            },
                        },
                        callbacks: {
                            onReady: () => {
                                if (mounted.current) setReady(true);
                            },
                            onSubmit: handleSubmit,
                            onError: handleBrickError,
                        },
                    },
                );
                if (!mounted.current) {
                    try {
                        await controller?.unmount();
                    } catch {
                        /* race with unmount — safe to ignore */
                    }
                    return;
                }
                controllerRef.current = controller;
            })
            .catch(() => {
                logger.error('Mercado Pago Brick init failed');
                if (mounted.current) {
                    onErrorRef.current(t('payment_mercadopago_load_failed'));
                }
            });

        return () => {
            mounted.current = false;
            const controller = controllerRef.current;
            controllerRef.current = null;
            if (controller) {
                Promise.resolve(controller.unmount()).catch(() => {
                    /* instance already torn down — safe to ignore */
                });
            }
        };
    }, [publicKey, amount, email, i18n.language, t]);

    return (
        <div className={styles.wrapper}>
            {!ready && (
                <div className={styles.loading} aria-live="polite" aria-busy="true">
                    <Spinner size="md" />
                    <p className={styles.loadingText}>{t('payment_mercadopago_preparing')}</p>
                </div>
            )}

            {/* MP Brick mounts itself inside this container — must exist before
                bricks.create is called, so it is rendered unconditionally. */}
            <div id={BRICK_CONTAINER_ID} className={styles.brickContainer} />

            {ready ? (
                <p className={styles.securityNote}>
                    <Lock size={14} weight="bold" aria-hidden="true" className={styles.lockIcon} />
                    {t('payment_secure_note_gateway', { gateway: 'Mercado Pago' })}
                </p>
            ) : null}
        </div>
    );
}
