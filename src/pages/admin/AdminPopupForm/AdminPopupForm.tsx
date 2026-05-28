import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { z } from 'zod';

import {
    useAdminPopupDetail,
    useAdminCreatePopup,
    useAdminUpdatePopup,
    useAdminUploadPopupImage,
} from '@/api/useAdminMarketing';
import { DateTimePicker } from '@/components/forms';
import { FormInput } from '@/components/forms/FormField/FormInput';
import { Button, Spinner } from '@/components/ui';
import { INITIAL_POPUP_FORM } from '@/constants/adminForms';
import { ROUTES } from '@/constants/routes';
import { applyServerErrors } from '@/lib/applyServerErrors';
import { popupSchema, type PopupFormValues } from '@/types/adminFormSchemas';

import styles from './AdminPopupForm.module.css';

// `PopupFormValues` is the output type. RHF holds the schema's input type so
// coerced number fields (retraso_segundos, frecuencia_horas) accept the raw
// input shape on the form.
type PopupFormInput = z.input<typeof popupSchema>;

/** `/admin/marketing/popups/new` and `/.../:id/edit` — popup CRUD form.
 *  `retraso_segundos` controls in-page delay, `frecuencia_horas`
 *  determines the per-visitor cooldown enforced by `useMarketingStore`. */
