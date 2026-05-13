/**
 * Generic destructive-action confirmation dialog (FE-9). Push into the
 * global modal slot via `useModalStore.openModal(<ConfirmModal .../>)`.
 * Default styling assumes a `danger` action; pass `variant="warning"` for
 * less severe operations. `onConfirm` may be async — the modal awaits it
 * before closing so a parent can show a follow-up state.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useEscapeKey } from '@/hooks';
import { useModalStore } from '@/stores';

import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    title: string;
    message: string;
    /** Label for the confirm button. Default: localized 'Confirm' */
    confirmLabel?: string;
    /** Label for the cancel button. Default: localized 'Cancel' */
    cancelLabel?: string;
    /** Visual variant of the confirm button. Default: 'danger' */
    variant?: 'danger' | 'warning';
    /** Called when the user confirms the action */
    onConfirm: () => void | Promise<void>;
    /** Optional: called when the modal is closed (either confirmed or cancelled) */
    handleClose?: () => void;
}

export function ConfirmModal({
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'danger',
    onConfirm,
    handleClose,
}: ConfirmModalProps) {
    const { t } = useTranslation();
    const closeModal = useModalStore((s) => s.closeModal);
    const effectiveConfirmLabel = confirmLabel ?? t('confirm');
    const effectiveCancelLabel = cancelLabel ?? t('cancel');

    const handleConfirm = async () => {
        await onConfirm();
        handleClose?.();
        closeModal();
    };

    const handleCancel = () => {
        handleClose?.();
        closeModal();
    };

    useEscapeKey(handleCancel);

    return (
        <div
            className={styles.container}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <h3 className={styles.title} id="confirm-modal-title">
                {title}
            </h3>
            <p className={styles.message}>{message}</p>

            <div className={styles.actions}>
                <Button variant="secondary" onClick={handleCancel}>
                    {effectiveCancelLabel}
                </Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : 'warning'}
                    onClick={handleConfirm}
                >
                    {effectiveConfirmLabel}
                </Button>
            </div>
        </div>
    );
}
