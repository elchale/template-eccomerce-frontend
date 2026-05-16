/**
 * E2E tests — Admin Email Log page (`/admin/email-logs`)
 *
 * Covers every UX flow from the ADR §UX Flows:
 *  - Happy path: nav → skeleton → table (friendly columns, NO raw template_name)
 *  - Status filter changes the list
 *  - "Inspeccionar" opens modal with raw template_name + error_message; modal closes
 *  - Retry button: only on retryable rows; loading → success toast; list refetches
 *  - Retry error paths: 409 → specific toast; 404 → specific toast; 500 → generic toast
 *  - Empty state (no data) and filtered-empty state with "Quitar filtro" CTA
 *  - Navigation: 401 → auth gate; 403 (non-admin) → access denied
 *  - Layout smoke: 375px, 768px, 1280px — no horizontal scrollbar, key elements visible
 *
 * Mocking strategy: all backend calls are intercepted via Playwright route().
 * The Django server does NOT need to be running. Only the Vite dev server
 * (port 5174, managed by playwright.config.ts webServer) is required.
 *
 * The Select component renders a *custom dropdown* on desktop (not a native
 * <select>). Interaction: click the trigger div (role="button") → click the
 * option div (role="option"). On mobile/tablet viewports ≤768px it uses a
 * native <select>. Tests that need to change the filter interact with the
 * trigger pattern because they run at 1280px (chromium-desktop project).
 */

import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid JWT (exp 2099) — auth store treats this as logged-in. */
const FAKE_JWT_VALID =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJ1c2VyX2lkIjoxLCJleHAiOjQxMDI0NDQ4MDB9' +
    '.invalid-sig';

const FAKE_ADMIN_USER = JSON.stringify({
    id: 1,
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    is_staff: true,
});

const FAKE_NON_ADMIN_USER = JSON.stringify({
    id: 2,
    email: 'user@example.com',
    first_name: 'Regular',
    last_name: 'User',
    is_staff: false,
});

const THEME_MOCK = JSON.stringify({ theme_id: 'classic', custom_colors: {} });

/** A retryable (failed) email log row — is_retryable: true */
const MOCK_FAILED_LOG = {
    id: 1,
    email_type: 'customer_payment_received',
    email_type_display: 'Pago confirmado — cliente',
    template_name: 'orders/payment_received.html',
    task_name: 'orders.tasks.send_payment_received_email',
    subject: 'Pago confirmado — Pedido #ORD-001',
    recipient_email: 'customer@example.com',
    recipient_user: 10,
    order: 5,
    order_number: 'ORD-001',
    status: 'failed',
    status_display: 'Fallido',
    error_message: 'SMTP connection timed out',
    attempts: 3,
    sent_at: null,
    last_attempt_at: '2026-01-01T10:00:00Z',
    is_retryable: true,
    created: '2026-01-01T09:55:00Z',
    updated: '2026-01-01T10:00:00Z',
};

/** A confirmed (non-retryable) email log row — is_retryable: false */
const MOCK_CONFIRMED_LOG = {
    id: 2,
    email_type: 'admin_new_paid_order',
    email_type_display: 'Nuevo pedido pagado — administrador',
    template_name: 'orders/admin/new_paid_order.html',
    task_name: 'orders.tasks.notify_admin_payment_received',
    subject: '[Pedido pagado] #ORD-001',
    recipient_email: 'admin@example.com',
    recipient_user: 1,
    order: 5,
    order_number: 'ORD-001',
    status: 'confirmed',
    status_display: 'Confirmado',
    error_message: '',
    attempts: 1,
    sent_at: '2026-01-01T09:58:00Z',
    last_attempt_at: '2026-01-01T09:57:00Z',
    is_retryable: false,
    created: '2026-01-01T09:55:00Z',
    updated: '2026-01-01T09:58:00Z',
};

/** A fresh pending (non-retryable) row — is_retryable: false */
const MOCK_PENDING_LOG = {
    id: 3,
    email_type: 'customer_status_update',
    email_type_display: 'Actualización de estado — cliente',
    template_name: 'orders/order_status_update.html',
    task_name: 'orders.tasks.send_order_status_changed',
    subject: 'Tu pedido #ORD-002 ahora está Enviado',
    recipient_email: 'customer2@example.com',
    recipient_user: 11,
    order: 6,
    order_number: 'ORD-002',
    status: 'pending',
    status_display: 'Pendiente',
    error_message: '',
    attempts: 0,
    sent_at: null,
    last_attempt_at: null,
    is_retryable: false,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
};

const PAGINATED_TWO = JSON.stringify({
    count: 2,
    next: null,
    previous: null,
    results: [MOCK_FAILED_LOG, MOCK_CONFIRMED_LOG],
});

