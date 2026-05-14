import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Dev-time CSP. Mirrors the production policy in `vercel.json` but additionally
 * allows `http://localhost:*` and `http://127.0.0.1:*` in `connect-src` so the
 * SPA can reach a locally-served Django backend (Docker or `runserver`) during
 * development. Production never sees this; Vercel HTTP headers take over.
 */
/**
 * Backend target for the dev proxy. Override with `VITE_BACKEND_PROXY_TARGET`
 * if the local Docker stack listens on a different host/port.
 */
const BACKEND_TARGET = process.env.VITE_BACKEND_PROXY_TARGET ?? 'http://127.0.0.1:8000';

/**
 * Path prefixes that should be forwarded to the Django backend during `npm run dev`.
 * Bypassing CORS by proxying through Vite mirrors the same-origin contract you'd
 * have behind a reverse proxy / CDN in production.
 *
 * `/admin` is intentionally NOT proxied — the SPA owns `/admin/*` for the React
 * admin panel. The Django OTP admin lives at the backend origin directly
 * (e.g. http://127.0.0.1:8000/admin/) and is accessed by superusers there.
 */
const PROXIED_PATHS = ['/api', '/auth', '/media', '/static', '/ws'];

const DEV_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://static.micuentaweb.pe https://secure.micuentaweb.pe https://*.online-metrix.net https://maps.googleapis.com https://maps.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://static.micuentaweb.pe",
    "img-src 'self' data: blob: https: http://127.0.0.1:* http://localhost:*",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:* https: https://accounts.google.com https://oauth2.googleapis.com https://static.micuentaweb.pe https://api.micuentaweb.pe https://secure.micuentaweb.pe https://*.online-metrix.net https://maps.googleapis.com",
    'frame-src https://accounts.google.com https://static.micuentaweb.pe https://secure.micuentaweb.pe https://*.online-metrix.net',
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

// FE-3: use function form so we can gate sourcemaps on mode
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    server: {
        port: 5174,
        host: '127.0.0.1',
        strictPort: true,
        headers: {
            // Google OAuth popup auth requires this opener policy.
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            // Local-only CSP — production policy lives in vercel.json HTTP headers.
            'Content-Security-Policy': DEV_CSP,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
        // Proxying backend paths through Vite gives same-origin requests in dev,
        // so Django CORS config doesn't need to enumerate every developer's port.
        // In production the SPA either shares an origin with the API or hits an
        // explicit `VITE_API_URL` whose CORS list includes the deployed frontend.
        proxy: Object.fromEntries(
            PROXIED_PATHS.map((path) => [
                path,
                {
                    target: BACKEND_TARGET,
                    changeOrigin: true,
                    ws: path === '/ws',
                },
            ]),
        ),
    },
    build: {
        // FE-3: disable sourcemaps in production to avoid leaking source code
        sourcemap: mode !== 'production',
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    charts: ['chart.js', 'react-chartjs-2'],
                    i18n: [
                        'i18next',
                        'react-i18next',
                        'i18next-http-backend',
                        'i18next-browser-languagedetector',
                    ],
                    payments: ['@lyracom/embedded-form-glue'],
                    auth: ['@react-oauth/google', 'jwt-decode'],
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test-setup.ts',
        exclude: ['**/node_modules/**', '**/.claude/worktrees/**', '**/dist/**', '**/e2e/**'],
    },
}));
