import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, LockKey, MapPin, PencilSimple } from '@phosphor-icons/react';
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
 * The two wizard steps. The address is collected FIRST; the payment Brick lives
 * on a SEPARATE view and only mounts once the buyer has confirmed step 1. This
 * is internal component state (not a router route) so a buyer can never
 * deep-link straight to payment without a validated address.
 */
type CheckoutStep = 'address' | 'payment';

/**
 * Sub-view for the in-page payment flow. The order does NOT exist until the
 * payment confirms, so we never navigate to an order until we have an
 * `order_number` (from the pay response or the session-status poll).
 */
type PayPhase = 'ready' | 'verifying' | 'error';

/**
 * `/checkout` — a 2-step checkout wizard under the order-on-payment model.
 *
 * STEP 1 ("Dirección de envío"): contact email + the AddressPicker (Google
 * Places autocomplete + draggable confirmation pin) + billing + notes. The
 * required address fields are validated here; "Continuar al pago" is disabled
 * until valid. Nothing is tokenised on this step.
 *
 * STEP 2 ("Pago"): a concise order summary + a read-only address recap (with an
 * "editar" link back to step 1) + the Mercado Pago Card Brick. The Brick mounts
 * ONLY when this step is reached, and unmounts cleanly when navigating back.
 *
 * The cart is the durable pre-payment state (server-side per user, resumable
 * from any device). On Brick submit we call `POST /api/checkout/pay` — which
 * creates the order ONLY when the payment is confirmed:
 *
 *  - `approved`          → success toast + navigate to the new order detail.
 *  - `pending_challenge` → mount the Status Screen Brick (3DS), then poll
 *    `GET /api/checkout/session/<uuid>/status` until `paid` (→ order) or
 *    `failed` (→ masked error, stay on payment step, cart intact).
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
    // Namespace-agnostic translator for resolving zod's `ns:key` messages on the
    // address field (which is not a FormInput, so it can't self-translate).
    const { t: tGlobal } = useTranslation();

    const { data: cart, isLoading: cartLoading } = useCart();
    const pay = useCheckoutPay();

    // Wizard step. Address is always first; payment is gated behind it.
    const [step, setStep] = useState<CheckoutStep>('address');

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
     * STEP 1 → STEP 2. Validate the contact/address fields; if they fail, keep
     * the buyer on the address step and surface the errors. Only advance to the
     * payment step (where the Brick mounts) when everything is valid.
     */
    const handleContinueToPayment = useCallback(async () => {
        const valid = await trigger();
        if (!valid) {
            toast.error(t('checkout_fill_required'), { duration: 8000 });
            return;
        }
        setPayPhase('ready');
        setErrorMessage(null);
        setStep('payment');
    }, [trigger, t]);

    /**
     * STEP 2 → STEP 1. Navigate back to the address step. Returning here
     * unmounts the MP Brick (its effect cleanup tears down the controller) and
     * clears any payment error so the buyer starts the payment step fresh.
     */
    const handleEditAddress = useCallback(() => {
        setChallenge(null);
        setPollingUuid(null);
        setPayPhase('ready');
        setErrorMessage(null);
        setStep('address');
    }, []);

    /**
     * The Brick produced a tokenised card. Re-validate (defensive — the buyer
     * already passed step 1) then call `/api/checkout/pay` and branch on the
     * response. The Promise we return tells the Brick whether to re-enable its
     * button (resolve = stop, reject = re-enable).
     */
    const handlePaymentReady = useCallback(
        async (cardFormData: MercadoPagoCardFormData) => {
            const valid = await trigger();
            if (!valid) {
                toast.error(t('checkout_fill_required'), { duration: 8000 });
                setStep('address');
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
                // `detail`. The cart is intact; the buyer can retry on this step.
                const msg = maskedError(error);
                setErrorMessage(msg);
                setPayPhase('error');
                toast.error(msg, { duration: 8000 });
                throw error;
            }
        },
        [trigger, getValues, address, couponCode, pay, navigate, t, maskedError],
    );

    const handlePaymentError = useCallback((message: string) => {
        setErrorMessage(message);
        setPayPhase('error');
        toast.error(message, { duration: 8000 });
    }, []);

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

    // Resolve a field's error to a display string. Only used for the address
    // field, which is rendered via AddressPicker + a hidden input (not a
    // FormInput, so it can't self-translate). FormInput fields translate their
    // own errors. zod messages are namespace-qualified keys (`shop:...`);
    // server messages are already-translated strings and pass through.
    const fieldError = (key: keyof CheckoutFormValues): string | undefined => {
        const e = errors[key];
        if (!e?.message) return undefined;
        return e.type === 'server' ? String(e.message) : tGlobal(String(e.message));
    };

    // Read-only address recap shown on the payment step.
    const addressSummary = formatAddressForBackend(address);

    // The single "back" affordance changes meaning per step: from the address
    // step it returns to the cart; from the payment step it returns to step 1.
    const handleBack = () => {
        if (step === 'payment') {
            handleEditAddress();
        } else {
            navigate(ROUTES.cart);
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.backButton}
                onClick={handleBack}
                type="button"
                aria-label={step === 'payment' ? t('checkout_back_to_address') : t('payment_back_to_cart')}
            >
                <ArrowLeft size={16} weight="bold" />{' '}
                {step === 'payment' ? t('checkout_back_to_address') : t('payment_back_to_cart')}
            </button>
            <h1 className={styles.title}>{t('checkout_title')}</h1>

            {/* ── Stepper / progress indicator ─────────────────────────────── */}
            <ol
                className={styles.stepper}
                aria-label={t('checkout_step_indicator', {
                    current: step === 'address' ? 1 : 2,
                    total: 2,
                })}
            >
                <li
                    className={`${styles.step} ${step === 'address' ? styles.stepActive : styles.stepDone}`}
                    aria-current={step === 'address' ? 'step' : undefined}
                >
                    <span className={styles.stepBadge}>
                        {step === 'payment' ? (
                            <Check size={14} weight="bold" aria-hidden="true" />
                        ) : (
                            1
                        )}
                    </span>
                    <span className={styles.stepLabel}>{t('checkout_step_address')}</span>
                </li>
                <li className={styles.stepConnector} role="presentation" aria-hidden="true" />
                <li
                    className={`${styles.step} ${step === 'payment' ? styles.stepActive : styles.stepUpcoming}`}
                    aria-current={step === 'payment' ? 'step' : undefined}
                >
                    <span className={styles.stepBadge}>2</span>
                    <span className={styles.stepLabel}>{t('checkout_step_payment')}</span>
                </li>
            </ol>

            <div className={styles.layout}>
                <div className={styles.formSection}>
                    {/* ── STEP 1: Shipping address (own view) ──────────────── */}
                    {step === 'address' && (
                        <>
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>{t('checkout_contact_info')}</h2>
                                <div className={styles.fieldGroup}>
                                    <FormInput
                                        control={control}
                                        name="email"
                                        label={t('checkout_email')}
                                        placeholder={t('checkout_email_placeholder')}
                                        isRequired
                                        type="email"
                                    />
                                </div>
                            </div>

                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>
                                    {t('checkout_step_address_title')}
                                </h2>
                                <AddressPicker value={address} onChange={handleAddressChange} />
                                {fieldError('shippingAddress') && (
                                    <p className={styles.shippingError} role="alert">
                                        {fieldError('shippingAddress')}
                                    </p>
                                )}
                                <input type="hidden" {...register('shippingAddress')} />
                            </div>

                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>
                                    {t('checkout_billing_address')}
                                </h2>
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
                                        label={t('checkout_billing_address')}
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
                                    label={t('checkout_notes_label')}
                                    placeholder={t('checkout_notes_placeholder')}
                                    multiline
                                    rows={3}
                                />
                            </div>

                            <Button
                                variant="primary"
                                size="lg"
                                className={styles.stepAction}
                                onClick={() => void handleContinueToPayment()}
                            >
                                {t('checkout_continue_to_payment')}
                            </Button>
                        </>
                    )}

                    {/* ── STEP 2: Payment (separate view) ──────────────────── */}
                    {step === 'payment' && (
                        <>
                            {/* Read-only recap of the step-1 address (NOT an
                                editable form) with an "editar" link back. */}
                            <div className={styles.card}>
                                <div className={styles.recapHeader}>
                                    <h2 className={styles.cardTitle}>
                                        <MapPin size={18} weight="bold" aria-hidden="true" />
                                        {t('checkout_shipping_to')}
                                    </h2>
                                    <button
                                        type="button"
                                        className={styles.editLink}
                                        onClick={handleEditAddress}
                                    >
                                        <PencilSimple size={14} weight="bold" aria-hidden="true" />
                                        {t('checkout_edit_address')}
                                    </button>
                                </div>
                                <address className={styles.recapAddress}>
                                    {addressSummary.split('\n').map((line, i) => (
                                        <span key={i} className={styles.recapLine}>
                                            {line}
                                        </span>
                                    ))}
                                </address>
                            </div>

                            {/* ── Payment card ─────────────────────────────── */}
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>
                                    <LockKey size={18} weight="bold" aria-hidden="true" />
                                    {t('checkout_step_payment_title')}
                                </h2>

                                {/* Verifying: /pay in flight or polling. */}
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

                                {/* 3DS challenge: Status Screen Brick + poll. */}
                                {payPhase === 'verifying' && !!challenge && (
                                    <>
                                        <MercadoPagoStatusBrick
                                            publicKey={MP_PUBLIC_KEY}
                                            paymentId={challenge.paymentId}
                                            externalResourceUrl={
                                                challenge.threeDs.external_resource_url
                                            }
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

                                {/* Error: masked message + retry (cart intact). */}
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

                                {/* Ready: the MP Brick. It mounts ONLY on this
                                    step, so the card is never tokenised on the
                                    address step; navigating back unmounts it. */}
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
                        </>
                    )}
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
