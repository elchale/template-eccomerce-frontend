import { useState, useEffect } from 'react';

/**
 * FE-6: Hook that tracks the browser's online/offline status.
 * Subscribes to the window 'online' and 'offline' events.
 *
 * @returns {{ isOnline: boolean }} Current network status
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline };
}
