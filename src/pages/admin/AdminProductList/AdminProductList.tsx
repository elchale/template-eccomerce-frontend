import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAdminProducts, useAdminDeleteProduct, useAdminCategories } from '@/api';
import { Select } from '@/components/forms';
import {
    Button,
    TableSkeleton,
    SearchInput,
    EmptyState,
    Paginator,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
    Badge,
} from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './AdminProductList.module.css';

/** `/admin/products` — paginated catalog table with search + category
 *  filter. Inline delete uses `ConfirmModal`; create/edit goes to
 *  `AdminProductForm`. */
export function AdminProductList() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [featuredFilter, setFeaturedFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const { t } = useTranslation('admin');

    const STATUS_OPTIONS = [
        { value: '', label: t('products_all_statuses') },
        { value: 'true', label: t('products_active') },
        { value: 'false', label: t('products_inactive') },
    ];

    const FEATURED_OPTIONS = [
        { value: '', label: t('products_all') },
        { value: 'true', label: t('products_featured') },
        { value: 'false', label: t('products_not_featured') },
    ];

    const STOCK_OPTIONS = [
        { value: '', label: t('products_any_stock') },
        { value: 'in_stock', label: t('products_in_stock') },
        { value: 'out_of_stock', label: t('products_out_of_stock') },
    ];

    const { data: categories } = useAdminCategories();

    const params: Record<string, string> = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter) params.is_active = statusFilter;
    if (featuredFilter) params.is_featured = featuredFilter;

    const { data, isLoading, error } = useAdminProducts(params);
    const deleteProduct = useAdminDeleteProduct();

    const handleDelete = (id: number, name: string) => {
        if (!window.confirm(t('products_delete_confirm', { name }))) return;

        deleteProduct.mutate(id, {
            onSuccess: () => toast.success(t('products_deleted', { name })),
            onError: () => toast.error(t('products_delete_error')),
        });
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const resetFilters = () => {
        setSearch('');
        setCategoryFilter('');
        setStatusFilter('');
        setFeaturedFilter('');
        setStockFilter('');
        setPage(1);
    };

    const hasActiveFilters =
        search || categoryFilter || statusFilter || featuredFilter || stockFilter;

    const categoryOptions = [
        { value: '', label: t('products_all_categories') },
        ...(categories?.map((c) => ({ value: c.slug, label: c.name })) ?? []),
    ];

    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    let filteredResults = data?.results ?? [];
    if (stockFilter === 'in_stock') {
        filteredResults = filteredResults.filter((p) => p.stock > 0);
    } else if (stockFilter === 'out_of_stock') {
        filteredResults = filteredResults.filter((p) => p.stock <= 0);
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.pageTitle}>{t('products_title')}</h2>
                <Link to={ROUTES.adminProductNew}>
                    <Button variant="primary" size="md">
                        <Plus /> {t('products_add')}
                    </Button>
                </Link>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <SearchInput
                        value={search}
                        onChange={handleSearchChange}
                        placeholder={t('products_search_placeholder')}
                    />
                </div>
                <div className={styles.filters}>
                    <Select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPage(1);
                        }}
                        options={categoryOptions}
                        size="sm"
                        fullWidth={false}
                    />
                    <Select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        options={STATUS_OPTIONS}
                        size="sm"
                        fullWidth={false}
                    />
                    <Select
                        value={featuredFilter}
                        onChange={(e) => {
                            setFeaturedFilter(e.target.value);
                            setPage(1);
                        }}
                        options={FEATURED_OPTIONS}
                        size="sm"
                        fullWidth={false}
                    />
                    <Select
                        value={stockFilter}
                        onChange={(e) => {
                            setStockFilter(e.target.value);
                            setPage(1);
                        }}
                        options={STOCK_OPTIONS}
                        size="sm"
                        fullWidth={false}
                    />
                    {!!hasActiveFilters && (
                        <button className={styles.clearFilters} onClick={resetFilters}>
                            {t('clear_all', { ns: 'common' })}
                        </button>
                    )}
                </div>
            </div>

            {!!data && (
                <div className={styles.resultCount}>
                    {data.count === 1
                        ? t('products_count_one', { count: data.count })
                        : t('products_count_other', { count: data.count })}
                </div>
            )}

            {isLoading ? (
                <TableSkeleton rows={PAGINATION.DEFAULT_PAGE_SIZE} columns={7} showImageColumn />
            ) : error ? (
                <EmptyState
                    title={t('products_load_error')}
                    message={t('products_load_error_message')}
                />
            ) : filteredResults.length === 0 ? (
                <EmptyState
                    title={hasActiveFilters ? t('products_no_results') : t('products_empty')}
                    message={
                        hasActiveFilters
                            ? t('products_no_results_filters')
                            : t('products_empty_message')
                    }
                    action={
                        !hasActiveFilters ? (
                            <Link to={ROUTES.adminProductNew}>
                                <Button variant="primary">{t('products_add')}</Button>
                            </Link>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    <Table aria-label={t('products_title')} radius={8}>
                        <TableHeader>
                            <TableColumn>{t('products_col_image')}</TableColumn>
                            <TableColumn>{t('products_col_name')}</TableColumn>
                            <TableColumn>{t('products_col_category')}</TableColumn>
                            <TableColumn>{t('products_col_sku')}</TableColumn>
                            <TableColumn>{t('products_col_price')}</TableColumn>
                            <TableColumn>{t('products_col_stock')}</TableColumn>
                            <TableColumn>{t('products_col_status')}</TableColumn>
                            <TableColumn>{t('products_col_actions')}</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {filteredResults.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className={styles.thumbnail}>
                                            {product.primary_image ? (
                                                <img
                                                    src={product.primary_image.image_url}
                                                    alt={product.name}
                                                    className={styles.thumbnailImg}
                                                    loading="lazy"
                                                    decoding="async"
                                                    width={48}
                                                    height={48}
                                                />
                                            ) : (
                                                <div className={styles.thumbnailPlaceholder}>
                                                    {t('no_image', { ns: 'common' })}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={styles.productInfo}>
                                            <span className={styles.productName}>
                                                {product.name}
                                            </span>
                                            {!!product.is_featured && <Badge variant="featured" />}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={styles.category}>
                                            {product.category_name}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <code className={styles.sku}>{product.sku}</code>
                                    </TableCell>
                                    <TableCell>{formatCurrency(product.base_price)}</TableCell>
                                    <TableCell>
                                        <span
                                            className={product.stock <= 0 ? styles.outOfStock : ''}
                                        >
                                            {product.stock}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {product.is_active ? (
                                            <Badge variant="new">{t('products_active')}</Badge>
                                        ) : (
                                            <Badge variant="out-of-stock">
                                                {t('products_inactive')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className={styles.actions}>
                                            <Link
                                                to={ROUTES.adminProductEdit.replace(
                                                    ':id',
                                                    String(product.id),
                                                )}
                                                className={styles.actionBtn}
                                                title={t('edit', { ns: 'common' })}
                                            >
                                                <PencilSimple />
                                            </Link>
                                            <button
                                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                onClick={() =>
                                                    handleDelete(product.id, product.name)
                                                }
                                                title={t('delete', { ns: 'common' })}
                                                disabled={deleteProduct.isPending}
                                            >
                                                <Trash />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {numPages > 1 && (
                        <div className={styles.pagination}>
                            <Paginator page={page} numPages={numPages} onPageChange={setPage} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
