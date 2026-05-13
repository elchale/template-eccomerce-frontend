import { Moon, Sun } from '@phosphor-icons/react';

import { useThemeStore } from '@/stores/useThemeStore';

import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
    size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ size = 'md' }: ThemeToggleProps) {
    const themeId = useThemeStore((s) => s.themeId);
    const setTheme = useThemeStore((s) => s.setTheme);

    if (themeId !== 'classic' && themeId !== 'dark') return null;

    const isDark = themeId === 'dark';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            className={`${styles.toggle} ${styles[size]}`}
            onClick={() => setTheme(isDark ? 'classic' : 'dark')}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            <div className={styles.track}>
                <div className={styles.ball}>
                    {isDark ? <Moon className={styles.icon} /> : <Sun className={styles.icon} />}
                </div>
            </div>
        </button>
    );
}
