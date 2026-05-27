import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, LockKey } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCart, useCheckoutPay, useCheckoutSessionStatus } from '@/api';
import type { CheckoutThreeDs } from '@/api';
import { CART_KEYS } from '@/api/useCart';
import { ORDER_KEYS } from '@/api/useOrders';
import {
    AddressPicker,
    EMPTY_ADDRESS,
    formatAddressForBackend,
    type AddressFields,
} from '@/components/features/AddressPicker';
import { FormInput } from '@/components/forms/FormField/FormInput';
import { MercadoPagoForm, MercadoPagoStatusBrick } from '@/components/payments';
import { Button, Spinner } from '@/components/ui';
import { ROUTES, buildRoute } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import { getDeviceId } from '@/lib/mercadopago';
import { useAuthStore } from '@/stores/useAuthStore';
import { checkoutSchema, type CheckoutFormValues } from '@/types/checkout';

import styles from './CheckoutPage.module.css';

// Mercado Pago is the active gateway. The public key is read at build time.
const MP_PUBLIC_KEY = (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined) ?? '';

/**
 * Sub-view for the in-page payment flow. The order does NOT exist until the
 * payment confirms, so we never navigate to an order until we have an
 * `order_number` (from the pay response or the session-status poll).
 */
type PayPhase = 'ready' | 'verifying' | 'error';

/**
 * `/checkout` — single-page checkout under the order-on-payment model.
 *
 * The cart is the durable pre-payment state (it lives on the server per user,
 * resumable from any device). This page collects the shipping/contact details
 * and tokenises the card via the Mercado Pago Brick, then calls
 * `POST /api/checkout/pay` — which creates the order ONLY when the payment is
 * confirmed:
 *
 *  - `approved`          → success toast + navigate to the new order detail.
 *  - `pending_challenge` → mount the Status Screen Brick (3DS), then poll
 *    `GET /api/checkout/session/<uuid>/status` until `paid` (→ order) or
 *    `failed` (→ masked error, cart intact). A "verificando tu pago" state is
 *    shown throughout.
 *  - `pending` / `in_process` → "te confirmaremos por correo" path.
 *  - rejected (402)      → masked `{detail}` toast, cart stays intact.
 *
 * If the buyer abandons or the card is declined, no order is created and the
 * cart is untouched — they can come back and pay again from the cart.
 */
