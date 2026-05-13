/**
 * Playwright config for browser-level smoke + acceptance tests.
 *
 * Boots the Vite dev server automatically (re-uses an existing instance if
 * one is already listening on 5174) and runs tests against three viewports
 * to match the UX-standards breakpoints (375 / 768 / 1280) declared in
 * `CLAUDE.md`. Tests live in `e2e/`; Vitest unit tests stay in `src/__tests__/`.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: './e2e',
    timeout: 120_000,
    expect: { timeout: 5_000 },
    // Fail fast on CI, retry once locally to absorb flakes from cold-cache navigations.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
        },
        {
            name: 'chromium-tablet',
            use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
        },
        {
            // Mobile profile runs on Chromium (the only browser we install in CI)
            // with iPhone-13-class viewport + touch + mobile UA. We don't use the
            // `devices['iPhone 13']` preset because it forces WebKit.
            name: 'chromium-mobile',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 390, height: 844 },
                deviceScaleFactor: 3,
                isMobile: true,
                hasTouch: true,
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
