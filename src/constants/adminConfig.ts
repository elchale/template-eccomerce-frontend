import type { StoreConfigSectionDef } from '@/types/adminConfig';

/**
 * Source of truth for the admin store-config form structure.
 * Labels are i18n keys resolved at render time via t() in the admin namespace.
 */
export const STORE_CONFIG_SECTIONS: readonly StoreConfigSectionDef[] = [
    {
        titleKey: 'store_section_info_title',
        fields: [
            {
                key: 'site_name',
                labelKey: 'store_section_info_name',
                type: 'text',
                placeholder: 'Qolca Solutions',
            },
        ],
    },
    {
        titleKey: 'store_section_contact_title',
        descriptionKey: 'store_section_contact_desc',
        fields: [
            {
                key: 'contact_email',
                labelKey: 'store_section_contact_email',
                type: 'email',
                placeholder: 'info@ejemplo.com',
            },
            {
                key: 'contact_phone',
                labelKey: 'store_section_contact_phone',
                type: 'text',
                placeholder: '+51 999 999 999',
            },
            {
                key: 'contact_address',
                labelKey: 'store_section_contact_address',
                type: 'text',
                placeholder: 'Lima, Perú',
            },
        ],
    },
    {
        titleKey: 'store_section_social_title',
        descriptionKey: 'store_section_social_desc',
        fields: [
            {
                key: 'social_facebook',
                labelKey: 'store_section_social_facebook',
                type: 'url',
                placeholder: 'https://facebook.com/...',
            },
            {
                key: 'social_instagram',
                labelKey: 'store_section_social_instagram',
                type: 'url',
                placeholder: 'https://instagram.com/...',
            },
            {
                key: 'social_tiktok',
                labelKey: 'store_section_social_tiktok',
                type: 'url',
                placeholder: 'https://tiktok.com/@...',
            },
            {
                key: 'social_linkedin',
                labelKey: 'store_section_social_linkedin',
                type: 'url',
                placeholder: 'https://linkedin.com/in/...',
            },
            {
                key: 'social_website',
                labelKey: 'store_section_social_website',
                type: 'url',
                placeholder: 'https://...',
            },
        ],
    },
    {
        titleKey: 'store_section_footer_title',
        fields: [
            { key: 'footer_tagline', labelKey: 'store_section_footer_tagline', type: 'text' },
            { key: 'footer_byline', labelKey: 'store_section_footer_byline', type: 'text' },
        ],
    },
    {
        titleKey: 'store_section_seo_title',
        descriptionKey: 'store_section_seo_desc',
        fields: [
            {
                key: 'meta_description',
                labelKey: 'store_section_seo_meta_description',
                type: 'textarea',
                helpKey: 'store_section_seo_meta_description_help',
            },
            {
                key: 'meta_keywords',
                labelKey: 'store_section_seo_meta_keywords',
                type: 'text',
                placeholder: 'ecommerce, peru, moda',
            },
            {
                key: 'og_image_url',
                labelKey: 'store_section_seo_og_image',
                type: 'url',
                placeholder: 'https://...',
            },
        ],
    },
    {
        titleKey: 'store_section_shipping_title',
        fields: [
            {
                key: 'currency',
                labelKey: 'store_section_shipping_currency',
                type: 'text',
                placeholder: 'PEN',
            },
            {
                key: 'free_shipping_threshold',
                labelKey: 'store_section_shipping_free_threshold',
                type: 'number',
                placeholder: '0',
            },
        ],
    },
] as const;

export const STORE_CONFIG_KNOWN_KEYS: ReadonlySet<string> = new Set(
    STORE_CONFIG_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)),
);
