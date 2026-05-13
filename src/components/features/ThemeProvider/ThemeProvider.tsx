import { useEffect, useRef } from 'react';

import { useThemeSettings } from '@/api/useThemeSettings';
import { useThemeStore } from '@/stores/useThemeStore';

interface ThemeProviderProps {
    children: React.ReactNode;
}

/**
 * Hydrates the theme store from the public theme endpoint on first load.
 *
 * The pre-paint script in index.html and the Zustand initial state already
 * render whatever was in localStorage before this effect runs, so the page
 * paints with the visitor's last-seen theme even before this effect resolves.
 *
 * This effect's job is to bring the client into sync with the server, which
 * is the source of truth (the admin saves a theme and every visitor must
 * see it). It runs ONCE on the first data resolution; subsequent setTheme
 * calls (live previews) won't be overwritten because `data` doesn't change
 * unless the public query is invalidated by an admin save — and in that
 * case syncing to the new server value is the correct behavior.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const { data } = useThemeSettings();
    const setFromServer = useThemeStore((s) => s.setFromServer);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        if (!data) return;
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;
        setFromServer(data);
    }, [data, setFromServer]);

    return <>{children}</>;
}
