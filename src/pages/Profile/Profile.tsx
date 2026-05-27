import {
    ArrowRight,
    Heart,
    LockKey,
    Package,
    ShieldCheck,
    SignOut,
} from '@phosphor-icons/react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { useOrders, useWishlist } from '@/api';
import { ROUTES } from '@/constants/routes';
import { sanitizeUserProfile } from '@/lib/sanitize';
import { useAuthStore } from '@/stores/useAuthStore';

import styles from './Profile.module.css';

/**
 * `/profile` — customer account hub. Summarises orders + wishlist counts
 * and links to: order history, wishlist, change-password, logout. User
 * data is sanitized at render via `sanitizeUserProfile` as defense-in-
 * depth even though it comes from our own backend.
 */
export function Profile() {
    const navigate = useNavigate();
    const logOut = useAuthStore((s) => s.logOut);
    const getUser = useAuthStore((s) => s.getUser);
    const { t } = useTranslation('shop');
    const [loggingOut, setLoggingOut] = useState(false);

    const userDetails = getUser();
    const sanitizedProfile = useMemo(() => {
        if (!userDetails) return null;
        return sanitizeUserProfile(userDetails);
    }, [userDetails]);

    const { data: ordersData } = useOrders({ limit: '1' });
    const { data: wishlistItems } = useWishlist();

    const totalOrders = ordersData?.count ?? 0;
    const wishlistCount = wishlistItems?.length ?? 0;

    const handleLogout = async () => {
        setLoggingOut(true);
        await logOut();
        navigate(ROUTES.main);
    };

    if (!sanitizedProfile) {
        return (
            <div className={styles.page}>
                <div className={styles.errorState}>
                    <p>{t('profile_load_error')}</p>
                    <button onClick={() => navigate(ROUTES.login)}>
                        {t('profile_go_to_login')}
                    </button>
                </div>
            </div>
        );
    }

    const emailInitial = sanitizedProfile.email?.charAt(0).toUpperCase() ?? 'U';
    const isAdmin = sanitizedProfile.is_staff;

    return (
        <div className={styles.page}>
            {/* Hero */}
            <div className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.avatar}>
                        <span className={styles.avatarInitial}>{emailInitial}</span>
                    </div>
                    <p className={styles.email}>{sanitizedProfile.email}</p>
                    {!!isAdmin && (
                        <span className={styles.staffBadge}>
                            <ShieldCheck size={12} />
                            {t('profile_administrator')}
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Stats */}
                <div className={styles.statsCard}>
                    <div className={styles.statTile}>
                        <span className={styles.statValue}>{totalOrders}</span>
                        <span className={styles.statLabel}>{t('profile_orders')}</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statTile}>
                        <span className={styles.statValue}>{wishlistCount}</span>
                        <span className={styles.statLabel}>{t('profile_favorites')}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actionsCard}>
                    <Link to={ROUTES.orders} className={styles.actionRow}>
                        <div className={styles.actionIcon}>
                            <Package size={20} />
                        </div>
                        <div className={styles.actionBody}>
                            <span className={styles.actionLabel}>{t('profile_my_orders')}</span>
                            <span className={styles.actionMeta}>
                                {totalOrders > 0
                                    ? t('profile_orders_count_other', { count: totalOrders })
                                    : t('profile_purchase_history')}
                            </span>
                        </div>
                        <ArrowRight size={18} className={styles.actionChevron} />
                    </Link>

                    <Link to={ROUTES.wishlist} className={styles.actionRow}>
                        <div className={styles.actionIcon}>
                            <Heart size={20} />
                        </div>
                        <div className={styles.actionBody}>
                            <span className={styles.actionLabel}>{t('profile_wishlist')}</span>
                            <span className={styles.actionMeta}>
                                {wishlistCount > 0
                                    ? t('profile_saved_count_other', { count: wishlistCount })
                                    : t('profile_saved_products')}
                            </span>
                        </div>
                        <ArrowRight size={18} className={styles.actionChevron} />
                    </Link>

                    <button
                        className={styles.actionRow}
                        onClick={() => navigate(ROUTES.changePassword)}
                    >
                        <div className={styles.actionIcon}>
                            <LockKey size={20} />
                        </div>
                        <div className={styles.actionBody}>
                            <span className={styles.actionLabel}>
                                {t('profile_change_password')}
                            </span>
                            <span className={styles.actionMeta}>
                                {t('profile_update_security')}
                            </span>
                        </div>
                        <ArrowRight size={18} className={styles.actionChevron} />
                    </button>

                    <button
                        className={`${styles.actionRow} ${styles.actionRowDanger}`}
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        <div className={`${styles.actionIcon} ${styles.actionIconDanger}`}>
                            <SignOut size={20} />
                        </div>
                        <div className={styles.actionBody}>
                            <span className={styles.actionLabel}>
                                {loggingOut ? t('profile_logging_out') : t('profile_logout')}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
