/**
 * Catalog domain types: categories, products, variants, images, reviews,
 * wishlist, plus the shared `PaginatedResponse` envelope and filter shape
 * used by storefront and admin queries.
 *
 * Locale-suffixed fields (e.g. `name_es`, `name_en`) are emitted by
 * `django-modeltranslation`; the bare field (`name`) reflects the active
 * `Accept-Language` header.
 */
export interface Category {
    id: number;
    name: string;
    slug: string;
    description: string;
    image_url: string;
    parent: number | null;
    is_active: boolean;
    sort_order: number;
    children?: Category[];
}

export interface ProductImage {
    id: number;
    image_url: string;
    alt_text: string;
    sort_order: number;
    is_primary: boolean;
}

export interface VariantOption {
    id: number;
    variant_type: number;
    variant_type_name: string;
    value: string;
}

export interface ProductVariant {
    id: number;
    sku: string;
    price: string;
    stock: number;
    options: VariantOption[];
    image_url: string;
    is_active: boolean;
}

export interface PrimaryImage {
    id: number;
    image_url: string;
    alt_text: string;
    sort_order: number;
    is_primary: boolean;
}

export interface PromocionResumen {
    tipo: string;
    valor_descuento: string;
    fecha_fin: string;
}

export interface ProductListItem {
    id: number;
    name: string;
    slug: string;
    description: string;
    category_name: string;
    category_slug: string;
    base_price: string;
    compare_at_price: string | null;
    is_active: boolean;
    is_featured: boolean;
    sku: string;
    stock: number;
    average_rating: string;
    review_count: number;
    primary_image: PrimaryImage | null;
    precio_promocion: string | null;
    promocion: PromocionResumen | null;
}

export interface ProductDetail extends ProductListItem {
    images: ProductImage[];
    variants: ProductVariant[];
}

export interface Review {
    id: number;
    user_email: string;
    user_name: string;
    product: number;
    rating: number;
    title: string;
    comment: string;
    is_verified_purchase: boolean;
    created: string;
}

export interface ReviewCreateRequest {
    product: number;
    rating: number;
    title?: string;
    comment?: string;
}

export interface WishlistItem {
    id: number;
    product: ProductListItem;
    created: string;
}

// Re-exported for backwards-compat. Canonical home is '@/types/api'.
export type { PaginatedResponse } from './api';

export interface ProductFilterParams {
    search?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    min_rating?: number;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
}
