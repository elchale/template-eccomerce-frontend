/**
 * Optional Sentry initialisation.
 *
 * When `VITE_SENTRY_DSN` is not set (empty string or undefined) this module
 * is a complete no-op — no SDK code runs, no network requests are made.
 * This keeps dev environments clean without requiring a real DSN.
 *
 * Call `initSentry()` once from `main.tsx` **before** `createRoot` so Sentry
 * can capture errors thrown during React hydration.
 */
import * as Sentry from '@sentry/react';

export function initSentry(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

    // Guard: no-op when DSN is absent
    if (!dsn) return;

    Sentry.init({
        dsn,
        environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? 'local',
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.05),
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                // Only capture replays for sessions that include an error
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],
        // Replays: 0% sample rate for normal sessions, 100% for sessions with errors
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
    });
}
