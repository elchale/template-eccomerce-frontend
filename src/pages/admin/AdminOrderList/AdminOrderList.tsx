import { Eye } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAdminOrders } from '@/api';
import { Select } from '@/components/forms';
import {
    TableSkeleton,
    EmptyState,
    Paginator,
    StatusBadge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
} from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './AdminOrderList.module.css';

/** `/admin/orders` — order management table with status filter. Click
 *  through to `AdminOrderDetail` for line items + status mutation. */
export function AdminOrderList() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const { t, i18n } = useTranslation('admin');

    const STATUS_OPTIONS = [
        { value: '', label: t('orders_all_statuses') },
        { value: 'pending', label: 'Pendiente' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'processing', label: 'Procesando' },
        { value: 'shipped', label: 'Enviado' },
        { value: 'delivered', label: 'Entregado' },
        { value: 'cancelled', label: 'Cancelado' },
    ];

    const params: Record<string, string> = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };
    if (statusFilter) params.status = statusFilter;

    const { data, isLoading, error } = useAdminOrders(params);

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('orders_title')}</h2>

            <div className={styles.toolbar}>
                <div className={styles.filterGroup}>
                    <Select
                        label={t('orders_filter_status')}
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={STATUS_OPTIONS}
                        size="sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={6} columns={6} />
            ) : error ? (
                <EmptyState
                    title={t('orders_load_error')}
                    message={t('orders_load_error_message')}
                />
            ) : !data || data.results.length === 0 ? (
                <EmptyState
                    title={t('orders_empty')}
                    message={statusFilter ? t('orders_empty_filtered') : t('orders_empty_none')}
                />
            ) : (
                <>
                    <Table aria-label={t('orders_title')} radius={8}>
                        <TableHeader>
                            <TableColumn>{t('orders_col_number')}</TableColumn>
                            <TableColumn>{t('orders_col_status')}</TableColumn>
                            <TableColumn>{t('orders_col_items')}</TableColumn>
                            <TableColumn>{t('orders_col_total')}</TableColumn>
                            <TableColumn>{t('orders_col_date')}</TableColumn>
                            <TableColumn>{t('orders_col_actions')}</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {data.results.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <span className={styles.orderNumber}>
                                            {order.order_number}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={order.status} />
                                    </TableCell>
                                    <TableCell>{order.item_count}</TableCell>
                                    <TableCell>{formatCurrency(order.total)}</TableCell>
                                    <TableCell>
                                        {new Date(order.created).toLocaleDateString(i18n.language)}
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            to={ROUTES.adminOrderDetail.replace(
                                                ':id',
                                                String(order.id),
                                            )}
                                            className={styles.viewBtn}
                                            title={t('view', { ns: 'common' })}
                                        >
                                            <Eye />
                                        </Link>
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
