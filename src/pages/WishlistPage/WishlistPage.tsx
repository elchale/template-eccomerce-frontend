import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useWishlist, useToggleWishlist } from '@/api';
import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { ProductGridSkeleton, Skeleton, EmptyState, Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

import styles from './WishlistPage.module.css';

/**
 * `/wishlist` — list of saved products. Tapping the heart on a card calls
 * the same toggle endpoint as the PDP, so removing here also unflags the
 * product everywhere else through cache invalidation.
 */
export function WishlistPage() {
    const { t } = useTranslation('shop');
    const { data: wishlistItems, isLoading, error } = useWishlist();
    const toggleWishlist = useToggleWishlist();

    const handleWishlistToggle = (productId: number) => {
        toggleWishlist.mutate(productId, {
            onSuccess: () => {
                toast.success(t('product_wishlist_removed'));
            },
            onError: () => {
                toast.error(t('wishlist_remove_error'));
            },
        });
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <Skeleton variant="text" width={200} height={32} />
                    <Skeleton variant="text" width={120} height={16} />
                </div>
                <ProductGridSkeleton count={8} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <p>{t('wishlist_load_error')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('wishlist_title')}</h1>

            {!wishlistItems || wishlistItems.length === 0 ? (
                <EmptyState
                    title={t('wishlist_empty_title')}
                    message={t('wishlist_empty_message')}
                    action={
                        <Link to={ROUTES.shop}>
                            <Button variant="primary">{t('wishlist_browse_products')}</Button>
                        </Link>
                    }
                />
            ) : (
                <>
                    <p className={styles.count}>
                        {wishlistItems.length === 1
                            ? t('wishlist_count_one', { count: wishlistItems.length })
                            : t('wishlist_count_other', { count: wishlistItems.length })}
                    </p>
                    <div className={styles.productGrid}>
                        {wishlistItems.map((item) => (
                            <ProductCard
                                key={item.id}
                                product={item.product}
                                onWishlistToggle={handleWishlistToggle}
                                isWishlisted
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
