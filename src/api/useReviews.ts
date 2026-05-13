/**
 * Product reviews — read + create.
 *
 * Creating a review invalidates both `reviews` (refresh the list) and
 * `products` (the product's `average_rating` / `review_count` aggregates
 * are recomputed server-side).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { PRODUCT_KEYS } from '@/api/useProducts';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type { Review, ReviewCreateRequest, PaginatedResponse } from '@/types/product';

const KEYS = {
    all: ['reviews'] as const,
    byProduct: (slug: string) => [...KEYS.all, 'product', slug] as const,
};

export { KEYS as REVIEW_KEYS };

/** Paginated reviews for a given product. */
export const useProductReviews = (slug: string) => {
    return useQuery({
        queryKey: KEYS.byProduct(slug),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Review>>(
                API_ROUTES.productReviews(slug),
            );
            return data;
        },
        enabled: !!slug,
    });
};

/** Post a new review. Backend enforces "one review per (user, product)". */
export const useCreateReview = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (review: ReviewCreateRequest) => {
            const { data } = await api.post(API_ROUTES.reviews, review);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};
