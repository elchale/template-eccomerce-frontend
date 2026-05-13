import { Truck } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { useStoreConfig } from '@/api/useMarketing';
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar';

import styles from './FreeShippingBar.module.css';

interface FreeShippingBarProps {
    currentTotal: number;
}

/** Fallback when the backend hasn't been seeded with a free-shipping
 *  threshold. Matches the value in `marketing/seed_data.py`. */
const DEFAULT_THRESHOLD = 50;

/**
 * Persuasion widget shown in the cart drawer and checkout page.
 * Visualizes "X away from free shipping" or congratulates the user when
 * they've crossed the threshold. Threshold comes from the admin-editable
 * `StoreConfig.free_shipping_threshold`.
 */
export function FreeShippingBar({ currentTotal }: FreeShippingBarProps) {
    const { t } = useTranslation();
    const { data: config } = useStoreConfig();
    const threshold = Number(config?.free_shipping_threshold ?? DEFAULT_THRESHOLD);
    const remaining = Math.max(0, threshold - currentTotal);
    const reachedFree = remaining === 0;

    return (
        <div className={styles.container}>
            <div className={styles.labelRow}>
                <Truck size={16} weight="fill" className={styles.icon} aria-hidden="true" />
                {reachedFree ? (
                    <span className={styles.labelSuccess}>{t('free_shipping_reached')}</span>
                ) : (
                    <span className={styles.label}>
                        {t('free_shipping_remaining', { amount: remaining.toFixed(2) })}
                    </span>
                )}
            </div>
            <ProgressBar value={currentTotal} max={threshold} color="var(--color-free-shipping)" />
        </div>
    );
}
