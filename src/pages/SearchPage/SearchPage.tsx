import { Funnel, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { useProducts, useCategories } from '@/api';
import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { ProductFilters } from '@/components/features/ProductFilters/ProductFilters';
import { ProductGridSkeleton, Paginator, EmptyState } from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import type { ProductFilterParams } from '@/types/product';

import styles from './SearchPage.module.css';

/**
 * `/search?q=...` — full-text search results page.
 *
 * Query string is the source of truth (`useSearchParams`), so the result
 * is shareable/back-button-friendly. The input mirrors `q` two-way: typing
 * updates `searchValue` locally, submit pushes it into `searchParams`.
 */
export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation('shop');
    const queryParam = searchParams.get('q') || '';
    const [searchValue, setSearchValue] = useState(queryParam);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ProductFilterParams>({});
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const { data: categories } = useCategories();
    const { data: productsData, isLoading } = useProducts({
        ...filters,
        limit: PAGINATION.DEFAULT_PAGE_SIZE,
        offset: (page - 1) * PAGINATION.DEFAULT_PAGE_SIZE,
        ...(queryParam && { search: queryParam }),
    });

    useEffect(() => {
        setSearchValue(queryParam);
    }, [queryParam]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        if (searchValue.trim()) {
            setSearchParams({ q: searchValue.trim() });
        } else {
            setSearchParams({});
        }
    };

    const handleFilterChange = (newFilters: ProductFilterParams) => {
        setFilters(newFilters);
        setPage(1);
    };

    const totalPages = productsData
        ? Math.ceil(productsData.count / PAGINATION.DEFAULT_PAGE_SIZE)
        : 0;
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className={styles.page}>
            {/* Top bar */}
            <div className={styles.topBar}>
                <div className={styles.topBarInner}>
                    <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                        <MagnifyingGlass className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={t('search_placeholder')}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                        {!!searchValue && (
                            <button
                                type="button"
                                className={styles.clearBtn}
                                onClick={() => {
                                    setSearchValue('');
                                    setSearchParams({});
                                    setPage(1);
                                }}
                            >
                                ×
                            </button>
                        )}
                        <button type="submit" className={styles.searchBtn}>
                            {t('search_button')}
                        </button>
                    </form>

                    <div className={styles.resultInfo}>
                        {!!productsData && (
                            <span className={styles.resultCount}>
                                {productsData.count === 1
                                    ? t('results_count_one', { count: productsData.count })
                                    : t('results_count_other', { count: productsData.count })}
                                {!!queryParam && <> {t('results_for', { query: queryParam })}</>}
                            </span>
                        )}
                        <button
                            className={styles.filterToggle}
                            onClick={() => setMobileFiltersOpen(true)}
                        >
                            <Funnel size={16} />
                            {t('filters', { ns: 'common' })}
                            {activeFilterCount > 0 && (
                                <span className={styles.filterBadge}>{activeFilterCount}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className={styles.layout}>
                {/* Sidebar filters — desktop */}
                <aside className={styles.sidebar}>
                    <ProductFilters
                        filters={filters}
                        onChange={handleFilterChange}
                        categories={categories}
                        showSearch={false}
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
                                <h3>{t('filters', { ns: 'common' })}</h3>
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
                                showSearch={false}
                            />
                        </div>
                    </>
                )}

                {/* Product grid */}
                <main className={styles.main}>
                    {isLoading ? (
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
                            title={queryParam ? t('search_no_results') : t('search_empty_title')}
                            message={
                                queryParam
                                    ? t('search_no_results_message', { query: queryParam })
                                    : t('search_empty_message')
                            }
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
