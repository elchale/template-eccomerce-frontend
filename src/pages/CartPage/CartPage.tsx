import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/api';
import { CartItemRow } from '@/components/features/CartItemRow/CartItemRow';
import { FreeShippingBar } from '@/components/features/FreeShippingBar/FreeShippingBar';
import { ConfirmModal } from '@/components/modals';
import { Button, Spinner, EmptyState } from '@/components/ui';
import { ROUTES, API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { formatCurrency } from '@/lib/formatCurrency';
import { useModalStore } from '@/stores';
import type { CouponValidationResult } from '@/types/order';

import styles from './CartPage.module.css';

/**
 * `/cart` — full-page shopping cart. Handles both authenticated (server
 * cart via `useCart`) and guest (`useCartStore.localItems`) carts in a
 * unified UI.
 *
 * Coupon application is validated client-side first (`/coupons/validate`)
 * to give immediate feedback, then re-applied at checkout where the
 * server is authoritative. `useClearCart` is wrapped in a `ConfirmModal`
 * because the action is non-recoverable.
 */
export function CartPage() {
    const navigate = useNavigate();
    const { t } = useTranslation('shop');
    const { data: cart, isLoading } = useCart();
    const updateCartItem = useUpdateCartItem();
    const removeCartItem = useRemoveCartItem();
    const clearCart = useClearCart();
    const openModal = useModalStore((s) => s.openModal);

    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const handleUpdateQuantity = (id: number, quantity: number) => {
        updateCartItem.mutate({ id, quantity });
    };

    const handleRemoveItem = (id: number) => {
        openModal(
            <ConfirmModal
                title={t('cart_remove_confirm_title')}
                message={t('cart_remove_confirm_message')}
                confirmLabel={t('cart_remove_label')}
                variant="danger"
                onConfirm={() => {
                    removeCartItem.mutate(id, {
                        onSuccess: () => toast.success(t('cart_item_removed')),
                    });
                }}
            />,
        );
    };

    const handleClearCart = () => {
        openModal(
            <ConfirmModal
                title={t('cart_clear_confirm_title')}
                message={t('cart_clear_confirm_message')}
                confirmLabel={t('cart_clear')}
                variant="danger"
                onConfirm={() => {
                    clearCart.mutate(undefined, {
                        onSuccess: () => {
                            toast.success(t('cart_cleared'));
                            setCouponResult(null);
                            setCouponCode('');
                        },
                        onError: () => toast.error(t('cart_clear_error')),
                    });
                }}
            />,
        );
    };

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        try {
            const { data } = await api.post<CouponValidationResult>(API_ROUTES.couponValidate, {
                code: couponCode.trim(),
            });
            setCouponResult(data);
            toast.success(t('cart_coupon_applied'));
        } catch {
            setCouponResult(null);
            toast.error(t('cart_coupon_invalid'));
        } finally {
            setValidatingCoupon(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className={styles.container}>
                <EmptyState
                    title={t('cart_empty_title')}
                    message={t('cart_empty_message')}
                    action={
                        <Link to={ROUTES.home}>
                            <Button variant="primary">{t('cart_continue_shopping')}</Button>
                        </Link>
                    }
                />
            </div>
        );
    }

    const subtotal = Number.parseFloat(cart.subtotal);
    const discount = couponResult ? Number.parseFloat(couponResult.discount_amount) : 0;
    const total = subtotal - discount;

    return (
        <div className={styles.container}>
            <button
                className={styles.backButton}
                onClick={() => navigate(-1)}
                aria-label={t('cart_title')}
            >
                <ArrowLeft size={16} weight="bold" /> {t('cart_title')}
            </button>
            <h1 className={styles.title}>{t('cart_title')}</h1>

            <div className={styles.layout}>
                {/* Artículos del carrito */}
                <div className={styles.itemsSection}>
                    <div className={styles.itemsHeader}>
                        <span className={styles.itemCount}>
                            {cart.item_count}{' '}
                            {cart.item_count === 1 ? t('cart_item_one') : t('cart_item_other')}
                        </span>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleClearCart}
                            disabled={clearCart.isPending}
                        >
                            {t('cart_clear')}
                        </Button>
                    </div>
                    <div className={styles.itemsList}>
                        {cart.items.map((item) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                onUpdateQuantity={handleUpdateQuantity}
                                onRemove={handleRemoveItem}
                            />
                        ))}
                    </div>
                </div>

                {/* Resumen del pedido */}
                <aside className={styles.summary}>
                    <h2 className={styles.summaryTitle}>{t('cart_order_summary')}</h2>

                    <FreeShippingBar currentTotal={subtotal} />

                    {/* Cupón */}
                    <div className={styles.couponSection}>
                        <label className={styles.couponLabel} htmlFor="coupon-code">
                            {t('cart_coupon_code')}
                        </label>
                        <div className={styles.couponInput}>
                            <input
                                id="coupon-code"
                                type="text"
                                className={styles.input}
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                placeholder={t('cart_coupon_placeholder')}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleValidateCoupon}
                                disabled={validatingCoupon || !couponCode.trim()}
                            >
                                {validatingCoupon
                                    ? t('cart_coupon_applying')
                                    : t('cart_coupon_apply')}
                            </Button>
                        </div>
                        {!!couponResult && (
                            <span className={styles.couponSuccess}>
                                {couponResult.description} (-{formatCurrency(discount)})
                            </span>
                        )}
                    </div>

                    <div className={styles.summaryRows}>
                        <div className={styles.summaryRow}>
                            <span>{t('subtotal', { ns: 'common' })}</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {!!couponResult && (
                            <div className={styles.summaryRow}>
                                <span>{t('discount', { ns: 'common' })}</span>
                                <span className={styles.discountAmount}>
                                    -{formatCurrency(discount)}
                                </span>
                            </div>
                        )}
                        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                            <span>{t('total', { ns: 'common' })}</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <Link to={ROUTES.checkout} className={styles.checkoutLink}>
                        <Button variant="primary" size="lg" className={styles.checkoutButton}>
                            {t('cart_proceed_checkout')}
                        </Button>
                    </Link>

                    <Link to={ROUTES.home} className={styles.continueShoppingLink}>
                        {t('cart_continue_shopping')}
                    </Link>
                </aside>
            </div>
        </div>
    );
}
