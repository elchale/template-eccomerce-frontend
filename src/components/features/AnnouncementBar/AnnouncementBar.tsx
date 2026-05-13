import { X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveBanners } from '@/api/useMarketing';
import { useInterval } from '@/hooks';

import styles from './AnnouncementBar.module.css';

export function AnnouncementBar() {
    const { t } = useTranslation();
    const { data: banners } = useActiveBanners('anuncio');
    const [visible, setVisible] = useState(true);
    const [closing, setClosing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useInterval(
        () => {
            if (banners && banners.length > 1) {
                setCurrentIndex((prev) => (prev + 1) % banners.length);
            }
        },
        banners && banners.length > 1 ? 4000 : null,
    );

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => setVisible(false), 280);
    };

    if (!visible || !banners || banners.length === 0) return null;

    const banner = banners[currentIndex];
    if (!banner) return null;

    return (
        <div
            className={`${styles.bar} ${closing ? styles.barClosing : ''}`}
            style={
                banner.color_fondo
                    ? ({ '--bar-bg': banner.color_fondo } as React.CSSProperties)
                    : undefined
            }
        >
            <div className={styles.inner}>
                <span className={styles.text}>
                    {banner.titulo}
                    {!!banner.texto_cta && !!banner.enlace_cta && (
                        <a href={banner.enlace_cta} className={styles.cta}>
                            {banner.texto_cta}
                        </a>
                    )}
                </span>
            </div>
            <button
                className={styles.closeBtn}
                onClick={handleClose}
                aria-label={t('close_announcement')}
            >
                <X size={14} weight="bold" />
            </button>
        </div>
    );
}
