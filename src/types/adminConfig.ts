/**
 * Admin store-config form schema shapes. Drives AdminStoreConfig rendering;
 * keep the SECTIONS data in @/constants/adminConfig.
 */
export type StoreConfigFieldType = 'text' | 'email' | 'url' | 'number' | 'textarea';

export interface StoreConfigFieldDef {
    key: string;
    /** i18n key, resolved at render time. */
    labelKey: string;
    type: StoreConfigFieldType;
    placeholder?: string;
    /** Optional i18n key for inline help text. */
    helpKey?: string;
}

export interface StoreConfigSectionDef {
    /** i18n key for the section title. */
    titleKey: string;
    /** Optional i18n key for the section description. */
    descriptionKey?: string;
    fields: StoreConfigFieldDef[];
}
