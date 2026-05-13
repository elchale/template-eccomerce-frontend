/**
 * Public product catalog queries (storefront only — admin product CRUD
 * lives in `useAdmin`).
 *
 * Cache keys embed `getLang()` so the ES/EN/PT variants don't collide;
 * switching language in `LanguageSwitcher` invalidates the whole tree.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { getLang } from '@/lib/i18n';
import type {
    ProductListItem,
    ProductDetail,
    ProductFilterParams,
    PaginatedResponse,
} from '@/types/product';

/** Query-key factory. Exposed as `PRODUCT_KEYS` so mutations elsewhere
 *  (e.g. wishlist, reviews) can target the right cache entries. */
const KEYS = {
    all: ['products'] as const,
    list: (params?: ProductFilterParams) => [...KEYS.all, 'list', getLang(), params] as const,
    detail: (slug: string) => [...KEYS.all, 'detail', getLang(), slug] as const,
};

export { KEYS as PRODUCT_KEYS };

/** Paginated product list with optional filters (category, search, ordering). */
export const useProducts = (params?: ProductFilterParams) => {
    return useQuery({
        queryKey: KEYS.list(params),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<ProductListItem>>(
                API_ROUTES.products,
                { params },
            );
            return data;
        },
    });
};

/** Single product fetched by slug (used by `ProductDetailPage`). */
export const useProductDetail = (slug: string) => {
    return useQuery({
        queryKey: KEYS.detail(slug),
        queryFn: async () => {
            const { data } = await api.get<ProductDetail>(API_ROUTES.productDetail(slug));
            return data;
        },
        enabled: !!slug,
    });
};
