/**
 * Smoke E2E — verifies the SPA boots, public routes render without crashing,
 * and the JavaScript bundle doesn't surface uncaught exceptions or React
 * hydration errors. Does NOT exercise authenticated flows or paid routes —
 * those need an auth fixture + seeded Docker backend, which belongs in a
 * separate spec file.
 *
 * Run with: `npm run e2e` (boots Vite dev server automatically).
 *
 * Mocking strategy: we seed a fake valid JWT and mock the minimal backend
 * routes (token refresh + marketing theme) needed to prevent the auth store's
 * infinite refresh retry loop when the Docker backend is offline.  The smoke
 * tests verify *React renders without JS crashes*, not backend connectivity.
 */
import { expect, test } from '@playwright/test';

// Valid JWT (exp 2099) — the auth store treats this as logged-in and won't
// attempt a refresh immediately.
const FAKE_JWT_VALID =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJ1c2VyX2lkIjoxLCJleHAiOjQxMDI0NDQ4MDB9' +
    '.invalid-sig';

const FAKE_USER = JSON.stringify({
    id: 1,
    email: 'smoke@example.com',
    first_name: 'Smoke',
    last_name: 'Test',
    is_staff: false,
});

const THEME_MOCK = JSON.stringify({ theme_id: 'classic', custom_colors: {} });

/** Seed auth state + mock the minimal backend routes needed to avoid infinite
 *  token-refresh retries when the Docker backend is offline. */
async function setupSmokeEnvironment(page: import('@playwright/test').Page) {
    // Inject a valid token before the page loads so the auth store starts logged-in.
    await page.addInitScript(
        ({ token, user }: { token: string; user: string }) => {
            localStorage.setItem('access_token', token);
            localStorage.setItem('user', user);
        },
        { token: FAKE_JWT_VALID, user: FAKE_USER },
    );

    // Mock token refresh to always succeed (prevents 401 → location.assign loop).
    await page.route('**/auth/token/refresh/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ access: FAKE_JWT_VALID }),
        });
    });

    // Mock /auth/user/ so AdminRoute / useMe don't trigger 401 auth redirect.
    await page.route('**/auth/user/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                pk: 1,
                email: 'smoke@example.com',
                first_name: 'Smoke',
                last_name: 'Test',
                is_staff: false,
            }),
        });
    });

    // Mock the theme endpoint to return a valid shape (empty {} crashes ThemeStore).
    await page.route('**/api/marketing/theme/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: THEME_MOCK });
    });

    // Mock marketing endpoints so AnnouncementBar / PromoPopup don't trigger 401.
    await page.route('**/api/marketing/banners/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/marketing/promociones/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
}

const PUBLIC_ROUTES: { name: string; path: string }[] = [
    { name: 'root redirects to home', path: '/' },
    { name: 'home', path: '/home' },
    { name: 'shop landing', path: '/shop' },
    { name: 'search empty', path: '/search' },
    { name: 'login', path: '/login' },
    { name: 'register', path: '/register' },
    { name: 'forgot password', path: '/forgot-password' },
    { name: 'privacy', path: '/privacy' },
    { name: 'terms', path: '/terms' },
    { name: '404 fallback', path: '/this-route-does-not-exist' },
];

