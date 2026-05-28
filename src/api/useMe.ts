/**
 * Hook to fetch the current authenticated user from the server.
 * Used by AdminRoute to gate admin access via a fresh server check
 * rather than trusting the localStorage `is_staff` flag (which could
 * be stale or tampered).
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type { User } from '@/types/auth';

const KEYS = {
    all: ['me'] as const,
    detail: () => [...KEYS.all, 'detail'] as const,
} as const;

interface UseMeOptions {
    /** Skip the query entirely when false. Defaults to true.
     *  Pass `isLogged` from the auth store to avoid triggering a token-refresh
     *  attempt when the user is not authenticated. */
    enabled?: boolean;
}

export function useMe(options?: UseMeOptions) {
    return useQuery({
        queryKey: KEYS.detail(),
        queryFn: async () => {
            const { data } = await api.get<User>(API_ROUTES.me);
            return data;
        },
        staleTime: 30_000,
        // Only fetch when the caller tells us the user is logged in.
        // Defaults to true for backward compatibility with callers that don't pass the option.
        enabled: options?.enabled ?? true,
        retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            // Don't retry auth failures — they are deterministic
            if (status === 401 || status === 403) return false;
            return failureCount < 1;
        },
    });
}

export { KEYS as ME_KEYS };
