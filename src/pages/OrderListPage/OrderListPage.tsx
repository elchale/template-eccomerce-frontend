import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useOrders } from '@/api';
import {
    Spinner,
    EmptyState,
    StatusBadge,
    Button,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
    Paginator,
} from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES, buildRoute } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './OrderListPage.module.css';

/**
 * `/orders` — customer's own order history. Server-side paginated; the
 * limit + offset pattern matches DRF's `LimitOffsetPagination` defaults.
 */
export function OrderListPage() {
    const [page, setPage] = useState(1);
    const { t, i18n } = useTranslation('shop');

    // Orders only exist once a payment is confirmed (order-on-payment model),
    // so there are no "unpaid" orders to resume here — the cart is the durable
    // pre-payment state. We still scope to paid so any legacy pending rows
    // (created by the old create-order flow) never surface as actionable.
    const params = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
        payment_status: 'paid',
    };

    const { data: ordersData, isLoading, error } = useOrders(params);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <p>{t('orders_load_error')}</p>
                </div>
            </div>
        );
    }

    const orders = ordersData?.results || [];
    const numPages = ordersData ? Math.ceil(ordersData.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{t('orders_title')}</h1>

            {orders.length === 0 ? (
                <EmptyState
                    title={t('orders_empty_title')}
                    message={t('orders_empty_message')}
                    action={
                        <Link to={ROUTES.home}>
                            <Button variant="primary">{t('orders_start_shopping')}</Button>
                        </Link>
                    }
                />
            ) : (
                <>
                    <div className={styles.tableContainer}>
                        <Table aria-label={t('orders_title')} radius={8}>
                            <TableHeader>
                                <TableColumn>{t('orders_order_number')}</TableColumn>
                                <TableColumn>{t('orders_date')}</TableColumn>
                                <TableColumn>{t('orders_status')}</TableColumn>
                                <TableColumn>{t('orders_items')}</TableColumn>
                                <TableColumn>{t('orders_total')}</TableColumn>
                                <TableColumn>{t('orders_actions')}</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => {
                                    const date = new Date(order.created).toLocaleDateString(
                                        i18n.language,
                                        {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        },
                                    );
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <span className={styles.orderNumber}>
                                                    {order.order_number}
                                                </span>
                                            </TableCell>
                                            <TableCell>{date}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={order.status} />
                                            </TableCell>
                                            <TableCell>{order.item_count}</TableCell>
                                            <TableCell>
                                                <span className={styles.total}>
                                                    {formatCurrency(order.total)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className={styles.actions}>
                                                    <Link
                                                        to={buildRoute.orderDetail(
                                                            order.order_number,
                                                        )}
                                                        className={styles.actionLink}
                                                    >
                                                        <Button variant="secondary" size="sm">
                                                            {t('orders_view')}
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    {numPages > 1 && (
                        <Paginator
                            page={page}
                            numPages={numPages}
                            onPageChange={setPage}
                            size="sm"
                            showEdges={false}
                        />
                    )}
                </>
            )}
        </div>
    );
}
