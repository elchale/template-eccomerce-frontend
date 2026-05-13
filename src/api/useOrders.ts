/**
 * Customer order queries + checkout mutation.
 *
 * Checkout creates a pending order; the payment IPN clears the cart and
 * promotes the order to `paid`. That's why `useCheckout` deliberately does
 * NOT invalidate the cart cache — doing so before payment confirmation
 * would mislead the user into thinking their cart is empty (ADR D5).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderListItem, OrderDetail, CheckoutRequest } from '@/types/order';
import type { PaginatedResponse } from '@/types/product';

const KEYS = {
    all: ['orders'] as const,
    list: (params?: Record<string, string>) => [...KEYS.all, 'list', params] as const,
    detail: (orderNumber: string) => [...KEYS.all, 'detail', orderNumber] as const,
};

export { KEYS as ORDER_KEYS };

export const useOrders = (params?: Record<string, string>) => {
    const isLogged = useAuthStore((s) => s.isLogged);
    return useQuery({
        queryKey: KEYS.list(params),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<OrderListItem>>(API_ROUTES.orders, {
                params,
            });
            return data;
        },
        enabled: isLogged,
    });
};

export const useOrderDetail = (orderNumber: string) => {
    return useQuery({
        queryKey: KEYS.detail(orderNumber),
        queryFn: async () => {
            const { data } = await api.get<OrderDetail>(API_ROUTES.orderDetail(orderNumber));
            return data;
        },
        enabled: !!orderNumber,
    });
};

export const useCheckout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (checkoutData: CheckoutRequest) => {
            const { data } = await api.post(API_ROUTES.checkout, checkoutData);
            return data;
        },
        onSuccess: () => {
            // Only invalidate orders — cart is cleared server-side when the IPN
            // confirms payment (ADR D5). Invalidating cart here would mislead the
            // user into thinking it's empty before they've actually paid.
            queryClient.invalidateQueries({ queryKey: KEYS.all });
        },
    });
};