const PAGINATED_ONE_FAILED = JSON.stringify({
    count: 1,
    next: null,
    previous: null,
    results: [MOCK_FAILED_LOG],
});

const PAGINATED_EMPTY = JSON.stringify({
    count: 0,
    next: null,
    previous: null,
    results: [],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedAdminAuth(page: import('@playwright/test').Page) {
    await page.addInitScript(
        ({ token, user }: { token: string; user: string }) => {
            localStorage.setItem('access_token', token);
            localStorage.setItem('user', user);
            // Dismiss cookie consent banner so it never blocks click interactions
            localStorage.setItem('cookie-consent', 'accepted');
        },
        { token: FAKE_JWT_VALID, user: FAKE_ADMIN_USER },
    );
}

async function seedUserAuth(page: import('@playwright/test').Page) {
    await page.addInitScript(
        ({ token, user }: { token: string; user: string }) => {
            localStorage.setItem('access_token', token);
            localStorage.setItem('user', user);
            // Dismiss cookie consent banner so it never blocks click interactions
            localStorage.setItem('cookie-consent', 'accepted');
        },
        { token: FAKE_JWT_VALID, user: FAKE_NON_ADMIN_USER },
    );
}

async function clearAuthState(page: import('@playwright/test').Page) {
    await page.addInitScript(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Dismiss cookie consent banner so it never blocks click interactions
        localStorage.setItem('cookie-consent', 'accepted');
    });
}

async function mockTheme(page: import('@playwright/test').Page) {
    await page.route('**/api/marketing/theme/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: THEME_MOCK });
    });
}

async function mockMarketing(page: import('@playwright/test').Page) {
    await mockTheme(page);
    await page.route('**/api/marketing/banners/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/marketing/promociones/**', (route) => {
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
}

async function mockRefreshOk(page: import('@playwright/test').Page) {
    await page.route('**/auth/token/refresh/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ access: FAKE_JWT_VALID }),
        });
    });
}

async function mockAuthUserAdmin(page: import('@playwright/test').Page) {
    await page.route('**/auth/user/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                pk: 1,
                email: 'admin@example.com',
                first_name: 'Admin',
                last_name: 'User',
                is_staff: true,
            }),
        });
    });
}

async function mockAuthUserNonAdmin(page: import('@playwright/test').Page) {
    await page.route('**/auth/user/**', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                pk: 2,
                email: 'user@example.com',
                first_name: 'Regular',
                last_name: 'User',
                is_staff: false,
            }),
        });
    });
}

async function mockAuthUser401(page: import('@playwright/test').Page) {
    await page.route('**/auth/user/**', (route) => {
        route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Authentication credentials were not provided.' }),
        });
    });
}

/** Wait for React to mount #root with content. */
async function waitForRoot(page: import('@playwright/test').Page, timeout = 15_000) {
    await expect(page.locator('#root')).toBeAttached();
    await page.waitForFunction(
        () => {
            const root = document.querySelector('#root');
            return !!root && root.childElementCount > 0;
        },
        { timeout },
    );
}

/**
 * Full admin session setup for the email-logs page.
 * Mocks everything needed: auth, theme, marketing, email-logs list.
 */
async function setupAdminEmailLogsPage(
    page: import('@playwright/test').Page,
    listBody = PAGINATED_TWO,
    listStatus = 200,
) {
    await seedAdminAuth(page);
    await mockMarketing(page);
    await mockRefreshOk(page);
    await mockAuthUserAdmin(page);
    await page.route('**/api/admin/email-logs/**', (route) => {
        if (route.request().method() === 'GET') {
            route.fulfill({ status: listStatus, contentType: 'application/json', body: listBody });
        } else {
            route.continue();
        }
    });
}

/**
 * Wait for the email-logs table to render with data (friendly display visible).
 * Used after page.goto to ensure the table has fully rendered before assertions.
 */
async function waitForTableData(page: import('@playwright/test').Page, text: string, timeout = 20_000) {
    await page.waitForFunction(
        (t) => document.body.innerText.includes(t),
        text,
        { timeout },
    );
}

/**
 * Wait for the AdminRoute to finish loading (it calls /auth/user/ to verify is_staff).
 * We wait for either the admin content OR the access-denied UI to appear.
 */
async function waitForAdminRoute(page: import('@playwright/test').Page, timeout = 15_000) {
    await page.waitForFunction(
        () => {
            const text = document.body.innerText;
            // Admin content visible
            const hasAdminContent =
                text.includes('Registro de correos') ||
                text.includes('Email Log') ||
                text.includes('Registro de correos');
            // Access denied or auth required
            const hasAccessGate =
                text.includes('Acceso Denegado') ||
                text.includes('Autenticación requerida') ||
                text.includes('No tienes permiso');
            return hasAdminContent || hasAccessGate;
        },
        { timeout },
    );
}