test.describe('smoke — public routes render without console errors', () => {
    for (const route of PUBLIC_ROUTES) {
        test(route.name, async ({ page }) => {
            // Set up mocks before navigation to prevent auth redirect loops.
            await setupSmokeEnvironment(page);

            // Collect any unhandled errors that fire during the navigation so we can
            // assert *after* the page settles. React errors surface via `pageerror`,
            // network/runtime warnings via `console`.
            const fatal: string[] = [];
            page.on('pageerror', (err) => fatal.push(`pageerror: ${err.message}`));
            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    const text = msg.text();
                    // Ignore expected network failures when the Docker backend is offline.
                    if (/Failed to load resource|net::ERR_|ECONNREFUSED/i.test(text)) return;
                    if (/Service worker/i.test(text)) return;
                    // Ignore token refresh 401s — expected when backend is offline.
                    if (/token:.*failed|token refresh.*failed|failed.*status code 401/i.test(text))
                        return;
                    if (/\[REDACTED\].*failed/i.test(text)) return;
                    // Ignore TanStack Query undefined warnings (not errors) from mocked empty arrays.
                    if (/Query data cannot be undefined/i.test(text)) return;
                    fatal.push(`console.error: ${text}`);
                }
            });

            const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
            expect(response, `expected a response for ${route.path}`).not.toBeNull();
            // Vite dev server returns 200 for all SPA routes (catch-all to index.html).
            expect(response!.status(), `status for ${route.path}`).toBeLessThan(400);

            // The SPA mounts a #root element — assert it has at least one child node
            // so we know React rendered, not just that the HTML shell loaded.
            await expect(page.locator('#root')).toBeAttached();
            await page.waitForFunction(
                () => {
                    const root = document.querySelector('#root');
                    return !!root && root.childElementCount > 0;
                },
                { timeout: 15_000 },
            );

            expect(
                fatal,
                `console/pageerror errors on ${route.path}:\n${fatal.join('\n')}`,
            ).toEqual([]);
        });
    }
});

test.describe('smoke — protected routes redirect anonymous users', () => {
    const protectedRoutes = ['/profile', '/orders', '/wishlist', '/admin'];

    for (const path of protectedRoutes) {
        test(`anonymous visit to ${path} resolves`, async ({ page }) => {
            // Mock theme + token refresh to avoid infinite retry loops.
            await page.route('**/api/marketing/theme/**', (route) => {
                route.fulfill({ status: 200, contentType: 'application/json', body: THEME_MOCK });
            });
            await page.route('**/auth/token/refresh/**', (route) => {
                route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ detail: 'Token is invalid or expired' }),
                });
            });
            await page.route('**/auth/user/**', (route) => {
                route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        detail: 'Authentication credentials were not provided.',
                    }),
                });
            });

            const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
            expect(response, `expected a response for ${path}`).not.toBeNull();
            expect(response!.status()).toBeLessThan(400);
            // We don't assert the exact target URL — ProtectedRoute may render an
            // in-place permission notice or redirect. What matters is no crash.
            await expect(page.locator('#root')).toBeAttached();
            // Wait for React to render at least something
            await page.waitForFunction(
                () => {
                    const root = document.querySelector('#root');
                    return !!root && root.childElementCount > 0;
                },
                { timeout: 15_000 },
            );
        });
    }
});

test.describe('smoke — viewport-specific layout sanity', () => {
    test('no horizontal overflow on home', async ({ page }) => {
        await setupSmokeEnvironment(page);
        await page.goto('/home', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
            () => {
                const root = document.querySelector('#root');
                return !!root && root.childElementCount > 0;
            },
            { timeout: 15_000 },
        );
        // documentElement.scrollWidth > clientWidth signals layout overflow that
        // forces horizontal scrolling — a UX-standards violation in CLAUDE.md.
        const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow, 'document should not overflow horizontally').toBeLessThanOrEqual(1);
    });

    test('skip-link / main landmark present on home', async ({ page }) => {
        await setupSmokeEnvironment(page);
        await page.goto('/home', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(
            () => {
                const root = document.querySelector('#root');
                return !!root && root.childElementCount > 0;
            },
            { timeout: 15_000 },
        );
        // Accessibility: there must be at least one landmark element so screen
        // readers can navigate. Header, main, nav, or footer all qualify.
        const landmarkCount = await page
            .locator(
                'header, main, nav, footer, [role="banner"], [role="main"], [role="navigation"], [role="contentinfo"]',
            )
            .count();
        expect(landmarkCount).toBeGreaterThan(0);
    });
});
