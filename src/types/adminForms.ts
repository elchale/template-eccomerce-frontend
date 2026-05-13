/**
 * Admin form state shapes — kept centralized so they don't drift from the canonical
 * entity types they mirror. Each shape is derived via Pick/Omit where the entity
 * matches; only diverges (e.g. fecha_*: string vs string|null) are spelled out.
 */
import type { Banner, Popup, PromocionAdmin } from './marketing';

// ─────────────────────────────────────────────────────────────────────────────
// Banner — form omits id and the canonical (unsuffixed) language fields, which
// the backend derives from the active locale.
// ─────────────────────────────────────────────────────────────────────────────
export type BannerFormState = Omit<Banner, 'id' | 'titulo' | 'subtitulo' | 'texto_cta'>;

// ─────────────────────────────────────────────────────────────────────────────
// Popup — same pattern; form uses non-null `fecha_*: string`, sentinel '' = unset.
// ─────────────────────────────────────────────────────────────────────────────
export type PopupFormState = Omit<
    Popup,
    'id' | 'titulo' | 'mensaje' | 'texto_cta' | 'fecha_inicio' | 'fecha_fin'
> & {
    fecha_inicio: string;
    fecha_fin: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Promo — subset of PromocionAdmin; the form only edits these fields.
// ─────────────────────────────────────────────────────────────────────────────
export type PromoFormState = Pick<
    PromocionAdmin,
    | 'nombre_es'
    | 'nombre_en'
    | 'nombre_pt'
    | 'tipo'
    | 'valor_descuento'
    | 'aplica_a_todo'
    | 'es_flash_sale'
> & {
    fecha_inicio: string;
    fecha_fin: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Category — uses string-typed numeric fields because raw <input> values are strings;
// converted to number on submit.
// ─────────────────────────────────────────────────────────────────────────────
export interface CategoryFormState {
    name: string;
    name_en: string;
    name_pt: string;
    slug: string;
    description: string;
    parent: string;
    sort_order: string;
    is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coupon — same string-input pattern as Category.
// ─────────────────────────────────────────────────────────────────────────────
export interface CouponFormState {
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: string;
    min_purchase_amount: string;
    max_discount_amount: string;
    usage_limit: string;
    is_active: boolean;
    valid_from: string;
    valid_until: string;
}
