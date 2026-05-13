import { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCart, useUpdateCartItem, useRemoveCartItem } from '@/api';
import { CartItemRow } from '@/components/features/CartItemRow/CartItemRow';
import { FreeShippingBar } from '@/components/features/FreeShippingBar/FreeShippingBar';
import { ConfirmModal } from '@/components/modals';
import { Button, Spinner, EmptyState } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import { useCartStore, useModalStore } from '@/stores';
import { useAuthStore } from '@/stores/useAuthStore';

import styles from './CartDrawer.module.css';

/**
 * Slide-over cart preview triggered by "Add to cart" anywhere in the tree.
 * Renders either the server cart (`useCart`) or the guest cart from
 * `useCartStore.localItems` depending on auth state — both shapes are
 * normalized so the same row component handles both.
 *
 * `overlayReady` blocks the overlay's click-to-close during the entry
 * animation, otherwise an "Add to cart" click sometimes propagates into
 * the freshly-opened overlay and dismisses it before the user sees it.
 */
export function CartDrawer() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isLogged = useAuthStore((s) => s.isLogged);
    const isCartOpen = useCartStore((s) => s.isCartOpen);
    const closeCart = useCartStore((s) => s.closeCart);
    const getLocalCartItems = useCartStore((s) => s.getLocalCartItems);
    const getLocalSubtotal = useCartStore((s) => s.getLocalSubtotal);
    const updateLocalItemQuantity = useCartStore((s) => s.updateLocalItemQuantity);
    const removeLocalItem = useCartStore((s) => s.removeLocalItem);
    const localItems = useCartStore((s) => s.localItems);
    const { data: cart, isLoading } = useCart();
    const updateItem = useUpdateCartItem();
    const removeItem = useRemoveCartItem();
    const openModal = useModalStore((s) => s.openModal);

    const overlayReady = useRef(false);
    useEffect(() => {
        const id = setTimeout(() => {
            overlayReady.current = true;
        }, 350);
        return () => {
            clearTimeout(id);
            overlayReady.current = false;
        };
    }, [isCartOpen]);

    if (!isCartOpen) return null;

    const isGuest = !isLogged;
    const guestItems = getLocalCartItems();
    const guestSubtotal = getLocalSubtotal();

    const items = isGuest ? guestItems : (cart?.items ?? []);
    const subtotal = isGuest
        ? guestSubtotal
        : cart
          ? Number.parseFloat(cart.subtotal).toFixed(2)
          : '0.00';
    const showLoading = !isGuest && isLoading;

    const handleUpdateQuantity = (id: number, quantity: number) => {
        if (isGuest) {
            const item = localItems[id - 1];
            if (item) {
                updateLocalItemQuantity(item.product_id, item.variant_id, quantity);
            }
        } else {
            updateItem.mutate({ id, quantity });
        }
    };

    const handleRemove = (id: number) => {
        // Same confirm step the full-page cart uses — removing a line is
        // destructive, so we never lose an item to a stray click whether
        // the row was rendered in the drawer or the page.
        // The copy lives in the `shop` namespace (CartPage uses it too);
        // namespace it explicitly because the drawer's default namespace
        // is `common`.
        openModal(
            <ConfirmModal
                title={t('shop:cart_remove_confirm_title')}
                message={t('shop:cart_remove_confirm_message')}
                confirmLabel={t('shop:cart_remove_label')}
                variant="danger"
                onConfirm={() => {
                    if (isGuest) {
                        const item = localItems[id - 1];
                        if (item) {
                            removeLocalItem(item.product_id, item.variant_id);
                            toast.success(t('shop:cart_item_removed'));
                        }
                    } else {
                        removeItem.mutate(id, {
                            onSuccess: () => toast.success(t('shop:cart_item_removed')),
                        });
                    }
                }}
            />,
        );
    };

    const handleCheckout = () => {
        closeCart();
        if (isGuest) {
            navigate(ROUTES.login);
        } else {
            navigate(ROUTES.checkout);
        }
    };

    const handleViewCart = () => {
        closeCart();
        navigate(ROUTES.cart);
    };

    const subtotalNum = Number.parseFloat(subtotal);

    return (
        <>
            <div
                className={styles.overlay}
                onClick={() => overlayReady.current && closeCart()}
                onKeyDown={(e) => {
                    if (
                        overlayReady.current &&
                        (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
                    ) {
                        e.preventDefault();
                        closeCart();
                    }
                }}
                role="button"
                tabIndex={-1}
                aria-label={t('cart_drawer_close')}
            />
            <div className={styles.drawer}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t('cart_drawer_title')}</h2>
                    <button
                        className={styles.closeButton}
                        onClick={closeCart}
                        aria-label={t('cart_drawer_close')}
                    >
                        ×
                    </button>
                </div>
                <div className={styles.body}>
                    {showLoading ? (
                        <div className={styles.loading}>
                            <Spinner size="md" />
                        </div>
                    ) : items.length === 0 ? (
                        <EmptyState
                            title={t('cart_drawer_empty_title')}
                            message={t('cart_drawer_empty_message')}
                        />
                    ) : (
                        <>
                            <FreeShippingBar
                                currentTotal={Number.isNaN(subtotalNum) ? 0 : subtotalNum}
                            />
                            <div className={styles.items}>
                                {items.map((item) => (
                                    <CartItemRow
                                        key={`${item.product}-${item.variant ?? 'no-var'}-${item.id}`}
                                        item={item}
                                        onUpdateQuantity={handleUpdateQuantity}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
                {items.length > 0 && (
                    <div className={styles.footer}>
                        <div className={styles.subtotal}>
                            <span>{t('cart_drawer_subtotal')}</span>
                            <span className={styles.subtotalValue}>{formatCurrency(subtotal)}</span>
                        </div>
                        {!!isGuest && (
                            <p className={styles.loginHint}>{t('cart_drawer_login_hint')}</p>
                        )}
                        <div className={styles.footerActions}>
                            <Button variant="secondary" onClick={handleViewCart}>
                                {t('cart_drawer_view')}
                            </Button>
                            <Button variant="primary" onClick={handleCheckout}>
                                {isGuest ? t('cart_drawer_signin') : t('cart_drawer_checkout')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
