import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of {@link value} that updates only after {@link delayMs}
 * of inactivity.
 *
 * Use for: search-as-you-type, filter inputs, auto-save typing — anywhere the
 * trailing value matters but every keystroke shouldn't trigger work.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);

    return debounced;
}
