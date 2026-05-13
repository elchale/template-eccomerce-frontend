import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';

import { useAdminOrderDetail, useAdminUpdateOrderStatus } from '@/api';
import { Select, Input } from '@/components/forms';
import {
    Button,
    Card,
    CardTitle,
    Spinner,
    EmptyState,
    StatusBadge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/formatCurrency';
import type { OrderStatus } from '@/types/order';

import styles from './AdminOrderDetail.module.css';

/**
 * `/admin/orders/:id` — order detail + status mutation panel.
 *
 * Status changes are not free-form — the backend enforces a transition
 * graph (`pending → paid → shipped → delivered`, plus cancel paths).
 * The `note` field is appended to the order audit log on every transition.
 */
export function AdminOrderDetail() {
    const { id } = useParams<{ id: string }>();
    const orderId = Number(id);
    const { t, i18n } = useTranslation('admin');

    const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
        { value: 'pending', label: 'Pendiente' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'processing', label: 'Procesando' },
        { value: 'shipped', label: 'Enviado' },
        { value: 'delivered', label: 'Entregado' },
        { value: 'cancelled', label: 'Cancelado' },
    ];

    const { data: order, isLoading, error } = useAdminOrderDetail(orderId);
    const updateStatus = useAdminUpdateOrderStatus();

    const [newStatus, setNewStatus] = useState('');
    const [note, setNote] = useState('');

    const handleStatusUpdate = () => {
        if (!newStatus) {
            toast.error(t('order_detail_select_status'));
            return;
        }

        const trimmedNote = note.trim();
        updateStatus.mutate(
            { id: orderId, status: newStatus, ...(trimmedNote && { note: trimmedNote }) },
            {
                onSuccess: () => {
                    toast.success(t('order_detail_status_updated'));
                    setNewStatus('');
                    setNote('');
                },
                onError: () => toast.error(t('order_detail_status_error')),
            },
        );
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <EmptyState
                title={t('order_detail_not_found')}
                message={t('order_detail_load_error')}
                action={
                    <Link to={ROUTES.adminOrders}>
                        <Button variant="primary">{t('order_detail_back')}</Button>
                    </Link>
                }
            />
        );
    }

    return (
        <div className={styles.container}>
            <Link to={ROUTES.adminOrders} className={styles.backLink}>
                <ArrowLeft /> {t('order_detail_back')}
            </Link>

            {/* Order header */}
            <div className={styles.orderHeader}>
                <div>
                    <h2 className={styles.orderNumber}>
                        {t('order_detail_order', { number: order.order_number })}
                    </h2>
                    <p className={styles.orderDate}>
                        {t('order_detail_placed_on', {
                            date: new Date(order.created).toLocaleString(i18n.language),
                        })}
                    </p>
                </div>
                <StatusBadge status={order.status} />
            </div>

            <div className={styles.grid}>
                {/* Status Update */}
                <Card className={styles.card}>
                    <CardTitle>{t('order_detail_update_status')}</CardTitle>
                    <div className={styles.statusForm}>
                        <Select
                            label={t('order_detail_new_status')}
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            options={STATUS_OPTIONS}
                            placeholder={t('order_detail_select_status_placeholder')}
                        />
                        <Input
                            name="status-note"
                            label={t('order_detail_note_label')}
                            value={note}
                            setValue={setNote}
                            placeholder={t('order_detail_note_placeholder')}
                            variant="bordered"
                            multiline
                            rows={3}
                        />
                        <Button
                            variant="primary"
                            onClick={handleStatusUpdate}
                            disabled={updateStatus.isPending || !newStatus}
                        >
                            {updateStatus.isPending
                                ? t('order_detail_updating')
                                : t('order_detail_update_btn')}
                        </Button>
                    </div>
                </Card>

                {/* Customer info */}
                <Card className={styles.card}>
                    <CardTitle>{t('order_detail_customer')}</CardTitle>
                    <div className={styles.infoList}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>{t('order_detail_email')}</span>
                            <span className={styles.infoValue}>{order.email}</span>
                        </div>
                        {!!order.phone && (
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>{t('order_detail_phone')}</span>
                                <span className={styles.infoValue}>{order.phone}</span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Addresses */}
                <Card className={styles.card}>
                    <CardTitle>{t('order_detail_shipping')}</CardTitle>
                    <p className={styles.address}>{order.shipping_address || '--'}</p>
                </Card>

                <Card className={styles.card}>
                    <CardTitle>{t('order_detail_billing')}</CardTitle>
                    <p className={styles.address}>
                        {order.billing_address || order.shipping_address || '--'}
                    </p>
                </Card>
            </div>

            {/* Order Items */}
            <Card className={styles.itemsCard}>
                <CardTitle>{t('order_detail_items')}</CardTitle>
                <Table aria-label={t('order_detail_items')} radius={8}>
                    <TableHeader>
                        <TableColumn>{t('order_detail_col_product')}</TableColumn>
                        <TableColumn>{t('order_detail_col_variant')}</TableColumn>
                        <TableColumn>{t('order_detail_col_qty')}</TableColumn>
                        <TableColumn>{t('order_detail_col_price')}</TableColumn>
                        <TableColumn>{t('order_detail_col_total')}</TableColumn>
                    </TableHeader>
                    <TableBody>
                        {order.items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className={styles.productCell}>
                                        {!!item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt={item.product_name}
                                                className={styles.itemImage}
                                                loading="lazy"
                                                decoding="async"
                                                width={60}
                                                height={60}
                                            />
                                        )}
                                        <span className={styles.productName}>
                                            {item.product_name}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{item.variant_info || '--'}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{formatCurrency(item.price)}</TableCell>
                                <TableCell>{formatCurrency(item.line_total)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className={styles.orderSummary}>
                    <div className={styles.summaryRow}>
                        <span>{t('order_detail_subtotal')}</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {!!order.coupon_code && (
                        <div className={styles.summaryRow}>
                            <span>{t('order_detail_discount', { code: order.coupon_code })}</span>
                            <span className={styles.discount}>
                                -{formatCurrency(order.discount_amount)}
                            </span>
                        </div>
                    )}
                    <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                        <span>{t('order_detail_total')}</span>
                        <span>{formatCurrency(order.total)}</span>
                    </div>
                </div>
            </Card>

            {/* Status History */}
            {!!order.status_history && order.status_history.length > 0 && (
                <Card className={styles.historyCard}>
                    <CardTitle>{t('order_detail_history')}</CardTitle>
                    <div className={styles.timeline}>
                        {order.status_history.map((entry) => (
                            <div key={entry.id} className={styles.timelineItem}>
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineHeader}>
                                        <StatusBadge status={entry.new_status} />
                                        <span className={styles.timelineDate}>
                                            {new Date(entry.created).toLocaleString(i18n.language)}
                                        </span>
                                    </div>
                                    {!!entry.note && (
                                        <p className={styles.timelineNote}>{entry.note}</p>
                                    )}
                                    <span className={styles.timelineBy}>
                                        {t('order_detail_by', { email: entry.changed_by_email })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
