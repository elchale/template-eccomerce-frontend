import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAdminRefundOrder } from '@/api';
import { Input, Select } from '@/components/forms';
import { Button } from '@/components/ui';
import { useEscapeKey } from '@/hooks';
import { formatCurrency } from '@/lib/formatCurrency';
import { useModalStore } from '@/stores';

import styles from './AdminOrderDetail.module.css';

interface RefundOrderModalProps {
    orderId: number;
    orderNumber: string;
    /** Maximum amount that can still be refunded (order total minus prior
     *  processed refunds). Used as the default and as a client-side cap. */
    maxRefundable: number;
}

/**
 * Admin-side refund dialog. Defaults to a full refund. The admin can
 * toggle "Partial refund" to choose a smaller amount — the backend caps
 * at the remaining refundable balance, so worst-case the API rejects
 * with a 400 and we surface the message.
 */
export function RefundOrderModal({
    orderId,
    orderNumber,
    maxRefundable,
}: RefundOrderModalProps) {
    const { t } = useTranslation('admin');
    const closeModal = useModalStore((s) => s.closeModal);
    const refundOrder = useAdminRefundOrder();

    const REASONS = [
        { value: 'Solicitud del cliente', label: t('refund_reason_customer_request') },
        { value: 'Producto defectuoso', label: t('refund_reason_defective') },
        { value: 'Envío perdido', label: t('refund_reason_lost_shipment') },
        { value: 'Error en el pedido', label: t('refund_reason_order_error') },
        { value: 'Otro', label: t('refund_reason_other') },
    ];

    const [reasonChoice, setReasonChoice] = useState(REASONS[0]!.value);
    const [otherReason, setOtherReason] = useState('');
    const [isPartial, setIsPartial] = useState(false);
    const [amount, setAmount] = useState(maxRefundable.toFixed(2));

    const effectiveReason = reasonChoice === 'Otro' ? otherReason.trim() : reasonChoice;
    const parsedAmount = Number.parseFloat(amount);
    const amountValid =
        !isPartial ||
        (Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= maxRefundable);
    const canSubmit = effectiveReason.length > 0 && amountValid && !refundOrder.isPending;

    useEscapeKey(closeModal);

    const handleSubmit = () => {
        if (!canSubmit) {
            toast.error(t('refund_form_invalid'));
            return;
        }
        refundOrder.mutate(
            {
                id: orderId,
                reason: effectiveReason,
                ...(isPartial && { amount: parsedAmount.toFixed(2) }),
            },
            {
                onSuccess: () => {
                    toast.success(t('refund_success'));
                    closeModal();
                },
                onError: (err: unknown) => {
                    const axiosErr = err as { response?: { data?: { detail?: string } } };
                    toast.error(axiosErr?.response?.data?.detail ?? t('refund_error'));
                },
            },
        );
    };

    return (
        <div
            className={styles.modalContainer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-order-modal-title"
        >
            <h3 className={styles.modalTitle} id="refund-order-modal-title">
                {t('refund_modal_title', { number: orderNumber })}
            </h3>
            <p className={styles.modalMessage}>
                {t('refund_modal_explainer', { amount: formatCurrency(maxRefundable) })}
            </p>

            <div className={styles.modalFields}>
                <Select
                    label={t('refund_reason_label')}
                    value={reasonChoice}
                    onChange={(e) => setReasonChoice(e.target.value)}
                    options={REASONS}
                />
                {reasonChoice === 'Otro' && (
                    <Input
                        name="refund-reason-other"
                        label={t('refund_reason_other_label')}
                        value={otherReason}
                        setValue={setOtherReason}
                        placeholder={t('refund_reason_other_placeholder')}
                        variant="bordered"
                        multiline
                        rows={2}
                    />
                )}

                <label className={styles.partialToggle}>
                    <input
                        type="checkbox"
                        checked={isPartial}
                        onChange={(e) => setIsPartial(e.target.checked)}
                    />
                    {t('refund_partial_toggle')}
                </label>

                {isPartial && (
                    <Input
                        name="refund-amount"
                        label={t('refund_amount_label')}
                        value={amount}
                        setValue={setAmount}
                        placeholder="0.00"
                        variant="bordered"
                        type="number"
                    />
                )}
            </div>

            <div className={styles.modalActions}>
                <Button variant="secondary" onClick={closeModal}>
                    {t('refund_modal_back')}
                </Button>
                <Button
                    variant="warning"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                >
                    {refundOrder.isPending
                        ? t('refund_modal_submitting')
                        : t('refund_modal_confirm')}
                </Button>
            </div>
        </div>
    );
}
