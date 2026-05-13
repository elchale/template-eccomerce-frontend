import { Fire } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { useActivePromociones } from '@/api/useMarketing';
import { useProducts } from '@/api/useProducts';
import { ProductCard } from '@/components/features/ProductCard/ProductCard';
import { CountdownTimer } from '@/components/ui/CountdownTimer/CountdownTimer';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';

import styles from './FlashSaleSection.module.css';

export function FlashSaleSection() {
    const { t } = useTranslation();
    const { data: promociones, isLoading: promoLoading } = useActivePromociones();
    const flashSales = promociones?.filter((p) => p.es_flash_sale) ?? [];

    const firstFlash = flashSales[0];

    const { data: productsData, isLoading: productsLoading } = useProducts({
        is_featured: true,
        limit: 8,
    });

    if (promoLoading || productsLoading) {
        return (
            <section className={styles.section}>
                <div className={styles.header}>
                    <Skeleton variant="text" width={200} height={28} />
                </div>
                <div className={styles.scrollRow}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={styles.cardSlot}>
                            <Skeleton variant="card" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!firstFlash) return null;

    const products = productsData?.results ?? [];
    if (products.length === 0) return null;

    return (
        <section className={styles.section} aria-label={t('flash_sale')}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <Fire weight="fill" size={24} className={styles.fireIcon} aria-hidden="true" />
                    <h2 className={styles.title}>{t('flash_sale')}</h2>
                </div>
                <CountdownTimer targetDate={firstFlash.fecha_fin} size="md" />
            </div>

            <div className={styles.scrollRow}>
                {products.map((product) => (
                    <div key={product.id} className={styles.cardSlot}>
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </section>
    );
}
