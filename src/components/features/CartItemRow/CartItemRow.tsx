import { Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { QuantitySelector, ProductImage } from '@/components/ui';
import { formatCurrency } from '@/lib/formatCurrency';
import type { CartItem } from '@/types/order';

import styles from './CartItemRow.module.css';

interface CartItemRowProps {
    item: CartItem;
    onUpdateQuantity: (id: number, quantity: number) => void;
    onRemove: (id: number) => void;
}

/**
 * One line in the cart UI. Delete is an icon-only trash button — the
 * actual confirm modal lives in the parent (CartPage / CartDrawer) so
 * the row stays presentational and the destructive prompt copy can vary
 * by context (drawer vs full-page cart).
 */
export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
    const { t } = useTranslation();

    return (
        <div className={styles.row}>
            <div className={styles.imageContainer}>
                <ProductImage src={item.product_image} alt={item.product_name} size="sm" />
            </div>
            <div className={styles.details}>
                <h4 className={styles.name}>{item.product_name}</h4>
                {!!item.variant_info && <span className={styles.variant}>{item.variant_info}</span>}
                <span className={styles.unitPrice}>
                    {formatCurrency(item.unit_price)} {t('per_unit')}
                </span>
            </div>
            <div className={styles.actions}>
                <QuantitySelector
                    value={item.quantity}
                    onChange={(quantity) => onUpdateQuantity(item.id, quantity)}
                    min={1}
                    max={99}
                />
                <span className={styles.lineTotal}>{formatCurrency(item.line_total)}</span>
                <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => onRemove(item.id)}
                    aria-label={t('remove_item_aria', { name: item.product_name })}
                    title={t('remove_item')}
                >
                    <Trash size={18} weight="bold" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
