import { useTranslation } from 'react-i18next';

import { Skeleton } from './Skeleton';
import styles from './TableSkeleton.module.css';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showImageColumn?: boolean;
}

export function TableSkeleton({
    rows = 6,
    columns = 5,
    showImageColumn = false,
}: TableSkeletonProps) {
    const { t } = useTranslation();
    return (
        <div className={styles.wrapper} aria-busy="true" aria-label={t('loading')}>
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className={styles.row}>
                    {!!showImageColumn && (
                        <Skeleton variant="rectangular" className={styles.imageCell} />
                    )}
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton
                            key={colIdx}
                            variant="text"
                            height={14}
                            width={colIdx === 0 ? '70%' : colIdx === columns - 1 ? '40%' : '55%'}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
