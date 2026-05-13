import { Info } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import {
    useAdminThemeSettings,
    useAdminUpdateTheme,
    useAdminResetTheme,
} from '@/api/useAdminTheme';
import { THEMES, CUSTOMIZABLE_COLORS } from '@/constants/themes';
import { useModalStore } from '@/stores/useModalStore';
import { useThemeStore } from '@/stores/useThemeStore';
import type { ThemeId, CustomColors } from '@/types/theme';

import styles from './AdminThemeSettings.module.css';
import { ColorRow } from './ColorRow';
import { ThemeCard } from './ThemeCard';

// ============================================
// Reset confirmation modal content
// ============================================

interface ResetConfirmProps {
    handleClose?: () => void;
    onConfirm: () => void;
}

function ResetConfirmModal({ handleClose, onConfirm }: ResetConfirmProps) {
    const { t } = useTranslation('admin');

    return (
        <div className={styles.confirmContent}>
            <p className={styles.confirmTitle}>{t('theme_reset_confirm_title')}</p>
            <p className={styles.confirmBody}>{t('theme_reset_confirm_body')}</p>
            <div className={styles.confirmActions}>
                <button type="button" className={styles.btnSecondary} onClick={handleClose}>
                    {t('theme_reset_confirm_cancel')}
                </button>
                <button
                    type="button"
                    className={styles.btnDestructive}
                    onClick={() => {
                        onConfirm();
                        handleClose?.();
                    }}
                >
                    {t('theme_reset_confirm_yes')}
                </button>
            </div>
        </div>
    );
}

// ============================================
// Main page
// ============================================

/**
 * `/admin/marketing/theme` — site-wide theme editor.
 *
 * Two-layer editor:
 *  - Base palette selection (`ThemeCard` grid) — switches `themeId`.
 *  - Per-token color overrides (`ColorRow` list, scoped to
 *    `CUSTOMIZABLE_COLORS`) — saves to `customColors`.
 *
 * Live-preview pattern: every change immediately calls the store mutator
 * so the admin sees the result on the storefront-styled preview without a
 * save round-trip. Save persists to the server; Reset clears all overrides
 * and reapplies the default palette via the dedicated reset endpoint.
 */
