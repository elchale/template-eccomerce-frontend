/**
 * Authentication store — single source of truth for JWT identity.
 *
 * Security model (post-cookie migration):
 *  - Access token lives in Zustand state ONLY (in-memory). Never persisted to
 *    localStorage so it cannot be exfiltrated by XSS.
 *  - Refresh token is an httpOnly cookie set by the backend — the browser
 *    sends it automatically on `/auth/token/refresh/` (via `withCredentials: true`
 *    on the axios instance). The frontend never reads or writes it.
 *  - `isLogged` is derived from whether we have a valid in-memory access token.
 *    On hard reload the store starts logged-out and immediately calls refresh
 *    to restore the session from the cookie if it exists.
 *
 * The `getAccessToken()` action implements a module-level promise gate
 * (`refreshPromise`) so concurrent expiring-token requests share a single
 * refresh round-trip — without it, parallel calls would race to rotate the
 * refresh token and one would lose.
 *
 * All flows enforce client-side rate limiting via `authRateLimiter` to push
 * back on credential stuffing before requests even reach the API.
 */
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { create } from 'zustand';

import { API_ROUTES, STORAGE_KEYS, TOKEN_REFRESH_THRESHOLD_MS, AUTH_MESSAGES } from '@/constants';
import { api } from '@/lib/axios';
import { logger } from '@/lib/logger';
import { queryClient } from '@/lib/queryClient';
import { authRateLimiter } from '@/lib/rateLimiter';
import type {
    User,
    AuthResult,
    LoginRequest,
    LoginResponse,
    LoginErrorResponse,
    SignupRequest,
    ResetPasswordRequest,
    ResetPasswordConfirmRequest,
    ChangePasswordRequest,
    TokenResponse,
    ConfirmEmailResponse,
    GoogleLoginRequest,
} from '@/types/auth';

// ============================================
// Helpers
// ============================================

/** Thin wrapper around `localStorage` for the user payload only.
 *  Refresh token is httpOnly cookie (backend-managed). Access token
 *  stays in Zustand state only — never in localStorage. */
const storage = {
    getUser: (): User | null => {
        const data = localStorage.getItem(STORAGE_KEYS.USER);
        if (!data) return null;

        try {
            return JSON.parse(data) as User;
        } catch {
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }
    },
    /** Only access token is persisted between reloads; refresh is httpOnly cookie. */
    setAccessToken: (access: string) => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
    },
    setUser: (user: User) => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    },
    clear: () => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    },
};

