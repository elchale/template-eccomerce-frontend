import { Star } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Badge, PriceDisplay, ProductImage } from '@/components/ui';
import { buildRoute } from '@/constants/routes';
import type { ProductListItem } from '@/types/product';

import styles from './ProductCard.module.css';

/**
 * Tile for catalog grids (home, category, search). Whole card is a link
 * to the PDP; wishlist toggle is rendered conditionally and stops event
 * propagation so it doesn't trigger the link.
 *
 * `compact` variant is used inside dense grids (related products, etc.) —
 * smaller image, tighter text. Variant differs purely via CSS, no separate
 * component.
 */
interface ProductCardProps {
    product: ProductListItem;
    onWishlistToggle?: (id: number) => void;
    isWishlisted?: boolean;
    compact?: boolean;
}

function getImageUrl(img: ProductListItem['primary_image']): string | null {
    if (!img) return null;
    if (typeof img === 'string') return img;
    return img.image_url || null;
}

function getImageAlt(img: ProductListItem['primary_image'], fallback: string): string {
    if (!img) return fallback;
    if (typeof img === 'string') return fallback;
    return img.alt_text || fallback;
}

export function ProductCard({
    product,
    onWishlistToggle,
    isWishlisted = false,
    compact = false,
}: ProductCardProps) {
    const { t } = useTranslation('shop');

    const handleWishlistClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onWishlistToggle?.(product.id);
    };

    const rating = Number.parseFloat(product.average_rating) || 0;
    const comparePrice = product.compare_at_price ? Number.parseFloat(product.compare_at_price) : 0;
    const basePrice = Number.parseFloat(product.base_price) || 0;
    const hasDiscount = comparePrice > 0 && comparePrice > basePrice;
    const discountPercent = hasDiscount ? Math.round((1 - basePrice / comparePrice) * 100) : 0;

    const imgUrl = getImageUrl(product.primary_image);
    const imgAlt = getImageAlt(product.primary_image, product.name);

    return (
        <Link
            to={buildRoute.shopProduct(product.slug)}
            className={`${styles.card} ${compact ? styles.compact : ''}`}
            aria-label={t('product_card_aria', { name: product.name })}
        >
            <div className={styles.imageContainer}>
                <ProductImage src={imgUrl} alt={imgAlt} />
                {!!hasDiscount && discountPercent > 0 && (
                    <span className={styles.discountTag}>-{discountPercent}%</span>
                )}
                {product.stock === 0 && (
                    <div className={styles.badges}>
                        <Badge variant="out-of-stock" />
                    </div>
                )}
                {!!onWishlistToggle && (
                    <button
                        className={`${styles.wishlistButton} ${isWishlisted ? styles.wishlisted : ''}`}
                        onClick={handleWishlistClick}
                        aria-label={isWishlisted ? t('remove_from_wishlist') : t('add_to_wishlist')}
                    >
                        {isWishlisted ? '♥' : '♡'}
                    </button>
                )}
            </div>
            <div className={styles.content}>
                <h3 className={styles.name}>{product.name}</h3>
                <PriceDisplay
                    price={product.base_price}
                    comparePrice={product.compare_at_price}
                    size="sm"
                />
                {rating > 0 && (
                    <div className={styles.ratingRow}>
                        <Star weight="fill" className={styles.starIcon} />
                        <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
                        <span className={styles.ratingCount}>({product.review_count})</span>
                    </div>
                )}
                {/* Fake social-proof multiplier removed — use real sales data when available */}
            </div>
        </Link>
    );
}