export function AdminThemeSettings() {
    const { t } = useTranslation('admin');
    const { data: serverData, isLoading } = useAdminThemeSettings();
    const updateTheme = useAdminUpdateTheme();
    const resetTheme = useAdminResetTheme();
    const setTheme = useThemeStore((s) => s.setTheme);
    const setCustomColor = useThemeStore((s) => s.setCustomColor);
    const resetCustomColor = useThemeStore((s) => s.resetCustomColor);
    const setFromServer = useThemeStore((s) => s.setFromServer);
    const openModal = useModalStore((s) => s.openModal);
    const closeModal = useModalStore((s) => s.closeModal);

    const [pendingThemeId, setPendingThemeId] = useState<ThemeId>('classic');
    const [pendingCustomColors, setPendingCustomColors] = useState<CustomColors>({});

    // Sync pending state from server on load
    useEffect(() => {
        if (serverData) {
            setPendingThemeId(serverData.theme_id);
            setPendingCustomColors(serverData.custom_colors);
        }
    }, [serverData]);

    const isDirty =
        !!serverData &&
        (pendingThemeId !== serverData.theme_id ||
            JSON.stringify(pendingCustomColors) !== JSON.stringify(serverData.custom_colors));

    // ----------------------------------------
    // Handlers
    // ----------------------------------------

    const handleThemeSelect = (themeId: ThemeId) => {
        setTheme(themeId); // live preview
        setPendingThemeId(themeId);
    };

    const handleColorChange = (key: string, val: string) => {
        setCustomColor(key, val); // live preview
        setPendingCustomColors((prev) => ({ ...prev, [key]: val }));
    };

    const handleColorReset = (key: string) => {
        resetCustomColor(key); // live preview
        setPendingCustomColors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleSave = async () => {
        if (!isDirty) {
            toast(t('toast_theme_no_changes'), { duration: 3000 });
            return;
        }
        try {
            await updateTheme.mutateAsync({
                theme_id: pendingThemeId,
                custom_colors: pendingCustomColors,
            });
            toast.success(t('toast_theme_saved'), { duration: 3000 });
        } catch {
            toast.error(t('toast_theme_save_error'), { duration: 8000 });
        }
    };

    const handleDiscard = () => {
        if (serverData) {
            setPendingThemeId(serverData.theme_id);
            setPendingCustomColors(serverData.custom_colors);
            setFromServer(serverData);
        }
    };

    const handleResetAll = () => {
        openModal(
            <ResetConfirmModal
                handleClose={closeModal}
                onConfirm={async () => {
                    try {
                        await resetTheme.mutateAsync();
                        toast.success(t('toast_theme_reset'), { duration: 3000 });
                        setPendingCustomColors({});
                    } catch {
                        toast.error(t('toast_theme_reset_error'), { duration: 8000 });
                    }
                }}
            />,
        );
    };

    // ----------------------------------------
    // Loading skeleton
    // ----------------------------------------

    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div className={styles.pageHeaderText}>
                        <div
                            className={styles.skeleton}
                            style={{ height: '32px', width: '200px', marginBottom: '8px' }}
                        />
                        <div
                            className={styles.skeleton}
                            style={{ height: '20px', width: '340px' }}
                        />
                    </div>
                </div>
                <div className={styles.skeletonGrid}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={styles.skeletonCard} />
                    ))}
                </div>
            </div>
        );
    }

    // ----------------------------------------
    // Render
    // ----------------------------------------

    return (
        <div className={styles.page}>
            {/* Page header */}
            <div className={styles.pageHeader}>
                <div className={styles.pageHeaderText}>
                    <h1 className={styles.pageTitle}>{t('theme_title')}</h1>
                    <p className={styles.pageSubtitle}>{t('theme_subtitle')}</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={handleResetAll}
                        disabled={resetTheme.isPending}
                    >
                        {t('theme_reset_all')}
                    </button>
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleSave}
                        disabled={!isDirty || updateTheme.isPending}
                    >
                        {updateTheme.isPending ? t('theme_saving') : t('theme_save')}
                    </button>
                </div>
            </div>

            {/* Section A: Theme picker */}
            <section className={styles.section}>
                <div>
                    <h2 className={styles.sectionTitle}>{t('theme_section_picker')}</h2>
                    <p className={styles.sectionDesc}>{t('theme_section_picker_desc')}</p>
                </div>
                <div className={styles.themeGrid}>
                    {THEMES.map((theme) => (
                        <ThemeCard
                            key={theme.id}
                            theme={theme}
                            isSelected={pendingThemeId === theme.id}
                            onSelect={() => handleThemeSelect(theme.id)}
                        />
                    ))}
                </div>
            </section>

            {/* Section B: Color customization */}
            <section className={styles.section}>
                <div>
                    <h2 className={styles.sectionTitle}>{t('theme_section_colors')}</h2>
                    <p className={styles.sectionDesc}>{t('theme_section_colors_desc')}</p>
                </div>

                <div className={styles.colorSection}>
                    <div className={styles.infoNote}>
                        <Info style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{t('theme_section_colors_note')}</span>
                    </div>

                    {Object.keys(pendingCustomColors).length === 0 && (
                        <p className={styles.emptyCustomizations}>
                            {t('theme_empty_customizations')}
                        </p>
                    )}

                    <div className={styles.colorList}>
                        {CUSTOMIZABLE_COLORS.map(({ key, labelKey }) => (
                            <ColorRow
                                key={key}
                                cssVar={key}
                                labelKey={labelKey}
                                overrideValue={pendingCustomColors[key]}
                                onChangeColor={(val) => handleColorChange(key, val)}
                                onResetColor={() => handleColorReset(key)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Sticky save bar */}
            {!!isDirty && (
                <div className={styles.savebar}>
                    <p className={styles.savebarMsg}>{t('theme_unsaved')}</p>
                    <div className={styles.savebarActions}>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={handleDiscard}
                            disabled={updateTheme.isPending}
                        >
                            {t('theme_discard')}
                        </button>
                        <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={handleSave}
                            disabled={updateTheme.isPending}
                        >
                            {updateTheme.isPending ? t('theme_saving') : t('theme_save')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
