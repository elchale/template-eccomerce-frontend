/**
 * Admin theme editor — read the canonical config + write user-defined
 * overrides. Successful mutations sync the new config into
 * `useThemeStore` so the admin sees changes apply live without a refetch
 * round-trip.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { THEME_KEYS } from '@/api/useThemeSettings';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useThemeStore } from '@/stores/useThemeStore';
import type { AdminThemeResponse, SiteThemeConfig } from '@/types/theme';

export { THEME_KEYS as ADMIN_THEME_KEYS };

export function useAdminThemeSettings() {
    return useQuery({
        queryKey: THEME_KEYS.admin(),
        queryFn: async () => {
            const { data } = await api.get<AdminThemeResponse>(API_ROUTES.adminMarketingTheme);
            return data;
        },
    });
}

export function useAdminUpdateTheme() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<SiteThemeConfig>) => {
            const { data } = await api.put<SiteThemeConfig>(
                API_ROUTES.adminMarketingTheme,
                payload,
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: THEME_KEYS.all });
            useThemeStore.getState().setFromServer(data);
        },
    });
}

export function useAdminResetTheme() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post<SiteThemeConfig>(
                API_ROUTES.adminMarketingThemeReset,
                {},
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: THEME_KEYS.all });
            useThemeStore.getState().setFromServer(data);
        },
    });
}
