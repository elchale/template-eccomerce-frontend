import { zodResolver } from '@hookform/resolvers/zod';
import { PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import {
    useAdminCoupons,
    useAdminCreateCoupon,
    useAdminUpdateCoupon,
    useAdminDeleteCoupon,
} from '@/api';
import { DateTimePicker, Select } from '@/components/forms';
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
    Paginator,
} from '@/components/ui';
import { INITIAL_COUPON_FORM } from '@/constants/adminForms';
import { PAGINATION } from '@/constants/pagination';
import { applyServerErrors } from '@/lib/applyServerErrors';
import { formatCurrency } from '@/lib/formatCurrency';
import { couponSchema, type CouponFormValues } from '@/types/adminFormSchemas';
import type { Coupon } from '@/types/order';

import styles from './AdminCouponList.module.css';

type CouponFormInput = z.input<typeof couponSchema>;

/**
 * `/admin/coupons` — inline CRUD for discount codes. Date pickers go
 * through `<Controller>` because RHF's `register()` can't bind native
 * Date instances; `z.coerce.number()` on percentage/amount fields drives
 * the `useForm<FormInput, unknown, FormValues>` typing pattern.
 */
export function AdminCouponList() {
    const [page, setPage] = useState(1);
    const { t } = useTranslation('admin');

    const DISCOUNT_TYPE_OPTIONS = [
        { value: 'percentage', label: t('coupons_percentage') },
        { value: 'fixed', label: t('coupons_fixed') },
    ];

    const params = {
        limit: String(PAGINATION.DEFAULT_PAGE_SIZE),
        offset: String((page - 1) * PAGINATION.DEFAULT_PAGE_SIZE),
    };

    const { data, isLoading, error } = useAdminCoupons(params);
    const createCoupon = useAdminCreateCoupon();
    const updateCoupon = useAdminUpdateCoupon();
    const deleteCoupon = useAdminDeleteCoupon();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { control, register, handleSubmit, reset, watch, setError } = useForm<
        CouponFormInput,
        unknown,
        CouponFormValues
    >({
        resolver: zodResolver(couponSchema),
        defaultValues: INITIAL_COUPON_FORM,
    });

    const discountType = watch('discount_type');

    const openCreateForm = () => {
        setEditingId(null);
        reset(INITIAL_COUPON_FORM);
        setShowForm(true);
    };

    const openEditForm = (coupon: Coupon) => {
        setEditingId(coupon.id);
        reset({
            code: coupon.code,
            description: coupon.description || '',
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            min_purchase_amount: coupon.min_purchase_amount || '0',
            max_discount_amount: coupon.max_discount_amount || '',
            usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
            is_active: coupon.is_active,
            valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
            valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        reset(INITIAL_COUPON_FORM);
    };

    const onSubmit = (values: CouponFormValues) => {
        const payload: Partial<Coupon> = {
            code: values.code.trim().toUpperCase(),
            description: values.description.trim(),
            discount_type: values.discount_type,
            discount_value: values.discount_value,
            min_purchase_amount: values.min_purchase_amount || '0',
            max_discount_amount: values.max_discount_amount || null,
            usage_limit: values.usage_limit ? Number(values.usage_limit) : null,
            is_active: values.is_active,
            valid_from: values.valid_from || (undefined as unknown as string),
            valid_until: values.valid_until || (undefined as unknown as string),
        };

        if (editingId) {
            updateCoupon.mutate(
                { id: editingId, ...payload },
                {
                    onSuccess: () => {
                        toast.success(t('coupons_updated'));
                        closeForm();
                    },
                    onError: (error) => {
                        applyServerErrors<CouponFormInput>({
                            error,
                            setError,
                            toast,
                            fallbackMessage: t('coupons_update_error'),
                        });
                    },
                },
            );
        } else {
            createCoupon.mutate(payload, {
                onSuccess: () => {
                    toast.success(t('coupons_created'));
                    closeForm();
                },
                onError: (error) => {
                    applyServerErrors<CouponFormInput>({
                        error,
                        setError,
                        toast,
                        fallbackMessage: t('coupons_create_error'),
                    });
                },
            });
        }
    };

    const handleDelete = (coupon: { id: number; code: string }) => {
        if (!window.confirm(t('coupons_delete_confirm', { code: coupon.code }))) return;
        deleteCoupon.mutate(coupon.id, {
            onSuccess: () => toast.success(t('coupons_deleted')),
            onError: () => toast.error(t('coupons_delete_error')),
        });
    };

    const isPending = createCoupon.isPending || updateCoupon.isPending;
    const coupons = data?.results || [];
    const numPages = data ? Math.ceil(data.count / PAGINATION.DEFAULT_PAGE_SIZE) : 1;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.pageTitle}>{t('coupons_title')}</h2>
                {!showForm && (
                    <Button variant="primary" size="md" onClick={openCreateForm}>
                        <Plus /> {t('coupons_add')}
                    </Button>
                )}
            </div>

            {/* Inline form */}
            {!!showForm && (
                <Card className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <CardTitle>
                            {editingId ? t('coupons_edit_title') : t('coupons_new_title')}
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
                        <div className={styles.formGrid}>
                            <FormInput
                                control={control}
                                name="code"
                                label={t('coupons_code')}
                                placeholder={t('coupons_code_placeholder')}
                                isRequired
                            />
                            <FormInput
                                control={control}
                                name="description"
                                label={t('coupons_description')}
                                placeholder={t('coupons_description_placeholder')}
                            />
                            <Controller
                                control={control}
                                name="discount_type"
                                render={({ field }) => (
                                    <Select
                                        label={t('coupons_discount_type')}
                                        value={field.value ?? 'percentage'}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        options={DISCOUNT_TYPE_OPTIONS}
                                    />
                                )}
                            />
                            <FormInput
                                control={control}
                                name="discount_value"
                                label={t('coupons_discount_value')}
                                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                                isRequired
                            />
                            <FormInput
                                control={control}
                                name="min_purchase_amount"
                                label={t('coupons_min_purchase')}
                                placeholder="0.00"
                            />
                            <FormInput
                                control={control}
                                name="max_discount_amount"
                                label={t('coupons_max_discount')}
                                placeholder={t('coupons_max_discount_placeholder')}
                            />
                            <FormInput
                                control={control}
                                name="usage_limit"
                                label={t('coupons_usage_limit')}
                                placeholder={t('coupons_usage_limit_placeholder')}
                            />
                            <Controller
                                control={control}
                                name="valid_from"
                                render={({ field }) => (
                                    <DateTimePicker
                                        name="coupon-from"
                                        label={t('coupons_valid_from')}
                                        value={field.value ?? ''}
                                        setValue={field.onChange}
                                        variant="bordered"
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="valid_until"
                                render={({ field }) => (
                                    <DateTimePicker
                                        name="coupon-until"
                                        label={t('coupons_valid_until')}
                                        value={field.value ?? ''}
                                        setValue={field.onChange}
                                        variant="bordered"
                                    />
                                )}
                            />
                        </div>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                {...register('is_active')}
                                className={styles.checkbox}
                            />
                            <span>{t('coupons_active')}</span>
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

            {/* Coupon table */}
            {isLoading ? (
                <TableSkeleton rows={6} columns={6} />
            ) : error ? (
                <EmptyState
                    title={t('coupons_load_error')}
                    message={t('coupons_load_error_message')}
                />
            ) : coupons.length === 0 ? (
                <EmptyState
                    title={t('coupons_empty')}
                    message={t('coupons_empty_message')}
                    action={
                        <Button variant="primary" onClick={openCreateForm}>
                            {t('coupons_add')}
                        </Button>
                    }
                />
            ) : (
                <>
                    <Table aria-label={t('coupons_title')} radius={8}>
                        <TableHeader>
                            <TableColumn>{t('coupons_col_code')}</TableColumn>
                            <TableColumn>{t('coupons_col_type')}</TableColumn>
                            <TableColumn>{t('coupons_col_value')}</TableColumn>
                            <TableColumn>{t('coupons_col_min')}</TableColumn>
                            <TableColumn>{t('coupons_col_usage')}</TableColumn>
                            <TableColumn>{t('coupons_col_active')}</TableColumn>
                            <TableColumn>{t('coupons_col_period')}</TableColumn>
                            <TableColumn>{t('coupons_col_actions')}</TableColumn>
                        </TableHeader>
                        <TableBody>
                            {coupons.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell>
                                        <code className={styles.couponCode}>{coupon.code}</code>
                                    </TableCell>
                                    <TableCell>
                                        {coupon.discount_type === 'percentage'
                                            ? t('percentage', { ns: 'common' })
                                            : t('fixed', { ns: 'common' })}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.discount_type === 'percentage'
                                            ? `${coupon.discount_value}%`
                                            : formatCurrency(coupon.discount_value)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(coupon.min_purchase_amount)}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.times_used}/
                                        {coupon.usage_limit ?? t('unlimited', { ns: 'common' })}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.is_active ? (
                                            <Badge variant="new">
                                                {t('active', { ns: 'common' })}
                                            </Badge>
                                        ) : (
                                            <Badge variant="out-of-stock">
                                                {t('inactive', { ns: 'common' })}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className={styles.dateRange}>
                                            <span>
                                                {coupon.valid_from
                                                    ? new Date(
                                                          coupon.valid_from,
                                                      ).toLocaleDateString()
                                                    : '--'}
                                            </span>
                                            <span className={styles.dateSep}>
                                                {t('coupons_to')}
                                            </span>
                                            <span>
                                                {coupon.valid_until
                                                    ? new Date(
                                                          coupon.valid_until,
                                                      ).toLocaleDateString()
                                                    : '--'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={styles.actionBtns}>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => openEditForm(coupon)}
                                                title={t('edit', { ns: 'common' })}
                                            >
                                                <PencilSimple />
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(coupon)}
                                                title={t('delete', { ns: 'common' })}
                                                disabled={deleteCoupon.isPending}
                                            >
                                                <Trash />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {numPages > 1 && (
                        <Paginator
                            page={page}
                            numPages={numPages}
                            onPageChange={setPage}
                            size="sm"
                            showEdges={false}
                        />
                    )}
                </>
            )}
        </div>
    );
}
