/**
 * Admin panel CRUD hooks — products, categories, coupons, orders, dashboard.
 *
 * Unlike the storefront queries, admin keys are NOT language-scoped: the
 * admin UI always works against the full translatable record (all locale
 * columns) so it can edit each language variant independently. Mutations
 * here invalidate both the admin cache and the matching storefront cache
 * so the catalog/category pages reflect changes immediately.
 *
 * Backend permissions enforce admin-only access — these hooks just assume
 * the user has the right role; gating happens at the route level.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CATEGORY_KEYS } from '@/api/useCategories';
import { ORDER_KEYS } from '@/api/useOrders';
import { PRODUCT_KEYS } from '@/api/useProducts';
import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type {
    DashboardData,
    AdminProduct,
    AdminCategory,
    AdminProductRequest,
    AdminCategoryRequest,
} from '@/types/admin';
import type { OrderListItem, OrderDetail, Coupon } from '@/types/order';
import type { ProductImage, ProductListItem, PaginatedResponse } from '@/types/product';

const KEYS = {
    all: ['admin'] as const,
    dashboard: () => [...KEYS.all, 'dashboard'] as const,
    products: () => [...KEYS.all, 'products'] as const,
    orders: (params?: Record<string, string>) => [...KEYS.all, 'orders', params] as const,
    orderDetail: (id: number) => [...KEYS.all, 'orders', 'detail', id] as const,
    coupons: () => [...KEYS.all, 'coupons'] as const,
    categories: () => [...KEYS.all, 'categories'] as const,
};

export { KEYS as ADMIN_KEYS };

/** KPI tiles for the admin home (revenue, order count, top products, etc.). */
export const useAdminDashboard = () => {
    return useQuery({
        queryKey: KEYS.dashboard(),
        queryFn: async () => {
            const { data } = await api.get<DashboardData>(API_ROUTES.adminDashboard);
            return data;
        },
    });
};

export const useAdminProducts = (params?: Record<string, string>) => {
    return useQuery({
        queryKey: [...KEYS.products(), params],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<ProductListItem>>(
                API_ROUTES.adminProducts,
                { params },
            );
            return data;
        },
    });
};

export const useAdminCreateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (product: AdminProductRequest) => {
            const { data } = await api.post(API_ROUTES.adminProducts, product);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.products() });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};

export const useAdminUpdateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...product }: AdminProductRequest & { id: number }) => {
            const { data } = await api.patch(API_ROUTES.adminProductDetail(id), product);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.products() });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};

export const useAdminDeleteProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(API_ROUTES.adminProductDetail(id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.products() });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};

export const useAdminProductDetail = (id: number) => {
    return useQuery({
        queryKey: [...KEYS.products(), 'detail', id],
        queryFn: async () => {
            const { data } = await api.get<AdminProduct & { images: ProductImage[] }>(
                API_ROUTES.adminProductDetail(id),
            );
            return data;
        },
        enabled: id > 0,
    });
};

/** Upload a product image. Multipart upload — backend streams to GCS and
 *  stores the public URL. `isPrimary` flag promotes the image to the
 *  hero slot (PDP main image, catalog thumbnail). */
export const useAdminUploadProductImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            productId,
            file,
            isPrimary,
        }: {
            productId: number;
            file: File;
            isPrimary?: boolean;
        }) => {
            const formData = new FormData();
            formData.append('image', file);
            if (isPrimary) formData.append('is_primary', 'true');
            const { data } = await api.post<ProductImage>(
                API_ROUTES.adminProductImages(productId),
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.products() });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};

export const useAdminDeleteProductImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ productId, imageId }: { productId: number; imageId: number }) => {
            await api.delete(API_ROUTES.adminProductImages(productId), {
                data: { image_id: imageId },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.products() });
            queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
        },
    });
};

export const useAdminOrders = (params?: Record<string, string>) => {
    return useQuery({
        queryKey: KEYS.orders(params),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<OrderListItem>>(
                API_ROUTES.adminOrders,
                { params },
            );
            return data;
        },
    });
};

export const useAdminOrderDetail = (id: number) => {
    return useQuery({
        queryKey: KEYS.orderDetail(id),
        queryFn: async () => {
            const { data } = await api.get<OrderDetail>(API_ROUTES.adminOrderDetail(id));
            return data;
        },
        enabled: !!id,
    });
};

/** Transition an order to a new status. The optional `note` is appended to
 *  the order's audit log on the backend. Both admin and customer order
 *  caches are invalidated since the customer's "track order" view reads
 *  the same status field. */
export const useAdminUpdateOrderStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
            const { data } = await api.patch(API_ROUTES.adminOrderStatus(id), {
                new_status: status,
                note,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
        },
    });
};

export const useAdminCoupons = (params?: Record<string, string>) => {
    return useQuery({
        queryKey: [...KEYS.coupons(), params],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Coupon>>(API_ROUTES.adminCoupons, {
                params,
            });
            return data;
        },
    });
};

export const useAdminCreateCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (coupon: Partial<Coupon>) => {
            const { data } = await api.post(API_ROUTES.adminCoupons, coupon);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.coupons() });
        },
    });
};

export const useAdminUpdateCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...coupon }: Partial<Coupon> & { id: number }) => {
            const { data } = await api.patch(API_ROUTES.adminCouponDetail(id), coupon);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.coupons() });
        },
    });
};

export const useAdminCategories = () => {
    return useQuery({
        queryKey: KEYS.categories(),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<AdminCategory>>(
                API_ROUTES.adminCategories,
            );
            return data.results;
        },
    });
};

export const useAdminCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (category: AdminCategoryRequest) => {
            const { data } = await api.post(API_ROUTES.adminCategories, category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.categories() });
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
        },
    });
};

export const useAdminUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...category }: AdminCategoryRequest & { id: number }) => {
            const { data } = await api.patch(API_ROUTES.adminCategoryDetail(id), category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.categories() });
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
        },
    });
};

export const useAdminDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(API_ROUTES.adminCategoryDetail(id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.categories() });
            queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
        },
    });
};

export const useAdminDeleteCoupon = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(API_ROUTES.adminCouponDetail(id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: KEYS.coupons() });
        },
    });
};
