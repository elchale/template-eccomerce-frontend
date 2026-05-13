/**
 * Tracks per-popup dismissal timestamps so we don't re-pester a user who
 * already closed a promo. Persisted to `localStorage`; map shape is
 * `{ [popupId]: timestamp_ms_of_last_dismiss }`.
 *
 * `shouldShowPopup(id, frecuenciaHoras)` is the public read API — the
 * popup config carries its own per-popup frequency (admin-configurable),
 * so the store doesn't hardcode policy.
 */
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/storage';

function getDismissals(): Record<number, number> {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.POPUP_DISMISSALS);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveDismissals(dismissals: Record<number, number>): void {
    try {
        localStorage.setItem(STORAGE_KEYS.POPUP_DISMISSALS, JSON.stringify(dismissals));
    } catch {
        // ignore storage errors
    }
}

interface MarketingState {
    dismissedPopups: Record<number, number>;
}

interface MarketingActions {
    shouldShowPopup: (popupId: number, frecuenciaHoras: number) => boolean;
    dismissPopup: (popupId: number) => void;
}

type MarketingStore = MarketingState & MarketingActions;

export const useMarketingStore = create<MarketingStore>()((set, get) => ({
    dismissedPopups: getDismissals(),

    shouldShowPopup: (popupId: number, frecuenciaHoras: number): boolean => {
        const dismissals = get().dismissedPopups;
        const lastDismissed = dismissals[popupId];
        if (!lastDismissed) return true;
        const elapsed = (Date.now() - lastDismissed) / (1000 * 60 * 60);
        return elapsed >= frecuenciaHoras;
    },

    dismissPopup: (popupId: number): void => {
        const updated = { ...get().dismissedPopups, [popupId]: Date.now() };
        saveDismissals(updated);
        set({ dismissedPopups: updated });
    },
}));
