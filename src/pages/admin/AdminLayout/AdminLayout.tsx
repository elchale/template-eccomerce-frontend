import {
    ArrowLeft,
    Browsers,
    ChartBar,
    EnvelopeSimple,
    Gear,
    Image,
    List,
    ListBullets,
    Megaphone,
    Palette,
    Percent,
    ShoppingBag,
    SquaresFour,
    Tag,
    Ticket,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, Link } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';

import styles from './AdminLayout.module.css';

/**
 * Shared shell for every `/admin/*` route. Holds the sidebar nav (Catalog
 * + Marketing groups), the top bar with a mobile-only hamburger, and an
 * `<Outlet />` for the active admin page. Mounted under `AdminRoute` so
 * non-staff visitors never reach this component.
 */
export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { t } = useTranslation('admin');

    const closeSidebar = () => setSidebarOpen(false);

    const NAV_ITEMS = [
        { to: ROUTES.admin, icon: <SquaresFour />, label: t('nav_dashboard'), end: true },
        { to: ROUTES.adminProducts, icon: <ShoppingBag />, label: t('nav_products'), end: false },
        { to: ROUTES.adminCategories, icon: <Tag />, label: t('nav_categories'), end: false },
        { to: ROUTES.adminOrders, icon: <ListBullets />, label: t('nav_orders'), end: false },
        { to: ROUTES.adminCoupons, icon: <Ticket />, label: t('nav_coupons'), end: false },
        { to: ROUTES.adminAnalytics, icon: <ChartBar />, label: t('nav_analytics'), end: false },
        {
            to: ROUTES.adminEmailLogs,
            icon: <EnvelopeSimple />,
            label: t('nav_email_logs'),
            end: false,
        },
    ];

    const MARKETING_NAV_ITEMS = [
        { to: ROUTES.adminMarketingPromos, icon: <Percent />, label: t('nav_promos'), end: false },
        { to: ROUTES.adminMarketingBanners, icon: <Image />, label: t('nav_banners'), end: false },
        { to: ROUTES.adminMarketingPopups, icon: <Browsers />, label: t('nav_popups'), end: false },
        { to: ROUTES.adminMarketingConfig, icon: <Gear />, label: t('nav_config'), end: false },
        { to: ROUTES.adminTheme, icon: <Palette />, label: t('nav_theme'), end: false },
    ];

    return (
        <div className={styles.layout}>
            {!!sidebarOpen && (
                <div
                    className={styles.overlay}
                    onClick={closeSidebar}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            closeSidebar();
                        }
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label={t('close', { ns: 'common' })}
                />
            )}

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarHeader}>
                    <h2 className={styles.sidebarTitle}>{t('panel_title')}</h2>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                            }
                            onClick={closeSidebar}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </NavLink>
                    ))}

                    <div className={styles.navSectionHeader}>
                        <Megaphone />
                        <span>{t('marketing')}</span>
                    </div>
                    {MARKETING_NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                            }
                            onClick={closeSidebar}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link to={ROUTES.home} className={styles.backLink}>
                        <ArrowLeft />
                        <span>{t('back_to_store')}</span>
                    </Link>
                </div>
            </aside>

            <div className={styles.main}>
                <header className={styles.topbar}>
                    <button
                        className={styles.menuButton}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={t('panel_title')}
                    >
                        <List />
                    </button>
                    <h1 className={styles.topbarTitle}>{t('panel_title')}</h1>
                    <Link to={ROUTES.home} className={styles.topbarBack}>
                        <ArrowLeft />
                        <span>{t('back_to_store')}</span>
                    </Link>
                </header>

                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
