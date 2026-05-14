import { ArrowLeft, LockKey, ShoppingBag, ArrowsClockwise } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { CART_KEYS } from '@/api/useCart';
import { useOrderDetail, ORDER_KEYS } from '@/api/useOrders';
import { useIzipayToken, useVerifyPayment } from '@/api/usePayments';
import { IzipayForm } from '@/components/payments/IzipayForm';
import type { IzipayPaymentResult } from '@/components/payments/IzipayForm';
import { Button, Spinner, Skeleton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import type { PaymentStep } from '@/types/payment';

import styles from './CheckoutPaymentPage.module.css';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Payment page — mounts after the checkout form creates the order.
 * Route: /checkout/pay/:orderNumber (protected — auth required)
 *
 * State machine: loading → ready → processing → navigate to order
 *                loading → error (retry refetches token)
 *
 * ADR §7.3 / §8.
 */
export function CheckoutPaymentPage() {
    const { orderNumber = '' } = useParams<{ orderNumber: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { t } = useTranslation('shop');

    const { data: order, isLoading: orderLoading } = useOrderDetail(orderNumber);
    const createToken = useIzipayToken();
    const verifyPayment = useVerifyPayment();

    const [formToken, setFormToken] = useState<string | null>(null);
    const [step, setStep] = useState<PaymentStep>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Timeout ref — switches loading → error after 30s if token never arrives
    const tokenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTokenTimeout = useCallback(() => {
        if (tokenTimeoutRef.current) {
            clearTimeout(tokenTimeoutRef.current);
            tokenTimeoutRef.current = null;
        }
    }, []);

    /** Fetch a fresh form token from the backend. */
    const fetchToken = useCallback(() => {
        if (!orderNumber) return;
        setStep('loading');
        setErrorMessage(null);

        // 30s timeout guard (ADR §8.2 — slow network fallback)
        clearTokenTimeout();
        tokenTimeoutRef.current = setTimeout(() => {
            setErrorMessage(t('payment_error_generic'));
            setStep('error');
            toast.error(t('payment_token_failed'), { duration: 8000 });
        }, 30_000);

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
                    const status = axiosErr?.response?.status;
                    const msg =
                        status === 502 ? t('payment_provider_down') : t('payment_token_failed');
                    setErrorMessage(msg);
                    setStep('error');
                    toast.error(msg, { duration: 8000 });
                },
            },
        );
    }, [orderNumber, createToken, clearTokenTimeout, t]);

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

        fetchToken();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.order_number, order?.status, order?.payment_status]);

    // Cleanup timeout on unmount
    useEffect(() => () => clearTokenTimeout(), [clearTokenTimeout]);

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
            <p className={styles.pageSubtitle}>{t('payment_subtitle')}</p>

            <div className={styles.layout}>
                {/* ── Left: payment form ─────────────────────────────────── */}
                <section className={styles.paymentSection} aria-label={t('payment_title')}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <LockKey size={18} weight="bold" aria-hidden="true" />
                            {t('payment_title')}
                        </h2>

                        {/* State: loading token */}
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

                        {/* State: processing verify */}
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
                                    onClick={fetchToken}
                                    disabled={createToken.isPending}
                                >
                                    <ArrowsClockwise size={16} aria-hidden="true" />
                                    {t('payment_retry')}
                                </Button>
                            </div>
                        )}

                        {/* State: ready — render Krypton form */}
                        {step === 'ready' && !!formToken && (
                            <IzipayForm
                                formToken={formToken}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                            />
                        )}
                    </div>

                    <p className={styles.secureRow}>
                        <LockKey size={14} weight="bold" aria-hidden="true" />
                        {t('payment_secure_note')}
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
