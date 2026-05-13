import { ArrowLeft, CreditCard, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { useOrderDetail } from '@/api';
import { Spinner, StatusBadge, Button } from '@/components/ui';
import { ORDER_STATUS_STEPS } from '@/constants/orders';
import { ROUTES, buildRoute } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './OrderDetailPage.module.css';

/**
 * `/orders/:orderNumber` — single-order detail view for the customer.
 * Renders line items + a visual status tracker driven by
 * `ORDER_STATUS_STEPS`. Status is set server-side; this page is read-only.
 */
export function OrderDetailPage() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const { t, i18n } = useTranslation('shop');
    const { data: order, isLoading, error } = useOrderDetail(orderNumber || '');

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.container}>
                <div className={styles.errorState}>
                    <p>{t('order_detail_not_found')}</p>
                    <Link to={ROUTES.orders}>
                        <Button variant="secondary">{t('order_detail_back_to_orders')}</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const orderDate = new Date(order.created).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const currentStatusIndex =
        order.status === 'cancelled' ? -1 : ORDER_STATUS_STEPS.indexOf(order.status);

    return (
        <div className={styles.container}>
            {/* Back Link */}
            <Link to={ROUTES.orders} className={styles.backLink}>
                <ArrowLeft size={16} weight="bold" /> {t('order_detail_back')}
            </Link>

            {/* Order Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>
                        {t('orders_order_number')}
                        {order.order_number}
                    </h1>
                    <span className={styles.date}>{orderDate}</span>
                </div>
                <StatusBadge status={order.status} />
            </div>

            {/* Unpaid CTA — surfaces a resume-payment path for any pending
                order that hasn't been paid yet. Bails on status changes
                (cancelled / paid / refunded) so we don't urge the user to
                pay something they can no longer pay. */}
            {order.status === 'pending' && order.payment_status === 'unpaid' && (
                <section className={styles.unpaidBanner} role="region" aria-live="polite">
                    <div className={styles.unpaidContent}>
                        <WarningCircle
                            size={28}
                            weight="fill"
                            className={styles.unpaidIcon}
                            aria-hidden="true"
                        />
                        <div className={styles.unpaidText}>
                            <p className={styles.unpaidTitle}>
                                {t('order_detail_unpaid_title')}
                            </p>
                            <p className={styles.unpaidSubtitle}>
                                {t('order_detail_unpaid_subtitle', {
                                    amount: formatCurrency(order.total),
                                })}
                            </p>
                        </div>
                    </div>
                    <Link
                        to={buildRoute.checkoutPay(order.order_number)}
                        className={styles.unpaidCta}
                    >
                        <CreditCard size={18} weight="bold" aria-hidden="true" />
                        {t('order_detail_pay_now')}
                    </Link>
                </section>
            )}

            {/* Status Timeline */}
            {order.status !== 'cancelled' && (
                <section className={styles.timelineSection}>
                    <h2 className={styles.sectionTitle}>{t('order_detail_order_status')}</h2>
                    <div className={styles.timeline}>
                        {ORDER_STATUS_STEPS.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;
                            return (
                                <div
                                    key={step}
                                    className={`${styles.timelineStep} ${
                                        isCompleted ? styles.completed : ''
                                    } ${isCurrent ? styles.current : ''}`}
                                >
                                    <div className={styles.timelineDot} />
                                    {index < ORDER_STATUS_STEPS.length - 1 && (
                                        <div
                                            className={`${styles.timelineLine} ${
                                                index < currentStatusIndex
                                                    ? styles.lineCompleted
                                                    : ''
                                            }`}
                                        />
                                    )}
                                    <span className={styles.timelineLabel}>
                                        {step.charAt(0).toUpperCase() + step.slice(1)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Status History */}
            {!!order.status_history && order.status_history.length > 0 && (
                <section className={styles.historySection}>
                    <h2 className={styles.sectionTitle}>{t('order_detail_status_history')}</h2>
                    <div className={styles.historyList}>
                        {order.status_history.map((entry) => {
                            const entryDate = new Date(entry.created).toLocaleDateString(
                                i18n.language,
                                {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                },
                            );
                            return (
                                <div key={entry.id} className={styles.historyEntry}>
                                    <div className={styles.historyStatus}>
                                        <StatusBadge status={entry.old_status} />
                                        <span className={styles.historyArrow}>&rarr;</span>
                                        <StatusBadge status={entry.new_status} />
                                    </div>
                                    {!!entry.note && (
                                        <p className={styles.historyNote}>{entry.note}</p>
                                    )}
                                    <span className={styles.historyDate}>{entryDate}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Order Items */}
            <section className={styles.itemsSection}>
                <h2 className={styles.sectionTitle}>{t('order_detail_items')}</h2>
                <div className={styles.itemsList}>
                    {(order.items ?? []).map((item) => (
                        <div key={item.id} className={styles.item}>
                            <div className={styles.itemImage}>
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.product_name}
                                        className={styles.image}
                                        loading="lazy"
                                        decoding="async"
                                        width={80}
                                        height={80}
                                    />
                                ) : (
                                    <div className={styles.imagePlaceholder}>
                                        {t('order_detail_no_img')}
                                    </div>
                                )}
                            </div>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{item.product_name}</span>
                                {!!item.variant_info && (
                                    <span className={styles.itemVariant}>{item.variant_info}</span>
                                )}
                            </div>
                            <div className={styles.itemQty}>
                                <span>{t('order_detail_qty', { count: item.quantity })}</span>
                            </div>
                            <div className={styles.itemPrice}>
                                <span className={styles.lineTotal}>
                                    {formatCurrency(item.line_total)}
                                </span>
                                <span className={styles.unitPrice}>
                                    {t('order_detail_each', {
                                        price: formatCurrency(item.price),
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Order Totals & Addresses */}
            <div className={styles.footer}>
                {/* Addresses */}
                <div className={styles.addresses}>
                    <div className={styles.addressCard}>
                        <h3 className={styles.addressTitle}>{t('order_detail_shipping')}</h3>
                        <p className={styles.addressText}>{order.shipping_address}</p>
                    </div>
                    {!!order.billing_address && (
                        <div className={styles.addressCard}>
                            <h3 className={styles.addressTitle}>{t('order_detail_billing')}</h3>
                            <p className={styles.addressText}>{order.billing_address}</p>
                        </div>
                    )}
                    <div className={styles.addressCard}>
                        <h3 className={styles.addressTitle}>{t('order_detail_contact')}</h3>
                        <p className={styles.addressText}>{order.email}</p>
                        {!!order.phone && <p className={styles.addressText}>{order.phone}</p>}
                    </div>
                </div>

                {/* Totals */}
                <div className={styles.totals}>
                    <div className={styles.totalRow}>
                        <span>{t('subtotal', { ns: 'common' })}</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {Number.parseFloat(order.discount_amount) > 0 && (
                        <div className={styles.totalRow}>
                            <span>
                                {t('discount', { ns: 'common' })}
                                {!!order.coupon_code && ` (${order.coupon_code})`}
                            </span>
                            <span className={styles.discountValue}>
                                -{formatCurrency(order.discount_amount)}
                            </span>
                        </div>
                    )}
                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                        <span>{t('total', { ns: 'common' })}</span>
                        <span>{formatCurrency(order.total)}</span>
                    </div>
                </div>
            </div>

            {!!order.notes && (
                <section className={styles.notesSection}>
                    <h2 className={styles.sectionTitle}>{t('order_detail_notes')}</h2>
                    <p className={styles.notesText}>{order.notes}</p>
                </section>
            )}
        </div>
    );
}
