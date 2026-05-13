import { useEffect, type RefObject } from 'react';

/**
 * Invokes {@link onOutside} when a `mousedown` happens outside the element pointed at by {@link ref}.
 *
 * Standard "click outside to close" affordance for dropdowns, popovers, autocomplete.
 *
 * @param enabled  Pass `false` to detach the listener (e.g. when the dropdown is closed)
 *                 — avoids handling clicks the consumer doesn't care about.
 */
export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    onOutside: () => void,
    enabled = true,
): void {
    useEffect(() => {
        if (!enabled) return;

        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onOutside();
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onOutside, enabled]);
}
