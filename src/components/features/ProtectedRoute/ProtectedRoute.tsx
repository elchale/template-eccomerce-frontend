import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Spinner, Button, Card } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { isSafeInternalPath } from '@/lib/sanitize';
import { useAuthStore } from '@/stores/useAuthStore';

import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
    /**
     * If true, redirects to login page instead of showing auth prompt
     */
    redirectToLogin?: boolean;
    /**
     * Custom redirect path (defaults to login)
     */
    redirectPath?: string;
    /**
     * Custom title for the auth prompt
     */
    title?: string;
    /**
     * Custom message for the auth prompt
     */
    message?: string;
}

/**
 * A route wrapper that protects routes requiring authentication.
 *
 * Usage in App.tsx:
 * ```tsx
 * // Shows auth prompt in place
 * <Route element={<ProtectedRoute />}>
 *     <Route path="/profile" element={<Profile />} />
 * </Route>
 *
 * // Redirects to login
 * <Route element={<ProtectedRoute redirectToLogin />}>
 *     <Route path="/settings" element={<Settings />} />
 * </Route>
 * ```
 */
export function ProtectedRoute({
    redirectToLogin = false,
    redirectPath = ROUTES.login,
    title = 'Authentication Required',
    message = 'Please log in to access this page.',
}: ProtectedRouteProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const isLogged = useAuthStore((s) => s.isLogged);
    const isLoading = useAuthStore((s) => s.isLoading);

    // Show loading state while checking authentication
    if (isLoading && !isLogged) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" />
            </div>
        );
    }

    // User is not authenticated
    if (!isLogged) {
        // FE-4: validate redirectPath against open-redirect attacks.
        // redirectPath is currently always ROUTES.login (a constant), so the risk
        // is theoretical today but this prevents any future caller from passing
        // an externally-controlled value.
        const safeRedirectPath = isSafeInternalPath(redirectPath) ? redirectPath : ROUTES.login;

        // Redirect to login page (preserving the intended destination)
        if (redirectToLogin) {
            return <Navigate to={safeRedirectPath} state={{ from: location }} replace />;
        }

        // Show auth prompt in place
        return (
            <div className={styles.container}>
                <Card className={styles.card}>
                    <div className={styles.content}>
                        <h2>{title}</h2>
                        <p>{message}</p>
                        <div className={styles.buttons}>
                            <Button
                                variant="primary"
                                onClick={() =>
                                    navigate(ROUTES.login, { state: { from: location } })
                                }
                            >
                                Login
                            </Button>
                            <Button variant="secondary" onClick={() => navigate(ROUTES.register)}>
                                Register
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    // User is authenticated, render the child routes
    return <Outlet />;
}
