/**
 * Pre-configured Axios instance for every request to the Django API.
 *
 * Behavior added on top of vanilla axios:
 *  - `withCredentials: true` so the httpOnly refresh cookie flows automatically
 *    on every request, including the `/auth/token/refresh/` endpoint.
 *  - Reads `csrftoken` cookie and attaches it as `X-CSRFToken` on all
 *    state-changing methods (POST/PUT/PATCH/DELETE) — required by Django's
 *    CSRF middleware when session auth is in use.
 *  - Attaches the active JWT as `Authorization: Bearer ...` on protected routes.
 *  - Skips token attachment for `NO_AUTH_REQUIRED_API_ROUTES` (signup, login, etc).
 *  - Sets `Accept-Language` so backend `LocaleMiddleware` returns the right
 *    translation variant via `django-modeltranslation`.
 *  - Generates and attaches a `X-Request-Id` header per request for distributed
 *    tracing (echoed back by the backend `RequestIdMiddleware`).
 *  - On 401, transparently refreshes the access token and retries the request once.
 *  - On well-known error codes (`LOGOUT_ERROR_CODES`), force-logs the user out.
 *
 * Token refresh races are de-duplicated inside `useAuthStore.getAccessToken()`
 * via a module-level promise gate (FE-2), so concurrent 401s share one refresh.
 */
import axios, { type AxiosResponse, type InternalAxiosRequestConfig, type AxiosError } from 'axios';

import { NO_AUTH_REQUIRED_API_ROUTES, API_ROUTES, LOGOUT_ERROR_CODES } from '@/constants';
import { getLang } from '@/lib/i18n';
import { useAuthStore } from '@/stores/useAuthStore';

/** Read a cookie by name from `document.cookie`. */
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
}

/** HTTP methods that mutate server state and require CSRF protection. */
const CSRF_METHODS = new Set(['post', 'put', 'patch', 'delete']);

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/',
    // Required so the httpOnly refresh cookie is sent on every request,
    // including /auth/token/refresh/ which reads it from the cookie instead
    // of the request body.
    withCredentials: true,
});

/**
 * Request interceptor — sets language header, attaches CSRF token for
 * state-changing requests, generates a per-request trace ID, and
 * conditionally attaches the JWT access token. Public routes
 * (auth/signup/reset) opt out via `NO_AUTH_REQUIRED_API_ROUTES` so we
 * never leak a Bearer token to endpoints that don't need it.
 */
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const url = config.url || '';
        const method = (config.method || 'get').toLowerCase();

        const isNoAuth = NO_AUTH_REQUIRED_API_ROUTES.some(
            (route) => url === route || url.startsWith(route.replace(/\/$/, '/')),
        );

        // Accept-Language for Django modeltranslation
        config.headers['Accept-Language'] = getLang();

        // X-Request-Id for distributed tracing — crypto.randomUUID is a CSPRNG.
        // The fallback uses a timestamp (non-random) only when crypto is unavailable.
        if (!config.headers['X-Request-Id']) {
            config.headers['X-Request-Id'] =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${Date.now().toString(36)}-${String(performance.now()).replace('.', '')}`;
        }

        // CSRF token — attach on mutating methods so Django's CsrfViewMiddleware
        // accepts the request even when the session cookie is present.
        if (CSRF_METHODS.has(method)) {
            const csrfToken = getCookie('csrftoken');
            if (csrfToken) {
                config.headers['X-CSRFToken'] = csrfToken;
            }
        }

        if (isNoAuth) {
            return config;
        }

        const token = await useAuthStore.getState().getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

/**
 * Response interceptor — handles transparent token refresh on 401 and
 * forced-logout for known terminal error codes.
 *
 * 401 flow:
 *  1. If the backend returned a `LOGOUT_ERROR_CODES` value (e.g. account
 *     deleted, password rotated), log the user out and reject — no retry.
 *  2. Otherwise call `getAccessToken()` which either returns the still-valid
 *     token, performs a refresh (cookie-based, no body), or returns undefined
 *     (then logs out with a toast + redirect to /login).
 *  3. Replay the original request with the new bearer.
 *
 * The refresh endpoint itself is excluded from the retry path to avoid
 * recursion if refresh fails with 401.
 */
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError) => {
        const { response, config: originalRequest } = error;

        if (!response || !originalRequest) {
            throw error;
        }

        const { status } = response;
        const { logOut, getAccessToken } = useAuthStore.getState();

        // 503 - Maintenance
        if (status === 503) {
            throw error;
        }

        // 401 - Unauthorized
        if (status === 401) {
            const errorCode =
                (response.data as Record<string, Record<string, string>>)?.code?.message || '';

            if (LOGOUT_ERROR_CODES.includes(errorCode)) {
                void logOut();
                throw error;
            }

            const reqUrl = originalRequest.url || '';
            const isNoAuthRoute = NO_AUTH_REQUIRED_API_ROUTES.some(
                (route) => reqUrl === route || reqUrl.startsWith(route.replace(/\/$/, '/')),
            );
            const shouldAttemptRefresh =
                !isNoAuthRoute && originalRequest.url !== API_ROUTES.refresh;

            if (shouldAttemptRefresh) {
                try {
                    // FE-2: getAccessToken() already has a module-level promise gate
                    // so concurrent 401 retries all share one in-flight refresh.
                    const newToken = await getAccessToken();
                    if (newToken) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api(originalRequest);
                    }
                } catch {
                    void logOut();
                }
            }
        }

        throw error;
    },
);
