import { Star, Trash, Upload } from '@phosphor-icons/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import {
    useAdminProductDetail,
    useAdminCreateProduct,
    useAdminUpdateProduct,
    useAdminCategories,
    useAdminUploadProductImage,
    useAdminDeleteProductImage,
} from '@/api';
import { Input, Select } from '@/components/forms';
import { Button, Spinner, Card } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { AdminProductRequest } from '@/types/admin';
import type { ProductImage } from '@/types/product';

import styles from './AdminProductForm.module.css';

/** URL-safe slug derived from the product name. Lowercase, hyphens for
 *  whitespace, drop everything else. Admin may override before submit. */
const generateSlug = (name: string) =>
    name
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9-]/g, '');

/**
 * `/admin/products/new` and `/admin/products/:id/edit` — create or edit
 * a product. Image upload is a separate POST against the product detail
 * endpoint after the record exists, so the form sequence is:
 *   1. Submit fields → create product (POST)
 *   2. For each pending image → upload (multipart POST)
 *
 * On edit, image add/remove can happen inline against the existing record.
 */
export function AdminProductForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation('admin');
    const isEditing = !!id;
    const productId = Number(id) || 0;

    const { data: productDetail, isLoading: productLoading } = useAdminProductDetail(productId);
    const { data: categories, isLoading: categoriesLoading } = useAdminCategories();
    const createProduct = useAdminCreateProduct();
    const updateProduct = useAdminUpdateProduct();
    const uploadImage = useAdminUploadProductImage();
    const deleteImage = useAdminDeleteProductImage();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [namePt, setNamePt] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [descriptionPt, setDescriptionPt] = useState('');
    const [category, setCategory] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [compareAtPrice, setCompareAtPrice] = useState('');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState('0');
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [translationTab, setTranslationTab] = useState<'es' | 'en' | 'pt'>('es');

    useEffect(() => {
        if (productDetail && categories) {
            setName(productDetail.name_es || productDetail.name);
            setNameEn(productDetail.name_en || '');
            setNamePt(productDetail.name_pt || '');
            setSlug(productDetail.slug);
            setDescription(productDetail.description_es || productDetail.description || '');
            setDescriptionEn(productDetail.description_en || '');
            setDescriptionPt(productDetail.description_pt || '');
            setCategory(productDetail.category ? String(productDetail.category) : '');
            setBasePrice(productDetail.base_price);
            setCompareAtPrice(productDetail.compare_at_price || '');
            setSku(productDetail.sku);
            setStock(String(productDetail.stock));
            setIsActive(productDetail.is_active);
            setIsFeatured(productDetail.is_featured);
            setSlugManuallyEdited(true);
        }
    }, [productDetail, categories]);

    useEffect(() => {
        if (!slugManuallyEdited) {
            setSlug(generateSlug(name));
        }
    }, [name, slugManuallyEdited]);

    const handleSlugChange = (val: string) => {
        setSlugManuallyEdited(true);
        setSlug(val);
    };

    const categoryOptions = useMemo(() => {
        if (!categories) return [];
        const opts: { value: string; label: string }[] = [];
        const flatten = (cats: typeof categories, prefix = '') => {
            for (const cat of cats) {
                opts.push({ value: String(cat.id), label: `${prefix}${cat.name}` });
                if (cat.children && cat.children.length > 0) {
                    flatten(cat.children, `${prefix}-- `);
                }
            }
        };
        flatten(categories);
        return opts;
    }, [categories]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !sku.trim() || !basePrice.trim()) {
            toast.error(t('product_form_required_fields'));
            return;
        }

        const descriptionEs = description.trim();
        const nameEnTrimmed = nameEn.trim();
        const namePtTrimmed = namePt.trim();
        const descriptionEnTrimmed = descriptionEn.trim();
        const descriptionPtTrimmed = descriptionPt.trim();
        const productData: AdminProductRequest = {
            name_es: name.trim(),
            slug: slug.trim(),
            category: category ? Number(category) : null,
            base_price: basePrice,
            sku: sku.trim(),
            stock: Number(stock) || 0,
            is_active: isActive,
            is_featured: isFeatured,
            ...(descriptionEs && { description_es: descriptionEs }),
            ...(nameEnTrimmed && { name_en: nameEnTrimmed }),
            ...(namePtTrimmed && { name_pt: namePtTrimmed }),
            ...(descriptionEnTrimmed && { description_en: descriptionEnTrimmed }),
            ...(descriptionPtTrimmed && { description_pt: descriptionPtTrimmed }),
            ...(compareAtPrice && { compare_at_price: compareAtPrice }),
        };

        if (isEditing) {
            updateProduct.mutate(
                { id: productId, ...productData },
                {
                    onSuccess: () => {
                        toast.success(t('product_form_updated'));
                        navigate(ROUTES.adminProducts);
                    },
                    onError: () => toast.error(t('product_form_update_error')),
                },
            );
        } else {
            createProduct.mutate(productData, {
                onSuccess: (data) => {
                    toast.success(t('product_form_created'));
                    navigate(ROUTES.adminProductEdit.replace(':id', String(data.id)));
                },
                onError: () => toast.error(t('product_form_create_error')),
            });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('product_form_image_not_image'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('product_form_image_too_large'));
            return;
        }

        const isPrimary = !productDetail?.images?.length;
        uploadImage.mutate(
            { productId, file, isPrimary },
            {
                onSuccess: () => toast.success(t('product_form_image_uploaded')),
                onError: () => toast.error(t('product_form_image_upload_error')),
            },
        );

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteImage = (image: ProductImage) => {
        if (!window.confirm(t('product_form_image_delete_confirm'))) return;
        deleteImage.mutate(
            { productId, imageId: image.id },
            {
                onSuccess: () => toast.success(t('product_form_image_deleted')),
                onError: () => toast.error(t('product_form_image_delete_error')),
            },
        );
    };

    const isPending = createProduct.isPending || updateProduct.isPending;

    if (isEditing && productLoading) {
        return (
            <div className={styles.loading}>
                <Spinner size="lg" variant="primary" />
            </div>
        );
    }

    const images = productDetail?.images ?? [];

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>
                {isEditing ? t('product_form_edit_title') : t('product_form_new_title')}
            </h2>

            <Card className={styles.formCard}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Translation tabs for name/description */}
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
                            <div className={styles.formGroup}>
                                <Input
                                    name="name"
                                    label={t('product_form_name_es')}
                                    value={name}
                                    setValue={setName}
                                    placeholder={t('product_form_name_placeholder')}
                                    variant="bordered"
                                    isRequired
                                />
                            </div>
                        )}
                        {translationTab === 'en' && (
                            <div className={styles.formGroup}>
                                <Input
                                    name="name-en"
                                    label={t('product_form_name_en')}
                                    value={nameEn}
                                    setValue={setNameEn}
                                    placeholder={t('product_form_name_placeholder')}
                                    variant="bordered"
                                />
                            </div>
                        )}
                        {translationTab === 'pt' && (
                            <div className={styles.formGroup}>
                                <Input
                                    name="name-pt"
                                    label={t('product_form_name_pt')}
                                    value={namePt}
                                    setValue={setNamePt}
                                    placeholder={t('product_form_name_placeholder')}
                                    variant="bordered"
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <Input
                                name="slug"
                                label={t('slug', { ns: 'common' })}
                                value={slug}
                                setValue={handleSlugChange}
                                placeholder={t('product_form_slug_placeholder')}
                                variant="bordered"
                                isRequired
                            />
                        </div>

                        {translationTab === 'es' && (
                            <div className={styles.formGroupFull}>
                                <Input
                                    name="description"
                                    label={t('product_form_desc_es')}
                                    value={description}
                                    setValue={setDescription}
                                    placeholder={t('product_form_description_placeholder')}
                                    variant="bordered"
                                    multiline
                                    rows={4}
                                />
                            </div>
                        )}
                        {translationTab === 'en' && (
                            <div className={styles.formGroupFull}>
                                <Input
                                    name="description-en"
                                    label={t('product_form_desc_en')}
                                    value={descriptionEn}
                                    setValue={setDescriptionEn}
                                    placeholder={t('product_form_description_placeholder')}
                                    variant="bordered"
                                    multiline
                                    rows={4}
                                />
                            </div>
                        )}
                        {translationTab === 'pt' && (
                            <div className={styles.formGroupFull}>
                                <Input
                                    name="description-pt"
                                    label={t('product_form_desc_pt')}
                                    value={descriptionPt}
                                    setValue={setDescriptionPt}
                                    placeholder={t('product_form_description_placeholder')}
                                    variant="bordered"
                                    multiline
                                    rows={4}
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            {categoriesLoading ? (
                                <Spinner size="sm" variant="primary" />
                            ) : (
                                <Select
                                    label={t('product_form_category')}
                                    placeholder={t('product_form_category_placeholder')}
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    options={categoryOptions}
                                />
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <Input
                                name="sku"
                                label={t('sku', { ns: 'common' })}
                                value={sku}
                                setValue={setSku}
                                placeholder={t('product_form_sku_placeholder')}
                                variant="bordered"
                                isRequired
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <Input
                                name="base_price"
                                label={t('product_form_base_price')}
                                value={basePrice}
                                setValue={setBasePrice}
                                placeholder="0.00"
                                variant="bordered"
                                isRequired
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <Input
                                name="compare_at_price"
                                label={t('product_form_compare_price')}
                                value={compareAtPrice}
                                setValue={setCompareAtPrice}
                                placeholder={t('product_form_compare_price_placeholder')}
                                variant="bordered"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <Input
                                name="stock"
                                label={t('product_form_stock')}
                                value={stock}
                                setValue={setStock}
                                placeholder="0"
                                variant="bordered"
                            />
                        </div>
                    </div>

                    <div className={styles.checkboxRow}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span>{t('product_form_active')}</span>
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={(e) => setIsFeatured(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span>{t('product_form_featured')}</span>
                        </label>
                    </div>

                    <div className={styles.formActions}>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => navigate(ROUTES.adminProducts)}
                        >
                            {t('cancel', { ns: 'common' })}
                        </Button>
                        <Button variant="primary" type="submit" disabled={isPending}>
                            {isPending
                                ? t('product_form_saving')
                                : isEditing
                                  ? t('product_form_update')
                                  : t('product_form_create')}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Image Management — only when editing */}
            {!!isEditing && (
                <Card className={styles.formCard}>
                    <h3 className={styles.sectionTitle}>{t('product_form_images')}</h3>

                    {images.length > 0 && (
                        <div className={styles.imageGrid}>
                            {images.map((img) => (
                                <div key={img.id} className={styles.imageCard}>
                                    <img
                                        src={img.image_url}
                                        alt={img.alt_text || t('image', { ns: 'common' })}
                                        className={styles.imagePreview}
                                        loading="lazy"
                                        decoding="async"
                                        width={200}
                                        height={200}
                                    />
                                    <div className={styles.imageActions}>
                                        {!!img.is_primary && (
                                            <span className={styles.primaryBadge}>
                                                <Star weight="fill" />{' '}
                                                {t('product_form_image_primary')}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.imageDeleteBtn}
                                            onClick={() => handleDeleteImage(img)}
                                            disabled={deleteImage.isPending}
                                            title={t('delete', { ns: 'common' })}
                                        >
                                            <Trash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={styles.uploadArea}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className={styles.hiddenInput}
                        />
                        <button
                            type="button"
                            className={styles.uploadBtn}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadImage.isPending}
                        >
                            {uploadImage.isPending ? (
                                <Spinner size="sm" />
                            ) : (
                                <>
                                    <Upload />
                                    <span>{t('product_form_image_upload')}</span>
                                </>
                            )}
                        </button>
                        <span className={styles.uploadHint}>{t('product_form_image_hint')}</span>
                    </div>
                </Card>
            )}

            {!isEditing && (
                <Card className={styles.formCard}>
                    <h3 className={styles.sectionTitle}>{t('product_form_images')}</h3>
                    <p className={styles.imageNote}>{t('product_form_image_save_first')}</p>
                </Card>
            )}
        </div>
    );
}
