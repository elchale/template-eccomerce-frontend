import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAdminUpdateOrderStatus } from '@/api';
import { Input, Select } from '@/components/forms';
import { Button } from '@/components/ui';
import { useEscapeKey } from '@/hooks';
import { useModalStore } from '@/stores';

import styles from './AdminOrderDetail.module.css';

interface CancelOrderModalProps {
    orderId: number;
    orderNumber: string;
}

/**
 * Admin-side cancel dialog: the reason field is required (the backend
 * enforces it via the serializer), but we pre-fill a curated list of
 * common reasons + a free-text fallback so audit logs read consistently.
 */
export function CancelOrderModal({ orderId, orderNumber }: CancelOrderModalProps) {
    const { t } = useTranslation('admin');
    const closeModal = useModalStore((s) => s.closeModal);
    const updateStatus = useAdminUpdateOrderStatus();

    const REASONS = [
        { value: 'Solicitud del cliente', label: t('cancel_reason_customer_request') },
        { value: 'Sin stock', label: t('cancel_reason_no_stock') },
        { value: 'Datos de envío incorrectos', label: t('cancel_reason_bad_address') },
        { value: 'Sospecha de fraude', label: t('cancel_reason_fraud') },
        { value: 'Otro', label: t('cancel_reason_other') },
    ];

    const [reasonChoice, setReasonChoice] = useState(REASONS[0]!.value);
    const [otherReason, setOtherReason] = useState('');
    const [note, setNote] = useState('');

    const effectiveReason = reasonChoice === 'Otro' ? otherReason.trim() : reasonChoice;
    const canSubmit = effectiveReason.length > 0 && !updateStatus.isPending;

    useEscapeKey(closeModal);

    const handleSubmit = () => {
        if (!canSubmit) {
            toast.error(t('cancel_reason_required'));
            return;
        }
        updateStatus.mutate(
            {
                id: orderId,
                status: 'cancelled',
                cancelReason: effectiveReason,
                ...(note.trim() && { note: note.trim() }),
            },
            {
                onSuccess: () => {
                    toast.success(t('cancel_success'));
                    closeModal();
                },
                onError: () => toast.error(t('cancel_error')),
            },
        );
    };

    return (
        <div
            className={styles.modalContainer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-modal-title"
        >
            <h3 className={styles.modalTitle} id="cancel-order-modal-title">
                {t('cancel_modal_title', { number: orderNumber })}
            </h3>
            <p className={styles.modalMessage}>{t('cancel_modal_explainer')}</p>

            <div className={styles.modalFields}>
                <Select
                    label={t('cancel_reason_label')}
                    value={reasonChoice}
                    onChange={(e) => setReasonChoice(e.target.value)}
                    options={REASONS}
                />
                {reasonChoice === 'Otro' && (
                    <Input
                        name="cancel-reason-other"
                        label={t('cancel_reason_other_label')}
                        value={otherReason}
                        setValue={setOtherReason}
                        placeholder={t('cancel_reason_other_placeholder')}
                        variant="bordered"
                        multiline
                        rows={2}
                    />
                )}
                <Input
                    name="cancel-note"
                    label={t('cancel_note_label')}
                    value={note}
                    setValue={setNote}
                    placeholder={t('cancel_note_placeholder')}
                    variant="bordered"
                    multiline
                    rows={3}
                />
            </div>

            <div className={styles.modalActions}>
                <Button variant="secondary" onClick={closeModal}>
                    {t('cancel_modal_back')}
                </Button>
                <Button
                    variant="danger"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                >
                    {updateStatus.isPending
                        ? t('cancel_modal_submitting')
                        : t('cancel_modal_confirm')}
                </Button>
            </div>
        </div>
    );
}
