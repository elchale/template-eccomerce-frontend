import { useState } from 'react';

import { Rating, Button } from '@/components/ui';
import type { ReviewCreateRequest } from '@/types/product';

import styles from './ReviewForm.module.css';

/**
 * Inline review composer rendered under a PDP's review list. Parent owns
 * the submit pipeline (`useCreateReview` mutation) and supplies the
 * product ID — the form emits a partial payload with `product: 0` that
 * the parent overrides before posting.
 *
 * Title/comment are conditionally spread so empty fields aren't sent to
 * the backend, letting it apply server-side defaults / null handling.
 */
interface ReviewFormProps {
    onSubmit: (data: ReviewCreateRequest) => void;
    isLoading?: boolean;
}

export function ReviewForm({ onSubmit, isLoading = false }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        const trimmedTitle = title.trim();
        const trimmedComment = comment.trim();
        onSubmit({
            product: 0, // will be set by the parent
            rating,
            ...(trimmedTitle && { title: trimmedTitle }),
            ...(trimmedComment && { comment: trimmedComment }),
        });
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field} role="group" aria-labelledby="review-rating-label">
                <span id="review-rating-label" className={styles.label}>
                    Rating *
                </span>
                <Rating value={rating} interactive onChange={setRating} size="lg" />
                {rating === 0 && <span className={styles.hint}>Select a rating</span>}
            </div>
            <div className={styles.field}>
                <label className={styles.label} htmlFor="review-title">
                    Title
                </label>
                <input
                    id="review-title"
                    type="text"
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your review"
                    maxLength={200}
                />
            </div>
            <div className={styles.field}>
                <label className={styles.label} htmlFor="review-comment">
                    Comment
                </label>
                <textarea
                    id="review-comment"
                    className={styles.textarea}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this product"
                    rows={4}
                    maxLength={2000}
                />
            </div>
            <Button type="submit" variant="primary" disabled={rating === 0 || isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Review'}
            </Button>
        </form>
    );
}
