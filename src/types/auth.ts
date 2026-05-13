/**
 * Authentication request/response shapes and the discriminated `AuthResult`
 * union returned by `useAuthStore.logIn`. Anything that talks to `/auth/*`
 * endpoints should consume types from this module so request bodies, error
 * envelopes, and store action signatures stay aligned with the backend.
 */
// ============================================
// User
// ============================================
// Canonical user types live in @/types/user. Re-exported for backwards-compat.
export type { AuthUser as User, UserDetails } from './user';
import type { AuthUser } from './user';

// ============================================
// Auth Results
// ============================================

export type AuthResult =
    | 'success'
    | 'confirm_email'
    | 'go2fa'
    | 'otp_fail'
    | 'wrong_data'
    | 'reset_psw'
    | 'account_block'
    | 'invalid'
    | 'error';

// ============================================
// Request Payloads
// ============================================

export interface LoginRequest {
    email: string;
    password: string;
    googlecode?: string;
}

export interface SignupRequest {
    email: string;
    password1: string;
    password2: string;
    username?: string;
    captcha_response?: string;
}

export interface ResetPasswordRequest {
    email: string;
    captcha?: string;
}

export interface ResetPasswordConfirmRequest {
    uid: string;
    token: string;
    new_password1: string;
    new_password2: string;
}

export interface ChangePasswordRequest {
    old_password: string;
    new_password1: string;
    new_password2: string;
}

// ============================================
// Response Payloads
// ============================================

export interface LoginResponse {
    access: string;
    refresh: string;
    user: AuthUser;
}

export interface LoginErrorResponse {
    message?: string[];
    type?: string[];
    token?: string[];
}

export interface TokenResponse {
    access: string;
    refresh: string;
}

export interface GoogleLoginRequest {
    access_token?: string;
    code?: string;
    id_token?: string;
}

export interface ConfirmEmailResponse {
    detail: string;
    access?: string;
    refresh?: string;
    user?: AuthUser;
    access_expiration?: string;
    refresh_expiration?: string;
}
