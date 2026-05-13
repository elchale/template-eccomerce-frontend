import { useEffect } from 'react';

/**
 * Calls {@link onEscape} when the user presses Escape anywhere in the document.
 *
 * Standard dismiss affordance for modals, dropdowns, autocomplete.
 *
 * @param enabled  Pass `false` to detach the listener (e.g. when the modal is closed).
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onEscape();
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onEscape, enabled]);
}
