/**
 * Admin CRUD for marketing entities: promotions, banners, popups, and the
 * global store config. Mirrors the read-only `useMarketing` hooks one-to-one,
 * but returns admin-shaped payloads (all locale columns, draft state, etc.).
 *
 * Image uploads are split into separate endpoints (`uploadImage`) because
 * the create/update flows take JSON, not multipart — splitting keeps the
 * happy path simple while still allowing image replacement without a full
 * re-save of the record.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type { Banner, Popup, PromocionAdmin, StoreConfig } from '@/types/marketing';
import type { PaginatedResponse } from '@/types/product';

export const ADMIN_MARKETING_KEYS = {
    all: ['admin-marketing'] as const,
    promociones: () => [...ADMIN_MARKETING_KEYS.all, 'promociones'] as const,
    promocionDetail: (id: number) => [...ADMIN_MARKETING_KEYS.all, 'promociones', id] as const,
    banners: () => [...ADMIN_MARKETING_KEYS.all, 'banners'] as const,
    bannerDetail: (id: number) => [...ADMIN_MARKETING_KEYS.all, 'banners', id] as const,
    popups: () => [...ADMIN_MARKETING_KEYS.all, 'popups'] as const,
    popupDetail: (id: number) => [...ADMIN_MARKETING_KEYS.all, 'popups', id] as const,
    config: () => [...ADMIN_MARKETING_KEYS.all, 'config'] as const,
} as const;

// ─── Promociones ─────────────────────────────────────────────────────────────

export const useAdminPromociones = (params?: Record<string, string>) =>
    useQuery({
        queryKey: [...ADMIN_MARKETING_KEYS.promociones(), params],
        queryFn: async (): Promise<PaginatedResponse<PromocionAdmin>> => {
            const { data } = await api.get<PaginatedResponse<PromocionAdmin>>(
                API_ROUTES.adminMarketingPromociones,
                { params },
            );
            return data;
        },
    });

export const useAdminPromocionDetail = (id: number) =>
    useQuery({
        queryKey: ADMIN_MARKETING_KEYS.promocionDetail(id),
        queryFn: async (): Promise<PromocionAdmin> => {
            const { data } = await api.get<PromocionAdmin>(
                API_ROUTES.adminMarketingPromocionDetail(id),
            );
            return data;
        },
        enabled: !!id,
    });

export const useAdminCreatePromocion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<PromocionAdmin>): Promise<PromocionAdmin> => {
            const { data } = await api.post<PromocionAdmin>(
                API_ROUTES.adminMarketingPromociones,
                payload,
            );
            return data;
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.promociones() }),
    });
};

export const useAdminUpdatePromocion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...payload
        }: Partial<PromocionAdmin> & { id: number }): Promise<PromocionAdmin> => {
            const { data } = await api.patch<PromocionAdmin>(
                API_ROUTES.adminMarketingPromocionDetail(id),
                payload,
            );
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.promociones() });
            queryClient.invalidateQueries({
                queryKey: ADMIN_MARKETING_KEYS.promocionDetail(vars.id),
            });
        },
    });
};

export const useAdminDeletePromocion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number): Promise<void> => {
            await api.delete(API_ROUTES.adminMarketingPromocionDetail(id));
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.promociones() }),
    });
};

// ─── Banners ─────────────────────────────────────────────────────────────────

export const useAdminBanners = (params?: Record<string, string>) =>
    useQuery({
        queryKey: [...ADMIN_MARKETING_KEYS.banners(), params],
        queryFn: async (): Promise<PaginatedResponse<Banner>> => {
            const { data } = await api.get<PaginatedResponse<Banner>>(
                API_ROUTES.adminMarketingBanners,
                { params },
            );
            return data;
        },
    });

export const useAdminBannerDetail = (id: number) =>
    useQuery({
        queryKey: ADMIN_MARKETING_KEYS.bannerDetail(id),
        queryFn: async (): Promise<Banner> => {
            const { data } = await api.get<Banner>(API_ROUTES.adminMarketingBannerDetail(id));
            return data;
        },
        enabled: !!id,
    });

export const useAdminCreateBanner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<Banner>): Promise<Banner> => {
            const { data } = await api.post<Banner>(API_ROUTES.adminMarketingBanners, payload);
            return data;
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.banners() }),
    });
};

export const useAdminUpdateBanner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            ...payload
        }: Partial<Banner> & { id: number }): Promise<Banner> => {
            const { data } = await api.patch<Banner>(
                API_ROUTES.adminMarketingBannerDetail(id),
                payload,
            );
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.banners() });
            queryClient.invalidateQueries({
                queryKey: ADMIN_MARKETING_KEYS.bannerDetail(vars.id),
            });
        },
    });
};

export const useAdminDeleteBanner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number): Promise<void> => {
            await api.delete(API_ROUTES.adminMarketingBannerDetail(id));
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.banners() }),
    });
};

export const useAdminUploadBannerImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            bannerId,
            file,
        }: {
            bannerId: number;
            file: File;
        }): Promise<{ image_url: string }> => {
            const formData = new FormData();
            formData.append('image', file);
            const { data } = await api.post<{ image_url: string }>(
                API_ROUTES.adminMarketingBannerUploadImage(bannerId),
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.banners() });
            queryClient.invalidateQueries({
                queryKey: ADMIN_MARKETING_KEYS.bannerDetail(vars.bannerId),
            });
        },
    });
};

// ─── Popups ──────────────────────────────────────────────────────────────────

export const useAdminPopups = (params?: Record<string, string>) =>
    useQuery({
        queryKey: [...ADMIN_MARKETING_KEYS.popups(), params],
        queryFn: async (): Promise<PaginatedResponse<Popup>> => {
            const { data } = await api.get<PaginatedResponse<Popup>>(
                API_ROUTES.adminMarketingPopups,
                { params },
            );
            return data;
        },
    });

export const useAdminPopupDetail = (id: number) =>
    useQuery({
        queryKey: ADMIN_MARKETING_KEYS.popupDetail(id),
        queryFn: async (): Promise<Popup> => {
            const { data } = await api.get<Popup>(API_ROUTES.adminMarketingPopupDetail(id));
            return data;
        },
        enabled: !!id,
    });

export const useAdminCreatePopup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<Popup>): Promise<Popup> => {
            const { data } = await api.post<Popup>(API_ROUTES.adminMarketingPopups, payload);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.popups() }),
    });
};

export const useAdminUpdatePopup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }: Partial<Popup> & { id: number }): Promise<Popup> => {
            const { data } = await api.patch<Popup>(
                API_ROUTES.adminMarketingPopupDetail(id),
                payload,
            );
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.popups() });
            queryClient.invalidateQueries({
                queryKey: ADMIN_MARKETING_KEYS.popupDetail(vars.id),
            });
        },
    });
};

export const useAdminDeletePopup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number): Promise<void> => {
            await api.delete(API_ROUTES.adminMarketingPopupDetail(id));
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.popups() }),
    });
};

export const useAdminUploadPopupImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            popupId,
            file,
        }: {
            popupId: number;
            file: File;
        }): Promise<{ image_url: string }> => {
            const formData = new FormData();
            formData.append('image', file);
            const { data } = await api.post<{ image_url: string }>(
                API_ROUTES.adminMarketingPopupUploadImage(popupId),
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.popups() });
            queryClient.invalidateQueries({
                queryKey: ADMIN_MARKETING_KEYS.popupDetail(vars.popupId),
            });
        },
    });
};

// ─── Store config ────────────────────────────────────────────────────────────

export const useAdminStoreConfig = () =>
    useQuery({
        queryKey: ADMIN_MARKETING_KEYS.config(),
        queryFn: async (): Promise<StoreConfig> => {
            const { data } = await api.get<StoreConfig>(API_ROUTES.adminMarketingConfig);
            return data;
        },
    });

export const useAdminUpdateStoreConfig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: StoreConfig): Promise<StoreConfig> => {
            const { data } = await api.patch<StoreConfig>(API_ROUTES.adminMarketingConfig, payload);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_MARKETING_KEYS.config() }),
    });
};
