import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useIntersectionObserver } from '@/hooks';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './StickyAddToCart.module.css';

interface StickyAddToCartProps {
    productName: string;
    price: string;
    onAddToCart: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
    mainCtaRef: React.RefObject<HTMLElement | null>;
}

export function StickyAddToCart({
    productName,
    price,
    onAddToCart,
    isLoading = false,
    isDisabled = false,
    mainCtaRef,
}: StickyAddToCartProps) {
    const { t } = useTranslation('shop');
    const observerOptions = useMemo(() => ({ threshold: 0.1 }), []);
    const isIntersecting = useIntersectionObserver(mainCtaRef, observerOptions);
    const visible = !isIntersecting;

    return (
        <div
            className={`${styles.bar} ${visible ? styles.barVisible : ''}`}
            aria-hidden={!visible}
            aria-label={t('product_add_to_cart')}
        >
            <div className={styles.info}>
                <span className={styles.name}>{productName}</span>
                <span className={styles.price}>{formatCurrency(price)}</span>
            </div>
            <Button
                variant="primary"
                size="md"
                onClick={onAddToCart}
                disabled={isDisabled || isLoading}
                className={styles.btn}
            >
                {isLoading ? t('product_adding') : t('product_add_to_cart')}
            </Button>
        </div>
    );
}
