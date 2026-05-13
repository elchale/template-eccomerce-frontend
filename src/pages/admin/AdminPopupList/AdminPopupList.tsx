import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAdminPopups, useAdminDeletePopup } from '@/api/useAdminMarketing';
import { Button, TableSkeleton, EmptyState, Paginator } from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES, buildRoute } from '@/constants/routes';

import styles from './AdminPopupList.module.css';

/** `/admin/marketing/popups` — list page for marketing popups
 *  (newsletter, promo announcements). Dismissal-frequency is per-popup. */
export function AdminPopupList() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const { t } = useTranslation('admin');

    const params = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };

    const { data, isLoading } = useAdminPopups(params);
    const deletePopup = useAdminDeletePopup();

    const popups = data?.results ?? [];
    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    const handleDelete = (id: number) => {
        if (!confirm(t('popups_delete_confirm'))) return;
        deletePopup.mutate(id, {
            onSuccess: () => toast.success(t('popups_deleted')),
            onError: () => toast.error(t('popups_delete_error')),
        });
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <TableSkeleton rows={6} columns={5} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('popups_title')}</h1>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate(ROUTES.adminMarketingPopupNew)}
                >
                    <Plus size={16} weight="bold" />
                    {t('popups_new')}
                </Button>
            </div>

            {popups.length === 0 ? (
                <EmptyState title={t('popups_empty')} message={t('popups_empty_message')} />
            ) : (
                <>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{t('popups_col_name')}</th>
                                    <th>{t('popups_col_type')}</th>
                                    <th>{t('popups_col_delay')}</th>
                                    <th>{t('popups_col_frequency')}</th>
                                    <th>{t('actions', { ns: 'common' })}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {popups.map((popup) => (
                                    <tr key={popup.id}>
                                        <td>{popup.nombre}</td>
                                        <td>
                                            <span className={styles.badge}>{popup.tipo}</span>
                                        </td>
                                        <td>{popup.retraso_segundos}</td>
                                        <td>{popup.frecuencia_horas}</td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() =>
                                                        navigate(
                                                            buildRoute.adminMarketingPopupEdit(
                                                                popup.id,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={t('edit', { ns: 'common' })}
                                                >
                                                    <PencilSimple size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconBtn} ${styles.danger}`}
                                                    onClick={() => handleDelete(popup.id)}
                                                    aria-label={t('delete', { ns: 'common' })}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
