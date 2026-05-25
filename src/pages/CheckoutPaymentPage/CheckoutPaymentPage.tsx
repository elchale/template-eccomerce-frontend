import { ArrowLeft, LockKey, ShoppingBag, ArrowsClockwise } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { CART_KEYS } from '@/api/useCart';
import { useOrderDetail, ORDER_KEYS } from '@/api/useOrders';
import {
    useIzipayToken,
    useVerifyPayment,
    useCulqiOrder,
    useCulqiCharge,
    useMercadoPagoProcess,
} from '@/api/usePayments';
import type { CulqiOrderResponse } from '@/api/usePayments';
import { CulqiForm, IzipayForm, MercadoPagoForm } from '@/components/payments';
import type { IzipayPaymentResult } from '@/components/payments';
import { Button, Spinner, Skeleton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import { getDeviceId } from '@/lib/mercadopago';
import type { PaymentStep } from '@/types/payment';

import styles from './CheckoutPaymentPage.module.css';

// ─── Gateway selection ──────────────────────────────────────────────────────

// Active payment gateway. Mercado Pago is the default; Culqi and Izipay are
// kept dormant and only used when VITE_PAYMENT_GATEWAY is flipped.
const GATEWAY = (import.meta.env.VITE_PAYMENT_GATEWAY as string | undefined) ?? 'mercadopago';
const IS_MERCADOPAGO = GATEWAY === 'mercadopago';
const IS_CULQI = GATEWAY === 'culqi';
const IS_IZIPAY = GATEWAY === 'izipay';
const GATEWAY_NAME = IS_MERCADOPAGO ? 'Mercado Pago' : IS_CULQI ? 'Culqi' : 'Izipay';
const MP_PUBLIC_KEY = (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined) ?? '';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Payment page — mounts after the checkout form creates the order.
 * Route: /checkout/pay/:orderNumber (protected — auth required)
 *
 * State machine: loading → ready → processing → navigate to order
 *                loading → error (retry re-prepares the gateway)
 *
 * Gateway-aware: with Culqi (active) it prepares a Culqi Order and renders the
 * CulqiForm; with Izipay (dormant) it fetches a formToken and renders the
 * IzipayForm. The gateway is fixed at build time via VITE_PAYMENT_GATEWAY.
 *
 * ADR §7.3 / §8.
 */
export function CheckoutPaymentPage() {
    const { orderNumber = '' } = useParams<{ orderNumber: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { t } = useTranslation('shop');

    const { data: order, isLoading: orderLoading } = useOrderDetail(orderNumber);

    // Izipay (dormant gateway) mutations.
    const createToken = useIzipayToken();
    const verifyPayment = useVerifyPayment();
    // Culqi (dormant gateway) mutations.
    const culqiOrderMutation = useCulqiOrder();
    const culqiCharge = useCulqiCharge();
    // Mercado Pago (active gateway) mutation.
    const mpProcess = useMercadoPagoProcess();

    const [formToken, setFormToken] = useState<string | null>(null);
    const [culqiOrder, setCulqiOrder] = useState<CulqiOrderResponse | null>(null);
    const [step, setStep] = useState<PaymentStep>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Timeout ref — switches loading → error after 30s if preparation stalls.
    const tokenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTokenTimeout = useCallback(() => {
        if (tokenTimeoutRef.current) {
            clearTimeout(tokenTimeoutRef.current);
            tokenTimeoutRef.current = null;
        }
    }, []);

    /** Prepare the gateway: nothing to fetch for MP (the Brick takes over), a
     *  Culqi Order for Culqi, a formToken for Izipay. */
    const prepare = useCallback(() => {
        if (!orderNumber) return;
        setStep('loading');
        setErrorMessage(null);

        // Mercado Pago needs no server round-trip before rendering the Brick —
        // the Brick fetches its own settings from MP directly using the public
        // key. Skip straight to the 'ready' step.
        if (IS_MERCADOPAGO) {
            clearTokenTimeout();
            setStep('ready');
            return;
        }

        // 30s timeout guard (ADR §8.2 — slow network fallback)
        clearTokenTimeout();
        tokenTimeoutRef.current = setTimeout(() => {
            setErrorMessage(t('payment_error_generic'));
            setStep('error');
            toast.error(t('payment_token_failed'), { duration: 8000 });
        }, 30_000);

        if (IS_CULQI) {
            culqiOrderMutation.mutate(
                { orderNumber },
                {
                    onSuccess: (data) => {
                        clearTokenTimeout();
                        setCulqiOrder(data);
                        setStep('ready');
                    },
                    onError: (err) => {
                        clearTokenTimeout();
                        const axiosErr = err as { response?: { status?: number } };
                        const msg =
                            axiosErr?.response?.status === 502
                                ? t('payment_provider_down')
                                : t('payment_token_failed');
                        setErrorMessage(msg);
                        setStep('error');
                        toast.error(msg, { duration: 8000 });
                    },
                },
            );
        } else {
            createToken.mutate(
                { orderNumber },
                {
                    onSuccess: (data) => {
                        clearTokenTimeout();
                        setFormToken(data.formToken);
                        setStep('ready');
                    },
                    onError: (err) => {
                        clearTokenTimeout();
                        const axiosErr = err as { response?: { status?: number } };
                        const msg =
                            axiosErr?.response?.status === 502
                                ? t('payment_provider_down')
                                : t('payment_token_failed');
                        setErrorMessage(msg);
                        setStep('error');
                        toast.error(msg, { duration: 8000 });
                    },
                },
            );
        }
    }, [orderNumber, createToken, culqiOrderMutation, clearTokenTimeout, t]);

    // On order load: guard against already-paid or non-pending orders
    useEffect(() => {
        if (!order) return;

        if (order.payment_status === 'paid') {
            toast(t('payment_already_paid'), { duration: 4000 });
            navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
            return;
        }

        if (order.status !== 'pending') {
            navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
            return;
        }

        prepare();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.order_number, order?.status, order?.payment_status]);

    // Cleanup timeout on unmount
    useEffect(() => () => clearTokenTimeout(), [clearTokenTimeout]);

    // ── Mercado Pago handler (active gateway) ─────────────────────────────────

    /**
     * Brick produced a tokenised card — forward the payload to the backend,
     * which creates the MP payment synchronously. status='approved' is
     * authoritative; status='in_process' means the webhook will confirm
     * shortly. The Promise we return tells the Brick whether to re-enable
     * its submit button.
     */
    const handleMercadoPagoSubmit = useCallback(
        async (cardFormData: MercadoPagoCardFormData) => {
            setStep('processing');
            try {
                const result = await mpProcess.mutateAsync({
                    orderNumber,
                    token: cardFormData.token,
                    paymentMethodId: cardFormData.payment_method_id,
                    issuerId: cardFormData.issuer_id,
                    installments: cardFormData.installments,
                    payerEmail: cardFormData.payer.email,
                    payerIdType: cardFormData.payer.identification?.type,
                    payerIdNumber: cardFormData.payer.identification?.number,
                    deviceId: getDeviceId(),
                });

                if (result.paid) {
                    // Optimistic: clear cart in cache immediately.
                    qc.setQueryData(CART_KEYS.detail(), {
                        items: [],
                        item_count: 0,
                        subtotal: '0.00',
                        id: 0,
                    });
                    qc.invalidateQueries({ queryKey: CART_KEYS.all });
                    qc.invalidateQueries({ queryKey: ORDER_KEYS.all });

                    toast.success(t('payment_success'), { duration: 3000 });
                    navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
                } else if (
                    result.status === 'in_process' ||
                    result.status === 'pending'
                ) {
                    // MP is reviewing — the /pay webhook will confirm later.
                    qc.invalidateQueries({ queryKey: CART_KEYS.all });
                    qc.invalidateQueries({ queryKey: ORDER_KEYS.all });
                    toast(t('payment_verifying'), { duration: 5000 });
                    navigate(
                        `${ROUTES.orderDetail.replace(':orderNumber', orderNumber)}?verifying=1`,
                    );
                } else {
                    setErrorMessage(t('payment_error_contact'));
                    setStep('error');
                    toast.error(t('payment_error_contact'), { duration: 8000 });
                    throw new Error(t('payment_error_contact'));
                }
            } catch (error) {
                // Render ONLY the backend-supplied safe `detail`. When there
                // is none (network error, etc.) fall back to a generic message
                // that includes our contact email. Never surface raw MP codes.
                const axiosErr = error as {
                    response?: { data?: { detail?: string } };
                };
                const msg =
                    axiosErr?.response?.data?.detail ?? t('payment_error_contact');
                setErrorMessage(msg);
                setStep('error');
                toast.error(msg, { duration: 8000 });
                throw error;
            }
        },
        [mpProcess, navigate, orderNumber, t, qc],
    );

    const handleMercadoPagoError = useCallback((message: string) => {
        setErrorMessage(message);
        setStep('error');
        toast.error(message, { duration: 8000 });
    }, []);

    // ── Culqi handlers (dormant gateway) ──────────────────────────────────────

    /** Card / Yape token created — charge it synchronously on the backend. */
    const handleCulqiToken = useCallback(
        (tokenId: string) => {
            setStep('processing');
            culqiCharge.mutate(
                { orderNumber, tokenId },
                {
                    onSuccess: (data) => {
                        if (data.paid) {
                            // Optimistic: clear cart in cache immediately.
                            qc.setQueryData(CART_KEYS.detail(), {
                                items: [],
                                item_count: 0,
                                subtotal: '0.00',
                                id: 0,
                            });
                            qc.invalidateQueries({ queryKey: CART_KEYS.all });
                            qc.invalidateQueries({ queryKey: ORDER_KEYS.all });

                            toast.success(t('payment_success'), { duration: 3000 });
                            navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
                        } else {
                            setErrorMessage(t('payment_error_generic'));
                            setStep('error');
                            toast.error(t('payment_error_generic'), { duration: 8000 });
                        }
                    },
                    onError: (err) => {
                        const axiosErr = err as {
                            response?: { data?: { detail?: string } };
                        };
                        const msg =
                            axiosErr?.response?.data?.detail || t('payment_error_generic');
                        setErrorMessage(msg);
                        setStep('error');
                        toast.error(msg, { duration: 8000 });
                    },
                },
            );
        },
        [culqiCharge, navigate, orderNumber, t, qc],
    );

    /**
     * An asynchronous method (PagoEfectivo, wallet, etc.) was chosen — the
     * payment confirms later via webhook, so acknowledge and move on.
     */
    const handleCulqiOrderPending = useCallback(() => {
        qc.invalidateQueries({ queryKey: CART_KEYS.all });
        qc.invalidateQueries({ queryKey: ORDER_KEYS.all });
        toast(t('payment_culqi_pending'), { duration: 6000 });
        navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
    }, [navigate, orderNumber, t, qc]);

    const handleCulqiError = useCallback(
        (message: string) => {
            setErrorMessage(message);
            setStep('error');
            toast.error(message, { duration: 8000 });
        },
        [],
    );

    // (Culqi handlers remain below for the dormant gateway path.)

    // ── Izipay handlers (dormant gateway) ─────────────────────────────────────

    /** Called by IzipayForm on successful card submit. */
    const handlePaymentSuccess = useCallback(
        async (result: IzipayPaymentResult) => {
            setStep('processing');

            try {
                const verification = await verifyPayment.mutateAsync({
                    kr_hash: result.hash,
                    kr_hash_key: result.hashKey,
                    kr_answer_raw: result.rawAnswer,
                });

                if (verification.paid) {
                    // Optimistic: clear cart in cache immediately (ADR §8.6)
                    qc.setQueryData(CART_KEYS.detail(), {
                        items: [],
                        item_count: 0,
                        subtotal: '0.00',
                        id: 0,
                    });
                    qc.invalidateQueries({ queryKey: CART_KEYS.all });
                    qc.invalidateQueries({ queryKey: ORDER_KEYS.all });

                    toast.success(t('payment_success'), { duration: 3000 });
                    navigate(ROUTES.orderDetail.replace(':orderNumber', orderNumber));
                } else {
                    // Verify returned paid:false but payment may still arrive via IPN
                    toast(t('payment_verifying'), { duration: 5000 });
                    navigate(
                        `${ROUTES.orderDetail.replace(':orderNumber', orderNumber)}?verifying=1`,
                    );
                }
            } catch {
                // Verify endpoint failed — IPN is authoritative, navigate anyway
                toast(t('payment_verifying'), { duration: 5000 });
                navigate(`${ROUTES.orderDetail.replace(':orderNumber', orderNumber)}?verifying=1`);
            }
        },
        [verifyPayment, navigate, orderNumber, t, qc],
    );

    /** Called by IzipayForm on KR error (card declined, 3DS timeout, etc.). */
    const handlePaymentError = useCallback(
        (err: unknown) => {
            let reason = '';
            if (err && typeof err === 'object') {
                if ('errorMessage' in err) reason = String((err as KRError).errorMessage);
                else if ('message' in err) reason = String((err as Error).message);
            }

            // Distinguish cancellation from decline
            const isCancelled =
                reason.toLowerCase().includes('cancel') ||
                (err &&
                    typeof err === 'object' &&
                    'errorCode' in err &&
                    String((err as KRError).errorCode) === 'CLIENT_300');

            const msg = isCancelled
                ? t('payment_cancelled')
                : reason
                  ? t('payment_declined', { reason })
                  : t('payment_error_generic');

            setErrorMessage(msg);
            setStep('error');
            toast.error(msg, { duration: 8000 });
        },
        [t],
    );

    // ── Render helpers ────────────────────────────────────────────────────────

    const formatSoles = (amount: string | number) => formatCurrency(amount);
    const retryPending = IS_MERCADOPAGO
        ? mpProcess.isPending
        : IS_CULQI
          ? culqiOrderMutation.isPending
          : createToken.isPending;

    // ── Loading skeleton (order still fetching) ───────────────────────────────
    if (orderLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.layout}>
                    <div className={styles.paymentSection}>
                        <div className={styles.card}>
                            <Skeleton variant="rectangular" height={32} width="60%" />
                            <Skeleton variant="rectangular" height={180} />
                            <Skeleton variant="rectangular" height={48} />
                        </div>
                    </div>
                    <aside className={styles.summary}>
                        <Skeleton variant="rectangular" height={24} width="50%" />
                        <Skeleton variant="rectangular" height={120} />
                        <Skeleton variant="rectangular" height={60} />
                    </aside>
                </div>
            </div>
        );
    }

    // ── Order not found ───────────────────────────────────────────────────────
    if (!order) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <ShoppingBag size={48} aria-hidden="true" className={styles.notFoundIcon} />
                    <h1 className={styles.notFoundTitle}>{t('payment_order_not_found')}</h1>
                    <p className={styles.notFoundText}>{t('payment_order_not_found_detail')}</p>
                    <Button variant="primary" onClick={() => navigate(ROUTES.orders)}>
                        {t('payment_back_to_orders')}
                    </Button>
                </div>
            </div>
        );
    }

    const subtotal = Number.parseFloat(order.subtotal || '0');
    const discount = Number.parseFloat(order.discount_amount || '0');
    const total = Number.parseFloat(order.total);
    const shipping = total - subtotal + discount;

    return (
        <div className={styles.container}>
            {/* Back link — the cart is empty by the time we land here
                (cleared on order creation), so the cart is the wrong
                destination. Route back to the order detail page where the
                user can resume payment later, see status, or cancel. */}
            <Link
                to={ROUTES.orderDetail.replace(':orderNumber', orderNumber)}
                className={styles.backLink}
                aria-label={t('payment_back_to_order')}
            >
                <ArrowLeft size={16} weight="bold" aria-hidden="true" />
                {t('payment_back_to_order')}
            </Link>

            <h1 className={styles.pageTitle}>
                {t('payment_title')}
                <span className={styles.orderNumber}>{order.order_number}</span>
            </h1>
            <p className={styles.pageSubtitle}>
                {t('payment_subtitle_gateway', { gateway: GATEWAY_NAME })}
            </p>

            <div className={styles.layout}>
                {/* ── Left: payment form ─────────────────────────────────── */}
                <section className={styles.paymentSection} aria-label={t('payment_title')}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <LockKey size={18} weight="bold" aria-hidden="true" />
                            {t('payment_title')}
                        </h2>

                        {/* State: preparing the gateway */}
                        {step === 'loading' && (
                            <div className={styles.stateBox} aria-live="polite" aria-busy="true">
                                <Skeleton variant="rectangular" height={40} />
                                <Skeleton variant="rectangular" height={40} />
                                <Skeleton variant="rectangular" height={40} />
                                <div className={styles.spinnerRow}>
                                    <Spinner size="sm" />
                                    <span className={styles.stateText}>
                                        {t('payment_loading_form')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* State: processing verify / charge */}
                        {step === 'processing' && (
                            <div className={styles.stateBox} aria-live="polite" aria-busy="true">
                                <div className={styles.spinnerRow}>
                                    <Spinner size="md" />
                                    <span className={styles.stateText}>
                                        {t('payment_processing')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* State: error */}
                        {step === 'error' && (
                            <div className={styles.errorBox} role="alert">
                                <p className={styles.errorText}>
                                    {errorMessage ?? t('payment_error_generic')}
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={prepare}
                                    disabled={retryPending}
                                >
                                    <ArrowsClockwise size={16} aria-hidden="true" />
                                    {t('payment_retry')}
                                </Button>
                            </div>
                        )}

                        {/* State: ready — Mercado Pago (active gateway) */}
                        {step === 'ready' && IS_MERCADOPAGO ? (
                            <MercadoPagoForm
                                publicKey={MP_PUBLIC_KEY}
                                amount={total}
                                email={order.email ?? ''}
                                onPaymentReady={handleMercadoPagoSubmit}
                                onError={handleMercadoPagoError}
                            />
                        ) : null}

                        {/* State: ready — Culqi (dormant gateway) */}
                        {step === 'ready' && IS_CULQI && !!culqiOrder ? (
                            <CulqiForm
                                culqiOrderId={culqiOrder.culqi_order_id}
                                publicKey={culqiOrder.public_key}
                                amount={culqiOrder.amount}
                                currency={culqiOrder.currency}
                                email={culqiOrder.email}
                                onToken={handleCulqiToken}
                                onOrderPending={handleCulqiOrderPending}
                                onError={handleCulqiError}
                            />
                        ) : null}

                        {/* State: ready — Izipay (dormant gateway) */}
                        {step === 'ready' && IS_IZIPAY && !!formToken ? (
                            <IzipayForm
                                formToken={formToken}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                            />
                        ) : null}
                    </div>

                    <p className={styles.secureRow}>
                        <LockKey size={14} weight="bold" aria-hidden="true" />
                        {t('payment_secure_note_gateway', { gateway: GATEWAY_NAME })}
                    </p>
                </section>

                {/* ── Right: order summary ───────────────────────────────── */}
                <aside className={styles.summary} aria-label={t('payment_order_summary')}>
                    <h2 className={styles.summaryTitle}>
                        <ShoppingBag size={18} aria-hidden="true" />
                        {t('payment_order_summary')}
                    </h2>

                    {/* Items list */}
                    <ul className={styles.itemsList} aria-label={t('payment_order_summary')}>
                        {order.items.map((item) => (
                            <li key={item.id} className={styles.summaryItem}>
                                <div className={styles.summaryItemInfo}>
                                    <span className={styles.summaryItemName}>
                                        {item.product_name}
                                    </span>
                                    {!!item.variant_info && (
                                        <span className={styles.summaryItemVariant}>
                                            {item.variant_info}
                                        </span>
                                    )}
                                    <span className={styles.summaryItemQty}>
                                        {t('payment_qty', { count: item.quantity })}
                                    </span>
                                </div>
                                <span className={styles.summaryItemPrice}>
                                    {formatSoles(item.line_total)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* Totals */}
                    <div className={styles.summaryTotals}>
                        <div className={styles.summaryRow}>
                            <span>{t('payment_subtotal')}</span>
                            <span>{formatSoles(subtotal)}</span>
                        </div>
                        {shipping > 0 && (
                            <div className={styles.summaryRow}>
                                <span>{t('payment_shipping')}</span>
                                <span>{formatSoles(shipping)}</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className={styles.summaryRow}>
                                <span>{t('payment_discount')}</span>
                                <span>- {formatSoles(discount)}</span>
                            </div>
                        )}
                        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                            <span>{t('payment_total_to_pay')}</span>
                            <span>{formatSoles(total)}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
