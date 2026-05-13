/**
 * Theme system types. `ThemeId` is the closed set of base palettes
 * (matched in `styles/variables.css` and `constants/themes.ts`).
 * `CustomColors` is the open per-token override map persisted by
 * `useThemeStore` and synced with the admin theme endpoint.
 */
export type ThemeId =
    | 'classic'
    | 'dark'
    | 'elegant'
    | 'nature'
    | 'vibrant'
    | 'pastel'
    | 'tech'
    | 'minimal';
export type CustomColors = Record<string, string>;

export interface ThemeDefinition {
    id: ThemeId;
    swatches: [string, string, string]; // [bg, primary, text]
}

export interface SiteThemeConfig {
    theme_id: ThemeId;
    custom_colors: CustomColors;
}

export interface AdminThemeResponse extends SiteThemeConfig {
    available_theme_ids: ThemeId[];
    customizable_color_keys: string[];
    updated: string;
}
