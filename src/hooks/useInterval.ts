import { useEffect, useRef } from 'react';

/**
 * Sets up a `setInterval` that fires the latest {@link callback} every {@link delayMs}.
 *
 * - Uses a ref so the callback can change between renders without restarting the interval.
 * - Pass `delayMs = null` to pause.
 *
 * Adapted from Dan Abramov's classic "useInterval" pattern.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
    const savedCallback = useRef(callback);

    // Always have the latest callback without resetting the interval.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delayMs === null) return;
        const id = setInterval(() => savedCallback.current(), delayMs);
        return () => clearInterval(id);
    }, [delayMs]);
}