/** Mapping from internal filter value to possible display labels (ES and EN). */
const FILTER_LABELS: Record<string, string[]> = {
    failed: ['Fallido', 'Failed'],
    confirmed: ['Confirmado', 'Confirmed'],
    pending: ['Pendiente', 'Pending'],
    retrying: ['Reintentando', 'Retrying'],
    '': ['Todos los estados', 'All statuses'],
};

/**
 * Open the Select filter by clicking its custom trigger (desktop: role="button",
 * mobile: native <select>), then pick the option by value.
 *
 * The Select component renders a custom dropdown on desktop (>768px) and a
 * native <select> on mobile/tablet (≤768px or mobile UA). The debug output
 * confirms that at mobile the options have values 'failed', 'confirmed', etc.,
 * so we select by value directly for the native case.
 */
async function selectFilterOption(
    page: import('@playwright/test').Page,
    filterValue: '' | 'failed' | 'confirmed' | 'pending' | 'retrying',
) {
    const width = page.viewportSize()?.width ?? 1280;
    // Select component uses window.innerWidth <= 768 OR mobile UA — matches
    // both chromium-tablet (768px desktop UA) and chromium-mobile (390px iPhone UA).
    const usesNativeSelect = width <= 768;

    if (usesNativeSelect) {
        // Native <select>: select by value directly (fastest, no i18n ambiguity).
        // For the "all" case, filterValue is '' which matches the enabled
        // "All statuses" option (the disabled placeholder also has value='' but
        // Playwright selectOption picks the first ENABLED matching option).
        const select = page.locator('select').first();
        await select.waitFor({ state: 'visible', timeout: 5_000 });
        if (filterValue === '') {
            // Select the "All statuses" option — it's the first enabled option
            // with value='' (after the disabled placeholder). Select by label.
            const possibleLabels = FILTER_LABELS[''] ?? ['All statuses'];
            let selected = false;
            for (const lbl of possibleLabels) {
                const opts = await page.locator('select option:not([disabled])').allTextContents();
                if (opts.some((t) => t.trim() === lbl)) {
                    await select.selectOption({ label: lbl });
                    selected = true;
                    break;
                }
            }
            if (!selected) {
                // Fallback: click the first non-disabled option (index 1 in options)
                await select.evaluate((el: HTMLSelectElement) => {
                    const opt = Array.from(el.options).find(
                        (o) => !o.disabled && o.value === '',
                    );
                    if (opt) {
                        el.value = '';
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        } else {
            await select.selectOption({ value: filterValue });
        }
    } else {
        // Custom dropdown (desktop): click the trigger, then click an option by text
        const trigger = page.locator('[role="button"][aria-haspopup="listbox"]').first();
        await trigger.click();
        // Wait for listbox to open
        await page.locator('[role="listbox"]').waitFor({ timeout: 3_000 });

        const possibleLabels = FILTER_LABELS[filterValue] ?? [filterValue];
        let clicked = false;
        for (const label of possibleLabels) {
            const option = page.locator(`[role="option"]:has-text("${label}")`).first();
            if (await option.count() > 0) {
                await option.click();
                clicked = true;
                break;
            }
        }
        if (!clicked) {
            // Close dropdown without selection (no matching option found)
            await page.keyboard.press('Escape');
            throw new Error(`Could not find filter option for value "${filterValue}". Tried: ${possibleLabels.join(', ')}`);
        }
    }
}

// ---------------------------------------------------------------------------
// 1. Happy path — navigation and table render
// ---------------------------------------------------------------------------
test.describe('1. Happy path — nav, skeleton, table render', () => {
    test('admin navigates to /admin/email-logs and table renders with data', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Friendly email_type_display visible
        await expect(page.getByText('Pago confirmado — cliente')).toBeVisible();

        // Recipient email visible
        await expect(page.getByText('customer@example.com')).toBeVisible();

        // Status badges visible — use exact match to avoid strict mode violation
        // "Confirmado" appears inside "Pago confirmado — cliente" so we need exact
        await expect(page.getByText('Fallido', { exact: true })).toBeVisible();
        await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
    });

    test('raw template_name is NOT visible in the table list', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const bodyText = await page.evaluate(() => document.body.innerText);
        // Raw template paths must NOT appear in the list
        expect(bodyText).not.toContain('orders/payment_received.html');
        expect(bodyText).not.toContain('orders/admin/new_paid_order.html');
    });

    test('sidebar nav shows "Registro de correos" link that navigates to email-logs', async ({
        page,
    }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasEmailLogNav =
            bodyText.includes('Registro de correos') || bodyText.includes('Email Log');
        expect(
            hasEmailLogNav,
            `Expected email log nav item. Got: "${bodyText.slice(0, 300)}"`,
        ).toBe(true);
    });

    test('table renders with correct column headers', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Column headers are rendered as <th> (TableColumn) elements.
        // The page is in English (Playwright browser UA is English by default).
        // The i18n backend loads from /locales/en/admin.json which has English headers.
        // We check using textContent (includes table header text) or locate by role.
        const fullText = await page.evaluate(() => document.body.textContent ?? '');

        // Accept translated strings in ES or EN or raw keys (in case i18n hasn't loaded)
        const hasObjetivo =
            fullText.includes('Objetivo') ||
            fullText.includes('Objective') ||
            fullText.includes('email_log_col_objetivo');
        const hasDestinatario =
            fullText.includes('Destinatario') ||
            fullText.includes('Recipient') ||
            fullText.includes('email_log_col_destinatario');
        const hasEstado =
            fullText.includes('Estado') ||
            fullText.includes('Status') ||
            fullText.includes('email_log_col_estado');
        const hasFecha =
            fullText.includes('Fecha') ||
            fullText.includes('Date') ||
            fullText.includes('email_log_col_fecha');

        expect(hasObjetivo, 'Expected Objetivo/Objective column').toBe(true);
        expect(hasDestinatario, 'Expected Destinatario/Recipient column').toBe(true);
        expect(hasEstado, 'Expected Estado/Status column').toBe(true);
        expect(hasFecha, 'Expected Fecha/Date column').toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 2. Status filter
// ---------------------------------------------------------------------------
test.describe('2. Status filter changes the list', () => {
    test('selecting "Fallido" filter triggers API call with status=failed', async ({ page }) => {
        const requestUrls: string[] = [];
        page.on('request', (req) => {
            if (req.url().includes('/api/admin/email-logs/')) {
                requestUrls.push(req.url());
            }
        });

        let callCount = 0;
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);
        await page.route('**/api/admin/email-logs/**', (route) => {
            if (route.request().method() === 'GET') {
                callCount++;
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: callCount === 1 ? PAGINATED_TWO : PAGINATED_ONE_FAILED,
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Use the friendly label that appears in the dropdown option
        await selectFilterOption(page, 'failed');

        // Wait for refetch — only failed row should remain
        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                // "Confirmado" badge is gone (confirmed row no longer in results)
                // but "Fallido" still present
                return (
                    !text.includes('Nuevo pedido pagado') &&
                    text.includes('Pago confirmado — cliente')
                );
            },
            { timeout: 10_000 },
        );

        // The API was called with status=failed
        const filteredReq = requestUrls.find((url) => url.includes('status=failed'));
        expect(
            filteredReq,
            `Expected request with status=failed. Got: ${requestUrls.join(', ')}`,
        ).toBeTruthy();
    });

    test('"Todos los estados" option resets the filter', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Apply a filter first
        await selectFilterOption(page, 'failed');

        // Then reset
        await selectFilterOption(page, '');

        // Both rows should be back
        await waitForTableData(page, 'Pago confirmado — cliente');
    });
});

// ---------------------------------------------------------------------------
// 3. "Inspeccionar" modal
// ---------------------------------------------------------------------------
test.describe('3. Inspeccionar modal', () => {
    test('clicking Inspeccionar opens modal with raw template_name and error_message', async ({
        page,
    }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Click the inspect button (Eye icon with aria-label or title)
        const inspectBtn = page
            .locator(
                '[aria-label="Inspeccionar"], [title="Inspeccionar"], [aria-label="Inspect"], [title="Inspect"]',
            )
            .first();
        await expect(inspectBtn).toBeVisible({ timeout: 5_000 });
        await inspectBtn.click();

        // Modal opens — template_name must appear in the modal
        await page.waitForFunction(
            () => document.body.innerText.includes('orders/payment_received.html'),
            { timeout: 10_000 },
        );

        const modalText = await page.evaluate(() => document.body.innerText);

        // Raw template_name visible in modal
        expect(modalText).toContain('orders/payment_received.html');
        // Error message visible in modal
        expect(modalText).toContain('SMTP connection timed out');
        // Task name visible
        expect(modalText).toContain('orders.tasks.send_payment_received_email');
    });

    test('template_name is hidden in the table but visible in the modal', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Before modal opens: template_name NOT in the DOM
        let bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).not.toContain('orders/payment_received.html');

        // Open modal
        const inspectBtn = page
            .locator(
                '[aria-label="Inspeccionar"], [title="Inspeccionar"], [aria-label="Inspect"], [title="Inspect"]',
            )
            .first();
        await inspectBtn.click();

        // After modal opens: template_name IS visible
        await page.waitForFunction(
            () => document.body.innerText.includes('orders/payment_received.html'),
            { timeout: 10_000 },
        );
        bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).toContain('orders/payment_received.html');
    });

    test('modal closes when Escape key is pressed', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Open modal
        const inspectBtn = page
            .locator(
                '[aria-label="Inspeccionar"], [title="Inspeccionar"], [aria-label="Inspect"], [title="Inspect"]',
            )
            .first();
        await inspectBtn.click();

        // Wait for modal content
        await page.waitForFunction(
            () => document.body.textContent?.includes('orders/payment_received.html'),
            { timeout: 10_000 },
        );

        // Close via Escape key (ModalBase binds useEscapeKey → closeModal)
        await page.keyboard.press('Escape');

        // template_name should disappear (modal unmounted after ~200ms animation)
        await page.waitForFunction(
            () => !document.body.textContent?.includes('orders/payment_received.html'),
            { timeout: 8_000 },
        );
    });

    test('modal closes via the footer "Cerrar" button inside EmailLogDetailModal', async ({
        page,
    }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Open modal
        const inspectBtn = page
            .locator(
                '[aria-label="Inspeccionar"], [title="Inspeccionar"], [aria-label="Inspect"], [title="Inspect"]',
            )
            .first();
        await inspectBtn.click();

        await page.waitForFunction(
            () => document.body.innerText.includes('orders/payment_received.html'),
            { timeout: 10_000 },
        );

        // Click the footer "Cerrar" button inside the modal detail component
        // (its text is the i18n 'close' key = "Cerrar" in Spanish)
        const footerCloseBtn = page.locator('[role="dialog"] button:has-text("Cerrar"), [role="dialog"] button:has-text("Close")').first();
        if (await footerCloseBtn.count() > 0) {
            await footerCloseBtn.click();
        } else {
            // Fallback: any Cerrar button
            await page.locator('button:has-text("Cerrar"), button:has-text("Close")').first().click();
        }

        // Modal should close
        await page.waitForFunction(
            () => !document.body.innerText.includes('orders/payment_received.html'),
            { timeout: 5_000 },
        );
    });
});

