import { ImageSquare } from '@phosphor-icons/react';
import { useState } from 'react';

import styles from './ImageGallery.module.css';

/**
 * Desktop product image viewer (one main image + vertical thumbnail strip).
 * `SwipeableGallery` handles the mobile counterpart with touch gestures.
 * Renders a placeholder when the product has no images.
 */
interface GalleryImage {
    id: number;
    image_url: string;
    alt_text: string;
}

interface ImageGalleryProps {
    images: GalleryImage[];
    size?: 'sm' | 'md' | 'lg';
}

export function ImageGallery({ images, size = 'md' }: ImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    if (images.length === 0) {
        return (
            <div className={`${styles.container} ${styles[size]}`}>
                <div className={styles.mainImage}>
                    <div className={styles.placeholder}>
                        <ImageSquare weight="duotone" size={48} />
                    </div>
                </div>
            </div>
        );
    }

    const selectedImage = images[selectedIndex] ?? images[0];
    if (!selectedImage) return null;

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <div className={styles.mainImage}>
                <img
                    src={selectedImage.image_url}
                    alt={selectedImage.alt_text}
                    className={styles.image}
                    loading="eager"
                    decoding="async"
                    width={600}
                    height={600}
                />
            </div>
            {images.length > 1 && (
                <div className={styles.thumbnails}>
                    {images.map((img, index) => (
                        <button
                            key={img.id}
                            className={`${styles.thumbnail} ${index === selectedIndex ? styles.active : ''}`}
                            onClick={() => setSelectedIndex(index)}
                            aria-label={`View ${img.alt_text}`}
                        >
                            <img
                                src={img.image_url}
                                alt={img.alt_text}
                                className={styles.thumbnailImage}
                                loading="lazy"
                                decoding="async"
                                width={80}
                                height={80}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
