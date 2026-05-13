/**
 * App-wide TanStack Query client. Single instance is mounted at the root via
 * `QueryClientProvider` in `App.tsx`.
 *
 * Defaults chosen for an e-commerce SPA:
 *  - `refetchOnWindowFocus: false` — focus refetch is noisy for shop pages
 *    and causes visible re-render spinners; cache is invalidated explicitly
 *    by mutations and route changes instead.
 *  - 30s `staleTime` — cheap server-state freshness for catalog/cart reads
 *    without hammering the API on every navigation.
 *  - Don't retry 401/403 — the axios interceptor already handles auth
 *    failure (refresh or logout); retrying just delays the redirect.
 *  - `networkMode: 'offlineFirst'` (FE-6) — serves cached data when offline
 *    so PDP/cart screens still render; the OfflineBanner surfaces the state.
 *  - Mutations don't retry — POSTs/PUTs are not safe to replay blindly
 *    (idempotency varies), and users would rather see an immediate error.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount: number, error: unknown) => {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 401 || status === 403) return false;
                return failureCount < 2;
            },
            staleTime: 30_000,
            networkMode: 'offlineFirst',
        },
        mutations: {
            retry: 0,
        },
    },
});