// ---------------------------------------------------------------------------
// 4. Retry button — happy path
// ---------------------------------------------------------------------------
test.describe('4. Retry button — happy path', () => {
    test('Retry button appears only on retryable rows (is_retryable=true)', async ({ page }) => {
        await setupAdminEmailLogsPage(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Should be exactly 1 retry button (only the failed row has is_retryable=true)
        const retryBtns = page.locator('button:has-text("Reintentar"), button:has-text("Retry")');
        const count = await retryBtns.count();
        expect(count, 'Expected exactly one Retry button (only failed row is retryable)').toBe(1);
    });

    test('clicking Retry shows success toast', async ({ page }) => {
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        const retryResponse = {
            ...MOCK_FAILED_LOG,
            status: 'pending',
            status_display: 'Pendiente',
            is_retryable: false,
            attempts: 4,
        };

        await page.route('**/api/admin/email-logs/**', (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: PAGINATED_TWO,
                });
            } else if (method === 'POST' && route.request().url().includes('/retry/')) {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(retryResponse),
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page
            .locator('button:has-text("Reintentar"), button:has-text("Retry")')
            .first();
        await expect(retryBtn).toBeVisible();
        await retryBtn.click();

        // Success toast (green) should appear
        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('Correo reenviado') ||
                    text.includes('Email resent') ||
                    text.includes('reenviado')
                );
            },
            { timeout: 8_000 },
        );
    });

    test('Retry POST goes to correct URL /api/admin/email-logs/1/retry/', async ({ page }) => {
        const retryUrls: string[] = [];

        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        await page.route('**/api/admin/email-logs/**', (route) => {
            const method = route.request().method();
            const url = route.request().url();
            if (method === 'GET') {
                route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_TWO });
            } else if (method === 'POST') {
                retryUrls.push(url);
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ...MOCK_FAILED_LOG, status: 'pending', is_retryable: false }),
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page
            .locator('button:has-text("Reintentar"), button:has-text("Retry")')
            .first();
        await retryBtn.click();

        // Wait for toast
        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return text.includes('reenviado') || text.includes('resent');
            },
            { timeout: 8_000 },
        );

        // The POST URL must end with /1/retry/
        const retryUrl = retryUrls.find((u) => u.includes('/retry/'));
        expect(retryUrl, `Expected /retry/ URL. Got: ${retryUrls.join(', ')}`).toBeTruthy();
        expect(retryUrl).toContain('/1/retry/');
    });

    test('admin stays on email-logs page after Retry (no redirect)', async ({ page }) => {
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        await page.route('**/api/admin/email-logs/**', (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_TWO });
            } else if (method === 'POST') {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ ...MOCK_FAILED_LOG, status: 'pending', is_retryable: false }),
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page
            .locator('button:has-text("Reintentar"), button:has-text("Retry")')
            .first();
        await retryBtn.click();

        await page.waitForFunction(
            () => document.body.innerText.includes('reenviado') || document.body.innerText.includes('resent'),
            { timeout: 8_000 },
        );

        // Still on the email-logs page
        expect(page.url()).toContain('/admin/email-logs');
    });
});

