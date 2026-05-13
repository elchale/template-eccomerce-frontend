import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAdminPromociones, useAdminDeletePromocion } from '@/api/useAdminMarketing';
import { Button, TableSkeleton, EmptyState, CountdownTimer, Paginator } from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES, buildRoute } from '@/constants/routes';

import styles from './AdminPromoList.module.css';

/** `/admin/marketing/promos` — list page for time-bound promotions.
 *  Active promos drive the storefront's Flash Sale section; the
 *  `CountdownTimer` here shows admins what shoppers see. */
export function AdminPromoList() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const { t } = useTranslation('admin');

    const params = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };

    const { data, isLoading } = useAdminPromociones(params);
    const deletePromo = useAdminDeletePromocion();

    const promos = data?.results ?? [];
    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    const handleDelete = (id: number) => {
        if (!confirm(t('promos_delete_confirm'))) return;
        deletePromo.mutate(id, {
            onSuccess: () => toast.success(t('promos_deleted')),
            onError: () => toast.error(t('promos_delete_error')),
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
                <h1 className={styles.title}>{t('promos_title')}</h1>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate(ROUTES.adminMarketingPromoNew)}
                >
                    <Plus size={16} weight="bold" />
                    {t('promos_new')}
                </Button>
            </div>

            {promos.length === 0 ? (
                <EmptyState title={t('promos_empty')} message={t('promos_empty_message')} />
            ) : (
                <>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{t('promos_col_name')}</th>
                                    <th>{t('promos_col_type')}</th>
                                    <th>{t('promos_col_discount')}</th>
                                    <th>{t('promos_col_flash')}</th>
                                    <th>{t('promos_col_ends')}</th>
                                    <th>{t('actions', { ns: 'common' })}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promos.map((promo) => (
                                    <tr key={promo.id}>
                                        <td>{promo.nombre}</td>
                                        <td>
                                            <span className={styles.badge}>{promo.tipo}</span>
                                        </td>
                                        <td>{promo.valor_descuento}</td>
                                        <td>{promo.es_flash_sale ? '✓' : '-'}</td>
                                        <td>
                                            <CountdownTimer
                                                targetDate={promo.fecha_fin}
                                                size="sm"
                                            />
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() =>
                                                        navigate(
                                                            buildRoute.adminMarketingPromoEdit(
                                                                promo.id,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={t('edit', { ns: 'common' })}
                                                >
                                                    <PencilSimple size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconBtn} ${styles.danger}`}
                                                    onClick={() => handleDelete(promo.id)}
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
