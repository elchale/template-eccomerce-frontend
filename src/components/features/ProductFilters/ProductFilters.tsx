import { useTranslation } from 'react-i18next';

import { SearchInput, Rating } from '@/components/ui';
import type { ProductFilterParams, Category } from '@/types/product';

import styles from './ProductFilters.module.css';

/**
 * Shared filter panel for the catalog (`ShopHome`), `CategoryPage`, and
 * `SearchPage`. Controlled component — owner page holds the `filters`
 * state and passes `onChange`. Filter keys map 1:1 to backend query params
 * (see `ProductFilterParams`).
 *
 * Empty / falsy values are normalised to `undefined` so callers can spread
 * them directly into a TanStack Query `params` object without filtering.
 */
interface ProductFiltersProps {
    filters: ProductFilterParams;
    onChange: (filters: ProductFilterParams) => void;
    categories?: Category[] | undefined;
    showSearch?: boolean | undefined;
}

export function ProductFilters({
    filters,
    onChange,
    categories,
    showSearch = true,
}: ProductFiltersProps) {
    const { t } = useTranslation();
    const safeCategories = Array.isArray(categories) ? categories : [];

    const updateFilter = (key: keyof ProductFilterParams, value: unknown) => {
        onChange({
            ...filters,
            [key]: value || undefined,
        });
    };

    return (
        <div className={styles.container}>
            {!!showSearch && (
                <div className={styles.section}>
                    <label className={styles.label} htmlFor="filter-search">
                        {t('search')}
                    </label>
                    <SearchInput
                        id="filter-search"
                        value={filters.search || ''}
                        onChange={(value) => updateFilter('search', value)}
                        placeholder={t('search_products_placeholder')}
                    />
                </div>
            )}

            <div className={styles.section}>
                <label className={styles.label} htmlFor="filter-category">
                    {t('filter_category')}
                </label>
                <select
                    id="filter-category"
                    className={styles.select}
                    value={filters.category || ''}
                    onChange={(e) => updateFilter('category', e.target.value)}
                >
                    <option value="">{t('filter_all_categories')}</option>
                    {safeCategories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.section} role="group" aria-labelledby="filter-price-label">
                <span id="filter-price-label" className={styles.label}>
                    {t('filter_price_range')}
                </span>
                <div className={styles.priceRange}>
                    <input
                        type="number"
                        className={styles.priceInput}
                        placeholder={t('filter_price_min')}
                        aria-label={t('filter_price_min_aria')}
                        value={filters.min_price ?? ''}
                        onChange={(e) =>
                            updateFilter(
                                'min_price',
                                e.target.value ? Number(e.target.value) : undefined,
                            )
                        }
                        min={0}
                    />
                    <span className={styles.separator}>-</span>
                    <input
                        type="number"
                        className={styles.priceInput}
                        placeholder={t('filter_price_max')}
                        aria-label={t('filter_price_max_aria')}
                        value={filters.max_price ?? ''}
                        onChange={(e) =>
                            updateFilter(
                                'max_price',
                                e.target.value ? Number(e.target.value) : undefined,
                            )
                        }
                        min={0}
                    />
                </div>
            </div>

            <div className={styles.section} role="group" aria-labelledby="filter-rating-label">
                <span id="filter-rating-label" className={styles.label}>
                    {t('filter_min_rating')}
                </span>
                <Rating
                    value={filters.min_rating || 0}
                    interactive
                    onChange={(value) => updateFilter('min_rating', value)}
                    size="md"
                />
                {filters.min_rating ? (
                    <button
                        type="button"
                        className={styles.clearFilter}
                        onClick={() => updateFilter('min_rating', undefined)}
                    >
                        {t('filter_remove_rating')}
                    </button>
                ) : null}
            </div>

            <div className={styles.section}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={filters.is_featured || false}
                        onChange={(e) => updateFilter('is_featured', e.target.checked || undefined)}
                    />
                    {t('filter_featured_only')}
                </label>
            </div>
        </div>
    );
}
