import { Outlet, useNavigate } from 'react-router-dom';

import { useMe } from '@/api/useMe';
import { Button, Card, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores';

import styles from './AdminRoute.module.css';

/**
 * Route guard that combines authentication + a **fresh server check** of the
 * `is_staff` flag. Reading `is_staff` from a cached localStorage value is
 * unsafe — it could be stale or tampered by the user. We call `GET /auth/user/`
 * with a 30s stale time so repeated navigation doesn't hammer the server.
 *
 * Three render branches:
 *  1. Loading → spinner while auth state is unknown.
 *  2. Not logged in → in-place login prompt (does NOT redirect — the user
 *     may have arrived from a direct link and we want them to come back
 *     to this exact URL after auth).
 *  3. Logged in but not staff → "Acceso Denegado" with a link home; the API
 *     also enforces this, so this is just the UI layer.
 */
export function AdminRoute() {
    const navigate = useNavigate();
    const isLogged = useAuthStore((s) => s.isLogged);
    const isLoading = useAuthStore((s) => s.isLoading);

    // Server-side is_staff check — do not trust localStorage.
    // Only fetch when we know the user is logged in; calling /auth/user/ when
    // isLogged is false would trigger the axios interceptor's token-refresh
    // flow, causing an unwanted redirect to /login for anonymous visitors.
    const { data: serverUser, isLoading: isLoadingMe } = useMe({ enabled: isLogged });

    const isBusy = (isLoading && !isLogged) || (isLogged && isLoadingMe);

    if (isBusy) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" />
            </div>
        );
    }

    if (!isLogged) {
        return (
            <div className={styles.container}>
                <Card className={styles.card}>
                    <div className={styles.content}>
                        <h2>Autenticación requerida</h2>
                        <p>Inicia sesión para acceder a esta página.</p>
                        <div className={styles.buttons}>
                            <Button variant="primary" onClick={() => navigate(ROUTES.login)}>
                                Iniciar sesión
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (!serverUser?.is_staff) {
        return (
            <div className={styles.container}>
                <Card className={styles.card}>
                    <div className={styles.content}>
                        <div className={styles.icon} aria-hidden="true">
                            &#x26D4;
                        </div>
                        <h2>Acceso Denegado</h2>
                        <p>
                            No tienes permiso para acceder a esta área. Se requieren privilegios de
                            administrador.
                        </p>
                        <div className={styles.buttons}>
                            <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
                                Ir al inicio
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return <Outlet />;
}
