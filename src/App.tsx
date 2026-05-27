/**
 * App root — composes providers, routes, and the global UI shell.
 *
 * Layering (outermost first):
 *  1. Top-level `ErrorBoundary` catches anything not handled below.
 *  2. `ThemeProvider` reconciles the server theme into the store.
 *  3. `AppInner` mounts inside `Router` (in `main.tsx`) so hooks like
 *     `useScrollToTop` and `useLocation` have router context.
 *
 * Bundle splitting: customer-facing pages are eagerly imported for fast
 * first paint; every admin page is lazy-loaded via `lazyNamed` so the
 * heavy charts library (chart.js) never ships in the public bundle.
 *
 * Each top-level UI feature (`OfflineBanner`, `ModalBase`, `CartDrawer`,
 * `Toaster`) is mounted once here, then opened/closed by global stores.
 */
import { Suspense } from 'react';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useLocation } from 'react-router-dom';

import { AdminRoute } from './components/features/AdminRoute/AdminRoute';
import { CartDrawer } from './components/features/CartDrawer/CartDrawer';
import { CookieConsent } from './components/features/CookieConsent/CookieConsent';
import { ErrorBoundary } from './components/features/ErrorBoundary/ErrorBoundary';
import { OfflineBanner } from './components/features/OfflineBanner/OfflineBanner';
import { ProtectedRoute } from './components/features/ProtectedRoute/ProtectedRoute';
import { ThemeProvider } from './components/features/ThemeProvider';
import { ModalBase } from './components/modals/ModalBase/ModalBase';
import { Spinner } from './components/ui';
import { ROUTES } from './constants';
import { useScrollToTop } from './hooks';
import { lazyNamed } from './lib/lazyNamed';
// Customer-facing pages — kept eager for fast first paint
import { ChangePassword } from './pages/auth/ChangePassword/ChangePassword';
import { ForgotPassword } from './pages/auth/ForgotPassword/ForgotPassword';
import { Login } from './pages/auth/Login/Login';
import { Register } from './pages/auth/Register/Register';
import { VerifyEmail } from './pages/auth/VerifyEmail/VerifyEmail';
import { CartPage } from './pages/CartPage/CartPage';
import { CategoryPage } from './pages/CategoryPage/CategoryPage';
import { CheckoutPage } from './pages/CheckoutPage/CheckoutPage';
import { Main } from './pages/Main/Main';
import { NotFound } from './pages/NotFound/NotFound';
import { OrderDetailPage } from './pages/OrderDetailPage/OrderDetailPage';
import { OrderListPage } from './pages/OrderListPage/OrderListPage';
import { PrivacyPage } from './pages/PrivacyPage/PrivacyPage';
import { ProductDetailPage } from './pages/ProductDetailPage/ProductDetailPage';
import { Profile } from './pages/Profile/Profile';
import { SearchPage } from './pages/SearchPage/SearchPage';
import { ShopHome } from './pages/ShopHome/ShopHome';
import { TermsPage } from './pages/TermsPage/TermsPage';
import { WishlistPage } from './pages/WishlistPage/WishlistPage';

// Admin pages — lazy-loaded so they don't ship with the public bundle.
// Charts library (chart.js + react-chartjs-2) only loads when AdminAnalytics is reached.
const AdminAnalytics = lazyNamed(
    () => import('./pages/admin/AdminAnalytics/AdminAnalytics'),
    'AdminAnalytics',
);
const AdminBannerForm = lazyNamed(
    () => import('./pages/admin/AdminBannerForm/AdminBannerForm'),
    'AdminBannerForm',
);
const AdminBannerList = lazyNamed(
    () => import('./pages/admin/AdminBannerList/AdminBannerList'),
    'AdminBannerList',
);
const AdminCategoryList = lazyNamed(
    () => import('./pages/admin/AdminCategoryList/AdminCategoryList'),
    'AdminCategoryList',
);
const AdminCouponList = lazyNamed(
    () => import('./pages/admin/AdminCouponList/AdminCouponList'),
    'AdminCouponList',
);
const AdminLayout = lazyNamed(() => import('./pages/admin/AdminLayout/AdminLayout'), 'AdminLayout');
const AdminOrderDetail = lazyNamed(
    () => import('./pages/admin/AdminOrderDetail/AdminOrderDetail'),
    'AdminOrderDetail',
);
const AdminOrderList = lazyNamed(
    () => import('./pages/admin/AdminOrderList/AdminOrderList'),
    'AdminOrderList',
);
const AdminPopupForm = lazyNamed(
    () => import('./pages/admin/AdminPopupForm/AdminPopupForm'),
    'AdminPopupForm',
);
const AdminPopupList = lazyNamed(
    () => import('./pages/admin/AdminPopupList/AdminPopupList'),
    'AdminPopupList',
);
const AdminProductForm = lazyNamed(
    () => import('./pages/admin/AdminProductForm/AdminProductForm'),
    'AdminProductForm',
);
const AdminProductList = lazyNamed(
    () => import('./pages/admin/AdminProductList/AdminProductList'),
    'AdminProductList',
);
const AdminPromoForm = lazyNamed(
    () => import('./pages/admin/AdminPromoForm/AdminPromoForm'),
    'AdminPromoForm',
);
const AdminPromoList = lazyNamed(
    () => import('./pages/admin/AdminPromoList/AdminPromoList'),
    'AdminPromoList',
);
const AdminStoreConfig = lazyNamed(
    () => import('./pages/admin/AdminStoreConfig/AdminStoreConfig'),
    'AdminStoreConfig',
);
const AdminThemeSettings = lazyNamed(
    () => import('./pages/admin/AdminThemeSettings/AdminThemeSettings'),
    'AdminThemeSettings',
);
const AdminEmailLog = lazyNamed(
    () => import('./pages/admin/AdminEmailLog/AdminEmailLog'),
    'AdminEmailLog',
);
const Dashboard = lazyNamed(() => import('./pages/admin/Dashboard/Dashboard'), 'Dashboard');

