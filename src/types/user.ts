/**
 * Canonical user entity used across auth, profile, and admin endpoints.
 *
 * All user-shaped responses (login, /api/auth/profile/, etc.) MUST return a subset of this
 * shape. Pick<User, ...> in endpoint-specific response types if narrower.
 */
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_active: boolean;
    actions_freezed_till?: string;
}

/**
 * Shape returned by `/auth/login/` and `/auth/registration/` — backend omits a few admin-only fields.
 */
export type AuthUser = Pick<
    User,
    'username' | 'email' | 'first_name' | 'last_name' | 'is_staff'
> & {
    actions_freezed_till?: string;
};

// Legacy alias — keep until all consumers migrate.
export type UserDetails = AuthUser;
export type UserProfile = User;
