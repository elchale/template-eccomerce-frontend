import { describe, it, expect, beforeEach } from 'vitest';

import { useMarketingStore } from '../stores/useMarketingStore';

describe('useMarketingStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useMarketingStore.setState({ dismissedPopups: {} });
    });

    it('shows popup when never dismissed', () => {
        const { shouldShowPopup } = useMarketingStore.getState();
        expect(shouldShowPopup(1, 24)).toBe(true);
    });

    it('hides popup immediately after dismiss', () => {
        const { dismissPopup, shouldShowPopup } = useMarketingStore.getState();
        dismissPopup(1);
        expect(shouldShowPopup(1, 24)).toBe(false);
    });

    it('shows popup after frecuencia hours have passed', () => {
        const { dismissPopup, shouldShowPopup } = useMarketingStore.getState();
        dismissPopup(1);
        // Manually set an old timestamp (25 hours ago)
        const old = Date.now() - 25 * 60 * 60 * 1000;
        useMarketingStore.setState({ dismissedPopups: { 1: old } });
        expect(shouldShowPopup(1, 24)).toBe(true);
    });
});
