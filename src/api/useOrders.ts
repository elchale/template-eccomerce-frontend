/**
 * Customer order queries + checkout mutation.
 *
 * Checkout creates a pending order. The backend clears the user's cart at
 * order creation (the order is now the source of truth for "what the user
 * is buying"; if they bail before paying they can resume from the order
 * detail page). We invalidate the cart query here so the navbar badge +
 * cart drawer reflect the empty cart immediately.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CART_KEYS } from '@/api/useCart';
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
            // Backend clears the cart at order creation now, so refresh both
            // caches: orders so the new pending row shows up + the unpaid
            // badge updates, and cart so the navbar drawer + badge zero out.
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: CART_KEYS.all });
        },
    });
};
