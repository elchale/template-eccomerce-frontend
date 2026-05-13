/**
 * Theme store — controls the `[data-theme="..."]` attribute on `<html>`
 * and any admin-configured per-token color overrides.
 *
 * Two layers stack:
 *  1. `themeId` selects a base palette (`classic`, `dark`, etc.) defined in
 *     `styles/variables.css`.
 *  2. `customColors` is a `{ "--color-x": "#hex" }` map that the admin can
 *     edit at runtime. It's injected as a `<style>` tag scoped to
 *     `[data-theme="<id>"]` so overrides apply to the active palette only.
 *
 * Initial state is read from `localStorage` to match what the
 * pre-paint inline script in `index.html` already applied, preventing FOUC.
 * `setFromServer()` is called by `useThemeSettings` once the canonical
 * config arrives from the API, marking the store hydrated.
 */
import { create } from 'zustand';

import { DOM_IDS, STORAGE_KEYS } from '@/constants/storage';
import type { ThemeId, CustomColors, SiteThemeConfig } from '@/types/theme';

// ============================================
// Helper: inject/remove custom color overrides
// ============================================

/** Append (or refresh) a `<style>` tag that maps custom color tokens
 *  under the current theme selector. Removed when the override map is empty. */
function _injectCustomColors(themeId: ThemeId, customColors: CustomColors) {
    let tag = document.getElementById(DOM_IDS.THEME_OVERRIDES_STYLE) as HTMLStyleElement | null;
    if (Object.keys(customColors).length === 0) {
        tag?.remove();
        return;
    }
    if (!tag) {
        tag = document.createElement('style');
        tag.id = DOM_IDS.THEME_OVERRIDES_STYLE;
        document.head.appendChild(tag);
    }
    const vars = Object.entries(customColors)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n');
    tag.textContent = `[data-theme="${themeId}"] {\n${vars}\n}`;
}

function _persistColors(customColors: CustomColors) {
    try {
        if (Object.keys(customColors).length === 0) {
            localStorage.removeItem(STORAGE_KEYS.THEME_CUSTOM_COLORS);
        } else {
            localStorage.setItem(STORAGE_KEYS.THEME_CUSTOM_COLORS, JSON.stringify(customColors));
        }
    } catch {
        // localStorage unavailable (private mode, quota) — fail silently
    }
}

// ============================================
// Read initial state from localStorage
// (matches what the pre-paint script already applied to the DOM)
// ============================================

function _initialState(): { themeId: ThemeId; customColors: CustomColors } {
    let themeId: ThemeId = 'classic';
    let customColors: CustomColors = {};
    try {
        const t = localStorage.getItem(STORAGE_KEYS.THEME);
        if (t) themeId = t as ThemeId;
        const raw = localStorage.getItem(STORAGE_KEYS.THEME_CUSTOM_COLORS);
        if (raw) customColors = JSON.parse(raw);
    } catch {
        // ignore
    }
    return { themeId, customColors };
}

// ============================================
// Store
// ============================================

interface State {
    themeId: ThemeId;
    customColors: CustomColors;
    isHydrated: boolean;
}

interface Actions {
    setTheme: (themeId: ThemeId) => void;
    setCustomColor: (key: string, value: string) => void;
    resetCustomColor: (key: string) => void;
    resetAllCustomColors: () => void;
    setFromServer: (config: SiteThemeConfig) => void;
}

type Store = State & Actions;

const initial = _initialState();

export const useThemeStore = create<Store>()((set, get) => ({
    // State
    themeId: initial.themeId,
    customColors: initial.customColors,
    isHydrated: false,

    // Actions
    setTheme: (themeId) => {
        document.documentElement.setAttribute('data-theme', themeId);
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, themeId);
        } catch {
            /* ignore */
        }
        set({ themeId });
        // Re-inject custom colors with the new themeId selector
        _injectCustomColors(themeId, get().customColors);
    },

    setCustomColor: (key, value) => {
        const newCustomColors = { ...get().customColors, [key]: value };
        set({ customColors: newCustomColors });
        _injectCustomColors(get().themeId, newCustomColors);
        _persistColors(newCustomColors);
    },

    resetCustomColor: (key) => {
        const newCustomColors = { ...get().customColors };
        delete newCustomColors[key];
        set({ customColors: newCustomColors });
        _injectCustomColors(get().themeId, newCustomColors);
        _persistColors(newCustomColors);
    },

    resetAllCustomColors: () => {
        set({ customColors: {} });
        _injectCustomColors(get().themeId, {});
        _persistColors({});
    },

    /** Applied once the backend's source-of-truth theme config arrives.
     *  Overwrites any local guesses and flips `isHydrated` so admin pages
     *  can stop showing the loading skeleton. */
    setFromServer: (config) => {
        const { theme_id, custom_colors } = config;
        // Guard against malformed or empty API responses — custom_colors may be
        // absent if the backend returns a partial config object.
        const safeColors: CustomColors = custom_colors ?? {};
        const safeThemeId: ThemeId = theme_id ?? 'classic';
        document.documentElement.setAttribute('data-theme', safeThemeId);
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, safeThemeId);
        } catch {
            /* ignore */
        }
        set({ themeId: safeThemeId, customColors: safeColors, isHydrated: true });
        _injectCustomColors(safeThemeId, safeColors);
        _persistColors(safeColors);
    },
}));
