import { ImageSquare } from '@phosphor-icons/react';
import { useState, useRef, useCallback } from 'react';

import type { ProductImage } from '@/types/product';

import styles from './SwipeableGallery.module.css';

/**
 * Mobile product image viewer with horizontal swipe gestures. Tracks
 * touch start in both axes and only commits a swipe when horizontal
 * movement exceeds the vertical component — this avoids hijacking vertical
 * page-scroll on diagonal gestures.
 */
interface SwipeableGalleryProps {
    images: ProductImage[];
    size?: 'sm' | 'md' | 'lg';
}

export function SwipeableGallery({ images, size = 'md' }: SwipeableGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const goTo = useCallback(
        (idx: number) => {
            setActiveIndex(Math.max(0, Math.min(idx, images.length - 1)));
        },
        [images.length],
    );

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        touchStartX.current = t.clientX;
        touchStartY.current = t.clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const deltaX = t.clientX - touchStartX.current;
        const deltaY = t.clientY - touchStartY.current;

        // Only handle horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
            if (deltaX < 0) goTo(activeIndex + 1);
            else goTo(activeIndex - 1);
        }

        touchStartX.current = null;
        touchStartY.current = null;
    };

    if (images.length === 0) {
        return (
            <div className={`${styles.gallery} ${styles[size]}`}>
                <div className={styles.placeholder} aria-label="Sin imagen">
                    <ImageSquare weight="duotone" size={48} />
                </div>
            </div>
        );
    }

    const active = images[activeIndex] ?? images[0];
    if (!active) return null;

    return (
        <div className={`${styles.gallery} ${styles[size]}`}>
            <div
                className={styles.main}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    key={active.id}
                    src={active.image_url}
                    alt={active.alt_text || 'Imagen del producto'}
                    className={styles.mainImage}
                    loading={activeIndex === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    width={600}
                    height={600}
                />
            </div>

            {images.length > 1 && (
                <>
                    <div className={styles.dots} role="tablist">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                role="tab"
                                aria-selected={i === activeIndex}
                                aria-label={`Imagen ${i + 1}`}
                                className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                                onClick={() => goTo(i)}
                            />
                        ))}
                    </div>

                    <div className={styles.thumbnails}>
                        {images.map((img, i) => (
                            <button
                                key={img.id}
                                className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ''}`}
                                onClick={() => goTo(i)}
                                aria-label={`Ver imagen ${i + 1}`}
                            >
                                <img
                                    src={img.image_url}
                                    alt={img.alt_text || `Miniatura ${i + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    width={64}
                                    height={64}
                                />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
