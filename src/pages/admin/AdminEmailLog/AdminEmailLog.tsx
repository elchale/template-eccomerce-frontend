/**
 * AdminEmailLog — `/admin/email-logs`
 *
 * Paginated table of email dispatch records.
 * Columns: Objetivo (friendly email_type_display), Destinatario,
 *          Estado (Badge), Fecha.
 *
 * Features:
 *  - Status filter Select (todos / pendiente / reintentando / confirmado / fallido)
 *  - "Inspeccionar" opens EmailLogDetailModal (raw template_name visible there only)
 *  - "Reintentar" button shown on rows where is_retryable === true
 *  - TableSkeleton while loading; EmptyState (unfiltered + filtered variants);
 *  - Paginator for multi-page result sets.
 *
 * Error handling matches UX Standards:
 *  - 409  → specific toast explaining not-retryable
 *  - 404  → toast + list invalidated
 *  - 500+ → generic "algo salió mal" toast (red, 8s)
 */
import { ArrowCounterClockwise, Eye } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAdminEmailLogs, useRetryEmailLog, EMAIL_LOG_KEYS } from '@/api';
import { Select } from '@/components/forms';
import {
    Badge,
    Button,
    Card,
    CardTitle,
    EmptyState,
    Paginator,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    TableSkeleton,
} from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { useModalStore } from '@/stores';
import type { EmailLog, EmailLogStatus } from '@/types/emailLog';

import { EmailLogDetailModal } from './EmailLogDetailModal';
import styles from './AdminEmailLog.module.css';

/** Map email log status to the closest Badge variant. */
function statusToBadgeVariant(
    status: EmailLogStatus,
): 'new' | 'sale' | 'out-of-stock' | 'featured' {
    switch (status) {
        case 'confirmed':
            return 'new';
        case 'failed':
            return 'sale';
        case 'retrying':
            return 'featured';
        case 'pending':
        default:
            return 'out-of-stock';
    }
}

export function AdminEmailLog() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const { t, i18n } = useTranslation('admin');
    const { openModal } = useModalStore();
    const queryClient = useQueryClient();

    const STATUS_OPTIONS = [
        { value: '', label: t('email_log_filter_all') },
        { value: 'pending', label: t('email_log_status_pending') },
        { value: 'retrying', label: t('email_log_status_retrying') },
        { value: 'confirmed', label: t('email_log_status_confirmed') },
        { value: 'failed', label: t('email_log_status_failed') },
    ];

    const params: Record<string, string> = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };
    if (statusFilter) params.status = statusFilter;

    const { data, isLoading, error, refetch } = useAdminEmailLogs(params);
    const retryMutation = useRetryEmailLog();

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    const handleInspect = (log: EmailLog) => {
        openModal(<EmailLogDetailModal log={log} />);
    };

    const handleRetry = (log: EmailLog) => {
        retryMutation.mutate(log.id, {
            onSuccess: () => {
                toast.success(t('email_log_retry_success'));
            },
            onError: (err: unknown) => {
                // Check HTTP status from axios error shape
                const status =
                    (err as { response?: { status?: number } })?.response?.status;

                if (status === 409) {
                    toast.error(t('email_log_retry_409'), { duration: 8000 });
                } else if (status === 404) {
                    toast.error(t('email_log_retry_404'), { duration: 8000 });
                    void queryClient.invalidateQueries({ queryKey: EMAIL_LOG_KEYS.all });
                } else {
                    toast.error(t('email_log_retry_error'), { duration: 8000 });
                }
            },
        });
    };

    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;
    const logs = data?.results ?? [];

    return (
        <div className={styles.container}>
            <Card className={styles.headerCard}>
                <CardTitle>{t('email_log_title')}</CardTitle>
            </Card>

            <div className={styles.toolbar}>
                <div className={styles.filterGroup}>
                    <Select
                        label={t('email_log_filter_status')}
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={STATUS_OPTIONS}
                        size="sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={6} columns={5} />
            ) : error ? (
                <EmptyState
                    title={t('email_log_load_error')}
                    message={t('email_log_load_error_message')}
                    action={
                        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                            {t('retry', { ns: 'common' })}
                        </Button>
                    }
                />
            ) : logs.length === 0 ? (
                statusFilter ? (
                    <EmptyState
                        title={t('email_log_empty_filtered_title')}
                        message={t('email_log_empty_filtered_message')}
                        action={
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setStatusFilter('');
                                    setPage(1);
                                }}
                            >
                                {t('email_log_empty_filtered_cta')}
                            </Button>
                        }
                    />
                ) : (
                    <EmptyState
                        title={t('email_log_empty_title')}
                        message={t('email_log_empty_message')}
                    />
                )
            ) : (
                <>
                    <Table aria-label={t('email_log_title')} radius={8}>
                        <TableHeader>
                            <TableColumn>{t('email_log_col_objetivo')}</TableColumn>
                            <TableColumn>{t('email_log_col_destinatario')}</TableColumn>
                            <TableColumn>{t('email_log_col_estado')}</TableColumn>
                            <TableColumn>{t('email_log_col_fecha')}</TableColumn>
                            <TableColumn>{t('email_log_col_actions')}</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <span className={styles.objetivo}>
                                            {log.email_type_display}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={styles.email}>
                                            {log.recipient_email}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusToBadgeVariant(log.status)}>
                                            {log.status_display}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className={styles.date}>
                                            {new Date(log.created).toLocaleDateString(
                                                i18n.language,
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className={styles.actions}>
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                onClick={() => handleInspect(log)}
                                                title={t('email_log_inspect')}
                                                aria-label={t('email_log_inspect')}
                                            >
                                                <Eye />
                                            </button>
                                            {log.is_retryable && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleRetry(log)}
                                                    disabled={retryMutation.isPending}
                                                >
                                                    <ArrowCounterClockwise />
                                                    {t('email_log_retry_btn')}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {numPages > 1 && (
                        <div className={styles.pagination}>
                            <Paginator
                                page={page}
                                numPages={numPages}
                                onPageChange={setPage}
                                size="sm"
                                showEdges={false}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
