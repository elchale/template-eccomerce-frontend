import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]:not([disabled])',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(',');

/**
 * Traps keyboard focus inside the element pointed at by {@link containerRef} while
 * {@link active} is true. On activation, moves focus to the first focusable
 * descendant; on deactivation, restores focus to whatever was focused before.
 *
 * Pairs with `role="dialog"` + `aria-modal="true"` to meet WAI-ARIA dialog
 * authoring practices.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
    useEffect(() => {
        if (!active) return;
        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        // Move focus into the modal on mount.
        const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const first = focusables[0];
        if (first) {
            first.focus();
        } else {
            // No focusable children — focus the container itself so screen readers anchor inside.
            container.tabIndex = -1;
            container.focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const els = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            if (els.length === 0) {
                e.preventDefault();
                return;
            }
            const firstEl = els[0]!;
            const lastEl = els[els.length - 1]!;
            const activeEl = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (activeEl === firstEl || !container.contains(activeEl)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (activeEl === lastEl) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus to the trigger that opened the modal.
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [active, containerRef]);
}
