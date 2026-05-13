/**
 * Integration tests for useAuthStore. Hits MSW-mocked /auth/* endpoints —
 * verifies the store's contract with the real backend shape (LoginResponse,
 * not a hand-rolled mock). When the backend response changes, these break first.
 *
 * Post-cookie-migration contract:
 *  - Access token is written to localStorage (for reload detection).
 *  - Refresh token is an httpOnly cookie — the frontend NEVER writes it to localStorage.
 *  - logOut() must call queryClient.clear() so server-state cache is wiped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storage';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/useAuthStore';

const noOp2FA = () => {};

describe('useAuthStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset store between tests so isLogged / token state doesn't leak.
        useAuthStore.setState({
            isLogged: false,
            isLoading: false,
            confirmEmailToken: null,
            _accessToken: null,
        });
    });

    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('logs in successfully and persists access token (not refresh)', async () => {
        const result = await useAuthStore
            .getState()
            .logIn({ email: 'user@example.com', password: 'pw' }, noOp2FA);
        expect(result).toBe('success');
        expect(useAuthStore.getState().isLogged).toBe(true);
        // Access token: stored in localStorage for reload detection
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('test-access-token');
        // Refresh token: httpOnly cookie — frontend must NOT write it to localStorage
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
        const user = useAuthStore.getState().getUser();
        expect(user?.email).toBe('user@example.com');
    });

    it('reports wrong_data on bad credentials', async () => {
        const result = await useAuthStore
            .getState()
            .logIn({ email: 'fail@example.com', password: 'pw' }, noOp2FA);
        expect(result).toBe('wrong_data');
        expect(useAuthStore.getState().isLogged).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    });

    it('logs out, clears tokens, and clears queryClient cache', async () => {
        // Spy on queryClient.clear
        const clearSpy = vi.spyOn(queryClient, 'clear');

        await useAuthStore.getState().logIn({ email: 'user@example.com', password: 'pw' }, noOp2FA);
        expect(useAuthStore.getState().isLogged).toBe(true);

        await useAuthStore.getState().logOut();
        expect(useAuthStore.getState().isLogged).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
        expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
        // queryClient.clear() must be called on logout
        expect(clearSpy).toHaveBeenCalledOnce();
    });

    it('in-memory _accessToken is not separately written to localStorage as REFRESH_TOKEN', async () => {
        await useAuthStore.getState().logIn({ email: 'user@example.com', password: 'pw' }, noOp2FA);
        // The store holds access token in-memory via _accessToken; it should
        // NOT appear as REFRESH_TOKEN in localStorage.
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
        // The in-memory value should equal the access token from the response
        expect(useAuthStore.getState()._accessToken).toBe('test-access-token');
    });
});
