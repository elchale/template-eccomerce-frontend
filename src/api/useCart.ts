/**
 * Server-side cart (authenticated users). The guest cart for anonymous
 * users lives in `useCartStore` and is merged into this cart on login.
 *
 * Add / update / remove mutations are optimistic (FE-8): they patch the
 * cached `Cart` immediately so the UI feels instant, snapshot the previous
 * state for rollback, then reconcile against the server via `onSettled`
 * invalidation. `useClearCart` is intentionally NOT optimistic — it sits
 * behind a confirmation modal where instant feedback isn't worth the risk
 * of an apparent-clear-then-restore flicker on failure.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Cart, CartItemRequest } from '@/types/order';

const KEYS = {
    all: ['cart'] as const,
    detail: () => [...KEYS.all, 'detail'] as const,
};

export { KEYS as CART_KEYS };

export const useCart = () => {
    const isLogged = useAuthStore((s) => s.isLogged);
    return useQuery({
        queryKey: KEYS.detail(),
        queryFn: async () => {
            const { data } = await api.get<Cart>(API_ROUTES.cart);
            return data;
        },
        enabled: isLogged,
    });
};

// FE-8: optimistic add-to-cart
export const useAddToCart = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (item: CartItemRequest) => {
            const { data } = await api.post(API_ROUTES.cartItems, item);
            return data;
        },
        onMutate: async (newItem: CartItemRequest) => {
            // Cancel any outgoing refetches so they don't overwrite our update
            await queryClient.cancelQueries({ queryKey: KEYS.detail() });

            // Snapshot the previous value for rollback
            const previousCart = queryClient.getQueryData<Cart>(KEYS.detail());

            // Optimistically update the cache
            if (previousCart) {
                const existingIndex = previousCart.items.findIndex(
                    (i) =>
                        i.product === newItem.product_id &&
                        i.variant === (newItem.variant_id ?? null),
                );

                // If the variant is already in the cart, bump its quantity; otherwise
                // leave the list as-is and let `onSettled` re-sync from the server
                // (we don't have full item data locally to build a phantom row).
                const updatedItems =
                    existingIndex === -1
                        ? previousCart.items
                        : previousCart.items.map((item, idx) =>
                              idx === existingIndex
                                  ? { ...item, quantity: item.quantity + newItem.quantity }
                                  : item,
                          );

                queryClient.setQueryData<Cart>(KEYS.detail(), {
                    ...previousCart,
                    items: updatedItems,
                    item_count: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
                });
            }

            return { previousCart };
        },
        onError: (_err, _newItem, context) => {
            // Rollback to previous state
            if (context?.previousCart) {
                queryClient.setQueryData(KEYS.detail(), context.previousCart);
            }
            toast.error('No se pudo actualizar el carrito. Inténtalo de nuevo.');
        },
        onSettled: () => {
            // Always refetch to sync with server after mutation
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};

// FE-8: optimistic quantity update
export const useUpdateCartItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
            const { data } = await api.patch(API_ROUTES.cartItemDetail(id), { quantity });
            return data;
        },
        onMutate: async ({ id, quantity }: { id: number; quantity: number }) => {
            await queryClient.cancelQueries({ queryKey: KEYS.detail() });

            const previousCart = queryClient.getQueryData<Cart>(KEYS.detail());

            if (previousCart) {
                const updatedItems = previousCart.items.map((item) =>
                    item.id === id ? { ...item, quantity } : item,
                );
                queryClient.setQueryData<Cart>(KEYS.detail(), {
                    ...previousCart,
                    items: updatedItems,
                    item_count: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
                });
            }

            return { previousCart };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(KEYS.detail(), context.previousCart);
            }
            toast.error('No se pudo actualizar el carrito. Inténtalo de nuevo.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};

// FE-8: optimistic remove item
export const useRemoveCartItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.delete(API_ROUTES.cartItemDelete(id));
            return data;
        },
        onMutate: async (id: number) => {
            await queryClient.cancelQueries({ queryKey: KEYS.detail() });

            const previousCart = queryClient.getQueryData<Cart>(KEYS.detail());

            if (previousCart) {
                const updatedItems = previousCart.items.filter((item) => item.id !== id);
                queryClient.setQueryData<Cart>(KEYS.detail(), {
                    ...previousCart,
                    items: updatedItems,
                    item_count: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
                });
            }

            return { previousCart };
        },
        onError: (_err, _id, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(KEYS.detail(), context.previousCart);
            }
            toast.error('No se pudo actualizar el carrito. Inténtalo de nuevo.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};

// useClearCart is intentionally non-optimistic (confirmed via modal before execution)
export const useClearCart = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.delete(API_ROUTES.cartClear);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};
