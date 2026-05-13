import styles from './Skeleton.module.css';

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'card' | undefined;
    width?: string | number | undefined;
    height?: string | number | undefined;
    className?: string | undefined;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
    const inlineStyle: React.CSSProperties = {};
    if (width) inlineStyle.width = typeof width === 'number' ? `${width}px` : width;
    if (height) inlineStyle.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${styles.skeleton} ${styles[variant]} ${className}`}
            style={inlineStyle}
            aria-hidden="true"
        />
    );
}
