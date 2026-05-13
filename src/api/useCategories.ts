/**
 * Storefront category queries. Categories change rarely so we use a
 * generous 5-minute staleTime to skip refetches on every nav.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { getLang } from '@/lib/i18n';
import type { Category } from '@/types/product';

const KEYS = {
    all: ['categories'] as const,
    list: () => [...KEYS.all, 'list', getLang()] as const,
    detail: (slug: string) => [...KEYS.all, 'detail', getLang(), slug] as const,
};

export { KEYS as CATEGORY_KEYS };

/** All categories. Backend may return either a plain array or a paginated
 *  envelope depending on pagination settings — we normalize here. */
export const useCategories = () => {
    return useQuery({
        queryKey: KEYS.list(),
        queryFn: async () => {
            const { data } = await api.get<Category[] | { results: Category[] }>(
                API_ROUTES.categories,
            );
            if (Array.isArray(data)) return data;
            return 'results' in data ? data.results : [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

/** Single category metadata (used for category landing pages). */
export const useCategoryDetail = (slug: string) => {
    return useQuery({
        queryKey: KEYS.detail(slug),
        queryFn: async () => {
            const { data } = await api.get<Category>(API_ROUTES.categoryDetail(slug));
            return data;
        },
        enabled: !!slug,
    });
};
