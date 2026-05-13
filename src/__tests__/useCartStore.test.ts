/**
 * Tests for the local (guest) cart logic in useCartStore. The local cart is a
 * pure client-side store backed by localStorage — no API surface — so these
 * tests don't need MSW.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storage';
import { type LocalCartItem, useCartStore } from '@/stores/useCartStore';

const makeItem = (overrides: Partial<LocalCartItem> = {}): LocalCartItem => ({
    product_id: 1,
    product_name: 'Widget',
    product_slug: 'widget',
    product_image: null,
    variant_id: null,
    variant_info: '',
    unit_price: '10.00',
    quantity: 1,
    ...overrides,
});

describe('useCartStore — local cart', () => {
    beforeEach(() => {
        localStorage.clear();
        useCartStore.setState({ localItems: [], itemCount: 0, isCartOpen: false });
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('adds a new item and persists to localStorage', () => {
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 2 }));
        expect(useCartStore.getState().localItems).toHaveLength(1);
        expect(useCartStore.getState().localItems[0]?.quantity).toBe(2);
        const persisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.GUEST_CART) ?? '[]');
        expect(persisted).toHaveLength(1);
    });

    it('merges quantity when adding the same product+variant combo', () => {
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 2 }));
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 3 }));
        const items = useCartStore.getState().localItems;
        expect(items).toHaveLength(1);
        expect(items[0]?.quantity).toBe(5);
    });

    it('keeps items separate when variant_id differs', () => {
        useCartStore
            .getState()
            .addLocalItem(makeItem({ product_id: 1, variant_id: null, quantity: 1 }));
        useCartStore
            .getState()
            .addLocalItem(makeItem({ product_id: 1, variant_id: 99, quantity: 1 }));
        expect(useCartStore.getState().localItems).toHaveLength(2);
    });

    it('updates quantity for an existing local item', () => {
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 1 }));
        useCartStore.getState().updateLocalItemQuantity(1, null, 7);
        expect(useCartStore.getState().localItems[0]?.quantity).toBe(7);
    });

    it('removes a local item', () => {
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 1 }));
        useCartStore.getState().addLocalItem(makeItem({ product_id: 2, quantity: 1 }));
        useCartStore.getState().removeLocalItem(1, null);
        const items = useCartStore.getState().localItems;
        expect(items).toHaveLength(1);
        expect(items[0]?.product_id).toBe(2);
    });

    it('clears the local cart and wipes localStorage', () => {
        useCartStore.getState().addLocalItem(makeItem({ product_id: 1, quantity: 1 }));
        useCartStore.getState().clearLocalCart();
        expect(useCartStore.getState().localItems).toHaveLength(0);
        expect(localStorage.getItem(STORAGE_KEYS.GUEST_CART)).toBeNull();
    });
});
