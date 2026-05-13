import { ArrowLeft } from '@phosphor-icons/react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import {
    useProductDetail,
    useProductReviews,
    useAddToCart,
    useCreateReview,
    useToggleWishlist,
    useWishlist,
} from '@/api';
import { ReviewCard } from '@/components/features/ReviewCard/ReviewCard';
import { ReviewForm } from '@/components/features/ReviewForm/ReviewForm';
import { StickyAddToCart } from '@/components/features/StickyAddToCart/StickyAddToCart';
import {
    Spinner,
    Skeleton,
    PriceDisplay,
    Rating,
    QuantitySelector,
    Button,
    SwipeableGallery,
    CountdownTimer,
    EmptyState,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import type { ProductVariant, ReviewCreateRequest } from '@/types/product';

import styles from './ProductDetailPage.module.css';

/**
 * `/product/:slug` — Product Detail Page. Three concerns wired in:
 *  - Variant selection — picking attribute combinations resolves to a
 *    `ProductVariant`, which overrides price/stock/SKU.
 *  - Add to cart — logged-in users hit the server cart mutation, guests
 *    store the item in `useCartStore.localItems`. Both open the cart drawer.
 *  - Reviews — paginated list plus an inline create form for logged-in
 *    users who haven't reviewed this product yet.
 *
 * `StickyAddToCart` is a sticky variant of the CTA shown on mobile when
 * the primary button scrolls out of view.
 */
export function ProductDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const isLogged = useAuthStore((s) => s.isLogged);
    const addLocalItem = useCartStore((s) => s.addLocalItem);
    const { t } = useTranslation('shop');

    const { data: product, isLoading: productLoading } = useProductDetail(slug || '');
    const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(slug || '');
    const { data: wishlistItems } = useWishlist();

    const addToCart = useAddToCart();
    const createReview = useCreateReview();
    const toggleWishlist = useToggleWishlist();

    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const addToCartBtnRef = useRef<HTMLDivElement | null>(null);

    const isWishlisted = wishlistItems?.some((item) => item.product.id === product?.id) ?? false;

    // Group variant options by variant type
    const variantTypes = product?.variants?.reduce<
        Record<string, { typeId: number; values: Set<string> }>
    >((acc, variant) => {
        variant.options.forEach((option) => {
            let entry = acc[option.variant_type_name];
            if (!entry) {
                entry = {
                    typeId: option.variant_type,
                    values: new Set(),
                };
                acc[option.variant_type_name] = entry;
            }
            entry.values.add(option.value);
        });
        return acc;
    }, {});

    // Find matching variant based on selected options
    const findMatchingVariant = (options: Record<string, string>): ProductVariant | null => {
        if (!product?.variants) return null;
        const optionValues = Object.values(options);
        return (
            product.variants.find(
                (variant) =>
                    variant.is_active &&
                    variant.options.every((opt) => optionValues.includes(opt.value)),
            ) ?? null
        );
    };

    const handleOptionSelect = (typeName: string, value: string) => {
        const newOptions = { ...selectedOptions, [typeName]: value };
        setSelectedOptions(newOptions);
        const matched = findMatchingVariant(newOptions);
        setSelectedVariant(matched);
    };

    const handleAddToCart = () => {
        if (!product) return;

        if ((product.variants?.length ?? 0) > 0 && !selectedVariant) {
            toast.error(t('product_select_options'));
            return;
        }

        if (isLogged) {
            addToCart.mutate(
                {
                    product_id: product.id,
                    quantity,
                    ...(selectedVariant && { variant_id: selectedVariant.id }),
                },
                {
                    onSuccess: () => {
                        toast.success(t('product_added'));
                        setQuantity(1);
                    },
                    onError: () => {
                        toast.error(t('product_add_error'));
                    },
                },
            );
        } else {
            addLocalItem({
                product_id: product.id,
                product_name: product.name,
                product_slug: product.slug,
                product_image: product.primary_image
                    ? typeof product.primary_image === 'string'
                        ? product.primary_image
                        : product.primary_image.image_url
                    : null,
                variant_id: selectedVariant?.id ?? null,
                variant_info: selectedVariant
                    ? selectedVariant.options.map((o) => o.value).join(' / ')
                    : '',
                unit_price: selectedVariant?.price || product.base_price,
                quantity,
            });
            toast.success(t('product_added'));
            setQuantity(1);
        }
    };

    const handleCreateReview = (data: ReviewCreateRequest) => {
        if (!product) return;
        createReview.mutate(
            { ...data, product: product.id },
            {
                onSuccess: () => {
                    toast.success(t('product_review_sent'));
                },
                onError: () => {
                    toast.error(t('product_review_error'));
                },
            },
        );
    };

    const handleWishlistToggle = () => {
        if (!product) return;
        if (!isLogged) {
            toast.error(t('product_wishlist_login'));
            return;
        }
        toggleWishlist.mutate(product.id, {
            onSuccess: () => {
                toast.success(
                    isWishlisted ? t('product_wishlist_remove') : t('product_wishlist_added'),
                );
            },
        });
    };

    const displayPrice = selectedVariant?.price || product?.base_price || '0';
    const displayStock = selectedVariant?.stock ?? product?.stock ?? 0;
    const isOutOfStock = displayStock === 0;

    if (productLoading) {
        return (
            <div className={styles.skeletonPage}>
                <Skeleton variant="rectangular" className={styles.skeletonGallery} />
                <div className={styles.skeletonInfo}>
                    <Skeleton variant="text" width="70%" height={28} />
                    <Skeleton variant="text" width="40%" height={24} />
                    <Skeleton variant="text" width="30%" height={20} />
                    <div className={styles.skeletonSpacer} />
                    <Skeleton variant="text" width="100%" height={16} />
                    <Skeleton variant="text" width="100%" height={16} />
                    <Skeleton variant="text" width="60%" height={16} />
                    <div className={styles.skeletonSpacer} />
                    <Skeleton variant="rectangular" width="100%" height={48} />
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className={styles.errorContainer}>
                <EmptyState
                    title={t('product_not_found')}
                    message={t('product_not_found_message')}
                    action={
                        <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
                            {t('product_back_to_store')}
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button
                className={styles.backButton}
                onClick={() => navigate(-1)}
                aria-label={t('product_back_to_store')}
            >
                <ArrowLeft size={16} weight="bold" /> {t('product_back_to_store')}
            </button>

            {/* Product Section */}
            <section className={styles.productSection}>
                <div className={styles.gallery}>
                    <SwipeableGallery images={product.images} size="lg" />
                </div>

                <div className={styles.info}>
                    <span className={styles.category}>{product.category_name}</span>
                    <h1 className={styles.name}>{product.name}</h1>

                    <div className={styles.ratingRow}>
                        <Rating
                            value={Number.parseFloat(product.average_rating)}
                            count={product.review_count}
                            size="md"
                        />
                    </div>

                    {product.precio_promocion ? (
                        <div className={styles.priceRow}>
                            <span className={styles.promoPrice}>
                                {formatCurrency(product.precio_promocion)}
                            </span>
                            <span className={styles.originalPrice}>
                                {formatCurrency(displayPrice)}
                            </span>
                        </div>
                    ) : (
                        <PriceDisplay
                            price={displayPrice}
                            comparePrice={product.compare_at_price}
                            size="lg"
                        />
                    )}

                    {!!product.promocion?.fecha_fin && (
                        <div className={styles.countdown}>
                            <span className={styles.countdownLabel}>{t('product_ends_in')}</span>
                            <CountdownTimer targetDate={product.promocion.fecha_fin} size="md" />
                        </div>
                    )}

                    <p className={styles.description}>{product.description}</p>

                    {/* Variant Selectors */}
                    {!!variantTypes && Object.keys(variantTypes).length > 0 && (
                        <div className={styles.variants}>
                            {Object.entries(variantTypes).map(([typeName, { values }]) => (
                                <div key={typeName} className={styles.variantGroup}>
                                    <label className={styles.variantLabel}>{typeName}</label>
                                    <div className={styles.variantOptions}>
                                        {Array.from(values).map((value) => (
                                            <button
                                                key={value}
                                                className={`${styles.variantPill} ${
                                                    selectedOptions[typeName] === value
                                                        ? styles.variantPillActive
                                                        : ''
                                                }`}
                                                onClick={() => handleOptionSelect(typeName, value)}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stock Status */}
                    <div className={styles.stockStatus}>
                        {isOutOfStock ? (
                            <span className={styles.outOfStock}>{t('product_out_of_stock')}</span>
                        ) : (
                            <span className={styles.inStock}>
                                {t('product_in_stock', { count: displayStock })}
                            </span>
                        )}
                    </div>

                    {/* Add to Cart */}
                    <div ref={addToCartBtnRef} className={styles.addToCart}>
                        <QuantitySelector
                            value={quantity}
                            onChange={setQuantity}
                            min={1}
                            max={Math.min(displayStock, 99)}
                        />
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleAddToCart}
                            disabled={isOutOfStock || addToCart.isPending}
                        >
                            {addToCart.isPending ? t('product_adding') : t('product_add_to_cart')}
                        </Button>
                        <button
                            className={`${styles.wishlistButton} ${isWishlisted ? styles.wishlisted : ''}`}
                            onClick={handleWishlistToggle}
                            aria-label={
                                isWishlisted
                                    ? t('product_wishlist_remove')
                                    : t('product_wishlist_add')
                            }
                        >
                            {isWishlisted ? '♥' : '♡'}
                        </button>
                    </div>

                    {/* SKU */}
                    <div className={styles.meta}>
                        <span className={styles.sku}>
                            SKU: {selectedVariant?.sku || product.sku}
                        </span>
                    </div>
                </div>
            </section>

            {/* Sticky Add to Cart */}
            <StickyAddToCart
                productName={product.name}
                price={displayPrice}
                onAddToCart={handleAddToCart}
                isLoading={addToCart.isPending}
                isDisabled={isOutOfStock}
                mainCtaRef={addToCartBtnRef}
            />

            {/* Reviews Section */}
            <section className={styles.reviewsSection}>
                <h2 className={styles.reviewsTitle}>
                    {t('product_reviews', { count: product.review_count })}
                </h2>

                {reviewsLoading ? (
                    <div className={styles.loadingContainer}>
                        <Spinner size="md" variant="primary" />
                    </div>
                ) : (
                    <div className={styles.reviewsList}>
                        {reviewsData && reviewsData.results.length > 0 ? (
                            reviewsData.results.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))
                        ) : (
                            <p className={styles.noReviews}>{t('product_no_reviews')}</p>
                        )}
                    </div>
                )}

                {!!isLogged && (
                    <div className={styles.reviewFormContainer}>
                        <h3 className={styles.reviewFormTitle}>{t('product_write_review')}</h3>
                        <ReviewForm
                            onSubmit={handleCreateReview}
                            isLoading={createReview.isPending}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}
