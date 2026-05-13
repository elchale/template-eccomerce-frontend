import { formatCurrency } from '@/lib/formatCurrency';

import styles from './PriceDisplay.module.css';

interface PriceDisplayProps {
    price: string;
    comparePrice?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ price, comparePrice, size = 'md' }: PriceDisplayProps) {
    const hasDiscount = comparePrice && Number.parseFloat(comparePrice) > Number.parseFloat(price);

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <span className={`${styles.price} ${hasDiscount ? styles.discounted : ''}`}>
                {formatCurrency(price)}
            </span>
            {!!hasDiscount && (
                <span className={styles.comparePrice}>{formatCurrency(comparePrice)}</span>
            )}
        </div>
    );
}
