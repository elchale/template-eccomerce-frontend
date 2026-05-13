import { House, MagnifyingGlass, ShoppingCart, Heart, User } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';

import styles from './BottomNav.module.css';

export function BottomNav() {
    const { t } = useTranslation();
    const location = useLocation();
    const isLogged = useAuthStore((s) => s.isLogged);
    const itemCount = useCartStore((s) => s.itemCount);
    const localItems = useCartStore((s) => s.localItems);
    const openCart = useCartStore((s) => s.openCart);

    const localCount = localItems.reduce((sum, i) => sum + i.quantity, 0);
    const cartCount = isLogged ? itemCount : localCount;

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className={styles.nav} aria-label={t('bottom_nav_aria')}>
            <Link
                to={ROUTES.home}
                className={`${styles.item} ${isActive(ROUTES.home) ? styles.active : ''}`}
                aria-label={t('bottom_nav_home')}
            >
                <House weight={isActive(ROUTES.home) ? 'fill' : 'regular'} size={22} />
                <span className={styles.label}>{t('bottom_nav_home')}</span>
            </Link>

            <Link
                to={ROUTES.search}
                className={`${styles.item} ${isActive(ROUTES.search) ? styles.active : ''}`}
                aria-label={t('bottom_nav_search')}
            >
                <MagnifyingGlass weight={isActive(ROUTES.search) ? 'fill' : 'regular'} size={22} />
                <span className={styles.label}>{t('bottom_nav_search')}</span>
            </Link>

            <button
                className={`${styles.item} ${styles.cartItem}`}
                onClick={openCart}
                aria-label={t('bottom_nav_cart')}
            >
                <span className={styles.cartIconWrapper}>
                    <ShoppingCart weight="regular" size={22} />
                    {cartCount > 0 && (
                        <span className={styles.badge}>{cartCount > 99 ? '99+' : cartCount}</span>
                    )}
                </span>
                <span className={styles.label}>{t('bottom_nav_cart')}</span>
            </button>

            {isLogged ? (
                <Link
                    to={ROUTES.wishlist}
                    className={`${styles.item} ${isActive(ROUTES.wishlist) ? styles.active : ''}`}
                    aria-label={t('bottom_nav_favorites')}
                >
                    <Heart weight={isActive(ROUTES.wishlist) ? 'fill' : 'regular'} size={22} />
                    <span className={styles.label}>{t('bottom_nav_favorites')}</span>
                </Link>
            ) : (
                <Link
                    to={ROUTES.login}
                    className={styles.item}
                    aria-label={t('bottom_nav_login_aria')}
                >
                    <Heart weight="regular" size={22} />
                    <span className={styles.label}>{t('bottom_nav_favorites')}</span>
                </Link>
            )}

            <Link
                to={isLogged ? ROUTES.profile : ROUTES.login}
                className={`${styles.item} ${isActive(ROUTES.profile) ? styles.active : ''}`}
                aria-label={isLogged ? t('bottom_nav_my_account_aria') : t('bottom_nav_login_aria')}
            >
                <User weight={isActive(ROUTES.profile) ? 'fill' : 'regular'} size={22} />
                <span className={styles.label}>{t('bottom_nav_account')}</span>
            </Link>
        </nav>
    );
}