import './App.css';

function AdminSuspenseFallback() {
    return (
        <div className="adminSuspenseFallback">
            <Spinner size="lg" variant="primary" />
        </div>
    );
}

// Inner component has access to router context (useLocation, useScrollToTop)
function AppInner() {
    useScrollToTop();
    const location = useLocation();
    const { t } = useTranslation();

    return (
        <div className="App">
            {/* FE-6: Persistent offline indicator */}
            <OfflineBanner />
            <ModalBase />
            <CartDrawer />
            {/* GDPR cookie consent banner — mounted once, hidden after user chooses */}
            <CookieConsent />
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    success: { duration: 3000, className: 'toast-success' },
                    error: { duration: 8000, className: 'toast-error' },
                }}
            >
                {(toasts) => (
                    <ToastBar toast={toasts}>
                        {({ icon, message }) => (
                            <button
                                type="button"
                                onClick={() => toast.dismiss()}
                                className="toast-dismiss-button"
                                aria-label={t('dismiss_notification')}
                            >
                                {icon}
                                {message}
                            </button>
                        )}
                    </ToastBar>
                )}
            </Toaster>
            <Routes>
                {/* Public auth endpoints */}
                <Route path={ROUTES.login} element={<Login />} />
                <Route path={ROUTES.register} element={<Register />} />
                <Route path={ROUTES.verifyEmail} element={<VerifyEmail />} />
                <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />

                {/* Protected auth endpoints */}
                <Route element={<ProtectedRoute redirectToLogin />}>
                    <Route path={ROUTES.changePassword} element={<ChangePassword />} />
                </Route>

                {/* Admin routes — wrapped in a localized ErrorBoundary so crashes
                    inside admin pages stay contained within the admin layout.
                    resetKey on pathname resets the boundary when navigating. */}
                <Route element={<AdminRoute />}>
                    <Route
                        path={ROUTES.admin}
                        element={
                            <ErrorBoundary resetKey={location.pathname}>
                                <Suspense fallback={<AdminSuspenseFallback />}>
                                    <AdminLayout />
                                </Suspense>
                            </ErrorBoundary>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="products" element={<AdminProductList />} />
                        <Route path="products/new" element={<AdminProductForm />} />
                        <Route path="products/:id/edit" element={<AdminProductForm />} />
                        <Route path="categories" element={<AdminCategoryList />} />
                        <Route path="orders" element={<AdminOrderList />} />
                        <Route path="orders/:id" element={<AdminOrderDetail />} />
                        <Route path="coupons" element={<AdminCouponList />} />
                        <Route path="analytics" element={<AdminAnalytics />} />
                        {/* Marketing */}
                        <Route path="marketing/promos" element={<AdminPromoList />} />
                        <Route path="marketing/promos/new" element={<AdminPromoForm />} />
                        <Route path="marketing/promos/:id/edit" element={<AdminPromoForm />} />
                        <Route path="marketing/banners" element={<AdminBannerList />} />
                        <Route path="marketing/banners/new" element={<AdminBannerForm />} />
                        <Route path="marketing/banners/:id/edit" element={<AdminBannerForm />} />
                        <Route path="marketing/popups" element={<AdminPopupList />} />
                        <Route path="marketing/popups/new" element={<AdminPopupForm />} />
                        <Route path="marketing/popups/:id/edit" element={<AdminPopupForm />} />
                        <Route path="marketing/config" element={<AdminStoreConfig />} />
                        <Route path="theme" element={<AdminThemeSettings />} />
                        <Route path="email-logs" element={<AdminEmailLog />} />
                    </Route>
                </Route>

                <Route path={ROUTES.main} element={<Main />}>
                    {/* Public routes */}
                    <Route path={ROUTES.home} element={<ShopHome />} />
                    <Route path={ROUTES.shopCategory} element={<CategoryPage />} />
                    <Route path={ROUTES.shopProduct} element={<ProductDetailPage />} />
                    <Route path={ROUTES.search} element={<SearchPage />} />
                    <Route path={ROUTES.privacy} element={<PrivacyPage />} />
                    <Route path={ROUTES.terms} element={<TermsPage />} />

                    {/* Protected routes - require authentication */}
                    <Route element={<ProtectedRoute />}>
                        <Route path={ROUTES.profile} element={<Profile />} />
                        <Route path={ROUTES.cart} element={<CartPage />} />
                        {/* FE-7: checkout wrapped in its own ErrorBoundary */}
                        <Route
                            path={ROUTES.checkout}
                            element={
                                <ErrorBoundary>
                                    <CheckoutPage />
                                </ErrorBoundary>
                            }
                        />
                        <Route path={ROUTES.orders} element={<OrderListPage />} />
                        <Route path={ROUTES.orderDetail} element={<OrderDetailPage />} />
                        <Route path={ROUTES.wishlist} element={<WishlistPage />} />
                    </Route>
                </Route>
                <Route path={ROUTES.notFound} element={<NotFound />} />
            </Routes>
        </div>
    );
}

// FE-7: top-level ErrorBoundary wraps entire app
function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AppInner />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export { App };
