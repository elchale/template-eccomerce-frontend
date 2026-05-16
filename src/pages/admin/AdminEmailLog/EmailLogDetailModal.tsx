/**
 * EmailLogDetailModal — inspect a single EmailLog row.
 *
 * Shows the FULL detail including:
 *  - Friendly objective (email_type_display)
 *  - Raw template_name  ← only surfaced here, NOT in the list
 *  - task_name, subject, recipient, order number
 *  - status, attempts, error_message
 *  - sent_at, last_attempt_at, created timestamps
 *
 * Accepts optional `handleClose` per AGENTS.md modal convention.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useModalStore } from '@/stores';
import type { EmailLog } from '@/types/emailLog';

import styles from './EmailLogDetailModal.module.css';

interface EmailLogDetailModalProps {
    log: EmailLog;
    handleClose?: () => void;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>{label}</dt>
            <dd className={styles.detailValue}>{value ?? '—'}</dd>
        </div>
    );
}

export function EmailLogDetailModal({ log, handleClose }: EmailLogDetailModalProps) {
    const { closeModal } = useModalStore();
    const { t, i18n } = useTranslation('admin');

    const onClose = () => {
        handleClose?.();
        closeModal();
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString(i18n.language);
    };

    return (
        <div className={styles.modal}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('email_log_detail_title')}</h2>
                <button
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label={t('close', { ns: 'common' })}
                    type="button"
                >
                    ✕
                </button>
            </div>

            <dl className={styles.detailList}>
                <DetailRow label={t('email_log_col_objetivo')} value={log.email_type_display} />
                <DetailRow label={t('email_log_detail_template')} value={
                    <code className={styles.codeValue}>{log.template_name}</code>
                } />
                <DetailRow label={t('email_log_detail_task')} value={
                    <code className={styles.codeValue}>{log.task_name}</code>
                } />
                <DetailRow label={t('email_log_detail_subject')} value={log.subject} />
                <DetailRow label={t('email_log_col_destinatario')} value={log.recipient_email} />
                <DetailRow label={t('email_log_detail_order')} value={log.order_number ?? '—'} />
                <DetailRow label={t('email_log_col_estado')} value={log.status_display} />
                <DetailRow label={t('email_log_detail_attempts')} value={String(log.attempts)} />

                {log.error_message && (
                    <DetailRow
                        label={t('email_log_detail_error')}
                        value={
                            <span className={styles.errorText}>{log.error_message}</span>
                        }
                    />
                )}

                <DetailRow label={t('email_log_detail_sent_at')} value={formatDate(log.sent_at)} />
                <DetailRow
                    label={t('email_log_detail_last_attempt')}
                    value={formatDate(log.last_attempt_at)}
                />
                <DetailRow label={t('email_log_detail_created')} value={formatDate(log.created)} />
            </dl>

            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.closeBtnPrimary}
                    onClick={onClose}
                >
                    {t('close', { ns: 'common' })}
                </button>
            </div>
        </div>
    );
}
