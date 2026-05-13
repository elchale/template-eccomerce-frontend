import { Outlet, Navigate, useLocation } from 'react-router-dom';

import { AnnouncementBar } from '@/components/features/AnnouncementBar/AnnouncementBar';
import { BottomNav } from '@/components/features/BottomNav/BottomNav';
import { PromoPopup } from '@/components/features/PromoPopup/PromoPopup';
import { Navbar, Footer } from '@/components/layout';
import { ROUTES } from '@/constants/routes';

import styles from './Main.module.css';

/**
 * Storefront layout shell. Wraps every customer-facing route with the
 * announcement bar, navbar, footer, and the global promo popup. The bare
 * `/` path redirects to the home route so the layout never paints with
 * an empty `<Outlet />` waiting for the home component.
 *
 * `BottomNav` is mounted here and hidden above 768px via CSS so mobile
 * users always have quick access to primary navigation.
 */
export function Main() {
    const location = useLocation();

    // Only show the landing page on the exact root URL
    const isLandingPage = location.pathname === '/';

    return (
        <>
            {!isLandingPage ? (
                <div className={styles.container}>
                    <AnnouncementBar />
                    <Navbar />
                    <div className={styles.contentWrapper}>
                        <Outlet />
                        <Footer />
                    </div>
                    <BottomNav />
                    <PromoPopup />
                </div>
            ) : (
                <Navigate to={ROUTES.home} />
            )}
        </>
    );
}
