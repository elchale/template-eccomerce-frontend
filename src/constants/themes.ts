import type { ThemeDefinition, ThemeId } from '@/types/theme';

export const DEFAULT_THEME_ID: ThemeId = 'classic';

export const THEMES: ThemeDefinition[] = [
    {
        id: 'classic',
        swatches: ['#ffffff', '#008060', '#18181b'],
    },
    {
        id: 'dark',
        swatches: ['#18181b', '#00a67d', '#fafafa'],
    },
    {
        id: 'elegant',
        swatches: ['#0F1724', '#D4AF37', '#F5EFE0'],
    },
    {
        id: 'nature',
        swatches: ['#FAF6EE', '#3F6B3F', '#1F2D1A'],
    },
    {
        id: 'vibrant',
        swatches: ['#FFFFFF', '#FF5722', '#000000'],
    },
    {
        id: 'pastel',
        swatches: ['#FFF5F8', '#B97F9C', '#3D2A35'],
    },
    {
        id: 'tech',
        swatches: ['#0A0E1A', '#00E0FF', '#A855F7'],
    },
    {
        id: 'minimal',
        swatches: ['#FFFFFF', '#1A1A1A', '#5A5A5A'],
    },
];

export const CUSTOMIZABLE_COLORS: { key: string; labelKey: string }[] = [
    { key: '--color-primary', labelKey: 'theme_color_label_primary' },
    { key: '--color-primary-hover', labelKey: 'theme_color_label_primary_hover' },
    { key: '--color-bg', labelKey: 'theme_color_label_bg' },
    { key: '--color-bg-subtle', labelKey: 'theme_color_label_bg_subtle' },
    { key: '--color-bg-accent', labelKey: 'theme_color_label_bg_accent' },
    { key: '--color-text', labelKey: 'theme_color_label_text' },
    { key: '--color-text-secondary', labelKey: 'theme_color_label_text_secondary' },
    { key: '--color-text-inverse', labelKey: 'theme_color_label_text_inverse' },
    { key: '--color-border', labelKey: 'theme_color_label_border' },
    { key: '--color-secondary', labelKey: 'theme_color_label_secondary' },
    { key: '--color-success', labelKey: 'theme_color_label_success' },
    { key: '--color-error', labelKey: 'theme_color_label_error' },
    { key: '--color-warning', labelKey: 'theme_color_label_warning' },
    { key: '--color-info', labelKey: 'theme_color_label_info' },
];
