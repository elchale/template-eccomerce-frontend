import type React from 'react';

import styles from './Badge.module.css';

interface BadgeProps {
    variant: 'sale' | 'new' | 'out-of-stock' | 'featured';
    children?: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
    const labelMap: Record<BadgeProps['variant'], string> = {
        sale: 'Sale',
        new: 'New',
        'out-of-stock': 'Out of Stock',
        featured: 'Featured',
    };

    return (
        <span className={`${styles.badge} ${styles[variant]}`}>
            {children || labelMap[variant]}
        </span>
    );
}
