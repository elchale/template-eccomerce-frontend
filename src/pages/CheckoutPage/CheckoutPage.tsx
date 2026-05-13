import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from '@phosphor-icons/react';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCart, useCheckout } from '@/api';
import {
    AddressPicker,
    EMPTY_ADDRESS,
    formatAddressForBackend,
    type AddressFields,
} from '@/components/features/AddressPicker';
import { FormInput } from '@/components/forms/FormField/FormInput';
import { Button, Spinner } from '@/components/ui';
import { ROUTES, buildRoute } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    BACKEND_CHECKOUT_FIELD_MAP,
    checkoutSchema,
    type CheckoutFormValues,
} from '@/types/checkout';

import styles from './CheckoutPage.module.css';

/**
 * `/checkout` — Step 1 of 2: shipping/billing address + contact.
 * Submitting creates a pending order on the backend and routes to
 * `/checkout/payment/:orderNumber` where Izipay handles tender capture.
 *
 * Field validation runs through `checkoutSchema` (Zod) inside RHF.
 * Optional fields use conditional spread on submit so `null/empty` never
 * goes to the backend — preserves true omit-semantics under
 * `exactOptionalPropertyTypes`. Backend field errors come back as a flat
 * object; we map them back to RHF via `BACKEND_CHECKOUT_FIELD_MAP`.
 */
export function CheckoutPage() {
    const navigate = useNavigate();
    const getUser = useAuthStore((s) => s.getUser);
    const user = getUser();
    const { t } = useTranslation('shop');

    const { data: cart, isLoading: cartLoading } = useCart();
    const checkout = useCheckout();

    // Structured address state. The shipping_address sent to the backend is
    // assembled from this — keeps the API contract intact while the UI gains
    // the Temu-style fields (country / departamento / distrito / etc.). The
    // legacy `shippingAddress` form field is kept under the hood so RHF
    // validation still gates submission against a non-empty address.
    const [address, setAddress] = useState<AddressFields>(() => ({
        ...EMPTY_ADDRESS,
        recipient: [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim(),
    }));

    const {
        control,
        handleSubmit,
        watch,
        setError,
        setValue,
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
        // Mirror the joined string into the hidden RHF field so the zod
        // `min(1)` guard sees the latest state and field errors clear as
        // soon as the user fills the address in.
        setValue('shippingAddress', formatAddressForBackend(next), {
            shouldValidate: true,
        });
    };

    const onSubmit = (values: CheckoutFormValues) => {
        const billingAddress = values.sameAsShipping ? '' : (values.billingAddress?.trim() ?? '');
        // Phone comes from the structured address; fall back to the
        // billing-side phone field if the user typed there instead.
        const phone = (address.phone || values.phone || '').trim();
        const notes = values.notes?.trim() ?? '';
        checkout.mutate(
            {
                shipping_address: formatAddressForBackend(address),
                email: values.email.trim(),
                ...(billingAddress && { billing_address: billingAddress }),
                ...(phone && { phone }),
                ...(notes && { notes }),
            },
            {
                onSuccess: (data: { order_number: string }) => {
                    toast.success(t('checkout_success'), { duration: 2000 });
                    navigate(buildRoute.checkoutPay(data.order_number));
                },
                onError: (error) => {
                    const axiosError = error as AxiosError<Record<string, unknown>>;
                    const responseData = axiosError?.response?.data;
                    const status = axiosError?.response?.status;

                    // DRF returns either a string or string[] per field; anything else is unexpected
                    // — we coerce defensively so we never surface `[object Object]` to the user.
                    const coerceMsg = (value: unknown): string => {
                        if (typeof value === 'string') return value;
                        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
                        return '';
                    };

                    if (responseData && typeof responseData === 'object' && status === 400) {
                        let hasFieldErrors = false;
                        for (const [backendKey, localKey] of Object.entries(
                            BACKEND_CHECKOUT_FIELD_MAP,
                        )) {
                            const msg = coerceMsg(responseData[backendKey]);
                            if (msg) {
                                setError(localKey, { type: 'server', message: msg });
                                hasFieldErrors = true;
                            }
                        }
                        if (hasFieldErrors) return;

                        const nonFieldMsg = coerceMsg(responseData.non_field_errors);
                        if (nonFieldMsg) {
                            toast.error(nonFieldMsg);
                            return;
                        }

                        const detailMsg = coerceMsg(responseData.detail);
                        if (detailMsg) {
                            toast.error(detailMsg);
                            return;
                        }
                    }

                    toast.error(t('checkout_error'));
                },
            },
        );
    };

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

    // Resolve zod's translation keys to display strings.
    const fieldError = (key: keyof CheckoutFormValues): string | undefined => {
        const e = errors[key];
        if (!e?.message) return undefined;
        // Server messages already come back human-readable.
        return e.type === 'server' ? String(e.message) : t(String(e.message));
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.backButton}
                onClick={() => navigate(-1)}
                type="button"
                aria-label={t('back', { ns: 'common' })}
            >
                <ArrowLeft size={16} weight="bold" /> {t('checkout_title')}
            </button>
            <h1 className={styles.title}>{t('checkout_title')}</h1>

            <form className={styles.layout} onSubmit={handleSubmit(onSubmit)} noValidate>
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
                        {/* Keep the hidden field registered so RHF tracks the value */}
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
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={checkout.isPending}
                        className={styles.placeOrderButton}
                    >
                        {checkout.isPending ? t('checkout_processing') : t('checkout_place_order')}
                    </Button>
                </aside>
            </form>
        </div>
    );
}
