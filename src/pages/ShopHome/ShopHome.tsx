import { ArrowRight, Star, TrendUp, Fire as FireIcon, CurrencyDollar } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useCategories, useProducts } from '@/api';
import { FlashSaleSection } from '@/components/features/FlashSaleSection/FlashSaleSection';
import { HeroBanner } from '@/components/features/HeroBanner/HeroBanner';
import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { QuickBuyButton } from '@/components/features/QuickBuyButton/QuickBuyButton';
import { Skeleton, EmptyState } from '@/components/ui';
import { ROUTES, buildRoute } from '@/constants/routes';
import type { QuickFilter } from '@/types/shop';

import styles from './ShopHome.module.css';

function getFilterParams(filter: QuickFilter) {
    switch (filter) {
        case 'featured':
            return { is_featured: true, limit: 20 };
        case 'top_rated':
            return { min_rating: 4, limit: 20 };
        case 'budget':
            return { max_price: 50, limit: 20 };
        case 'premium':
            return { min_price: 100, limit: 20 };
        default:
            return { limit: 20 };
    }
}

/**
 * `/` — storefront landing page. Stacks:
 *  - Hero banner carousel (admin-configurable via marketing/banners)
 *  - Flash sales row
 *  - Category tiles
 *  - Featured products grid
 *  - Quick filter chips (all/featured/top_rated/budget/premium) that
 *    swap the secondary product grid below — each filter maps to a
 *    distinct `useProducts` params object via `getFilterParams`.
 */
export function ShopHome() {
    const [activeFilter, setActiveFilter] = useState<QuickFilter>('all');
    const { t } = useTranslation('shop');
    const { data: categories } = useCategories();
    const {
        data: featuredData,
        isLoading: featuredLoading,
        isError: featuredError,
    } = useProducts({ is_featured: true, limit: 8 });
    const {
        data: filteredData,
        isLoading: filteredLoading,
        isError: filteredError,
    } = useProducts(getFilterParams(activeFilter));

    const featuredProducts = featuredData?.results ?? [];
    const filteredProducts = filteredData?.results ?? [];

    const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: t('filter_all'), icon: null },
        { key: 'featured', label: t('filter_featured'), icon: <Star weight="fill" size={14} /> },
        {
            key: 'top_rated',
            label: t('filter_top_rated'),
            icon: <TrendUp weight="bold" size={14} />,
        },
        {
            key: 'budget',
            label: t('filter_budget'),
            icon: <CurrencyDollar weight="bold" size={14} />,
        },
        { key: 'premium', label: t('filter_premium'), icon: <FireIcon weight="fill" size={14} /> },
    ];

    return (
        <div className={styles.page}>
            <HeroBanner />

            {/* Categorías */}
            {!!categories && categories.length > 0 && (
                <div className={styles.categoryBar}>
                    <div className={styles.categoryScroll}>
                        <Link
                            to={ROUTES.search}
                            className={`${styles.categoryChip} ${styles.categoryChipActive}`}
                        >
                            {t('all_categories')}
                        </Link>
                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                to={buildRoute.shopCategory(cat.slug)}
                                className={styles.categoryChip}
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.content}>
                {/* Flash Sale */}
                <FlashSaleSection />

                {/* Productos destacados (always shows top featured) */}
                {featuredLoading ? (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Skeleton variant="text" width={160} height={28} />
                        </div>
                        <div className={styles.productGrid}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} variant="card" />
                            ))}
                        </div>
                    </section>
                ) : featuredError ? null : featuredProducts.length > 0 ? (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionTitleGroup}>
                                <Star
                                    weight="fill"
                                    className={styles.sectionIcon}
                                    aria-hidden="true"
                                />
                                <h2 className={styles.sectionTitle}>{t('featured_products')}</h2>
                            </div>
                            <Link
                                to={`${ROUTES.search}?is_featured=true`}
                                className={styles.viewAll}
                            >
                                {t('view_all')} <ArrowRight size={16} />
                            </Link>
                        </div>
                        <div className={styles.productGrid}>
                            {featuredProducts.map((product) => (
                                <div key={`feat-${product.id}`} className={styles.cardWrapper}>
                                    <ProductCard product={product} />
                                    <div className={styles.quickBuyOverlay}>
                                        <QuickBuyButton product={product} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* Quick Filters + Filtered Grid */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleGroup}>
                            <h2 className={styles.sectionTitle}>{t('explore_products')}</h2>
                        </div>
                        <Link to={ROUTES.search} className={styles.viewAll}>
                            {t('view_all')} <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className={styles.filterBar}>
                        {QUICK_FILTERS.map((f) => (
                            <button
                                key={f.key}
                                className={`${styles.filterChip} ${activeFilter === f.key ? styles.filterChipActive : ''}`}
                                onClick={() => setActiveFilter(f.key)}
                            >
                                {f.icon}
                                <span>{f.label}</span>
                            </button>
                        ))}
                    </div>

                    {filteredLoading ? (
                        <div className={styles.productGrid}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} variant="card" />
                            ))}
                        </div>
                    ) : filteredError ? (
                        <EmptyState title={t('load_error')} message={t('load_error_message')} />
                    ) : filteredProducts.length === 0 ? (
                        <EmptyState title={t('no_results')} message={t('no_results_message')} />
                    ) : (
                        <div className={styles.productGrid}>
                            {filteredProducts.map((product) => (
                                <div key={`filt-${product.id}`} className={styles.cardWrapper}>
                                    <ProductCard product={product} compact />
                                    <div className={styles.quickBuyOverlay}>
                                        <QuickBuyButton product={product} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
