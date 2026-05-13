/**
 * INITIAL_* defaults for admin form `useState` hooks. Pulled out of each form
 * component so the shape lives next to its type definition and is reusable
 * for `useState` initial value AND post-submit reset.
 */
import type {
    BannerFormState,
    PopupFormState,
    PromoFormState,
    CategoryFormState,
    CouponFormState,
} from '@/types/adminForms';

export const INITIAL_BANNER_FORM: BannerFormState = {
    nombre: '',
    tipo: 'hero',
    titulo_es: '',
    titulo_en: '',
    titulo_pt: '',
    subtitulo_es: '',
    subtitulo_en: '',
    subtitulo_pt: '',
    texto_cta_es: '',
    texto_cta_en: '',
    texto_cta_pt: '',
    enlace_cta: '',
    imagen_url: '',
    imagen_movil_url: '',
    color_fondo: '',
    color_texto: '',
    posicion: 0,
    es_activo: true,
    fecha_inicio: null,
    fecha_fin: null,
};

export const INITIAL_POPUP_FORM: PopupFormState = {
    nombre: '',
    tipo: 'bienvenida',
    titulo_es: '',
    titulo_en: '',
    titulo_pt: '',
    mensaje_es: '',
    mensaje_en: '',
    mensaje_pt: '',
    texto_cta_es: '',
    texto_cta_en: '',
    texto_cta_pt: '',
    imagen_url: '',
    enlace_cta: '',
    codigo_cupon: '',
    retraso_segundos: 0,
    frecuencia_horas: 24,
    es_activo: true,
    fecha_inicio: '',
    fecha_fin: '',
};

export const INITIAL_PROMO_FORM: PromoFormState = {
    nombre_es: '',
    nombre_en: '',
    nombre_pt: '',
    tipo: 'porcentaje',
    valor_descuento: '',
    aplica_a_todo: true,
    es_flash_sale: false,
    fecha_inicio: '',
    fecha_fin: '',
};

export const INITIAL_CATEGORY_FORM: CategoryFormState = {
    name: '',
    name_en: '',
    name_pt: '',
    slug: '',
    description: '',
    parent: '',
    sort_order: '0',
    is_active: true,
};

export const INITIAL_COUPON_FORM: CouponFormState = {
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase_amount: '0',
    max_discount_amount: '',
    usage_limit: '',
    is_active: true,
    valid_from: '',
    valid_until: '',
};
