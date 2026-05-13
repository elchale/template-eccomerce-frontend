/**
 * Public-facing site theme. Fetched once per session (`staleTime: Infinity`)
 * since the theme rarely changes mid-session and the pre-paint script in
 * `index.html` already applied a localStorage guess to prevent FOUC — this
 * query just reconciles with the server's source of truth.
 *
 * `useAdminUpdateTheme` invalidates this cache so a live edit in the admin
 * UI propagates to the storefront immediately.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type { SiteThemeConfig } from '@/types/theme';

export const THEME_KEYS = {
    all: ['site-theme'] as const,
    public: () => [...THEME_KEYS.all, 'public'] as const,
    admin: () => [...THEME_KEYS.all, 'admin'] as const,
};

export function useThemeSettings() {
    return useQuery({
        queryKey: THEME_KEYS.public(),
        queryFn: async () => {
            const { data } = await api.get<SiteThemeConfig>(API_ROUTES.marketingTheme);
            return data;
        },
        staleTime: Infinity,
        retry: 1,
    });
}
