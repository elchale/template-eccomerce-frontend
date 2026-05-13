import { useTranslation } from 'react-i18next';

import styles from './ProductGridSkeleton.module.css';
import { Skeleton } from './Skeleton';

interface ProductGridSkeletonProps {
    count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
    const { t } = useTranslation();
    return (
        <div className={styles.grid} aria-busy="true" aria-label={t('loading_products_aria')}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={styles.card}>
                    <Skeleton variant="rectangular" className={styles.image} />
                    <div className={styles.meta}>
                        <Skeleton variant="text" width="85%" height={16} />
                        <Skeleton variant="text" width="55%" height={14} />
                        <Skeleton variant="text" width="35%" height={18} />
                    </div>
                </div>
            ))}
        </div>
    );
}
