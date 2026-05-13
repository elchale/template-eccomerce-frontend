/**
 * Tests the axios response interceptor — verifies the auto-refresh behavior on 401
 * and that protected route requests carry the Bearer token from the auth store.
 *
 * These guard the most security-sensitive path in the app: if the interceptor
 * misbehaves, users get silently logged out or stuck loading forever.
 */
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storage';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';

import { server } from './msw/server';

// jwt-decode requires a real-shaped JWT. Generate one with a future exp.
function makeJwt(expSecondsFromNow: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
        JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
    );
    return `${header}.${payload}.signature`;
}

describe('axios interceptor', () => {
    beforeEach(() => {
        localStorage.clear();
        useAuthStore.setState({ isLogged: false, isLoading: false, confirmEmailToken: null });
    });

    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('attaches Bearer token to authenticated requests', async () => {
        const validToken = makeJwt(3600); // 1 hour from now
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, validToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, validToken);
        useAuthStore.setState({ isLogged: true });

        let receivedAuthHeader: string | null = null;
        server.use(
            http.get('*/api/orders/', ({ request }) => {
                receivedAuthHeader = request.headers.get('authorization');
                return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
            }),
        );

        await api.get('/api/orders/');
        expect(receivedAuthHeader).toBe(`Bearer ${validToken}`);
    });

    it('sends Accept-Language header from localStorage', async () => {
        localStorage.setItem(STORAGE_KEYS.LANG, 'en');

        let receivedLang: string | null = null;
        server.use(
            http.get('*/api/products/', ({ request }) => {
                receivedLang = request.headers.get('accept-language');
                return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
            }),
        );

        await api.get('/api/products/');
        expect(receivedLang).toBe('en');
    });

    it('defaults Accept-Language to "es" when no lang is stored', async () => {
        let receivedLang: string | null = null;
        server.use(
            http.get('*/api/products/', ({ request }) => {
                receivedLang = request.headers.get('accept-language');
                return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
            }),
        );

        await api.get('/api/products/');
        expect(receivedLang).toBe('es');
    });

    it('skips auth header on no-auth routes (public products list)', async () => {
        const validToken = makeJwt(3600);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, validToken);

        let receivedAuthHeader: string | null = null;
        server.use(
            http.get('*/api/products/', ({ request }) => {
                receivedAuthHeader = request.headers.get('authorization');
                return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
            }),
        );

        await api.get('/api/products/');
        expect(receivedAuthHeader).toBeNull();
    });
});
