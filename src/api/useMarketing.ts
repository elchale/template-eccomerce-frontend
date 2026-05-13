/**
 * Storefront marketing reads: active banners, popups, promotions, store
 * config, and search suggestions.
 *
 * The admin CRUD counterparts live in `useAdminMarketing`. Keys here are
 * language-scoped because marketing copy is translated; search-suggestions
 * additionally cache per query string.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { getLang } from '@/lib/i18n';
import type { PaginatedResponse } from '@/types/api';
import type { Banner, Popup, Promocion, SearchSuggestion, StoreConfig } from '@/types/marketing';

export const MARKETING_KEYS = {
    all: ['marketing'] as const,
    promociones: () => [...MARKETING_KEYS.all, 'promociones', 'activas', getLang()] as const,
    banners: (tipo?: string) =>
        [...MARKETING_KEYS.all, 'banners', 'activos', getLang(), tipo ?? 'all'] as const,
    popups: (tipo?: string) =>
        [...MARKETING_KEYS.all, 'popups', 'activos', getLang(), tipo ?? 'all'] as const,
    config: () => [...MARKETING_KEYS.all, 'config'] as const,
    searchSuggestions: (query: string) =>
        [...MARKETING_KEYS.all, 'search-suggestions', getLang(), query] as const,
} as const;

/** Currently-active promotions (filtered server-side by date and `is_active`). */
export const useActivePromociones = () =>
    useQuery({
        queryKey: MARKETING_KEYS.promociones(),
        queryFn: async (): Promise<Promocion[]> => {
            const { data } = await api.get<PaginatedResponse<Promocion>>(
                API_ROUTES.marketingPromocionesActivas,
            );
            return data.results;
        },
    });

/** Active banners filtered by placement (`hero`, `category`, etc.). */
export const useActiveBanners = (tipo?: string) =>
    useQuery({
        queryKey: MARKETING_KEYS.banners(tipo),
        queryFn: async (): Promise<Banner[]> => {
            const { data } = await api.get<PaginatedResponse<Banner>>(
                API_ROUTES.marketingBannersActivos,
                { params: tipo ? { tipo } : {} },
            );
            return data.results;
        },
    });

/** Active popups; `PromoPopup` reads this then filters again client-side
 *  through `useMarketingStore.shouldShowPopup` to honor dismissals. */
export const useActivePopups = (tipo?: string) =>
    useQuery({
        queryKey: MARKETING_KEYS.popups(tipo),
        queryFn: async (): Promise<Popup[]> => {
            const { data } = await api.get<PaginatedResponse<Popup>>(
                API_ROUTES.marketingPopupsActivos,
                { params: tipo ? { tipo } : {} },
            );
            return data.results;
        },
    });

/** Store-wide configuration (name, logo, shipping thresholds, social links). */
export const useStoreConfig = () =>
    useQuery({
        queryKey: MARKETING_KEYS.config(),
        queryFn: async (): Promise<StoreConfig> => {
            const { data } = await api.get<StoreConfig>(API_ROUTES.marketingConfiguracion);
            return data;
        },
    });

/** Live search suggestions. Gated to queries ≥ 2 chars so we don't spam
 *  the backend on the first keystroke; 60s cache window deduplicates
 *  consecutive identical queries. */
export const useSearchSuggestions = (query: string) =>
    useQuery({
        queryKey: MARKETING_KEYS.searchSuggestions(query),
        queryFn: async (): Promise<SearchSuggestion[]> => {
            const { data } = await api.get<SearchSuggestion[]>(API_ROUTES.searchSuggestions, {
                params: { q: query },
            });
            return data;
        },
        enabled: query.length >= 2,
        staleTime: 60_000,
    });
