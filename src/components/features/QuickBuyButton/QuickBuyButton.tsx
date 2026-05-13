import { ShoppingCart } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

import { useAddToCart } from '@/api/useCart';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import type { ProductListItem } from '@/types/product';

import styles from './QuickBuyButton.module.css';

interface QuickBuyButtonProps {
    product: ProductListItem;
}

export function QuickBuyButton({ product }: QuickBuyButtonProps) {
    const isLogged = useAuthStore((s) => s.isLogged);
    const addLocalItem = useCartStore((s) => s.addLocalItem);
    const openCart = useCartStore((s) => s.openCart);
    const addToCart = useAddToCart();

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (product.stock === 0) {
            toast.error('Producto sin stock');
            return;
        }

        if (isLogged) {
            addToCart.mutate(
                { product_id: product.id, quantity: 1 },
                {
                    onSuccess: () => {
                        toast.success('Agregado al carrito');
                        openCart();
                    },
                    onError: () => {
                        toast.error('No se pudo agregar al carrito');
                    },
                },
            );
        } else {
            const imageUrl = product.primary_image
                ? typeof product.primary_image === 'string'
                    ? product.primary_image
                    : product.primary_image.image_url
                : null;
            addLocalItem({
                product_id: product.id,
                product_name: product.name,
                product_slug: product.slug,
                product_image: imageUrl,
                variant_id: null,
                variant_info: '',
                unit_price: product.base_price,
                quantity: 1,
            });
            toast.success('Agregado al carrito');
            openCart();
        }
    };

    return (
        <button
            className={styles.btn}
            onClick={handleClick}
            disabled={addToCart.isPending}
            aria-label="Agregar al carrito rápido"
        >
            <ShoppingCart size={16} weight="fill" />
            <span className={styles.text}>+ Carrito</span>
        </button>
    );
}
