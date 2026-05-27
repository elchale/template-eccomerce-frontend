import {
    Heart,
    House,
    List,
    MagnifyingGlass,
    Package,
    ShoppingCart,
    SquaresFour,
    User,
    X,
} from '@phosphor-icons/react';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useCart } from '@/api/useCart';
import { useOrders } from '@/api/useOrders';
import { Button, Spinner, LanguageSwitcher } from '@/components/ui';
import { LOGO, PROJECT_NAME } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import type { UserDetails } from '@/types/auth';

import styles from './Navbar.module.css';

/**
 * Top navigation shared across all storefront pages. Combines:
 *  - Brand logo + project name
 *  - Search autocomplete (desktop) / search button (mobile)
 *  - Cart badge (reads `useCart` for logged-in, `useCartStore.getLocalItemCount`
 *    for guests) that opens the slide-over drawer
 *  - Wishlist + profile shortcuts (auth-gated)
 *  - Language switcher
 *  - Hamburger menu (mobile) rendered via portal so it escapes the
 *    navbar's stacking context
 */
export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isLogged = useAuthStore((s) => s.isLogged);
    const getUser = useAuthStore((s) => s.getUser);
    const itemCount = useCartStore((s) => s.itemCount);
    const setItemCount = useCartStore((s) => s.setItemCount);
    const openCart = useCartStore((s) => s.openCart);
    const localItems = useCartStore((s) => s.localItems);
    const { data: cart } = useCart();

    // Count of pending+unpaid orders for the bag-icon badge. We only need
    // pagination's `count`, so cap the page size at 1 to keep the payload
    // tiny — the response is cached for 30s by the default queryClient
    // config, plenty for a top-of-page chrome element.
    const { data: pendingOrdersData } = useOrders(
        isLogged
            ? { status: 'pending', payment_status: 'unpaid', limit: '1' }
            : undefined,
    );
    const pendingOrdersCount = pendingOrdersData?.count ?? 0;

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userDetails, setUserDetails] = useState<UserDetails | undefined>(undefined);
    const [hidden, setHidden] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const lastScrollYRef = useRef(0);

    // Sync cart count from API (logged in users)
    useEffect(() => {
        if (cart) {
            setItemCount(cart.item_count);
        }
    }, [cart, setItemCount]);

    // Determine displayed cart count
    const localCartCount = localItems.reduce((sum, i) => sum + i.quantity, 0);
    const displayCartCount = isLogged ? itemCount : localCartCount;

    useEffect(() => {
        if (isLogged) {
            const userData = getUser();
            setUserDetails(userData ?? undefined);
        } else {
            setUserDetails(undefined);
        }
    }, [isLogged, getUser]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollYRef.current;
            const pastThreshold = currentScrollY > 80;

            if (scrollingDown && pastThreshold) {
                setHidden(true);
            } else {
                setHidden(false);
            }

            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Keep a global CSS class in sync so sticky children can react to navbar visibility
    useEffect(() => {
        const isHidden = hidden && !mobileMenuOpen;
        document.documentElement.classList.toggle('navbar-hidden', isHidden);
        return () => document.documentElement.classList.remove('navbar-hidden');
    }, [hidden, mobileMenuOpen]);

    const isActive = (path: string) => location.pathname.startsWith(path);
    const isSearchPage = location.pathname === ROUTES.search;
    const isAdmin = userDetails?.is_staff;
    const profileLoading = false;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            navigate(`${ROUTES.search}?q=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue('');
            searchRef.current?.blur();
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen((prev) => !prev);
    };

    const navbarClasses = [styles.navbar, hidden && !mobileMenuOpen ? styles.hidden : '']
        .filter(Boolean)
        .join(' ');

    // Rendered via portal into document.body to escape backdrop-filter stacking context
    const drawerPortal = createPortal(
        <>
            {!!mobileMenuOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setMobileMenuOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setMobileMenuOpen(false);
                        }
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label={t('close', { ns: 'common' })}
                />
            )}

            <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
                <form
                    className={styles.drawerSearch}
                    onSubmit={(e) => {
                        handleSearch(e);
                        setMobileMenuOpen(false);
                    }}
                >
                    <MagnifyingGlass className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t('nav_search_placeholder')}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </form>

                <Link
                    to={ROUTES.home}
                    className={`${styles.mobileLink} ${isActive(ROUTES.home) ? styles.mobileLinkActive : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <House size={20} />
                    <span>{t('nav_home')}</span>
                </Link>
                <Link
                    to={ROUTES.search}
                    className={`${styles.mobileLink} ${isActive(ROUTES.search) ? styles.mobileLinkActive : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <MagnifyingGlass size={20} />
                    <span>{t('nav_shop_all')}</span>
                </Link>

                <button
                    className={styles.mobileLink}
                    onClick={() => {
                        openCart();
                        setMobileMenuOpen(false);
                    }}
                >
                    <ShoppingCart size={20} />
                    <span>
                        {t('nav_cart')} {displayCartCount > 0 && `(${displayCartCount})`}
                    </span>
                </button>

                {isLogged ? (
                    <>
                        <Link
                            to={ROUTES.wishlist}
                            className={`${styles.mobileLink} ${isActive(ROUTES.wishlist) ? styles.mobileLinkActive : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Heart size={20} />
                            <span>{t('nav_wishlist')}</span>
                        </Link>
                        <Link
                            to={ROUTES.orders}
                            className={`${styles.mobileLink} ${isActive(ROUTES.orders) ? styles.mobileLinkActive : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Package size={20} />
                            <span>{t('nav_orders')}</span>
                        </Link>
                        {!!isAdmin && (
                            <Link
                                to={ROUTES.admin}
                                className={styles.mobileLink}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <SquaresFour size={20} />
                                <span>{t('nav_admin')}</span>
                            </Link>
                        )}
                        <Link
                            to={ROUTES.profile}
                            className={`${styles.mobileLink} ${isActive(ROUTES.profile) ? styles.mobileLinkActive : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <User size={20} />
                            <span>{t('nav_profile')}</span>
                        </Link>
                    </>
                ) : (
                    <div className={styles.mobileAuth}>
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => {
                                navigate(ROUTES.login);
                                setMobileMenuOpen(false);
                            }}
                        >
                            {t('nav_login')}
                        </Button>
                    </div>
                )}
                <div className={styles.mobileLanguage}>
                    <LanguageSwitcher />
                </div>
            </div>
        </>,
        document.body,
    );

    return (
        <>
            <nav className={navbarClasses}>
                <div className={styles.inner}>
                    {/* Left: Logo */}
                    <Link to={ROUTES.home} className={styles.logo}>
                        <img
                            src={LOGO.src}
                            alt={LOGO.alt}
                            className={styles.logoImg}
                            width={40}
                            height={40}
                        />
                        <span className={styles.logoText}>{PROJECT_NAME}</span>
                    </Link>

                    {/* Center: Search bar — hidden on /search (page has its own prominent bar) */}
                    <form
                        className={`${styles.searchBar} ${isSearchPage ? styles.searchBarHidden : ''}`}
                        onSubmit={handleSearch}
                    >
                        <MagnifyingGlass className={styles.searchIcon} />
                        <input
                            ref={searchRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder={t('nav_search_placeholder')}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                        {!!searchValue && (
                            <button
                                type="button"
                                className={styles.searchClear}
                                onClick={() => setSearchValue('')}
                            >
                                ×
                            </button>
                        )}
                        <button type="submit" className={styles.searchSubmit}>
                            {t('search')}
                        </button>
                    </form>

                    {/* Right: Actions (desktop) */}
                    <div className={styles.actions}>
                        <LanguageSwitcher />

                        {!!isLogged && (
                            <button
                                className={styles.iconButton}
                                onClick={() => navigate(ROUTES.wishlist)}
                                aria-label={t('nav_wishlist_aria')}
                            >
                                <Heart size={20} />
                            </button>
                        )}

                        {!!isLogged && (
                            <button
                                className={`${styles.iconButton} ${styles.cartButton}`}
                                onClick={() => navigate(ROUTES.orders)}
                                aria-label={
                                    pendingOrdersCount > 0
                                        ? t('shop:nav_pending_orders_aria', {
                                              count: pendingOrdersCount,
                                          })
                                        : t('nav_orders_aria')
                                }
                            >
                                <Package size={20} />
                                {pendingOrdersCount > 0 && (
                                    <span className={styles.cartBadge}>
                                        {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                                    </span>
                                )}
                            </button>
                        )}

                        <button
                            className={`${styles.iconButton} ${styles.cartButton}`}
                            onClick={openCart}
                            aria-label={t('nav_cart_aria')}
                        >
                            <ShoppingCart size={20} />
                            {displayCartCount > 0 && (
                                <span className={styles.cartBadge}>
                                    {displayCartCount > 99 ? '99+' : displayCartCount}
                                </span>
                            )}
                        </button>

                        {!!isAdmin && (
                            <button
                                className={styles.iconButton}
                                onClick={() => navigate(ROUTES.admin)}
                                aria-label={t('nav_admin_aria')}
                            >
                                <SquaresFour size={20} />
                            </button>
                        )}

                        {profileLoading ? (
                            <Spinner />
                        ) : isLogged ? (
                            <Link
                                to={ROUTES.profile}
                                className={styles.iconButton}
                                aria-label={t('nav_profile_aria')}
                            >
                                <div className={styles.userAvatar}>
                                    {userDetails?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </Link>
                        ) : (
                            <button
                                className={styles.iconButton}
                                onClick={() => navigate(ROUTES.login)}
                                aria-label={t('nav_login_aria')}
                            >
                                <User size={20} />
                            </button>
                        )}
                    </div>

                    {/* Mobile: cart + hamburger */}
                    <div className={styles.mobileControls}>
                        <button
                            className={`${styles.iconButton} ${styles.cartButton}`}
                            onClick={openCart}
                            aria-label={t('nav_cart_aria')}
                        >
                            <ShoppingCart size={20} />
                            {displayCartCount > 0 && (
                                <span className={styles.cartBadge}>
                                    {displayCartCount > 99 ? '99+' : displayCartCount}
                                </span>
                            )}
                        </button>
                        <button className={styles.mobileToggle} onClick={toggleMobileMenu}>
                            {mobileMenuOpen ? <X size={22} /> : <List size={22} />}
                        </button>
                    </div>
                </div>

                {/* Mobile: search row (below inner bar) */}
                <form className={styles.mobileSearch} onSubmit={handleSearch}>
                    <MagnifyingGlass className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder={t('nav_search_placeholder')}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </form>
            </nav>

            {drawerPortal}
        </>
    );
}
