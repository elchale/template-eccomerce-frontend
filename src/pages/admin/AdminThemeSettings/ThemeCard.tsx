import { Check, Heart, ShoppingBag } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import type { ThemeDefinition } from '@/types/theme';

import styles from './ThemeCard.module.css';

/** Selectable base-palette tile in the theme editor. The card renders
 *  the palette's preview swatches so the admin can compare options
 *  side-by-side before committing. */
interface ThemeCardProps {
    theme: ThemeDefinition;
    isSelected: boolean;
    onSelect: () => void;
}

export function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
    const { t } = useTranslation('admin');

    return (
        <div
            className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect();
            }}
            aria-pressed={isSelected}
            aria-label={t(`theme_name_${theme.id}`)}
        >
            {!!isSelected && (
                <div className={styles.selectedBadge} aria-label={t('theme_selected')}>
                    <Check />
                </div>
            )}

            {/* Live preview — data-theme on this wrapper scopes theme variables to descendants */}
            <div data-theme={theme.id} className={styles.preview}>
                <div className={styles.previewInner}>
                    <h3 className={styles.previewHeading}>{t(`theme_name_${theme.id}`)}</h3>
                    <p className={styles.previewBody}>{t('theme_preview_body')}</p>

                    <div className={styles.previewControls}>
                        <button type="button" className={styles.previewButton} tabIndex={-1}>
                            <ShoppingBag aria-hidden="true" />
                            {t('theme_preview_cta')}
                        </button>
                        <span className={styles.previewChip}>
                            <Heart aria-hidden="true" />
                            {t('theme_preview_tag')}
                        </span>
                    </div>

                    <div className={styles.swatchRow}>
                        {theme.swatches.map((color, i) => (
                            <span
                                key={i}
                                className={styles.swatch}
                                style={{ backgroundColor: color }}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.cardFooter}>
                <p className={styles.cardName}>{t(`theme_name_${theme.id}`)}</p>
                <p className={styles.cardDesc}>{t(`theme_desc_${theme.id}`)}</p>
            </div>
        </div>
    );
}
