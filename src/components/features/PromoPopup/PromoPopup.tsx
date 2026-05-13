import { X } from '@phosphor-icons/react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useActivePopups } from '@/api/useMarketing';
import { Button } from '@/components/ui';
import { useMarketingStore } from '@/stores/useMarketingStore';
import type { Popup } from '@/types/marketing';

import styles from './PromoPopup.module.css';

/**
 * Renders at most one active marketing popup per session. Eligibility
 * combines two filters:
 *  1. Backend `is_active` + date window (returned by `useActivePopups`).
 *  2. Client-side per-popup cooldown via `useMarketingStore.shouldShowPopup`
 *     (admin-configured `frecuencia_horas`).
 *
 * `shownRef` is a render guard so React 19's StrictMode double-invocation
 * doesn't schedule the popup twice. Each popup respects its own
 * `retraso_segundos` before appearing.
 */
export function PromoPopup() {
    const { t } = useTranslation();
    const { data: popups } = useActivePopups();
    const shouldShowPopup = useMarketingStore((s) => s.shouldShowPopup);
    const dismissPopup = useMarketingStore((s) => s.dismissPopup);
    const [activePopup, setActivePopup] = useState<Popup | null>(null);
    const shownRef = useRef(false);

    useEffect(() => {
        if (shownRef.current || !popups || popups.length === 0) return;

        const eligible = popups.find((p) => shouldShowPopup(p.id, p.frecuencia_horas));
        if (!eligible) return;

        shownRef.current = true;
        const delay = Math.max(0, eligible.retraso_segundos * 1000);
        const id = setTimeout(() => {
            setActivePopup(eligible);
        }, delay);

        return () => clearTimeout(id);
    }, [popups, shouldShowPopup]);

    const handleClose = () => {
        if (activePopup) {
            dismissPopup(activePopup.id);
        }
        setActivePopup(null);
    };

    if (!activePopup) return null;

    return (
        <>
            <div className={styles.backdrop} onClick={handleClose} aria-hidden="true" />
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-title"
            >
                <button className={styles.closeBtn} onClick={handleClose} aria-label={t('close')}>
                    <X size={18} weight="bold" />
                </button>

                {!!activePopup.imagen_url && (
                    <img
                        src={activePopup.imagen_url}
                        alt={activePopup.titulo}
                        className={styles.image}
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={300}
                    />
                )}

                <div className={styles.body}>
                    <h2 id="popup-title" className={styles.title}>
                        {activePopup.titulo}
                    </h2>
                    {!!activePopup.mensaje && (
                        <p className={styles.message}>{activePopup.mensaje}</p>
                    )}
                    {!!activePopup.codigo_cupon && (
                        <div className={styles.couponBadge}>
                            <span className={styles.couponLabel}>{t('discount_code_label')}</span>
                            <strong className={styles.couponCode}>
                                {activePopup.codigo_cupon}
                            </strong>
                        </div>
                    )}
                    {!!activePopup.texto_cta && !!activePopup.enlace_cta && (
                        <a href={activePopup.enlace_cta} onClick={handleClose}>
                            <Button variant="primary" size="lg" className={styles.ctaBtn}>
                                {activePopup.texto_cta}
                            </Button>
                        </a>
                    )}
                    <button className={styles.skipBtn} onClick={handleClose}>
                        {t('no_thanks')}
                    </button>
                </div>
            </div>
        </>
    );
}
