import { useTranslation } from 'react-i18next';

import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
    status: string;
}

const statusStyleMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const { t } = useTranslation();
    const styleKey = statusStyleMap[status] || 'pending';
    const key = `order_status_${status}` as const;
    const label = t(key, { defaultValue: status.charAt(0).toUpperCase() + status.slice(1) });

    return <span className={`${styles.badge} ${styles[styleKey]}`}>{label}</span>;
}