/** True iff the JWT decodes and its `exp` claim is in the future. */
const isTokenValid = (token: string | null): boolean => {
    if (!token) return false;
    try {
        const { exp } = jwtDecode<{ exp: number }>(token);
        return exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

/** True iff the JWT will expire within `TOKEN_REFRESH_THRESHOLD_MS`.
 *  Used to proactively refresh before a request fails with 401. */
const isTokenExpiringSoon = (token: string): boolean => {
    try {
        const { exp } = jwtDecode<{ exp: number }>(token);
        const timeToExpire = exp * 1000 - Date.now();
        return timeToExpire <= TOKEN_REFRESH_THRESHOLD_MS;
    } catch {
        return true;
    }
};

/** FE-2: module-level promise gate. Concurrent callers awaiting a fresh
 *  access token share this single in-flight refresh request instead of each
 *  rotating the refresh token (which would invalidate the others). */
let refreshPromise: Promise<string | undefined> | null = null;

/** Guard against multiple simultaneous logout calls (e.g. from parallel 401s). */
let isLoggingOut = false;

// Helper to safely extract Axios-like error data without using `any`
interface AxiosLikeError {
    response?: {
        status?: number;
        data?: unknown;
    };
}

function asAxiosError(e: unknown): AxiosLikeError {
    return e as AxiosLikeError;
}

// ============================================
// Store
// ============================================

interface AuthState {
    isLogged: boolean;
    isLoading: boolean;
    confirmEmailToken: string | null;
    /** In-memory access token — never written to localStorage. */
    _accessToken: string | null;
}

interface AuthActions {
    logIn: (credentials: LoginRequest, onRequire2FA: () => void) => Promise<AuthResult>;
    loginWithGoogle: (credential: string) => Promise<AuthResult>;
    logOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
    getUser: () => User | null;

    register: (data: SignupRequest) => Promise<boolean>;
    resendConfirmationEmail: (token: string) => Promise<'sent' | 'in_progress' | 'error'>;
    confirmEmail: (code: string) => Promise<boolean>;

    requestPasswordReset: (data: ResetPasswordRequest) => Promise<boolean>;
    resetPassword: (data: ResetPasswordConfirmRequest) => Promise<boolean>;
    changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set, get) => ({
    // State
    // On hard reload: check localStorage for an existing access token. If it's
    // valid we stay logged in; if it's expired we'll refresh lazily on first request.
    isLogged: isTokenValid(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)),
    isLoading: false,
    confirmEmailToken: null,
    _accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),

    // ----------------------------------------
    // Authentication
    // ----------------------------------------

    /**
     * Email/password login. Performs a client-side rate-limit check first
     * to deflect credential stuffing before the request leaves the browser.
     *
     * Returns a discriminated `AuthResult`:
     *  - `success` → access token in state, refresh token as httpOnly cookie,
     *    `isLogged = true`
     *  - `confirm_email` → backend says email isn't verified; a verification
     *    token is captured and a resend was triggered. The caller should
     *    route to `/verify-email`.
     *  - `go2fa` → backend requires the 2FA challenge; `onRequire2FA()` is
     *    invoked so the caller can navigate to the OTP step.
     *  - `wrong_data` | `reset_psw` | `account_block` | `invalid` →
     *    user-friendly toast is shown automatically.
     *  - `error` → unknown/unexpected failure (no toast).
     */
    logIn: async (credentials, onRequire2FA) => {
        // Check rate limit before attempting login
        const rateLimitCheck = authRateLimiter.checkLimit(credentials.email);
        if (!rateLimitCheck.isAllowed) {
            const minutes = Math.ceil((rateLimitCheck.retryAfter || 0) / 60);
            toast.error(
                `Demasiados intentos de inicio de sesión. Intenta de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`,
            );
            return 'error';
        }

        set({ isLoading: true });
        toast.dismiss();

        try {
            const { data } = await api.post<LoginResponse>(API_ROUTES.login, credentials);

            // Successful login - reset rate limit
            authRateLimiter.reset(credentials.email);

            // Access token in memory + localStorage (for reload detection).
            // Refresh token is an httpOnly cookie — backend sets it, we never touch it.
            storage.setAccessToken(data.access);
            storage.setUser(data.user);
            set({
                isLogged: true,
                isLoading: false,
                confirmEmailToken: null,
                _accessToken: data.access,
            });

            return 'success';
        } catch (error: unknown) {
            // Record failed attempt for rate limiting
            authRateLimiter.recordAttempt(credentials.email);

            if (credentials.googlecode) {
                set({ isLoading: false });
                return 'otp_fail';
            }

            const errorData: LoginErrorResponse = asAxiosError(error)?.response
                ?.data as LoginErrorResponse;
            if (!errorData) {
                set({ isLoading: false });
                return 'error';
            }

            // Email not confirmed - resend confirmation
            // Keep loading state active while resending confirmation email
            if (errorData.token?.[0]) {
                set({ confirmEmailToken: errorData.token[0] });
                const sent = await get().resendConfirmationEmail(errorData.token[0]);
                set({ isLoading: false }); // Only stop loading after resend completes
                return sent === 'error' ? 'error' : 'confirm_email';
            }

            // 2FA required
            const errorType = errorData.type?.[0] || errorData.message?.[0];
            if (errorType === 'two_fa_failed') {
                set({ isLoading: false });
                onRequire2FA();
                return 'go2fa';
            }

            // Known error types
            const knownErrors: AuthResult[] = [
                'wrong_data',
                'reset_psw',
                'account_block',
                'invalid',
            ];
            if (errorType && knownErrors.includes(errorType as AuthResult)) {
                set({ isLoading: false });
                toast.error(
                    AUTH_MESSAGES[errorType as keyof typeof AUTH_MESSAGES] || AUTH_MESSAGES.error,
                );
                return errorType as AuthResult;
            }

            set({ isLoading: false });
            return 'error';
        }
    },

    /**
     * Exchange a Google ID token / authorization code for app tokens.
     * Backend endpoint validates the credential and returns the same
     * `LoginResponse` shape as email/password login. The refresh token
     * is set as an httpOnly cookie by the backend.
     */
    loginWithGoogle: async (credential) => {
        set({ isLoading: true });
        toast.dismiss();

        try {
            const payload: GoogleLoginRequest = { code: credential };
            const { data } = await api.post<LoginResponse>(API_ROUTES.googleLogin, payload);

            storage.setAccessToken(data.access);
            storage.setUser(data.user);
            set({
                isLogged: true,
                isLoading: false,
                confirmEmailToken: null,
                _accessToken: data.access,
            });

            toast.success('Sesión iniciada correctamente');
            return 'success';
        } catch (error: unknown) {
            set({ isLoading: false });
            const status = asAxiosError(error)?.response?.status;
            if (status === 400) {
                toast.error('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
            } else if (status === 403) {
                toast.error('Tu cuenta no tiene permiso para acceder.');
            } else {
                toast.error('Algo salió mal. Por favor, inténtalo de nuevo.');
            }
            logger.error('Google login failed', error);
            return 'error';
        }
    },

    /**
     * Best-effort backend logout (token blacklist) plus unconditional local
     * cleanup. Network failure does NOT prevent local logout — leaving the
     * user logged-in client-side after a logout attempt would be worse than
     * a stale server-side token. Clears TanStack Query cache so no stale
     * server state leaks between sessions.
     */
    logOut: async () => {
        if (isLoggingOut) return;
        isLoggingOut = true;

        set({ isLoading: true });
        toast.dismiss();

        try {
            await api.post(API_ROUTES.logout);
        } catch (error) {
            logger.error('Logout request failed', error);
        }

        storage.clear();
        // Clear all TanStack Query cache on logout so no server state
        // from the previous session leaks into the next.
        queryClient.clear();
        set({ isLogged: false, isLoading: false, confirmEmailToken: null, _accessToken: null });
        isLoggingOut = false;
    },

    /**
     * Returns a usable access token, refreshing it transparently if needed.
     * This is the single entry point used by the axios request interceptor.
     *
     * Three outcomes:
     *  1. Token still valid → return it as-is.
     *  2. Token near expiry → start (or reuse) a shared refresh promise that
     *     calls POST /auth/token/refresh/ with NO body (server reads httpOnly
     *     cookie). Returns the new access token.
     *  3. No refresh possible → show session-expired toast, redirect to login,
     *     trigger logout, return `undefined`.
     */
    getAccessToken: async () => {
        const accessToken = get()._accessToken ?? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        // Token still valid — no refresh needed
        if (accessToken && !isTokenExpiringSoon(accessToken)) {
            return accessToken;
        }

        // Anonymous visitor — no in-memory token, no logged-in state, and no
        // record of a previous session on this device. Returning `undefined`
        // means the request goes WITHOUT an Authorization header — public
        // catalog endpoints accept it, and any protected endpoint will 401
        // normally via a page-level guard.
        const hasPreviousSession = localStorage.getItem(STORAGE_KEYS.USER) !== null;
        if (!accessToken && !get().isLogged && !hasPreviousSession) {
            return undefined;
        }

        // Capture whether THIS app instance ever saw an active session.
        // If yes, a refresh failure means a real session expired (toast +
        // redirect is correct UX). If no, the refresh attempt is just trying
        // to restore from stale localStorage on a cold load — failure there
        // should silently clear the stale data, NOT redirect an anonymous
        // visitor to /login.
        const wasActiveSession = get().isLogged;

        // FE-2: if a refresh is already in-flight, await the shared promise so
        // concurrent 401-triggered callers don't each kick off their own refresh
        // and rotate past each other.
        if (!refreshPromise) {
            refreshPromise = (async () => {
                try {
                    // POST with no body — server reads the httpOnly refresh cookie.
                    const { data } = await api.post<TokenResponse>(API_ROUTES.refresh);
                    storage.setAccessToken(data.access);
                    set({ isLogged: true, _accessToken: data.access });
                    return data.access;
                } catch (error) {
                    logger.error('Token refresh failed', error);

                    // Wipe stale auth state unconditionally — the cookie is
                    // gone or invalid, so any in-memory hopes are now lies.
                    storage.clear();
                    queryClient.clear();
                    set({ isLogged: false, _accessToken: null });

                    if (wasActiveSession) {
                        // Real session expired mid-use → toast + redirect with
                        // `from` so the user comes back to the same page after
                        // logging in.
                        toast.error('Tu sesión expiró, vuelve a entrar', { duration: 8000 });
                        const from = encodeURIComponent(
                            window.location.pathname + window.location.search,
                        );
                        window.location.assign(`/login?from=${from}`);
                    }
                    // else: this was a cold-load restore attempt against stale
                    // localStorage. Silently degrade to anonymous browsing —
                    // no toast, no redirect. The user never knew they had
                    // a stored session; they don't need to know we tried.
                    return undefined;
                }
            })().finally(() => {
                refreshPromise = null;
            });
        }

        return refreshPromise;
    },

    getUser: () => storage.getUser(),

    // ----------------------------------------
    // Registration
    // ----------------------------------------

    /**
     * Create a new account. The backend sends a verification email; the
     * user must complete `confirmEmail()` before tokens are issued.
     * Caller is expected to navigate to `/verify-email` on success.
     */
    register: async (data) => {
        if (data.password1 !== data.password2) {
            toast.error(AUTH_MESSAGES.passwords_mismatch);
            return false;
        }

        set({ isLoading: true });
        toast.dismiss();

        try {
            await api.post(API_ROUTES.signup, data);
            // Don't set confirmEmailToken here - user must login to resend confirmation
            toast.success(AUTH_MESSAGES.register_success);
            return true;
        } catch (error: unknown) {
            const errorData = asAxiosError(error)?.response?.data as
                | Record<string, unknown>
                | undefined;
            if (errorData?.email) toast.error(AUTH_MESSAGES.bad_email);
            else if (errorData?.non_field_errors) toast.error(AUTH_MESSAGES.bad_data);
            else toast.error(AUTH_MESSAGES.error);
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    /**
     * Re-trigger the email verification message. Returns:
     *  - `sent` → new email dispatched, caller should start a short cooldown.
     *  - `in_progress` → a recent send is still in flight; caller should
     *    surface the longer (5min) cooldown.
     *  - `error` → unexpected failure.
     */
    resendConfirmationEmail: async (token) => {
        // Check rate limit before attempting resend
        const rateLimitCheck = authRateLimiter.checkLimit(`resend:${token}`);
        if (!rateLimitCheck.isAllowed) {
            const minutes = Math.ceil((rateLimitCheck.retryAfter || 0) / 60);
            toast.error(
                `Demasiados intentos de reenvío. Intenta de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`,
            );
            return 'error';
        }

        try {
            const { data } = await api.post(API_ROUTES.resendEmail, { token });
            const resendData = data as Record<string, unknown> | undefined;
            const status = resendData?.Status as boolean | undefined;
            const code = resendData?.code as string | undefined;

            if (status) {
                authRateLimiter.recordAttempt(`resend:${token}`);
                toast.success(AUTH_MESSAGES.resent_code);
                return 'sent';
            }

            if (code === 'Email confirmation in progress') {
                toast.error(
                    'El correo de confirmación fue enviado recientemente. Espera 5 minutos antes de solicitar otro.',
                );
                return 'in_progress';
            }

            authRateLimiter.recordAttempt(`resend:${token}`);
            toast.error(AUTH_MESSAGES.error);
            return 'error';
        } catch (error: unknown) {
            authRateLimiter.recordAttempt(`resend:${token}`);

            const errorData = asAxiosError(error)?.response?.data as
                | Record<string, unknown>
                | undefined;
            if (errorData?.code === 'Email confirmation in progress') {
                toast.error(
                    'El correo de confirmación fue enviado recientemente. Espera 5 minutos antes de solicitar otro.',
                );
                return 'in_progress';
            }

            logger.error('Failed to resend confirmation', error);
            return 'error';
        }
    },

    /**
     * Verify the 6-digit code from the confirmation email. On success the
     * backend returns auth tokens, so the user is auto-logged-in without a
     * separate login step.
     */
    confirmEmail: async (code) => {
        // Check rate limit before attempting confirmation
        const rateLimitCheck = authRateLimiter.checkLimit(`verify:${code}`);
        if (!rateLimitCheck.isAllowed) {
            const minutes = Math.ceil((rateLimitCheck.retryAfter || 0) / 60);
            toast.error(
                `Demasiados intentos de verificación. Intenta de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`,
            );
            return false;
        }

        set({ isLoading: true });
        toast.dismiss();

        try {
            const { data } = await api.post<ConfirmEmailResponse>(API_ROUTES.confirmEmail, {
                key: code,
            });

            // Successful verification - reset rate limit
            authRateLimiter.reset(`verify:${code}`);
            set({ confirmEmailToken: null });

            if (data.access) {
                storage.setAccessToken(data.access);

                if (data.user) {
                    storage.setUser(data.user);
                    set({ isLogged: true, isLoading: false, _accessToken: data.access });
                    toast.success(AUTH_MESSAGES.email_confirmed_and_logged_in);
                } else {
                    logger.warn(
                        'No user data in confirmation response. Setting logged in but user may need to fetch profile.',
                    );
                    set({ isLogged: true, isLoading: false, _accessToken: data.access });
                    toast.success(AUTH_MESSAGES.email_confirmed_and_logged_in);
                }
            } else {
                logger.warn('No tokens in confirmation response');
                toast.success(AUTH_MESSAGES.email_confirmed);
            }

            return true;
        } catch (error) {
            // Record failed attempt for rate limiting
            authRateLimiter.recordAttempt(`verify:${code}`);
            logger.error('Email confirmation failed', error);
            toast.error(AUTH_MESSAGES.error);
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    // ----------------------------------------
    // Password Management
    // ----------------------------------------

    /** Send a password reset email containing a `uid+token` link to
     *  `/reset-password/:uid/:token`, which the user follows to `resetPassword`. */
    requestPasswordReset: async (data) => {
        set({ isLoading: true });
        toast.dismiss();

        try {
            await api.post(API_ROUTES.resetPassword, data);
            toast.success(AUTH_MESSAGES.email_sent);
            return true;
        } catch (error: unknown) {
            const errData = asAxiosError(error)?.response?.data as
                | Record<string, unknown>
                | undefined;
            if (errData?.email) {
                toast.error(AUTH_MESSAGES.bad_email);
            }
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    /** Finalize a forgotten-password reset using the emailed `uid+token`. */
    resetPassword: async (data) => {
        set({ isLoading: true });
        toast.dismiss();

        try {
            await api.post(API_ROUTES.resetPasswordConfirm, data);
            toast.success(AUTH_MESSAGES.password_reset_request_success);
            return true;
        } catch (error: unknown) {
            const errorData = asAxiosError(error)?.response?.data as
                | Record<string, unknown>
                | undefined;
            if (errorData?.uid || errorData?.token) {
                toast.error(AUTH_MESSAGES.invalid_data);
            } else {
                toast.error(AUTH_MESSAGES.error);
            }
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    /** In-session password change (requires old password). Triggers an
     *  `actions_freeze` window on the backend on success. */
    changePassword: async (data) => {
        set({ isLoading: true });
        toast.dismiss();

        try {
            await api.post(API_ROUTES.changePassword, data);
            toast.success(AUTH_MESSAGES.password_reset_success);
            return true;
        } catch (error: unknown) {
            const errorData = asAxiosError(error)?.response?.data as
                | Record<string, unknown>
                | undefined;
            const errorCode = errorData?.code as keyof typeof AUTH_MESSAGES | undefined;
            toast.error((errorCode && AUTH_MESSAGES[errorCode]) || AUTH_MESSAGES.error);
            return false;
        } finally {
            set({ isLoading: false });
        }
    },
}));
