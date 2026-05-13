/**
 * Cart store — handles both the authenticated (server-backed) cart count
 * and the guest cart that lives entirely in `localStorage`.
 *
 * Two parallel concerns:
 *  - `itemCount` mirrors the backend cart badge for logged-in users.
 *  - `localItems` is the guest cart; persisted to `STORAGE_KEYS.GUEST_CART`
 *    so it survives reloads, and merged into the server cart on login (see
 *    `api/useCart` / login flow).
 *
 * `isCartOpen` controls the slide-over cart drawer; centralized here so any
 * "Add to cart" button anywhere in the tree can open it.
 */
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/storage';
import type { CartItem } from '@/types/order';

/** Guest cart line. Shape is local-only — server uses `CartItem` from `types/order`. */
export interface LocalCartItem {
    product_id: number;
    product_name: string;
    product_slug: string;
    product_image: string | null;
    variant_id: number | null;
    variant_info: string;
    unit_price: string;
    quantity: number;
}

function loadLocalCart(): LocalCartItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.GUEST_CART);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveLocalCart(items: LocalCartItem[]) {
    localStorage.setItem(STORAGE_KEYS.GUEST_CART, JSON.stringify(items));
}

/** Adapts a guest-cart line to the server `CartItem` shape so the same
 *  cart UI can render both. `id` is synthesized from the array index — it
 *  only needs to be unique for React key purposes. */
function localCartItemToCartItem(item: LocalCartItem, index: number): CartItem {
    const lineTotal = (Number.parseFloat(item.unit_price) * item.quantity).toFixed(2);
    return {
        id: index + 1, // fake id for CartItemRow key
        product: item.product_id,
        product_name: item.product_name,
        product_slug: item.product_slug,
        product_image: item.product_image,
        variant: item.variant_id,
        variant_info: item.variant_info,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: lineTotal,
    };
}

// ── Store ──
interface CartState {
    itemCount: number;
    isCartOpen: boolean;
    localItems: LocalCartItem[];
}

interface CartActions {
    setItemCount: (count: number) => void;
    incrementItemCount: () => void;
    decrementItemCount: () => void;
    toggleCart: () => void;
    openCart: () => void;
    closeCart: () => void;
    // Local cart actions
    addLocalItem: (item: LocalCartItem) => void;
    updateLocalItemQuantity: (
        productId: number,
        variantId: number | null,
        quantity: number,
    ) => void;
    removeLocalItem: (productId: number, variantId: number | null) => void;
    clearLocalCart: () => void;
    getLocalCartItems: () => CartItem[];
    getLocalSubtotal: () => string;
    getLocalItemCount: () => number;
}

type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>((set, get) => ({
    itemCount: 0,
    isCartOpen: false,
    localItems: loadLocalCart(),

    setItemCount: (count) => set({ itemCount: count }),
    incrementItemCount: () => set((state) => ({ itemCount: state.itemCount + 1 })),
    decrementItemCount: () => set((state) => ({ itemCount: Math.max(0, state.itemCount - 1) })),
    toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
    openCart: () => set({ isCartOpen: true }),
    closeCart: () => set({ isCartOpen: false }),

    /** Append or merge a line into the guest cart. Same `(product, variant)`
     *  combo increments quantity instead of duplicating the row. */
    addLocalItem: (item) => {
        set((state) => {
            const existingIndex = state.localItems.findIndex(
                (i) => i.product_id === item.product_id && i.variant_id === item.variant_id,
            );
            let newItems: LocalCartItem[];
            const existingItem = existingIndex !== -1 ? state.localItems[existingIndex] : undefined;
            if (existingItem) {
                newItems = [...state.localItems];
                newItems[existingIndex] = {
                    ...existingItem,
                    quantity: existingItem.quantity + item.quantity,
                };
            } else {
                newItems = [...state.localItems, item];
            }
            saveLocalCart(newItems);
            return { localItems: newItems };
        });
    },

    updateLocalItemQuantity: (productId, variantId, quantity) => {
        set((state) => {
            const newItems = state.localItems.map((i) =>
                i.product_id === productId && i.variant_id === variantId ? { ...i, quantity } : i,
            );
            saveLocalCart(newItems);
            return { localItems: newItems };
        });
    },

    removeLocalItem: (productId, variantId) => {
        set((state) => {
            const newItems = state.localItems.filter(
                (i) => !(i.product_id === productId && i.variant_id === variantId),
            );
            saveLocalCart(newItems);
            return { localItems: newItems };
        });
    },

    clearLocalCart: () => {
        localStorage.removeItem(STORAGE_KEYS.GUEST_CART);
        set({ localItems: [] });
    },

    getLocalCartItems: () => {
        return get().localItems.map(localCartItemToCartItem);
    },

    getLocalSubtotal: () => {
        return get()
            .localItems.reduce((sum, i) => sum + Number.parseFloat(i.unit_price) * i.quantity, 0)
            .toFixed(2);
    },

    getLocalItemCount: () => {
        return get().localItems.reduce((sum, i) => sum + i.quantity, 0);
    },
}));
