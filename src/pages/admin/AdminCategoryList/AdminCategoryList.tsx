import { zodResolver } from '@hookform/resolvers/zod';
import { PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import {
    useAdminCategories,
    useAdminCreateCategory,
    useAdminUpdateCategory,
    useAdminDeleteCategory,
} from '@/api';
import { Input, Select } from '@/components/forms';
import { FormInput } from '@/components/forms/FormField/FormInput';
import {
    Button,
    TableSkeleton,
    Card,
    CardTitle,
    EmptyState,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableColumn,
} from '@/components/ui';
import { INITIAL_CATEGORY_FORM } from '@/constants/adminForms';
import { applyServerErrors } from '@/lib/applyServerErrors';
import type { AdminCategory, AdminCategoryRequest } from '@/types/admin';
import { categorySchema, type CategoryFormValues } from '@/types/adminFormSchemas';

import styles from './AdminCategoryList.module.css';

type CategoryFormInput = z.input<typeof categorySchema>;

const generateSlug = (name: string) =>
    name
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '');

/**
 * `/admin/categories` — single-page CRUD: list + inline create/edit form
 * (no separate detail route). Slug is auto-derived from the name; the
 * admin can override before submitting. Uses RHF + zod for validation.
 */
export function AdminCategoryList() {
    const { data: categories, isLoading, error } = useAdminCategories();
    const createCategory = useAdminCreateCategory();
    const updateCategory = useAdminUpdateCategory();
    const deleteCategory = useAdminDeleteCategory();
    const { t } = useTranslation('admin');
    // Namespace-agnostic translator for resolving zod's `ns:key` messages on the
    // slug field, which is rendered via a raw Controller + Input (not FormInput).
    const { t: tGlobal } = useTranslation();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [translationTab, setTranslationTab] = useState<'es' | 'en' | 'pt'>('es');
    // Tracks whether the user manually edited the slug; while false, slug is
    // auto-derived from `name`.
    const slugManualRef = useRef(false);

    const {
        control,
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        setError,
        getValues,
    } = useForm<CategoryFormInput, unknown, CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: INITIAL_CATEGORY_FORM,
    });

    // Backend serializer accepts `name_es` while the form holds `name` for
    // the default-language input. Map it so a `name_es: ['...']` from the
    // server attaches the error to the visible field. Translation tabs:
    // auto-switch on `name_en` / `name_pt`.
    const fieldMap = { name_es: 'name' as const };

    const switchToTabFor = (field: string) => {
        if (field.endsWith('_en')) setTranslationTab('en');
        else if (field.endsWith('_pt')) setTranslationTab('pt');
    };

    // Auto-slug: watch `name`, regenerate slug while user hasn't manually edited it.
    const watchedName = watch('name');
    useEffect(() => {
        if (!slugManualRef.current) {
            const next = generateSlug(watchedName ?? '');
            if (getValues('slug') !== next) {
                setValue('slug', next, { shouldDirty: true });
            }
        }
    }, [watchedName, getValues, setValue]);

    const flatCategories = (() => {
        if (!categories) return [];
        const flat: { category: AdminCategory; depth: number }[] = [];
        const flatten = (cats: AdminCategory[], depth = 0) => {
            for (const cat of cats) {
                flat.push({ category: cat, depth });
                if (cat.children && cat.children.length > 0) {
                    flatten(cat.children, depth + 1);
                }
            }
        };
        flatten(categories);
        return flat;
    })();

    const parentOptions = flatCategories
        .filter((item) => item.category.id !== editingId)
        .map((item) => ({
            value: String(item.category.id),
            label: `${'-- '.repeat(item.depth)}${item.category.name}`,
        }));

    const openCreateForm = () => {
        setEditingId(null);
        slugManualRef.current = false;
        reset(INITIAL_CATEGORY_FORM);
        setTranslationTab('es');
        setShowForm(true);
    };

    const openEditForm = (cat: AdminCategory) => {
        setEditingId(cat.id);
        // Editing an existing category — treat slug as user-managed.
        slugManualRef.current = true;
        reset({
            name: cat.name,
            name_en: cat.name_en || '',
            name_pt: cat.name_pt || '',
            slug: cat.slug,
            description: cat.description || '',
            parent: cat.parent ? String(cat.parent) : '',
            sort_order: String(cat.sort_order),
            is_active: cat.is_active,
        });
        setTranslationTab('es');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        slugManualRef.current = false;
        reset(INITIAL_CATEGORY_FORM);
    };

    const onSubmit = (values: CategoryFormValues) => {
        const nameEn = values.name_en.trim();
        const namePt = values.name_pt.trim();
        const description = values.description.trim();
        const payload: AdminCategoryRequest = {
            name_es: values.name.trim(),
            slug: values.slug.trim(),
            parent: values.parent ? Number(values.parent) : null,
            sort_order: Number(values.sort_order) || 0,
            is_active: values.is_active,
            ...(nameEn && { name_en: nameEn }),
            ...(namePt && { name_pt: namePt }),
            ...(description && { description_es: description }),
        };

        if (editingId) {
            updateCategory.mutate(
                { id: editingId, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('categories_updated'));
                        closeForm();
                    },
                    onError: (error) => {
                        const applied = applyServerErrors<CategoryFormInput>({
                            error,
                            setError,
                            fieldMap,
                            toast,
                            fallbackMessage: t('categories_update_error'),
                        });
                        if (applied[0]) switchToTabFor(applied[0]);
                    },
                },
            );
        } else {
            createCategory.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('categories_created'));
                    closeForm();
                },
                onError: (error) => {
                    const applied = applyServerErrors<CategoryFormInput>({
                        error,
                        setError,
                        fieldMap,
                        toast,
                        fallbackMessage: t('categories_create_error'),
                    });
                    if (applied[0]) switchToTabFor(applied[0]);
                },
            });
        }
    };

    const handleDelete = (cat: AdminCategory) => {
        if (!window.confirm(t('categories_delete_confirm', { name: cat.name }))) return;
        deleteCategory.mutate(cat.id, {
            onSuccess: () => toast.success(t('categories_deleted')),
            onError: () => toast.error(t('categories_delete_error')),
        });
    };

    const isPending = createCategory.isPending || updateCategory.isPending;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.pageTitle}>{t('categories_title')}</h2>
                {!showForm && (
                    <Button variant="primary" size="md" onClick={openCreateForm}>
                        <Plus /> {t('categories_add')}
                    </Button>
                )}
            </div>

            {/* Inline form */}
            {!!showForm && (
                <Card className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <CardTitle>
                            {editingId ? t('categories_edit_title') : t('categories_new_title')}
                        </CardTitle>
                        <button
                            className={styles.closeBtn}
                            onClick={closeForm}
                            aria-label={t('close', { ns: 'common' })}
                        >
                            <X />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
                        {/* Translation tabs */}
                        <div className={styles.translationTabs}>
                            <button
                                type="button"
                                className={`${styles.translationTab} ${translationTab === 'es' ? styles.translationTabActive : ''}`}
                                onClick={() => setTranslationTab('es')}
                            >
                                {t('translation_es', { ns: 'common' })}
                            </button>
                            <button
                                type="button"
                                className={`${styles.translationTab} ${translationTab === 'en' ? styles.translationTabActive : ''}`}
                                onClick={() => setTranslationTab('en')}
                            >
                                {t('translation_en', { ns: 'common' })}
                            </button>
                            <button
                                type="button"
                                className={`${styles.translationTab} ${translationTab === 'pt' ? styles.translationTabActive : ''}`}
                                onClick={() => setTranslationTab('pt')}
                            >
                                {t('translation_pt', { ns: 'common' })}
                            </button>
                        </div>

                        <div className={styles.formGrid}>
                            {translationTab === 'es' && (
                                <FormInput
                                    control={control}
                                    name="name"
                                    label={t('categories_name_es')}
                                    placeholder={t('categories_name_placeholder')}
                                    isRequired
                                />
                            )}
                            {translationTab === 'en' && (
                                <FormInput
                                    control={control}
                                    name="name_en"
                                    label={t('categories_name_en')}
                                    placeholder={t('categories_name_placeholder')}
                                />
                            )}
                            {translationTab === 'pt' && (
                                <FormInput
                                    control={control}
                                    name="name_pt"
                                    label={t('categories_name_pt')}
                                    placeholder={t('categories_name_placeholder')}
                                />
                            )}
                            <Controller
                                control={control}
                                name="slug"
                                render={({ field, fieldState }) => {
                                    const resolvedError = fieldState.error?.message
                                        ? fieldState.error.type === 'server'
                                            ? String(fieldState.error.message)
                                            : tGlobal(String(fieldState.error.message))
                                        : undefined;
                                    return (
                                        <Input
                                            name="slug"
                                            label={t('slug', { ns: 'common' })}
                                            value={field.value ?? ''}
                                            setValue={(v) => {
                                                // Mark slug as user-edited so the name-watcher stops overwriting it.
                                                slugManualRef.current = true;
                                                field.onChange(v);
                                            }}
                                            placeholder={t('categories_slug_placeholder')}
                                            variant="bordered"
                                            isRequired
                                            errorMessage={resolvedError}
                                        />
                                    );
                                }}
                            />
                            <Controller
                                control={control}
                                name="parent"
                                render={({ field }) => (
                                    <Select
                                        label={t('categories_parent')}
                                        placeholder={t('categories_parent_placeholder')}
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        options={parentOptions}
                                    />
                                )}
                            />
                            <FormInput
                                control={control}
                                name="sort_order"
                                label={t('categories_sort_order')}
                                placeholder="0"
                            />
                        </div>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                {...register('is_active')}
                                className={styles.checkbox}
                            />
                            <span>{t('categories_active')}</span>
                        </label>
                        <div className={styles.formActions}>
                            <Button variant="secondary" type="button" onClick={closeForm}>
                                {t('cancel', { ns: 'common' })}
                            </Button>
                            <Button variant="primary" type="submit" disabled={isPending}>
                                {isPending
                                    ? t('saving', { ns: 'common' })
                                    : editingId
                                      ? t('update', { ns: 'common' })
                                      : t('create', { ns: 'common' })}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Category table */}
            {isLoading ? (
                <TableSkeleton rows={6} columns={4} showImageColumn />
            ) : error ? (
                <EmptyState
                    title={t('categories_load_error')}
                    message={t('categories_load_error_message')}
                />
            ) : flatCategories.length === 0 ? (
                <EmptyState
                    title={t('categories_empty')}
                    message={t('categories_empty_message')}
                    action={
                        <Button variant="primary" onClick={openCreateForm}>
                            {t('categories_add')}
                        </Button>
                    }
                />
            ) : (
                <Table aria-label={t('categories_title')} radius={8}>
                    <TableHeader>
                        <TableColumn>{t('categories_col_name')}</TableColumn>
                        <TableColumn>{t('categories_col_slug')}</TableColumn>
                        <TableColumn>{t('categories_col_parent')}</TableColumn>
                        <TableColumn>{t('categories_col_sort')}</TableColumn>
                        <TableColumn>{t('categories_col_active')}</TableColumn>
                        <TableColumn>{t('categories_col_actions')}</TableColumn>
                    </TableHeader>
                    <TableBody>
                        {flatCategories.map(({ category: cat, depth }) => (
                            <TableRow key={cat.id}>
                                <TableCell>
                                    <span
                                        style={{ paddingLeft: `${depth * 20}px` }}
                                        className={styles.catName}
                                    >
                                        {depth > 0 && (
                                            <span className={styles.indent}>{'-- '}</span>
                                        )}
                                        {cat.name}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <code className={styles.slug}>{cat.slug}</code>
                                </TableCell>
                                <TableCell>
                                    {cat.parent
                                        ? flatCategories.find((fc) => fc.category.id === cat.parent)
                                              ?.category.name || '--'
                                        : '--'}
                                </TableCell>
                                <TableCell>{cat.sort_order}</TableCell>
                                <TableCell>
                                    {cat.is_active ? (
                                        <Badge variant="new">{t('active', { ns: 'common' })}</Badge>
                                    ) : (
                                        <Badge variant="out-of-stock">
                                            {t('inactive', { ns: 'common' })}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className={styles.actionBtns}>
                                        <button
                                            className={styles.editBtn}
                                            onClick={() => openEditForm(cat)}
                                            title={t('edit', { ns: 'common' })}
                                        >
                                            <PencilSimple />
                                        </button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(cat)}
                                            title={t('delete', { ns: 'common' })}
                                            disabled={deleteCategory.isPending}
                                        >
                                            <Trash />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
