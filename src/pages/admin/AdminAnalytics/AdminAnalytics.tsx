import { useTranslation } from 'react-i18next';

import { useAdminDashboard } from '@/api';
import { Card, CardTitle, Spinner, EmptyState, StatusBadge } from '@/components/ui';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './AdminAnalytics.module.css';

/** `/admin/analytics` — deeper business metrics view. Reuses
 *  `useAdminDashboard`; backend may return additional aggregates in the
 *  same payload depending on staff role. */
export function AdminAnalytics() {
    const { data, isLoading, error } = useAdminDashboard();
    const { t } = useTranslation('admin');

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
                title={t('analytics_load_error')}
                message={t('analytics_load_error_message')}
            />
        );
    }

    const totalOrders = Object.values(data.order_counts ?? {}).reduce(
        (sum, count) => sum + count,
        0,
    );
    const revenueByDay = data.revenue_by_day ?? [];
    const topProducts = data.top_products ?? [];

    const maxRevenue = Math.max(...revenueByDay.map((d) => Number.parseFloat(d.revenue)), 1);
    const maxProductSold = Math.max(...topProducts.map((p) => p.total_sold), 1);

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('analytics_title')}</h2>

            {/* Summary stats */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('analytics_total_revenue')}</span>
                    <span className={styles.statValue}>{formatCurrency(data.total_revenue)}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('analytics_total_orders')}</span>
                    <span className={styles.statValue}>{totalOrders}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('analytics_new_customers')}</span>
                    <span className={styles.statValue}>{data.new_customers_count}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>{t('analytics_avg_order')}</span>
                    <span className={styles.statValue}>
                        {formatCurrency(
                            totalOrders > 0
                                ? Number.parseFloat(data.total_revenue) / totalOrders
                                : 0,
                        )}
                    </span>
                </Card>
            </div>

            {/* Revenue chart - taller */}
            <Card className={styles.chartCard}>
                <CardTitle>{t('analytics_revenue_chart')}</CardTitle>
                <div className={styles.chart}>
                    {revenueByDay.map((day) => {
                        const revenue = Number.parseFloat(day.revenue);
                        const heightPercent = (revenue / maxRevenue) * 100;
                        return (
                            <div key={day.date} className={styles.chartBarWrapper}>
                                <div className={styles.chartBarContainer}>
                                    <div
                                        className={styles.chartBar}
                                        style={{ height: `${Math.max(heightPercent, 1)}%` }}
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

            <div className={styles.splitGrid}>
                {/* Orders by status */}
                <Card className={styles.sectionCard}>
                    <CardTitle>{t('analytics_orders_by_status')}</CardTitle>
                    <div className={styles.statusList}>
                        {statusOrder.map((status) => {
                            const count = data.order_counts[status] || 0;
                            const percent = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                            return (
                                <div key={status} className={styles.statusRow}>
                                    <div className={styles.statusInfo}>
                                        <StatusBadge status={status} />
                                        <span className={styles.statusCount}>{count}</span>
                                    </div>
                                    <div className={styles.statusBarBg}>
                                        <div
                                            className={styles.statusBarFill}
                                            style={{ width: `${Math.max(percent, 1)}%` }}
                                        />
                                    </div>
                                    <span className={styles.statusPercent}>
                                        {percent.toFixed(1)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Top products ranked */}
                <Card className={styles.sectionCard}>
                    <CardTitle>{t('analytics_top_products')}</CardTitle>
                    <div className={styles.productRank}>
                        {topProducts.length === 0 ? (
                            <p className={styles.emptyText}>{t('analytics_no_data')}</p>
                        ) : (
                            topProducts.map((product, index) => {
                                const percent = (product.total_sold / maxProductSold) * 100;
                                return (
                                    <div
                                        key={product.product__id ?? `product-${index}`}
                                        className={styles.rankItem}
                                    >
                                        <div className={styles.rankHeader}>
                                            <span className={styles.rankNumber}>#{index + 1}</span>
                                            <span className={styles.rankName}>
                                                {product.product__name}
                                            </span>
                                            <span className={styles.rankStats}>
                                                {product.total_sold} {t('analytics_sold')} -{' '}
                                                {formatCurrency(product.total_revenue)}
                                            </span>
                                        </div>
                                        <div className={styles.rankBarBg}>
                                            <div
                                                className={styles.rankBarFill}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
