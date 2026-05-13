/**
 * Application bootstrap. Order of providers matters:
 *  - `BrowserRouter` outermost so any provider can call `useLocation`.
 *  - `StrictMode` next — double-invocation of effects helps surface side
 *    effects that wouldn't survive React 19's concurrent rendering.
 *  - `QueryClientProvider` makes TanStack Query available globally.
 *  - `GoogleOAuthProvider` is required by `useGoogleLogin` in
 *    `GoogleLoginButton`. `VITE_GOOGLE_CLIENT_ID` may be empty in dev —
 *    the button still mounts but `useGoogleLogin` won't initialize.
 *  - `ReactQueryDevtools` only renders in dev (tree-shaken in prod).
 *
 * i18n is imported for side effects only — initializing once at app start.
 * Sentry is initialised before createRoot so hydration errors are captured.
 */
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { queryClient } from '@/lib/queryClient';
import { initSentry } from '@/lib/sentry';

import { App } from './App.tsx';

import './styles/index.css';
import './lib/i18n';

// Initialise Sentry before React renders — no-op when VITE_SENTRY_DSN is unset
initSentry();

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID as string}>
                    <App />
                    <ReactQueryDevtools initialIsOpen={false} />
                </GoogleOAuthProvider>
            </QueryClientProvider>
        </StrictMode>
    </BrowserRouter>,
);
