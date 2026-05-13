import { Link } from 'react-router-dom';

import { buildRoute } from '@/constants/routes';
import type { Category } from '@/types/product';

import styles from './CategoryCard.module.css';

interface CategoryCardProps {
    category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
    return (
        <Link to={buildRoute.shopCategory(category.slug)} className={styles.card}>
            <div className={styles.imageContainer}>
                {category.image_url ? (
                    <img
                        src={category.image_url}
                        alt={category.name}
                        className={styles.image}
                        loading="lazy"
                        decoding="async"
                        width={300}
                        height={300}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        {category.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className={styles.overlay}>
                    <h3 className={styles.name}>{category.name}</h3>
                </div>
            </div>
        </Link>
    );
}
