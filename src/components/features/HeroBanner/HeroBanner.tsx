import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useActiveBanners } from '@/api/useMarketing';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { useInterval } from '@/hooks';
import { sanitizeUrl } from '@/lib/sanitize';

import styles from './HeroBanner.module.css';

/**
 * Auto-rotating hero carousel on the storefront landing page.
 *
 * Reads banners tagged with `tipo='hero'`. Rotation is 5s when more than
 * one banner is active, paused otherwise (single banner stays put). CTA
 * destinations are validated through `sanitizeUrl()` for external links;
 * internal paths are routed via React Router with no sanitization since
 * they originate from trusted admin input and are scoped to the SPA.
 */
export function HeroBanner() {
    const { t } = useTranslation();
    const { data: banners, isLoading } = useActiveBanners('hero');
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);

    const count = banners?.length ?? 0;

    const next = useCallback(() => {
        setActiveIndex((prev) => (prev + 1) % count);
    }, [count]);

    useInterval(next, count > 1 ? 5000 : null);

    if (isLoading) {
        return <Skeleton variant="rectangular" height={480} />;
    }

    if (!banners || banners.length === 0) return null;

    const banner = banners[activeIndex];
    if (!banner) return null;

    const handleCta = () => {
        if (banner.enlace_cta) {
            if (banner.enlace_cta.startsWith('/')) {
                // Internal path — use router, no sanitization needed
                navigate(banner.enlace_cta);
            } else {
                // FE-5: sanitize external URL before navigation to prevent JS injection
                const safeUrl = sanitizeUrl(banner.enlace_cta);
                if (safeUrl) {
                    window.location.href = safeUrl;
                }
                // If sanitizeUrl returns '' (e.g. javascript: scheme), click is a no-op
            }
        }
    };

    return (
        <section className={styles.hero} aria-label={t('hero_banner_aria')}>
            <div
                className={styles.slide}
                style={
                    banner.imagen_url
                        ? { backgroundImage: `url(${banner.imagen_url})` }
                        : { background: banner.color_fondo || 'var(--gradient-hero)' }
                }
            >
                <picture>
                    {!!banner.imagen_movil_url && (
                        <source media="(max-width: 768px)" srcSet={banner.imagen_movil_url} />
                    )}
                    {!!banner.imagen_url && (
                        <img
                            src={banner.imagen_url}
                            alt={banner.titulo}
                            className={styles.bgImage}
                            loading="eager"
                            decoding="async"
                            width={1600}
                            height={600}
                        />
                    )}
                </picture>

                <div className={styles.overlay} />

                <div
                    className={styles.content}
                    style={banner.color_texto ? { color: banner.color_texto } : undefined}
                >
                    {!!banner.titulo && <h2 className={styles.title}>{banner.titulo}</h2>}
                    {!!banner.subtitulo && <p className={styles.subtitle}>{banner.subtitulo}</p>}
                    {!!banner.texto_cta && (
                        <Button size="lg" onClick={handleCta} className={styles.ctaBtn}>
                            {banner.texto_cta}
                        </Button>
                    )}
                </div>
            </div>

            {count > 1 && (
                <div className={styles.dots} role="tablist" aria-label={t('slides_aria')}>
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === activeIndex}
                            aria-label={t('slide_n_aria', { n: i + 1 })}
                            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                            onClick={() => setActiveIndex(i)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
