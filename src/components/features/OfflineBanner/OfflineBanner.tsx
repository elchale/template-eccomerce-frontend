import { useTranslation } from 'react-i18next';

import { useNetworkStatus } from '@/hooks';

import styles from './OfflineBanner.module.css';

/**
 * Site-wide banner shown when `navigator.onLine` is false. Pairs with the
 * `offlineFirst` `networkMode` on `queryClient` — cached data still renders,
 * but the user gets a visible signal that writes won't succeed.
 */
export function OfflineBanner() {
    const { t } = useTranslation();
    const { isOnline } = useNetworkStatus();

    if (isOnline) return null;

    return (
        <div className={styles.banner} role="alert" aria-live="polite">
            <span className={styles.icon} aria-hidden="true">
                ⚠
            </span>
            <span className={styles.text}>{t('offline_message')}</span>
        </div>
    );
}
