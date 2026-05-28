/**
 * Zod schemas for admin forms. Validation messages are namespace-qualified i18n
 * keys (`admin:<key>`) resolved by `FormInput` via i18next's namespace-agnostic
 * `t` at error-render time. Server-side validation errors come back as
 * already-translated strings via RHF's `setError(field, { type: 'server' })` —
 * i18next returns those verbatim since they aren't known keys.
 */
import { z } from 'zod';

// ─── Banner ─────────────────────────────────────────────────────────────────
export const bannerSchema = z.object({
    nombre: z.string().min(1, { message: 'admin:banner_form_required' }),
    tipo: z.enum(['hero', 'anuncio', 'categoria']),
    titulo_es: z.string().min(1, { message: 'admin:banner_form_required' }),
    titulo_en: z.string(),
    titulo_pt: z.string(),
    subtitulo_es: z.string(),
    subtitulo_en: z.string(),
    subtitulo_pt: z.string(),
    texto_cta_es: z.string(),
    texto_cta_en: z.string(),
    texto_cta_pt: z.string(),
    enlace_cta: z.string(),
    imagen_url: z.string(),
    imagen_movil_url: z.string(),
    color_fondo: z.string(),
    color_texto: z.string(),
    posicion: z.coerce.number().int(),
    es_activo: z.boolean(),
    fecha_inicio: z.string().nullable(),
    fecha_fin: z.string().nullable(),
});
export type BannerFormValues = z.infer<typeof bannerSchema>;

// ─── Popup ──────────────────────────────────────────────────────────────────
export const popupSchema = z.object({
    nombre: z.string().min(1, { message: 'admin:popup_form_required' }),
    tipo: z.enum(['bienvenida', 'abandono_carrito', 'intencion_salida', 'suscripcion']),
    titulo_es: z.string().min(1, { message: 'admin:popup_form_required' }),
    titulo_en: z.string(),
    titulo_pt: z.string(),
    mensaje_es: z.string(),
    mensaje_en: z.string(),
    mensaje_pt: z.string(),
    texto_cta_es: z.string(),
    texto_cta_en: z.string(),
    texto_cta_pt: z.string(),
    imagen_url: z.string(),
    enlace_cta: z.string(),
    codigo_cupon: z.string(),
    retraso_segundos: z.coerce.number().int().nonnegative(),
    frecuencia_horas: z.coerce.number().int().nonnegative(),
    es_activo: z.boolean(),
    fecha_inicio: z.string(),
    fecha_fin: z.string(),
});
export type PopupFormValues = z.infer<typeof popupSchema>;

// ─── Promo ──────────────────────────────────────────────────────────────────
export const promoSchema = z.object({
    nombre_es: z.string().min(1, { message: 'admin:promo_form_required' }),
    nombre_en: z.string(),
    nombre_pt: z.string(),
    tipo: z.enum(['porcentaje', 'monto_fijo', 'compra_x_lleva_y']),
    valor_descuento: z.string().min(1, { message: 'admin:promo_form_required' }),
    aplica_a_todo: z.boolean(),
    es_flash_sale: z.boolean(),
    fecha_inicio: z.string(),
    fecha_fin: z.string(),
});
export type PromoFormValues = z.infer<typeof promoSchema>;

// ─── Category ───────────────────────────────────────────────────────────────
export const categorySchema = z.object({
    name: z.string().min(1, { message: 'admin:categories_required_fields' }),
    name_en: z.string(),
    name_pt: z.string(),
    slug: z.string().min(1, { message: 'admin:categories_required_fields' }),
    description: z.string(),
    parent: z.string(), // raw select value; '' = no parent
    sort_order: z.string(), // raw input; coerced on submit
    is_active: z.boolean(),
});
export type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Coupon ─────────────────────────────────────────────────────────────────
export const couponSchema = z.object({
    code: z.string().min(1, { message: 'admin:coupons_code_required' }),
    description: z.string(),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.string().min(1, { message: 'admin:coupons_value_required' }),
    min_purchase_amount: z.string(),
    max_discount_amount: z.string(),
    usage_limit: z.string(),
    is_active: z.boolean(),
    valid_from: z.string(),
    valid_until: z.string(),
});
export type CouponFormValues = z.infer<typeof couponSchema>;
