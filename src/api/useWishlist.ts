/**
 * Wishlist (saved-for-later) — authenticated only.
 *
 * `useToggleWishlist` is a single endpoint: backend flips presence based on
 * the current state. Saves a round-trip vs. explicit add/remove.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { WishlistItem } from '@/types/product';

const KEYS = {
    all: ['wishlist'] as const,
    list: () => [...KEYS.all, 'list'] as const,
};

export { KEYS as WISHLIST_KEYS };

export const useWishlist = () => {
    const isLogged = useAuthStore((s) => s.isLogged);
    return useQuery({
        queryKey: KEYS.list(),
        queryFn: async () => {
            const { data } = await api.get<WishlistItem[] | { results: WishlistItem[] }>(
                API_ROUTES.wishlist,
            );
            if (Array.isArray(data)) return data;
            return 'results' in data ? data.results : [];
        },
        enabled: isLogged,
    });
};

export const useToggleWishlist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (productId: number) => {
            const { data } = await api.post(API_ROUTES.wishlistToggle, { product_id: productId });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};