export function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const qc = useQueryClient();
    const getUser = useAuthStore((s) => s.getUser);
    const user = getUser();
    const { t } = useTranslation('shop');

    const { data: cart, isLoading: cartLoading } = useCart();
    const pay = useCheckoutPay();

    // Coupon code carried over from the cart page (validated there; the server
    // re-validates authoritatively when the order is created).
    const couponCode = (location.state as { couponCode?: string } | null)?.couponCode ?? '';

    // Structured address state — assembled into the backend address string.
    const [address, setAddress] = useState<AddressFields>(() => ({
        ...EMPTY_ADDRESS,
        recipient: [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim(),
    }));

    const [payPhase, setPayPhase] = useState<PayPhase>('ready');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Set when the backend returns `pending_challenge`. While present, the
    // Status Screen Brick is mounted and we poll the session status.
    const [challenge, setChallenge] = useState<{
        sessionUuid: string;
        paymentId: string;
        threeDs: CheckoutThreeDs;
    } | null>(null);
    // Once the challenge is presented + resolved, start polling the session.
    const [pollingUuid, setPollingUuid] = useState<string | null>(null);

    const {
        control,
        watch,
        setValue,
        getValues,
        trigger,
        formState: { errors },
        register,
    } = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            email: user?.email ?? '',
            phone: '',
            shippingAddress: '',
            sameAsShipping: true,
            billingAddress: '',
            notes: '',
        },
    });

    const sameAsShipping = watch('sameAsShipping');

    const handleAddressChange = (next: AddressFields) => {
        setAddress(next);
        setValue('shippingAddress', formatAddressForBackend(next), { shouldValidate: true });
    };

    // ── Session-status poll (after a 3DS challenge) ───────────────────────────
    const sessionStatus = useCheckoutSessionStatus(pollingUuid, !!pollingUuid);
    const sessionData = sessionStatus.data;

    useEffect(() => {
        if (!pollingUuid || !sessionData) return;

        if (sessionData.status === 'paid' && sessionData.order_number) {
            const orderNumber = sessionData.order_number;
            setPollingUuid(null);
            setChallenge(null);
            void qc.invalidateQueries({ queryKey: CART_KEYS.all });
            void qc.invalidateQueries({ queryKey: ORDER_KEYS.all });
            toast.success(t('payment_success'), { duration: 3000 });
            navigate(buildRoute.orderDetail(orderNumber));
        } else if (sessionData.status === 'failed' || sessionData.status === 'expired') {
            setPollingUuid(null);
            setChallenge(null);
            void qc.invalidateQueries({ queryKey: CART_KEYS.all });
            setErrorMessage(t('payment_error_contact'));
            setPayPhase('error');
            toast.error(t('payment_error_contact'), { duration: 8000 });
        }
    }, [pollingUuid, sessionData, qc, navigate, t]);

    // ── Map a /pay error to a safe, user-facing message ───────────────────────
    const maskedError = useCallback(
        (error: unknown): string => {
            const axiosErr = error as { response?: { data?: { detail?: string } } };
            return axiosErr?.response?.data?.detail ?? t('payment_error_contact');
        },
        [t],
    );

    /**
     * The Brick produced a tokenised card. Validate the address/contact fields
     * first; if they fail, surface the errors and reject so the Brick re-enables
     * its submit button. Otherwise call `/api/checkout/pay` and branch on the
     * response. The Promise we return tells the Brick whether to re-enable its
     * button (resolve = stop, reject = re-enable).
     */
    const handlePaymentReady = useCallback(
        async (cardFormData: MercadoPagoCardFormData) => {
            const valid = await trigger();
            if (!valid) {
                toast.error(t('checkout_fill_required'), { duration: 8000 });
                throw new Error('invalid_form');
            }

            const values = getValues();
            const billingAddress = values.sameAsShipping
                ? ''
                : (values.billingAddress?.trim() ?? '');
            const phone = (address.phone || values.phone || '').trim();
            const notes = values.notes?.trim() ?? '';

            setErrorMessage(null);
            setPayPhase('verifying');

            try {
                const result = await pay.mutateAsync({
                    shippingAddress: formatAddressForBackend(address),
                    billingAddress: billingAddress || undefined,
                    email: values.email.trim(),
                    phone: phone || undefined,
                    notes: notes || undefined,
                    couponCode: couponCode || undefined,
                    token: cardFormData.token,
                    paymentMethodId: cardFormData.payment_method_id,
                    issuerId: cardFormData.issuer_id,
                    installments: cardFormData.installments,
                    payerEmail: cardFormData.payer.email,
                    payerIdType: cardFormData.payer.identification?.type,
                    payerIdNumber: cardFormData.payer.identification?.number,
                    deviceId: getDeviceId(),
                });

                if ('paid' in result) {
                    // Approved: the order now exists (backend spreads OrderDetail
                    // whose own `status` is e.g. "confirmed", so we key off
                    // `paid`, not a `status:'approved'`). Cart cleared server-side.
                    toast.success(t('payment_success'), { duration: 3000 });
                    navigate(buildRoute.orderDetail(result.order_number));
                } else if (result.status === 'pending_challenge') {
                    // No order yet — mount the Status Screen Brick for the bank
                    // challenge, then poll the session until it resolves.
                    setChallenge({
                        sessionUuid: result.session_uuid,
                        paymentId: result.payment_id ?? '',
                        threeDs: result.three_ds,
                    });
                    setPayPhase('verifying');
                } else {
                    // pending / in_process — the webhook will confirm; the
                    // buyer will be notified by email. No order exists yet, so
                    // we can't route to one — send them to their orders list
                    // (the paid order will appear there once the webhook fires).
                    toast(t('payment_verifying'), { duration: 6000 });
                    navigate(ROUTES.orders);
                }
            } catch (error) {
                // Rejected (402) or network error — render ONLY the backend-safe
                // `detail`. The cart is intact; the buyer can retry.
                const msg = maskedError(error);
                setErrorMessage(msg);
                setPayPhase('error');
                toast.error(msg, { duration: 8000 });
                throw error;
            }
        },
        [trigger, getValues, address, couponCode, pay, navigate, t, maskedError],
    );

    const handlePaymentError = useCallback(
        (message: string) => {
            setErrorMessage(message);
            setPayPhase('error');
            toast.error(message, { duration: 8000 });
        },
        [],
    );

    /**
     * The Status Screen Brick presented + resolved the 3DS challenge. We do not
     * read MP's outcome client-side — the session status (driven by the webhook)
     * is the source of truth. Start polling it.
     */
    const handleChallengeResolved = useCallback(() => {
        if (challenge) setPollingUuid(challenge.sessionUuid);
    }, [challenge]);

    const resetToReady = useCallback(() => {
        setPayPhase('ready');
        setErrorMessage(null);
        setChallenge(null);
        setPollingUuid(null);
    }, []);

    // ── Loading / empty-cart guards ───────────────────────────────────────────
    if (cartLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>{t('checkout_empty_cart')}</p>
                    <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
                        {t('checkout_go_to_store')}
                    </Button>
                </div>
            </div>
        );
    }

    const subtotal = Number.parseFloat(cart.subtotal);
    const total = subtotal;

    // Resolve zod's translation keys to display strings.
    const fieldError = (key: keyof CheckoutFormValues): string | undefined => {
        const e = errors[key];
        if (!e?.message) return undefined;
        return e.type === 'server' ? String(e.message) : t(String(e.message));
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.backButton}
                onClick={() => navigate(ROUTES.cart)}
                type="button"
                aria-label={t('payment_back_to_cart')}
            >
                <ArrowLeft size={16} weight="bold" /> {t('payment_back_to_cart')}
            </button>
            <h1 className={styles.title}>{t('checkout_title')}</h1>

            <div className={styles.layout}>
                <div className={styles.formSection}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>{t('checkout_contact_info')}</h2>
                        <div className={styles.fieldGroup}>
                            <FormInput
                                control={control}
                                name="email"
                                label={fieldError('email') ?? t('checkout_email')}
                                placeholder={t('checkout_email_placeholder')}
                                isRequired
                                type="email"
                            />
                        </div>
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>{t('checkout_shipping_address')}</h2>
                        <AddressPicker value={address} onChange={handleAddressChange} />
                        {fieldError('shippingAddress') && (
                            <p className={styles.shippingError} role="alert">
                                {fieldError('shippingAddress')}
                            </p>
                        )}
                        <input type="hidden" {...register('shippingAddress')} />
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>{t('checkout_billing_address')}</h2>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                {...register('sameAsShipping')}
                            />
                            {t('checkout_billing_same')}
                        </label>
                        {!sameAsShipping && (
                            <FormInput
                                control={control}
                                name="billingAddress"
                                label={
                                    fieldError('billingAddress') ?? t('checkout_billing_address')
                                }
                                placeholder={t('checkout_billing_address_placeholder')}
                                multiline
                                rows={3}
                            />
                        )}
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>{t('checkout_notes')}</h2>
                        <FormInput
                            control={control}
                            name="notes"
                            label={fieldError('notes') ?? t('checkout_notes_label')}
                            placeholder={t('checkout_notes_placeholder')}
                            multiline
                            rows={3}
                        />
                    </div>

                    {/* ── Payment card ─────────────────────────────────────── */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>
                            <LockKey size={18} weight="bold" aria-hidden="true" />
                            {t('payment_title')}
                        </h2>

                        {/* Verifying state: shown while the /pay request is in
                            flight, during the 3DS challenge, and while polling. */}
                        {payPhase === 'verifying' && !challenge && (
                            <div
                                className={styles.payState}
                                aria-live="polite"
                                aria-busy="true"
                            >
                                <Spinner size="md" />
                                <span className={styles.payStateText}>
                                    {t('payment_verifying_inline')}
                                </span>
                            </div>
                        )}

                        {/* 3DS challenge: Status Screen Brick renders the bank
                            challenge, then we poll the session for the outcome. */}
                        {payPhase === 'verifying' && !!challenge && (
                            <>
                                <MercadoPagoStatusBrick
                                    publicKey={MP_PUBLIC_KEY}
                                    paymentId={challenge.paymentId}
                                    externalResourceUrl={challenge.threeDs.external_resource_url}
                                    creq={challenge.threeDs.creq}
                                    onChallengeResolved={handleChallengeResolved}
                                    onError={handlePaymentError}
                                />
                                {!!pollingUuid && (
                                    <div
                                        className={styles.payState}
                                        aria-live="polite"
                                        aria-busy="true"
                                    >
                                        <Spinner size="sm" />
                                        <span className={styles.payStateText}>
                                            {t('payment_verifying_inline')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Error state: masked message + retry (cart intact). */}
                        {payPhase === 'error' && (
                            <div className={styles.payError} role="alert">
                                <p className={styles.payErrorText}>
                                    {errorMessage ?? t('payment_error_generic')}
                                </p>
                                <Button variant="secondary" onClick={resetToReady}>
                                    {t('payment_retry')}
                                </Button>
                            </div>
                        )}

                        {/* Ready state: the MP Brick (its submit button is the
                            single "Pagar" action). */}
                        {payPhase === 'ready' && (
                            <MercadoPagoForm
                                publicKey={MP_PUBLIC_KEY}
                                amount={total}
                                email={getValues('email') || (user?.email ?? '')}
                                onPaymentReady={handlePaymentReady}
                                onError={handlePaymentError}
                            />
                        )}

                        <p className={styles.secureRow}>
                            <LockKey size={14} weight="bold" aria-hidden="true" />
                            {t('payment_secure_note_gateway', { gateway: 'Mercado Pago' })}
                        </p>
                    </div>
                </div>

                <aside className={styles.summary}>
                    <h2 className={styles.summaryTitle}>{t('cart_order_summary')}</h2>

                    <div className={styles.summaryItems}>
                        {cart.items.map((item) => (
                            <div key={item.id} className={styles.summaryItem}>
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
                                        {t('checkout_qty', { count: item.quantity })}
                                    </span>
                                </div>
                                <span className={styles.summaryItemPrice}>
                                    {formatCurrency(item.line_total)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.summaryTotals}>
                        <div className={styles.summaryRow}>
                            <span>{t('subtotal', { ns: 'common' })}</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                            <span>{t('total', { ns: 'common' })}</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
