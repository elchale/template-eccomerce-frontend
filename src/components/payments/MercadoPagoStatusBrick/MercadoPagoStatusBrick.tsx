import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';
import { logger } from '@/lib/logger';
import { loadMercadoPagoSdk } from '@/lib/mercadopago';

import styles from './MercadoPagoStatusBrick.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MercadoPagoStatusBrickProps {
    /** Mercado Pago public key (APP_USR-… / TEST-…), provided by the backend env. */
    publicKey: string;
    /** MP payment id returned by the backend on a `pending_challenge` response. */
    paymentId: string;
    /** Bank ACS challenge URL (payment.three_ds_info.external_resource_url). */
    externalResourceUrl: string;
    /** Challenge request token (payment.three_ds_info.creq). */
    creq: string;
    /**
     * The buyer finished the bank challenge (Brick reached a terminal status).
     * The parent re-queries the order/payment to learn the real outcome.
     */
    onChallengeResolved: () => void;
    /** The Brick failed to load or render the challenge. */
    onError: (message: string) => void;
}

// Stable container id for the Status Screen Brick. The Brick mounts itself
// inside the element with this id, so it must exist before `bricks.create`.
const BRICK_CONTAINER_ID = 'mercadopago-status-screen-brick-container';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Mercado Pago Status Screen Brick component.
 *
 * The Card Payment Brick does NOT render the 3DS challenge. When the backend
 * returns `pending_challenge`, this Brick is mounted with the returned
 * `paymentId` + `additionalInfo` (externalResourceURL + creq); it renders the
 * bank challenge inline and then shows the final status.
 *
 * Once the Brick is ready (the challenge has been presented and resolved), we
 * notify the parent via `onChallengeResolved` so it can re-query the order /
 * payment for the authoritative outcome (webhook is the source of truth) and
 * route to the existing success / masked-error UI.
 */
export function MercadoPagoStatusBrick({
    publicKey,
    paymentId,
    externalResourceUrl,
    creq,
    onChallengeResolved,
    onError,
}: MercadoPagoStatusBrickProps) {
    const { t, i18n } = useTranslation('shop');
    const [ready, setReady] = useState(false);
    const controllerRef = useRef<MercadoPagoBrickController | null>(null);

    // Stable refs for callbacks — avoids stale closures inside the Brick
    // event handlers while keeping the latest prop values accessible.
    const onChallengeResolvedRef = useRef(onChallengeResolved);
    const onErrorRef = useRef(onError);
    onChallengeResolvedRef.current = onChallengeResolved;
    onErrorRef.current = onError;

    useEffect(() => {
        const mounted = { current: true };

        const lang = i18n.language ?? '';
        const locale = lang.startsWith('pt')
            ? 'pt-BR'
            : lang.startsWith('en')
              ? 'en-US'
              : 'es-PE';

        const handleBrickError = () => {
            // Never surface MP's raw error.message; do not dump the raw object.
            logger.error('Mercado Pago Status Screen Brick error');
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
                    'statusScreen',
                    BRICK_CONTAINER_ID,
                    {
                        initialization: {
                            paymentId,
                            additionalInfo: {
                                externalResourceURL: externalResourceUrl,
                                creq,
                            },
                        },
                        customization: {
                            visual: {
                                style: { theme: 'default' },
                                hideTransactionDate: true,
                            },
                        },
                        callbacks: {
                            onReady: () => {
                                if (!mounted.current) return;
                                setReady(true);
                                // The challenge has been presented and the
                                // Brick has reached a status — let the parent
                                // re-query the order for the real outcome.
                                onChallengeResolvedRef.current();
                            },
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
                logger.error('Mercado Pago Status Screen Brick init failed');
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
    }, [publicKey, paymentId, externalResourceUrl, creq, i18n.language, t]);

    return (
        <div className={styles.wrapper}>
            {!ready && (
                <div className={styles.loading} aria-live="polite" aria-busy="true">
                    <Spinner size="md" />
                    <p className={styles.loadingText}>{t('payment_mercadopago_challenge')}</p>
                </div>
            )}

            {/* The Status Screen Brick mounts itself inside this container —
                it must exist before bricks.create is called, so it is rendered
                unconditionally. */}
            <div id={BRICK_CONTAINER_ID} className={styles.brickContainer} />
        </div>
    );
}
