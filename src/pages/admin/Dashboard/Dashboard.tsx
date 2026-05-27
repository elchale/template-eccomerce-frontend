import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useAdminDashboard } from '@/api';
import {
    Card,
    CardTitle,
    Spinner,
    StatusBadge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
    EmptyState,
} from '@/components/ui';
import { buildRoute } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './Dashboard.module.css';

/** `/admin` — KPI tiles + a "recent orders" table. The bulk of business
 *  intel lives on `/admin/analytics`; this page is the at-a-glance view. */
export function Dashboard() {
    const { data, isLoading, error } = useAdminDashboard();
    const { t, i18n } = useTranslation('admin');

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <EmptyState
                title={t('dashboard_load_error')}
                message={t('dashboard_load_error_message')}
            />
        );
    }

    const totalOrders = Object.values(data.order_counts ?? {}).reduce(
        (sum, count) => sum + count,
        0,
    );
    const pendingOrders = data.order_counts?.pending || 0;

    const revenueByDay = data.revenue_by_day ?? [];
    const topProducts = data.top_products ?? [];
    const recentOrders = data.recent_orders ?? [];

    const maxRevenue = Math.max(...revenueByDay.map((d) => Number.parseFloat(d.revenue)), 1);

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('dashboard_title')}</h2>

            {/* Stats cards */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('dashboard_total_revenue')}</span>
                    <span className={styles.statValue}>{formatCurrency(data.total_revenue)}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('dashboard_total_orders')}</span>
                    <span className={styles.statValue}>{totalOrders}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('dashboard_pending_orders')}</span>
                    <span className={styles.statValue}>{pendingOrders}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('dashboard_new_customers')}</span>
                    <span className={styles.statValue}>{data.new_customers_count}</span>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card className={styles.chartCard}>
                <CardTitle>{t('dashboard_revenue_chart')}</CardTitle>
                <div className={styles.chart}>
                    {revenueByDay.map((day) => {
                        const revenue = Number.parseFloat(day.revenue);
                        const heightPercent = (revenue / maxRevenue) * 100;
                        return (
                            <div key={day.date} className={styles.chartBarWrapper}>
                                <div className={styles.chartBarContainer}>
                                    <div
                                        className={styles.chartBar}
                                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                        title={`${day.date}: ${formatCurrency(revenue)}`}
                                    />
                                </div>
                                <span className={styles.chartLabel}>
                                    {new Date(day.date).getDate()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className={styles.tablesGrid}>
                {/* Top Products */}
                <Card className={styles.tableCard}>
                    <CardTitle>{t('dashboard_top_products')}</CardTitle>
                    {topProducts.length === 0 ? (
                        <p className={styles.emptyText}>{t('dashboard_no_product_data')}</p>
                    ) : (
                        <Table aria-label={t('dashboard_top_products')} radius={8}>
                            <TableHeader>
                                <TableColumn>{t('products_col_name')}</TableColumn>
                                <TableColumn>{t('analytics_sold')}</TableColumn>
                                <TableColumn>{t('analytics_total_revenue')}</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {topProducts.map((product, index) => (
                                    <TableRow key={product.product__id ?? `product-${index}`}>
                                        <TableCell>{product.product__name}</TableCell>
                                        <TableCell>{product.total_sold}</TableCell>
                                        <TableCell>
                                            {formatCurrency(product.total_revenue)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>

                {/* Recent Orders */}
                <Card className={styles.tableCard}>
                    <CardTitle>{t('dashboard_recent_orders')}</CardTitle>
                    {recentOrders.length === 0 ? (
                        <p className={styles.emptyText}>{t('dashboard_no_recent_orders')}</p>
                    ) : (
                        <Table aria-label={t('dashboard_recent_orders')} radius={8}>
                            <TableHeader>
                                <TableColumn>{t('orders_col_number')}</TableColumn>
                                <TableColumn>{t('orders_col_status')}</TableColumn>
                                <TableColumn>{t('orders_col_total')}</TableColumn>
                                <TableColumn>{t('orders_col_date')}</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {recentOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Link
                                                to={buildRoute.adminOrderDetail(order.id)}
                                                className={styles.orderLink}
                                            >
                                                {order.order_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell>{formatCurrency(order.total)}</TableCell>
                                        <TableCell>
                                            {new Date(order.created).toLocaleDateString(
                                                i18n.language,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            </div>
        </div>
    );
}
