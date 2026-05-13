import type { ReactNode } from 'react';

import styles from './CardTitle.module.css';

interface CardTitleProps {
    /** The content to be rendered inside the container */
    children: ReactNode;
    /** Additional CSS classes for custom styling (optional) */
    className?: string;
    /** OnClick callback — when provided, renders a <button> for keyboard accessibility */
    onClick?: () => void;
}

export function CardTitle({ children, className, onClick }: CardTitleProps) {
    const composedClassName = `${styles.title} ${className || ''}`;

    if (onClick) {
        return (
            <button type="button" className={composedClassName} onClick={onClick}>
                {children}
            </button>
        );
    }

    return <div className={composedClassName}>{children}</div>;
}
