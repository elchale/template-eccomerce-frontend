import { Rating, Badge } from '@/components/ui';
import type { Review } from '@/types/product';

import styles from './ReviewCard.module.css';

interface ReviewCardProps {
    review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
    const date = new Date(review.created).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <Rating value={review.rating} size="sm" />
                {!!review.is_verified_purchase && <Badge variant="new">Verified Purchase</Badge>}
            </div>
            {!!review.title && <h4 className={styles.title}>{review.title}</h4>}
            {!!review.comment && <p className={styles.comment}>{review.comment}</p>}
            <div className={styles.footer}>
                <span className={styles.author}>{review.user_name || 'Anonymous'}</span>
                <span className={styles.date}>{date}</span>
            </div>
        </div>
    );
}