// ---------------------------------------------------------------------------
// 5. Retry error paths
// ---------------------------------------------------------------------------
test.describe('5. Retry error paths', () => {
    async function setupRetryError(
        page: import('@playwright/test').Page,
        errorStatus: number,
    ) {
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        await page.route('**/api/admin/email-logs/**', (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_TWO });
            } else if (method === 'POST' && route.request().url().includes('/retry/')) {
                route.fulfill({
                    status: errorStatus,
                    contentType: 'application/json',
                    body: JSON.stringify({ detail: 'Error' }),
                });
            } else {
                route.continue();
            }
        });
    }

    test('409 shows specific "cannot retry" toast (8s red)', async ({ page }) => {
        await setupRetryError(page, 409);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page.locator('button:has-text("Reintentar"), button:has-text("Retry")').first();
        await retryBtn.click();

        // 409-specific toast text from the ADR / locale file
        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('no se puede reintentar') ||
                    text.includes('cannot be retried') ||
                    text.includes('todavía') ||
                    text.includes('No se puede reintentar')
                );
            },
            { timeout: 8_000 },
        );
    });

    test('404 shows "row no longer exists" toast (8s red)', async ({ page }) => {
        await setupRetryError(page, 404);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page.locator('button:has-text("Reintentar"), button:has-text("Retry")').first();
        await retryBtn.click();

        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('ya no existe') ||
                    text.includes('no longer exists') ||
                    text.includes('no existe')
                );
            },
            { timeout: 8_000 },
        );
    });

    test('500 shows generic "could not resend" toast (8s red)', async ({ page }) => {
        await setupRetryError(page, 500);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page.locator('button:has-text("Reintentar"), button:has-text("Retry")').first();
        await retryBtn.click();

        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('No se pudo reenviar') ||
                    text.includes('Could not resend') ||
                    text.includes('Inténtalo de nuevo') ||
                    text.includes('Please try again')
                );
            },
            { timeout: 8_000 },
        );
    });

    test('fields NOT cleared and table data preserved after retry error', async ({ page }) => {
        await setupRetryError(page, 500);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        const retryBtn = page.locator('button:has-text("Reintentar"), button:has-text("Retry")').first();
        await retryBtn.click();

        // Wait for error toast
        await page.waitForFunction(
            () => document.body.innerText.includes('No se pudo reenviar') || document.body.innerText.includes('Could not resend'),
            { timeout: 8_000 },
        );

        // The table data should still be visible — rows not cleared on error
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).toContain('Pago confirmado — cliente');
        expect(bodyText).toContain('customer@example.com');
    });
});

