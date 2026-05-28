import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { z } from 'zod';

import {
    useAdminPromocionDetail,
    useAdminCreatePromocion,
    useAdminUpdatePromocion,
} from '@/api/useAdminMarketing';
import { DateTimePicker } from '@/components/forms';
import { FormInput } from '@/components/forms/FormField/FormInput';
import { Button, Spinner } from '@/components/ui';
import { INITIAL_PROMO_FORM } from '@/constants/adminForms';
import { ROUTES } from '@/constants/routes';
import { applyServerErrors } from '@/lib/applyServerErrors';
import { promoSchema, type PromoFormValues } from '@/types/adminFormSchemas';

import styles from './AdminPromoForm.module.css';

type PromoFormInput = z.input<typeof promoSchema>;

/** `/admin/marketing/promos/new` and `/.../:id/edit` — promotion CRUD.
 *  Date range determines when the promo is active on the storefront;
 *  Flash Sale section reads it via `useActivePromociones`. */
export function AdminPromoForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation('admin');
    const isEditing = !!id;

    const { data: existing, isLoading: loadingExisting } = useAdminPromocionDetail(
        isEditing ? Number(id) : 0,
    );
    const create = useAdminCreatePromocion();
    const update = useAdminUpdatePromocion();

    const [translationTab, setTranslationTab] = useState<'es' | 'en' | 'pt'>('es');

    const {
        control,
        register,
        handleSubmit,
        setError,
        reset,
    } = useForm<PromoFormInput, unknown, PromoFormValues>({
        resolver: zodResolver(promoSchema),
        defaultValues: INITIAL_PROMO_FORM,
    });

    const switchToTabFor = (field: string) => {
        if (field.endsWith('_en')) setTranslationTab('en');
        else if (field.endsWith('_pt')) setTranslationTab('pt');
        else if (field.endsWith('_es')) setTranslationTab('es');
    };

    useEffect(() => {
        if (existing) {
            reset({
                nombre_es: existing.nombre_es ?? existing.nombre ?? '',
                nombre_en: existing.nombre_en ?? '',
                nombre_pt: existing.nombre_pt ?? '',
                tipo: existing.tipo ?? 'porcentaje',
                valor_descuento: existing.valor_descuento ?? '',
                aplica_a_todo: existing.aplica_a_todo ?? true,
                es_flash_sale: existing.es_flash_sale ?? false,
                fecha_inicio: existing.fecha_inicio ?? '',
                fecha_fin: existing.fecha_fin ?? '',
            });
        }
    }, [existing, reset]);

    const onSubmit = (values: PromoFormValues) => {
        if (!values.fecha_inicio || !values.fecha_fin) {
            toast.error(t('promo_form_required'));
            return;
        }

        const payload = {
            nombre_es: values.nombre_es,
            nombre_en: values.nombre_en,
            nombre_pt: values.nombre_pt,
            tipo: values.tipo,
            valor_descuento: values.valor_descuento,
            aplica_a_todo: values.aplica_a_todo,
            es_flash_sale: values.es_flash_sale,
            fecha_inicio: values.fecha_inicio,
            fecha_fin: values.fecha_fin,
        };

        if (isEditing) {
            update.mutate(
                { id: Number(id), ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('promo_form_updated'));
                        navigate(ROUTES.adminMarketingPromos);
                    },
                    onError: (error) => {
                        const applied = applyServerErrors<PromoFormInput>({
                            error,
                            setError,
                            toast,
                            fallbackMessage: t('promo_form_update_error'),
                        });
                        if (applied[0]) switchToTabFor(applied[0]);
                    },
                },
            );
        } else {
            create.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('promo_form_created'));
                    navigate(ROUTES.adminMarketingPromos);
                },
                onError: (error) => {
                    const applied = applyServerErrors<PromoFormInput>({
                        error,
                        setError,
                        toast,
                        fallbackMessage: t('promo_form_create_error'),
                    });
                    if (applied[0]) switchToTabFor(applied[0]);
                },
            });
        }
    };

    if (isEditing && loadingExisting) {
        return (
            <div className={styles.center}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    const isPending = create.isPending || update.isPending;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>
                {isEditing ? t('promo_form_edit_title') : t('promo_form_new_title')}
            </h1>

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Translation tabs for nombre */}
                <div className={styles.translationTabs}>
                    {(['es', 'en', 'pt'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            className={`${styles.translationTab} ${translationTab === lang ? styles.translationTabActive : ''}`}
                            onClick={() => setTranslationTab(lang)}
                        >
                            {t(`translation_${lang}`, { ns: 'common' })}
                        </button>
                    ))}
                </div>

                {translationTab === 'es' && (
                    <FormInput
                        control={control}
                        name="nombre_es"
                        label={t('promo_form_nombre_es')}
                        isRequired
                    />
                )}
                {translationTab === 'en' && (
                    <FormInput
                        control={control}
                        name="nombre_en"
                        label={t('promo_form_nombre_en')}
                    />
                )}
                {translationTab === 'pt' && (
                    <FormInput
                        control={control}
                        name="nombre_pt"
                        label={t('promo_form_nombre_pt')}
                    />
                )}

                <div className={styles.field}>
                    <label className={styles.label}>{t('promo_form_tipo')} *</label>
                    <select className={styles.select} {...register('tipo')}>
                        <option value="porcentaje">Porcentaje</option>
                        <option value="monto_fijo">Monto fijo</option>
                        <option value="compra_x_lleva_y">Compra X lleva Y</option>
                    </select>
                </div>

                <FormInput
                    control={control}
                    name="valor_descuento"
                    label={t('promo_form_discount_value')}
                    isRequired
                />

                <Controller
                    control={control}
                    name="fecha_inicio"
                    render={({ field }) => (
                        <DateTimePicker
                            name="fecha_inicio"
                            label={`${t('promo_form_start_date')} *`}
                            value={field.value ?? ''}
                            setValue={field.onChange}
                            variant="bordered"
                            isRequired
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="fecha_fin"
                    render={({ field }) => (
                        <DateTimePicker
                            name="fecha_fin"
                            label={`${t('promo_form_end_date')} *`}
                            value={field.value ?? ''}
                            setValue={field.onChange}
                            variant="bordered"
                            isRequired
                        />
                    )}
                />

                <label className={styles.checkboxRow}>
                    <input type="checkbox" {...register('aplica_a_todo')} />
                    {t('promo_form_aplica_a_todo')}
                </label>

                <label className={styles.checkboxRow}>
                    <input type="checkbox" {...register('es_flash_sale')} />
                    {t('promo_form_es_flash_sale')}
                </label>

                <div className={styles.footer}>
                    <Button
                        variant="outline"
                        size="md"
                        onClick={() => navigate(ROUTES.adminMarketingPromos)}
                        type="button"
                    >
                        {t('cancel', { ns: 'common' })}
                    </Button>
                    <Button variant="primary" size="md" type="submit" disabled={isPending}>
                        {isPending
                            ? t('saving', { ns: 'common' })
                            : isEditing
                              ? t('update', { ns: 'common' })
                              : t('create', { ns: 'common' })}
                    </Button>
                </div>
            </form>
        </div>
    );
}
