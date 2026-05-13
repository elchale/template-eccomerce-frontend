import { Star } from '@phosphor-icons/react';
import { useState } from 'react';

import styles from './Rating.module.css';

type RatingSize = 'sm' | 'md' | 'lg';

interface RatingProps {
    value: number;
    count?: number;
    size?: RatingSize;
    interactive?: boolean;
    onChange?: (value: number) => void;
}

const STAR_PIXEL_SIZE: Record<RatingSize, number> = { sm: 14, md: 18, lg: 22 };

export function Rating({ value, count, size = 'md', interactive = false, onChange }: RatingProps) {
    const [hoverValue, setHoverValue] = useState<number>(0);
    const displayValue = hoverValue || value;

    const handleSelect = (star: number) => {
        if (interactive && onChange) {
            onChange(star);
        }
    };

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => {
                    const filledClass = star <= displayValue ? styles.filled : styles.empty;
                    const interactiveClass = interactive ? styles.interactive : '';
                    return (
                        <span
                            key={star}
                            className={`${styles.star} ${filledClass} ${interactiveClass}`}
                            onClick={() => handleSelect(star)}
                            onMouseEnter={() => interactive && setHoverValue(star)}
                            onMouseLeave={() => interactive && setHoverValue(0)}
                            role={interactive ? 'button' : undefined}
                            tabIndex={interactive ? 0 : undefined}
                            aria-label={interactive ? `Rate ${star} stars` : undefined}
                            onKeyDown={(e) => {
                                if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleSelect(star);
                                }
                            }}
                        >
                            <Star
                                size={STAR_PIXEL_SIZE[size]}
                                weight={star <= displayValue ? 'fill' : 'regular'}
                            />
                        </span>
                    );
                })}
            </div>
            {count !== undefined && <span className={styles.count}>({count})</span>}
        </div>
    );
}