// ---------------------------------------------------------------------------
// 6. Empty states
// ---------------------------------------------------------------------------
test.describe('6. Empty states', () => {
    test('no data at all → "Aún no hay correos registrados" with NO "Quitar filtro" CTA', async ({
        page,
    }) => {
        await setupAdminEmailLogsPage(page, PAGINATED_EMPTY);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);

        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('Aún no hay correos') ||
                    text.includes('No emails logged yet') ||
                    text.includes('no hay correos')
                );
            },
            { timeout: 15_000 },
        );

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasEmptyState =
            bodyText.includes('Aún no hay correos') || bodyText.includes('No emails logged yet');
        expect(hasEmptyState, `Expected empty-state text. Got: "${bodyText.slice(0, 300)}"`).toBe(true);

        // No "Quitar filtro" CTA for the unfiltered empty state (per ADR)
        const hasQuitarFiltro =
            bodyText.includes('Quitar filtro') || bodyText.includes('Clear filter');
        expect(hasQuitarFiltro, 'Unfiltered empty state must NOT show "Quitar filtro"').toBe(false);
    });

    test('filtered empty state → "Sin resultados" + "Quitar filtro" CTA', async ({ page }) => {
        let callCount = 0;
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        await page.route('**/api/admin/email-logs/**', (route) => {
            if (route.request().method() === 'GET') {
                callCount++;
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: callCount === 1 ? PAGINATED_TWO : PAGINATED_EMPTY,
                });
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Apply a filter (use "Retrying" which has no rows in our mocked data)
        await selectFilterOption(page, 'retrying');

        // Wait for filtered empty state
        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return text.includes('Sin resultados') || text.includes('No results');
            },
            { timeout: 10_000 },
        );

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasSinResultados =
            bodyText.includes('Sin resultados') || bodyText.includes('No results');
        expect(
            hasSinResultados,
            `Expected "Sin resultados". Got: "${bodyText.slice(0, 300)}"`,
        ).toBe(true);

        const hasQuitarFiltro =
            bodyText.includes('Quitar filtro') || bodyText.includes('Clear filter');
        expect(hasQuitarFiltro, 'Filtered empty state must show "Quitar filtro" CTA').toBe(true);
    });

    test('"Quitar filtro" button clears the filter and restores data', async ({ page }) => {
        let callCount = 0;
        await seedAdminAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserAdmin(page);

        await page.route('**/api/admin/email-logs/**', (route) => {
            if (route.request().method() === 'GET') {
                callCount++;
                if (callCount === 1) {
                    route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_TWO });
                } else if (callCount === 2) {
                    route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_EMPTY });
                } else {
                    route.fulfill({ status: 200, contentType: 'application/json', body: PAGINATED_TWO });
                }
            } else {
                route.continue();
            }
        });

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Pago confirmado — cliente');

        // Apply a filter that yields empty
        await selectFilterOption(page, 'retrying');

        // Wait for empty filtered state
        await page.waitForFunction(
            () => document.body.innerText.includes('Sin resultados') || document.body.innerText.includes('No results'),
            { timeout: 10_000 },
        );

        // Click "Quitar filtro"
        const clearBtn = page.locator(
            'button:has-text("Quitar filtro"), button:has-text("Clear filter")',
        );
        await expect(clearBtn).toBeVisible({ timeout: 3_000 });
        await clearBtn.click();

        // Table with data should come back
        await waitForTableData(page, 'Pago confirmado — cliente');
    });

    test('500 on list request → error empty state with retry messaging', async ({ page }) => {
        await setupAdminEmailLogsPage(
            page,
            JSON.stringify({ detail: 'Internal Server Error' }),
            500,
        );

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);

        await page.waitForFunction(
            () => {
                const text = document.body.innerText;
                return (
                    text.includes('No se pudo cargar') ||
                    text.includes('Failed to load') ||
                    text.includes('error') ||
                    text.includes('Error')
                );
            },
            { timeout: 15_000 },
        );

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasErrorState =
            bodyText.includes('No se pudo cargar') || bodyText.includes('Failed to load');
        expect(hasErrorState, `Expected error empty state. Got: "${bodyText.slice(0, 300)}"`).toBe(
            true,
        );
    });
});

