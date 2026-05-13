import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAdminStoreConfig, useAdminUpdateStoreConfig } from '@/api/useAdminMarketing';
import { Button, Spinner } from '@/components/ui';
import { STORE_CONFIG_KNOWN_KEYS, STORE_CONFIG_SECTIONS } from '@/constants/adminConfig';

import styles from './AdminStoreConfig.module.css';

/**
 * `/admin/marketing/config` — global store configuration editor.
 *
 * Field layout is data-driven: `STORE_CONFIG_SECTIONS` defines the
 * sections and their fields, so adding a new key only requires updating
 * that constant + translations. Tracks per-field dirtiness in a `Set`
 * so the Save button reflects "you have unsaved changes" accurately.
 */
export function AdminStoreConfig() {
    const { data: config, isLoading } = useAdminStoreConfig();
    const update = useAdminUpdateStoreConfig();
    const { t } = useTranslation('admin');
    const [values, setValues] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (config) {
            const initial: Record<string, string> = {};
            Object.entries(config).forEach(([k, v]) => {
                initial[k] = v == null ? '' : String(v);
            });
            setValues(initial);
            setDirty(new Set());
        }
    }, [config]);

    const unknownKeys = useMemo(
        () => [...Object.keys(values).filter((k) => !STORE_CONFIG_KNOWN_KEYS.has(k))].sort(),
        [values],
    );

    const handleChange = (key: string, value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }));
        setDirty((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    };

    const handleSave = () => {
        if (dirty.size === 0) {
            toast(t('store_config_save'), { icon: 'ℹ️' });
            return;
        }
        const payload: Record<string, string> = {};
        dirty.forEach((k) => {
            payload[k] = values[k] ?? '';
        });
        update.mutate(payload, {
            onSuccess: () => {
                toast.success(t('store_config_saved'));
                setDirty(new Set());
            },
            onError: () => toast.error(t('store_config_save_error')),
        });
    };

    if (isLoading) {
        return (
            <div className={styles.center}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('store_config_title')}</h1>
                    <p className={styles.subtitle}>{t('store_config_subtitle')}</p>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    onClick={handleSave}
                    disabled={update.isPending || dirty.size === 0}
                >
                    {update.isPending
                        ? t('store_config_saving')
                        : dirty.size > 0
                          ? t('store_config_save_count', { count: dirty.size })
                          : t('store_config_save')}
                </Button>
            </div>

            <div className={styles.sections}>
                {STORE_CONFIG_SECTIONS.map((section) => (
                    <section key={section.titleKey} className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{t(section.titleKey)}</h2>
                            {!!section.descriptionKey && (
                                <p className={styles.sectionDescription}>
                                    {t(section.descriptionKey)}
                                </p>
                            )}
                        </header>
                        <div className={styles.fieldGrid}>
                            {section.fields.map((field) => {
                                const value = values[field.key] ?? '';
                                const isDirty = dirty.has(field.key);
                                return (
                                    <div key={field.key} className={styles.field}>
                                        <label className={styles.fieldLabel} htmlFor={field.key}>
                                            {t(field.labelKey)}
                                            {!!isDirty && (
                                                <span
                                                    className={styles.dirtyDot}
                                                    aria-label={t('modified', { ns: 'common' })}
                                                />
                                            )}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                id={field.key}
                                                className={styles.textarea}
                                                value={value}
                                                placeholder={field.placeholder}
                                                onChange={(e) =>
                                                    handleChange(field.key, e.target.value)
                                                }
                                                rows={3}
                                            />
                                        ) : (
                                            <input
                                                id={field.key}
                                                type={field.type}
                                                className={styles.input}
                                                value={value}
                                                placeholder={field.placeholder}
                                                onChange={(e) =>
                                                    handleChange(field.key, e.target.value)
                                                }
                                            />
                                        )}
                                        {!!field.helpKey && (
                                            <p className={styles.fieldHelp}>{t(field.helpKey)}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {unknownKeys.length > 0 && (
                    <section className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{t('store_config_other_keys')}</h2>
                            <p className={styles.sectionDescription}>
                                {t('store_config_other_desc')}
                            </p>
                        </header>
                        <div className={styles.fieldGrid}>
                            {unknownKeys.map((key) => (
                                <div key={key} className={styles.field}>
                                    <label className={styles.fieldLabel} htmlFor={key}>
                                        {key}
                                        {dirty.has(key) && (
                                            <span
                                                className={styles.dirtyDot}
                                                aria-label={t('modified', { ns: 'common' })}
                                            />
                                        )}
                                    </label>
                                    <input
                                        id={key}
                                        type="text"
                                        className={styles.input}
                                        value={values[key] ?? ''}
                                        onChange={(e) => handleChange(key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
