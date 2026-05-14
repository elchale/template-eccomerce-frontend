import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { z } from 'zod';

import {
    useAdminBannerDetail,
    useAdminCreateBanner,
    useAdminUpdateBanner,
    useAdminUploadBannerImage,
} from '@/api/useAdminMarketing';
import { DateTimePicker } from '@/components/forms';
import { FormInput } from '@/components/forms/FormField/FormInput';
import { Button, Spinner } from '@/components/ui';
import { INITIAL_BANNER_FORM } from '@/constants/adminForms';
import { ROUTES } from '@/constants/routes';
import { applyServerErrors } from '@/lib/applyServerErrors';
import { bannerSchema, type BannerFormValues } from '@/types/adminFormSchemas';

// `BannerFormValues` is the output type of the zod schema. RHF's resolver
// keeps the input shape on the form (coerced fields like `posicion` accept
// `unknown` on input) and emits the output shape on submit.
type BannerFormInput = z.input<typeof bannerSchema>;

import styles from './AdminBannerForm.module.css';

/**
 * `/admin/marketing/banners/new` and `/.../:id/edit` — create or edit a
 * banner. Image upload is a separate POST (multipart) called after the
 * banner record exists; on create we chain the two requests, on edit
 * the existing image is replaced inline.
 */
export function AdminBannerForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation('admin');
    const isEditing = !!id;
    const bannerId = Number(id) || 0;

    const { data: existing, isLoading: loadingExisting } = useAdminBannerDetail(
        isEditing ? bannerId : 0,
    );
    const create = useAdminCreateBanner();
    const update = useAdminUpdateBanner();
    const uploadImage = useAdminUploadBannerImage();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [translationTab, setTranslationTab] = useState<'es' | 'en' | 'pt'>('es');

    const {
        control,
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors },
    } = useForm<BannerFormInput, unknown, BannerFormValues>({
        resolver: zodResolver(bannerSchema),
        defaultValues: INITIAL_BANNER_FORM,
    });

    // Backend serializer keys (snake_case) match the form fields verbatim
    // — no remap needed. If a translated field (e.g. titulo_pt) fails,
    // auto-flip to its tab so the inline error is visible without making
    // the user hunt for it.
    const switchToTabFor = (field: string) => {
        if (field.endsWith('_en')) setTranslationTab('en');
        else if (field.endsWith('_pt')) setTranslationTab('pt');
        else if (field.endsWith('_es')) setTranslationTab('es');
    };

    useEffect(() => {
        if (existing) {
            reset({
                nombre: existing.nombre ?? '',
                tipo: existing.tipo ?? 'hero',
                titulo_es: existing.titulo_es ?? '',
                titulo_en: existing.titulo_en ?? '',
                titulo_pt: existing.titulo_pt ?? '',
                subtitulo_es: existing.subtitulo_es ?? '',
                subtitulo_en: existing.subtitulo_en ?? '',
                subtitulo_pt: existing.subtitulo_pt ?? '',
                texto_cta_es: existing.texto_cta_es ?? '',
                texto_cta_en: existing.texto_cta_en ?? '',
                texto_cta_pt: existing.texto_cta_pt ?? '',
                enlace_cta: existing.enlace_cta ?? '',
                imagen_url: existing.imagen_url ?? '',
                imagen_movil_url: existing.imagen_movil_url ?? '',
                color_fondo: existing.color_fondo ?? '',
                color_texto: existing.color_texto ?? '',
                posicion: existing.posicion ?? 0,
                es_activo: existing.es_activo ?? true,
                fecha_inicio: existing.fecha_inicio ?? null,
                fecha_fin: existing.fecha_fin ?? null,
            });
        }
    }, [existing, reset]);

    const onSubmit = (values: BannerFormValues) => {
        const payload = {
            nombre: values.nombre,
            tipo: values.tipo,
            titulo_es: values.titulo_es,
            titulo_en: values.titulo_en,
            titulo_pt: values.titulo_pt,
            subtitulo_es: values.subtitulo_es,
            subtitulo_en: values.subtitulo_en,
            subtitulo_pt: values.subtitulo_pt,
            texto_cta_es: values.texto_cta_es,
            texto_cta_en: values.texto_cta_en,
            texto_cta_pt: values.texto_cta_pt,
            enlace_cta: values.enlace_cta,
            imagen_url: values.imagen_url,
            imagen_movil_url: values.imagen_movil_url,
            color_fondo: values.color_fondo,
            color_texto: values.color_texto,
            posicion: values.posicion ?? 0,
            es_activo: values.es_activo,
            fecha_inicio: values.fecha_inicio || null,
            fecha_fin: values.fecha_fin || null,
        };

        if (isEditing) {
            update.mutate(
                { id: bannerId, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('banner_form_updated'));
                        navigate(ROUTES.adminMarketingBanners);
                    },
                    onError: (error) => {
                        const applied = applyServerErrors<BannerFormInput>({
                            error,
                            setError,
                            toast,
                            fallbackMessage: t('banner_form_update_error'),
                        });
                        if (applied[0]) switchToTabFor(applied[0]);
                    },
                },
            );
        } else {
            create.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('banner_form_created'));
                    navigate(ROUTES.adminMarketingBanners);
                },
                onError: (error) => {
                    const applied = applyServerErrors<BannerFormInput>({
                        error,
                        setError,
                        toast,
                        fallbackMessage: t('banner_form_create_error'),
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
            toast.error(t('banner_form_image_not_image'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('banner_form_image_too_large'));
            return;
        }

        if (!isEditing) {
            toast.error(t('banner_form_image_save_first'));
            return;
        }

        uploadImage.mutate(
            { bannerId, file },
            {
                onSuccess: (data) => {
                    toast.success(t('banner_form_image_uploaded'));
                    setValue('imagen_url', data.image_url, { shouldDirty: true });
                },
                onError: () => toast.error(t('banner_form_image_upload_error')),
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

    // Resolve zod's translation keys to display strings, but render server
    // messages (already translated) verbatim.
    const fieldError = (key: keyof BannerFormInput): string | undefined => {
        const e = errors[key];
        if (!e?.message) return undefined;
        return e.type === 'server' ? String(e.message) : t(String(e.message));
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>
                {isEditing ? t('banner_form_edit_title') : t('banner_form_new_title')}
            </h1>

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
                <FormInput
                    control={control}
                    name="nombre"
                    label={fieldError('nombre') ?? `${t('banner_form_internal_name')} *`}
                    isRequired
                />

                <div className={styles.field}>
                    <label className={styles.label}>{t('banner_form_tipo')} *</label>
                    <select className={styles.select} {...register('tipo')}>
                        <option value="hero">Hero</option>
                        <option value="anuncio">Anuncio</option>
                        <option value="categoria">Categoría</option>
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
                            label={fieldError('titulo_es') ?? `${t('banner_form_titulo_es')} *`}
                            isRequired
                        />
                        <FormInput
                            control={control}
                            name="subtitulo_es"
                            label={t('banner_form_subtitulo_es')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_es"
                            label={t('banner_form_texto_cta_es')}
                        />
                    </>
                )}

                {translationTab === 'en' && (
                    <>
                        <FormInput
                            control={control}
                            name="titulo_en"
                            label={t('banner_form_titulo_en')}
                        />
                        <FormInput
                            control={control}
                            name="subtitulo_en"
                            label={t('banner_form_subtitulo_en')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_en"
                            label={t('banner_form_texto_cta_en')}
                        />
                    </>
                )}

                {translationTab === 'pt' && (
                    <>
                        <FormInput
                            control={control}
                            name="titulo_pt"
                            label={t('banner_form_titulo_pt')}
                        />
                        <FormInput
                            control={control}
                            name="subtitulo_pt"
                            label={t('banner_form_subtitulo_pt')}
                        />
                        <FormInput
                            control={control}
                            name="texto_cta_pt"
                            label={t('banner_form_texto_cta_pt')}
                        />
                    </>
                )}

                <FormInput
                    control={control}
                    name="enlace_cta"
                    label={t('banner_form_enlace_cta')}
                />

                {/* Image upload section */}
                <Controller
                    control={control}
                    name="imagen_url"
                    render={({ field }) => (
                        <div className={styles.imageSection}>
                            <p className={styles.label}>{t('banner_form_image_desktop')}</p>
                            {!!field.value && (
                                <img
                                    src={field.value}
                                    alt={t('banner_form_image_desktop')}
                                    className={styles.imagePreview}
                                />
                            )}
                            <div className={styles.imageUploadRow}>
                                <FormInput
                                    control={control}
                                    name="imagen_url"
                                    label={t('banner_form_image_url_desktop')}
                                />
                                {!!isEditing && (
                                    <div className={styles.uploadBtnWrapper}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className={styles.hiddenInput}
                                            onChange={handleFileSelect}
                                            aria-label={t('banner_form_upload_image')}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="md"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadImage.isPending}
                                        >
                                            {uploadImage.isPending
                                                ? t('banner_form_uploading')
                                                : t('banner_form_upload_image')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            {!isEditing && (
                                <p className={styles.uploadHint}>
                                    {t('banner_form_save_first_hint')}
                                </p>
                            )}
                        </div>
                    )}
                />

                <FormInput
                    control={control}
                    name="imagen_movil_url"
                    label={t('banner_form_image_url_mobile')}
                />

                <div className={styles.colorRow}>
                    <Controller
                        control={control}
                        name="color_fondo"
                        render={({ field }) => (
                            <div className={styles.field}>
                                <label className={styles.label}>{t('banner_form_color_bg')}</label>
                                <input
                                    type="color"
                                    className={styles.colorInput}
                                    value={field.value || '#ffffff'}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                />
                            </div>
                        )}
                    />
                    <Controller
                        control={control}
                        name="color_texto"
                        render={({ field }) => (
                            <div className={styles.field}>
                                <label className={styles.label}>
                                    {t('banner_form_color_text')}
                                </label>
                                <input
                                    type="color"
                                    className={styles.colorInput}
                                    value={field.value || '#000000'}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                />
                            </div>
                        )}
                    />
                </div>

                <FormInput
                    control={control}
                    name="posicion"
                    label={t('categories_sort_order', { ns: 'admin' })}
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
                            setValue={(v) => field.onChange(v || null)}
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
                            setValue={(v) => field.onChange(v || null)}
                            variant="bordered"
                        />
                    )}
                />

                <label className={styles.checkboxRow}>
                    <input type="checkbox" {...register('es_activo')} />
                    {t('banner_form_active')}
                </label>

                <div className={styles.footer}>
                    <Button
                        variant="outline"
                        size="md"
                        onClick={() => navigate(ROUTES.adminMarketingBanners)}
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