export function AdminPopupForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation('admin');
    const isEditing = !!id;
    const popupId = Number(id) || 0;

    const { data: existing, isLoading: loadingExisting } = useAdminPopupDetail(
        isEditing ? popupId : 0,
    );
    const create = useAdminCreatePopup();
    const update = useAdminUpdatePopup();
    const uploadImage = useAdminUploadPopupImage();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [translationTab, setTranslationTab] = useState<'es' | 'en' | 'pt'>('es');

    const {
        control,
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
    } = useForm<PopupFormInput, unknown, PopupFormValues>({
        resolver: zodResolver(popupSchema),
        defaultValues: INITIAL_POPUP_FORM,
    });

    // Auto-switch translation tab to the language that produced the
    // server error so the inline message is in view immediately.
    const switchToTabFor = (field: string) => {
        if (field.endsWith('_en')) setTranslationTab('en');
        else if (field.endsWith('_pt')) setTranslationTab('pt');
        else if (field.endsWith('_es')) setTranslationTab('es');
    };

    useEffect(() => {
        if (existing) {
            reset({
                nombre: existing.nombre ?? '',
                tipo: existing.tipo ?? 'bienvenida',
                titulo_es: existing.titulo_es ?? '',
                titulo_en: existing.titulo_en ?? '',
                titulo_pt: existing.titulo_pt ?? '',
                mensaje_es: existing.mensaje_es ?? '',
                mensaje_en: existing.mensaje_en ?? '',
                mensaje_pt: existing.mensaje_pt ?? '',
                texto_cta_es: existing.texto_cta_es ?? '',
                texto_cta_en: existing.texto_cta_en ?? '',
                texto_cta_pt: existing.texto_cta_pt ?? '',
                imagen_url: existing.imagen_url ?? '',
                enlace_cta: existing.enlace_cta ?? '',
                codigo_cupon: existing.codigo_cupon ?? '',
                retraso_segundos: existing.retraso_segundos ?? 0,
                frecuencia_horas: existing.frecuencia_horas ?? 24,
                es_activo: existing.es_activo ?? true,
                fecha_inicio: existing.fecha_inicio ?? '',
                fecha_fin: existing.fecha_fin ?? '',
            });
        }
    }, [existing, reset]);

    const onSubmit = (values: PopupFormValues) => {
        const payload = {
            nombre: values.nombre,
            tipo: values.tipo,
            titulo_es: values.titulo_es,
            titulo_en: values.titulo_en,
            titulo_pt: values.titulo_pt,
            mensaje_es: values.mensaje_es,
            mensaje_en: values.mensaje_en,
            mensaje_pt: values.mensaje_pt,
            texto_cta_es: values.texto_cta_es,
            texto_cta_en: values.texto_cta_en,
            texto_cta_pt: values.texto_cta_pt,
            imagen_url: values.imagen_url,
            enlace_cta: values.enlace_cta,
            codigo_cupon: values.codigo_cupon,
            retraso_segundos: values.retraso_segundos ?? 0,
            frecuencia_horas: values.frecuencia_horas ?? 24,
            es_activo: values.es_activo,
            fecha_inicio: values.fecha_inicio || null,
            fecha_fin: values.fecha_fin || null,
        };

        if (isEditing) {
            update.mutate(
                { id: popupId, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('popup_form_updated'));
                        navigate(ROUTES.adminMarketingPopups);
                    },
                    onError: (error) => {
                        const applied = applyServerErrors<PopupFormInput>({
                            error,
                            setError,
                            toast,
                            fallbackMessage: t('popup_form_update_error'),
                        });
                        if (applied[0]) switchToTabFor(applied[0]);
                    },
                },
            );
        } else {
            create.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('popup_form_created'));
                    navigate(ROUTES.adminMarketingPopups);
                },
                onError: (error) => {
                    const applied = applyServerErrors<PopupFormInput>({
                        error,
                        setError,
                        toast,
                        fallbackMessage: t('popup_form_create_error'),
                    });
                    if (applied[0]) switchToTabFor(applied[0]);
                },
            });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('popup_form_image_not_image'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('popup_form_image_too_large'));
            return;
        }

        if (!isEditing) {
            toast.error(t('popup_form_image_save_first'));
            return;
        }

        uploadImage.mutate(
            { popupId, file },
            {
                onSuccess: (data) => {
                    toast.success(t('popup_form_image_uploaded'));
                    setValue('imagen_url', data.image_url, { shouldDirty: true });
                },
                onError: () => toast.error(t('popup_form_image_upload_error')),
            },
        );

        if (fileInputRef.current) fileInputRef.current.value = '';
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
                {isEditing ? t('popup_form_edit_title') : t('popup_form_new_title')}
            </h1>

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
                <FormInput
                    control={control}
                    name="nombre"
                    label={t('popup_form_internal_name')}
                    isRequired
                />

                <div className={styles.field}>
                    <label className={styles.label}>{t('popup_form_tipo')} *</label>
                    <select className={styles.select} {...register('tipo')}>
                        <option value="bienvenida">Bienvenida</option>
                        <option value="abandono_carrito">Abandono de carrito</option>
                        <option value="intencion_salida">Intención de salida</option>
                        <option value="suscripcion">Suscripción</option>
                    </select>
                </div>

                {/* Translation tabs for content fields */}
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
                    <>
                        <FormInput
                            control={control}
                            name="titulo_es"
                            label={t('popup_form_titulo_es')}
                            isRequired
                        />
                        <FormInput
                            control={control}
                            name="mensaje_es"
                            label={t('popup_form_mensaje_es')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_es"
                            label={t('popup_form_texto_cta_es')}
                        />
                    </>
                )}

                {translationTab === 'en' && (
                    <>
                        <FormInput
                            control={control}
                            name="titulo_en"
                            label={t('popup_form_titulo_en')}
                        />
                        <FormInput
                            control={control}
                            name="mensaje_en"
                            label={t('popup_form_mensaje_en')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_en"
                            label={t('popup_form_texto_cta_en')}
                        />
                    </>
                )}

                {translationTab === 'pt' && (
                    <>
                        <FormInput
                            control={control}
                            name="titulo_pt"
                            label={t('popup_form_titulo_pt')}
                        />
                        <FormInput
                            control={control}
                            name="mensaje_pt"
                            label={t('popup_form_mensaje_pt')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_pt"
                            label={t('popup_form_texto_cta_pt')}
                        />
                    </>
                )}

                {/* Image upload section */}
                <Controller
                    control={control}
                    name="imagen_url"
                    render={({ field }) => (
                        <div className={styles.imageSection}>
                            <p className={styles.label}>{t('popup_form_image')}</p>
                            {!!field.value && (
                                <img
                                    src={field.value}
                                    alt={t('popup_form_image')}
                                    className={styles.imagePreview}
                                />
                            )}
                            <div className={styles.imageUploadRow}>
                                <FormInput
                                    control={control}
                                    name="imagen_url"
                                    label={t('popup_form_image_url')}
                                />
                                {!!isEditing && (
                                    <div className={styles.uploadBtnWrapper}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className={styles.hiddenInput}
                                            onChange={handleFileSelect}
                                            aria-label={t('popup_form_upload_image')}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="md"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadImage.isPending}
                                        >
                                            {uploadImage.isPending
                                                ? t('popup_form_uploading')
                                                : t('popup_form_upload_image')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {!isEditing && (
                                <p className={styles.uploadHint}>
                                    {t('popup_form_save_first_hint')}
                                </p>
                            )}
                        </div>
                    )}
                />

                <FormInput control={control} name="enlace_cta" label={t('popup_form_enlace_cta')} />

                <FormInput
                    control={control}
                    name="codigo_cupon"
                    label={t('popup_form_codigo_cupon')}
                />

                <FormInput
                    control={control}
                    name="retraso_segundos"
                    label={t('popup_form_retraso')}
                    type="number"
                />

                <FormInput
                    control={control}
                    name="frecuencia_horas"
                    label={t('popup_form_frecuencia')}
                    type="number"
                />

                <Controller
                    control={control}
                    name="fecha_inicio"
                    render={({ field }) => (
                        <DateTimePicker
                            name="fecha_inicio"
                            label={t('coupons_valid_from', { ns: 'admin' })}
                            value={field.value ?? ''}
                            setValue={field.onChange}
                            variant="bordered"
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="fecha_fin"
                    render={({ field }) => (
                        <DateTimePicker
                            name="fecha_fin"
                            label={t('coupons_valid_until', { ns: 'admin' })}
                            value={field.value ?? ''}
                            setValue={field.onChange}
                            variant="bordered"
                        />
                    )}
                />

                <label className={styles.checkboxRow}>
                    <input type="checkbox" {...register('es_activo')} />
                    {t('popup_form_activo')}
                </label>

                <div className={styles.footer}>
                    <Button
                        variant="outline"
                        size="md"
                        onClick={() => navigate(ROUTES.adminMarketingPopups)}
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
