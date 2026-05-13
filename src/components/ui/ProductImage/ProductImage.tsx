import { ImageSquare } from '@phosphor-icons/react';
import { useState } from 'react';

import styles from './ProductImage.module.css';

interface ProductImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function ProductImage({ src, alt, className = '', size = 'md' }: ProductImageProps) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className={`${styles.fallback} ${styles[size]} ${className}`} aria-label={alt}>
                <div className={styles.iconWrapper}>
                    <ImageSquare weight="duotone" className={styles.icon} />
                </div>
                <span className={styles.label}>Sin imagen</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${styles.image} ${className}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            width={400}
            height={400}
        />
    );
}
