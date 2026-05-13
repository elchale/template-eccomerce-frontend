/**
 * Admin-only response/request shapes. Mirrors the storefront types but
 * adds writeable fields and locale columns the admin UI edits directly.
 * `DashboardData` is the aggregate consumed by both the admin dashboard
 * and analytics pages.
 */
import type { OrderListItem } from './order';

export interface DashboardData {
    total_revenue: string;
    order_counts: Record<string, number>;
    top_products: {
        product__name: string;
        product__id: number | null;
        total_revenue: string;
        total_sold: number;
    }[];
    revenue_by_day: {
        date: string;
        revenue: string;
    }[];
    recent_orders: OrderListItem[];
    new_customers_count: number;
}

export interface AdminProduct {
    id: number;
    name: string;
    slug: string;
    description: string;
    name_es?: string;
    name_en?: string;
    name_pt?: string;
    description_es?: string;
    description_en?: string;
    description_pt?: string;
    category: number | null;
    base_price: string;
    compare_at_price: string | null;
    is_active: boolean;
    is_featured: boolean;
    sku: string;
    stock: number;
    average_rating: string;
    review_count: number;
}

export interface AdminCategory {
    id: number;
    name: string;
    slug: string;
    description?: string;
    name_es?: string;
    name_en?: string;
    name_pt?: string;
    description_es?: string;
    description_en?: string;
    description_pt?: string;
    image_url?: string;
    parent: number | null;
    is_active: boolean;
    sort_order: number;
    children?: AdminCategory[];
}

export interface AdminProductRequest {
    name_es: string;
    slug: string;
    description_es?: string;
    name_en?: string;
    name_pt?: string;
    description_en?: string;
    description_pt?: string;
    category?: number | null;
    base_price: string;
    compare_at_price?: string | null;
    is_active?: boolean;
    is_featured?: boolean;
    sku: string;
    stock?: number;
}

export interface AdminCategoryRequest {
    name_es: string;
    slug: string;
    description_es?: string;
    name_en?: string;
    name_pt?: string;
    image_url?: string;
    parent?: number | null;
    is_active?: boolean;
    sort_order?: number;
}
