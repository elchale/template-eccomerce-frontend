import { Funnel, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useCategoryDetail, useProducts, useCategories } from '@/api';
import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { ProductFilters } from '@/components/features/ProductFilters/ProductFilters';
import { Skeleton, ProductGridSkeleton, Paginator, EmptyState } from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import type { ProductFilterParams } from '@/types/product';

import styles from './CategoryPage.module.css';

/**
 * `/category/:slug` — products scoped to one category, with filters and
 * pagination. The active category slug is preserved across filter changes
 * so filtering doesn't navigate the user out of the category context.
 * Mobile filter UI opens as a sheet via `mobileFiltersOpen`.
 */
export function CategoryPage() {
    const { slug } = useParams<{ slug: string }>();
    const { t } = useTranslation('shop');
    const [filters, setFilters] = useState<ProductFilterParams>({});
    const [page, setPage] = useState(1);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const { data: category, isLoading: categoryLoading } = useCategoryDetail(slug || '');
    const { data: categories } = useCategories();
    const { data: productsData, isLoading: productsLoading } = useProducts({
        ...filters,
        limit: PAGINATION.DEFAULT_PAGE_SIZE,
        offset: (page - 1) * PAGINATION.DEFAULT_PAGE_SIZE,
        ...(slug && { category: slug }),
    });

    const handleFilterChange = (newFilters: ProductFilterParams) => {
        setFilters(newFilters);
        setPage(1);
    };

    const totalPages = productsData
        ? Math.ceil(productsData.count / PAGINATION.DEFAULT_PAGE_SIZE)
        : 0;
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    if (categoryLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.header}>
                    <div className={styles.headerInner}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <Skeleton variant="text" width={240} height={32} />
                            <Skeleton variant="text" width={380} height={16} />
                        </div>
                    </div>
                </div>
                <div className={styles.layout}>
                    <main className={styles.main}>
                        <ProductGridSkeleton count={8} />
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInner}>
                    <div>
                        <h1 className={styles.title}>{category?.name || t('category_fallback')}</h1>
                        {!!category?.description && (
                            <p className={styles.description}>{category.description}</p>
                        )}
                    </div>
                    <div className={styles.headerMeta}>
                        {!!productsData && (
                            <span className={styles.count}>
                                {t('category_products', { count: productsData.count })}
                            </span>
                        )}
                        <button
                            className={styles.filterToggle}
                            onClick={() => setMobileFiltersOpen(true)}
                        >
                            <Funnel size={16} />
                            {t('category_filters')}
                            {activeFilterCount > 0 && (
                                <span className={styles.filterBadge}>{activeFilterCount}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={styles.layout}>
                {/* Sidebar Filters — desktop */}
                <aside className={styles.sidebar}>
                    <ProductFilters
                        filters={filters}
                        onChange={handleFilterChange}
                        categories={categories}
                    />
                </aside>

                {/* Mobile filters overlay */}
                {!!mobileFiltersOpen && (
                    <>
                        <div
                            className={styles.overlay}
                            onClick={() => setMobileFiltersOpen(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setMobileFiltersOpen(false);
                                }
                            }}
                            role="button"
                            tabIndex={-1}
                            aria-label={t('close', { ns: 'common' })}
                        />
                        <div className={styles.mobileFilters}>
                            <div className={styles.mobileFiltersHeader}>
                                <h3>{t('category_filters')}</h3>
                                <button
                                    className={styles.mobileFiltersClose}
                                    onClick={() => setMobileFiltersOpen(false)}
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <ProductFilters
                                filters={filters}
                                onChange={handleFilterChange}
                                categories={categories}
                            />
                        </div>
                    </>
                )}

                {/* Product Grid */}
                <main className={styles.main}>
                    {productsLoading ? (
                        <ProductGridSkeleton count={8} />
                    ) : productsData && productsData.results.length > 0 ? (
                        <>
                            <div className={styles.productGrid}>
                                {productsData.results.map((product) => (
                                    <ProductCard key={product.id} product={product} compact />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className={styles.paginatorContainer}>
                                    <Paginator
                                        page={page}
                                        numPages={totalPages}
                                        onPageChange={setPage}
                                        size="md"
                                        variant="rounded"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState
                            title={t('category_no_products_title')}
                            message={t('category_no_products_message')}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
