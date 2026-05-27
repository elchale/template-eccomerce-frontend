/**
 * Customer order queries.
 *
 * Orders are created ONLY when a payment confirms (see `useCheckoutPay`). The
 * durable pre-payment state is the cart, not a "pending" order — so the order
 * list shows only real (paid) orders and there is no "resume payment from an
 * order" concept. The cart is resumable from any device; the buyer just
 * re-opens it and pays.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderListItem, OrderDetail } from '@/types/order';
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
