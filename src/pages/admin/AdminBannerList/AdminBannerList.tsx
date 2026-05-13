import { Plus, PencilSimple, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAdminBanners, useAdminDeleteBanner } from '@/api/useAdminMarketing';
import { Button, TableSkeleton, EmptyState, Paginator } from '@/components/ui';
import { PAGINATION } from '@/constants/pagination';
import { ROUTES, buildRoute } from '@/constants/routes';

import styles from './AdminBannerList.module.css';

/** `/admin/marketing/banners` — list page for hero/category banners.
 *  Each row shows the rendered image; edit/delete actions open `AdminBannerForm`. */
export function AdminBannerList() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const { t } = useTranslation('admin');

    const params = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };

    const { data, isLoading } = useAdminBanners(params);
    const deleteBanner = useAdminDeleteBanner();

    const banners = data?.results ?? [];
    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    const handleDelete = (id: number) => {
        if (!confirm(t('banners_delete_confirm'))) return;
        deleteBanner.mutate(id, {
            onSuccess: () => toast.success(t('banners_deleted')),
            onError: () => toast.error(t('banners_delete_error')),
        });
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <TableSkeleton rows={6} columns={5} showImageColumn />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('banners_title')}</h1>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate(ROUTES.adminMarketingBannerNew)}
                >
                    <Plus size={16} weight="bold" />
                    {t('banners_new')}
                </Button>
            </div>

            {banners.length === 0 ? (
                <EmptyState title={t('banners_empty')} message={t('banners_empty_message')} />
            ) : (
                <>
                    <div className={styles.grid}>
                        {banners.map((banner) => (
                            <div key={banner.id} className={styles.card}>
                                {!!banner.imagen_url && (
                                    <img
                                        src={banner.imagen_url}
                                        alt={banner.titulo}
                                        className={styles.preview}
                                        loading="lazy"
                                        decoding="async"
                                        width={200}
                                        height={80}
                                    />
                                )}
                                <div className={styles.cardBody}>
                                    <span className={styles.cardType}>{banner.tipo}</span>
                                    <h3 className={styles.cardTitle}>{banner.titulo}</h3>
                                    {!!banner.subtitulo && (
                                        <p className={styles.cardSubtitle}>{banner.subtitulo}</p>
                                    )}
                                </div>
                                <div className={styles.cardActions}>
                                    <button
                                        className={styles.iconBtn}
                                        onClick={() =>
                                            navigate(buildRoute.adminMarketingBannerEdit(banner.id))
                                        }
                                        aria-label={t('edit', { ns: 'common' })}
                                    >
                                        <PencilSimple size={16} />
                                    </button>
                                    <button
                                        className={`${styles.iconBtn} ${styles.danger}`}
                                        onClick={() => handleDelete(banner.id)}
                                        aria-label={t('delete', { ns: 'common' })}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
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
