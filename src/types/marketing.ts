/**
 * Marketing domain — promotions, banners, popups, store configuration,
 * and search suggestions.
 *
 * The "shop" variants (`Promocion`, `Banner`, `Popup`) only carry the
 * fields the storefront needs to render; admin variants (`PromocionAdmin`)
 * include translation columns, draft state, and audit fields the admin
 * panel edits directly.
 */
export interface Promocion {
    id: number;
    nombre: string;
    nombre_es: string;
    nombre_en: string;
    nombre_pt: string;
    slug: string;
    tipo: 'porcentaje' | 'monto_fijo' | 'compra_x_lleva_y';
    valor_descuento: string;
    compra_cantidad: number | null;
    lleva_cantidad: number | null;
    aplica_a_todo: boolean;
    fecha_inicio: string;
    fecha_fin: string;
    es_flash_sale: boolean;
}

export interface PromocionAdmin extends Promocion {
    productos: number[];
    categorias: number[];
}

export interface Banner {
    id: number;
    nombre: string;
    tipo: 'hero' | 'anuncio' | 'categoria';
    titulo: string;
    titulo_es: string;
    titulo_en: string;
    titulo_pt: string;
    subtitulo: string;
    subtitulo_es: string;
    subtitulo_en: string;
    subtitulo_pt: string;
    texto_cta: string;
    texto_cta_es: string;
    texto_cta_en: string;
    texto_cta_pt: string;
    enlace_cta: string;
    imagen_url: string;
    imagen_movil_url: string;
    color_fondo: string;
    color_texto: string;
    posicion: number;
    es_activo: boolean;
    fecha_inicio: string | null;
    fecha_fin: string | null;
}

export interface Popup {
    id: number;
    nombre: string;
    tipo: 'bienvenida' | 'abandono_carrito' | 'intencion_salida' | 'suscripcion';
    titulo: string;
    titulo_es: string;
    titulo_en: string;
    titulo_pt: string;
    mensaje: string;
    mensaje_es: string;
    mensaje_en: string;
    mensaje_pt: string;
    imagen_url: string;
    texto_cta: string;
    texto_cta_es: string;
    texto_cta_en: string;
    texto_cta_pt: string;
    enlace_cta: string;
    codigo_cupon: string;
    retraso_segundos: number;
    frecuencia_horas: number;
    es_activo: boolean;
    fecha_inicio: string | null;
    fecha_fin: string | null;
}

export type StoreConfig = Record<string, boolean | string | number>;

export interface SearchSuggestion {
    id: number;
    name: string;
    slug: string;
    primary_image: string | null;
    base_price: string;
}