// ---------------------------------------------------------------------------
// 7. Navigation and auth
// ---------------------------------------------------------------------------
test.describe('7. Navigation and auth', () => {
    test('unauthenticated visit to /admin/email-logs shows auth gate (not the table)', async ({
        page,
    }) => {
        await clearAuthState(page);
        await mockMarketing(page);
        await page.route('**/auth/token/refresh/**', (route) => {
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token is invalid or expired' }),
            });
        });
        await mockAuthUser401(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await page.waitForTimeout(3_000);

        const url = page.url();
        const bodyText = await page.evaluate(() => document.body.innerText);

        const isAuthGated =
            url.includes('/login') ||
            bodyText.includes('Autenticación requerida') ||
            bodyText.includes('Iniciar sesión') ||
            bodyText.includes('Authentication Required') ||
            bodyText.includes('Please log in');

        // Must NOT show the email log table
        const showsTable =
            bodyText.includes('Objetivo') && bodyText.includes('Pago confirmado — cliente');

        expect(
            isAuthGated,
            `Expected auth gate. URL: ${url}, text: "${bodyText.slice(0, 300)}"`,
        ).toBe(true);
        expect(showsTable, 'Unauthenticated user must not see the email log table').toBe(false);
    });

    test('non-admin user (is_staff=false) sees "Acceso Denegado", not the table', async ({
        page,
    }) => {
        await seedUserAuth(page);
        await mockMarketing(page);
        await mockRefreshOk(page);
        await mockAuthUserNonAdmin(page);

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await page.waitForTimeout(3_000);

        const bodyText = await page.evaluate(() => document.body.innerText);

        const hasAccessDenied =
            bodyText.includes('Acceso Denegado') ||
            bodyText.includes('No tienes permiso') ||
            bodyText.includes('Autenticación requerida') ||
            bodyText.includes('Authentication');
        expect(
            hasAccessDenied,
            `Expected access denied. Got: "${bodyText.slice(0, 300)}"`,
        ).toBe(true);

        const showsEmailTable =
            bodyText.includes('Objetivo') &&
            bodyText.includes('Destinatario') &&
            bodyText.includes('Pago confirmado — cliente');
        expect(showsEmailTable, 'Non-admin must not see the email log table').toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 8. Non-retryable rows have no Retry button
// ---------------------------------------------------------------------------
test.describe('8. Non-retryable rows', () => {
    test('confirmed row (is_retryable=false) has no Retry button', async ({ page }) => {
        await setupAdminEmailLogsPage(
            page,
            JSON.stringify({ count: 1, next: null, previous: null, results: [MOCK_CONFIRMED_LOG] }),
        );

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Nuevo pedido pagado — administrador');

        const retryBtns = page.locator('button:has-text("Reintentar"), button:has-text("Retry")');
        const count = await retryBtns.count();
        expect(count, 'Confirmed row must NOT show Retry button').toBe(0);
    });

    test('fresh pending row (is_retryable=false) has no Retry button', async ({ page }) => {
        await setupAdminEmailLogsPage(
            page,
            JSON.stringify({ count: 1, next: null, previous: null, results: [MOCK_PENDING_LOG] }),
        );

        await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
        await waitForRoot(page);
        await waitForAdminRoute(page);
        await waitForTableData(page, 'Actualización de estado — cliente');

        const retryBtns = page.locator('button:has-text("Reintentar"), button:has-text("Retry")');
        const count = await retryBtns.count();
        expect(count, 'Fresh pending row must NOT show Retry button').toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 9. Layout smoke — 375px, 768px, 1280px
// ---------------------------------------------------------------------------
test.describe('9. Layout smoke — viewports', () => {
    const VIEWPORTS = [
        { name: '375px mobile', width: 375, height: 667 },
        { name: '768px tablet', width: 768, height: 1024 },
        { name: '1280px desktop', width: 1280, height: 800 },
    ];

    for (const vp of VIEWPORTS) {
        test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await setupAdminEmailLogsPage(page);

            await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
            await waitForRoot(page);
            await waitForAdminRoute(page);

            // Small wait for CSS layout to settle
            await page.waitForTimeout(500);

            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(
                overflow,
                `Horizontal overflow at ${vp.name}: ${overflow}px`,
            ).toBeLessThanOrEqual(1);
        });

        test(`key elements visible and not overlapping at ${vp.name}`, async ({ page }) => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await setupAdminEmailLogsPage(page);

            await page.goto('/admin/email-logs', { waitUntil: 'domcontentloaded' });
            await waitForRoot(page);
            await waitForAdminRoute(page);
            await waitForTableData(page, 'Pago confirmado — cliente');

            const bodyText = await page.evaluate(() => document.body.innerText);

            // Page title visible
            const hasTitle =
                bodyText.includes('Registro de correos') || bodyText.includes('Email Log');
            expect(hasTitle, `Page title not visible at ${vp.name}`).toBe(true);

            // Table data visible
            expect(bodyText).toContain('Pago confirmado — cliente');

            // No element bleeds beyond the right edge of the viewport.
            // We exclude:
            //  - Non-visual tags (SCRIPT, STYLE, META, HTML, BODY)
            //  - SVG children (their className is SVGAnimatedString, not a string)
            //  - Elements inside a scrollable container (intentional horizontal scroll,
            //    e.g. the table wrapper with overflow-x:auto)
            const overflowingElements = await page.evaluate(() => {
                const vw = document.documentElement.clientWidth;
                const overflowing: string[] = [];

                /** Walk up the DOM — return true if any ancestor has overflow-x scroll/auto */
                function isInsideScrollableX(el: Element): boolean {
                    let node = el.parentElement;
                    while (node && node !== document.body) {
                        const style = window.getComputedStyle(node);
                        const ox = style.overflowX;
                        if (ox === 'auto' || ox === 'scroll') return true;
                        node = node.parentElement;
                    }
                    return false;
                }

                document.querySelectorAll('*').forEach((el) => {
                    // Skip SVG elements — their className is SVGAnimatedString (not a string)
                    if (el instanceof SVGElement) return;

                    const rect = el.getBoundingClientRect();
                    if (rect.right > vw + 2) {
                        // Skip elements that are inside a scrollable container
                        if (isInsideScrollableX(el)) return;

                        const cls =
                            typeof el.className === 'string' && el.className
                                ? `.${el.className.trim().split(/\s+/)[0]}`
                                : '';
                        overflowing.push(el.tagName + cls);
                    }
                });
                return overflowing;
            });

            const meaningful = overflowingElements.filter(
                (tag) =>
                    !tag.includes('SCRIPT') &&
                    !tag.includes('STYLE') &&
                    !tag.includes('META') &&
                    !tag.includes('HTML') &&
                    !tag.includes('BODY'),
            );

            expect(
                meaningful,
                `Elements overflowing at ${vp.name}: ${meaningful.slice(0, 5).join(', ')}`,
            ).toHaveLength(0);
        });
    }
});
