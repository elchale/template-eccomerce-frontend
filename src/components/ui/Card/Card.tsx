import type React from 'react';

import styles from './Card.module.css';

/**
 * Generic card component that can be clickable
 */
interface CardProps {
    /** The content to be rendered inside the container */
    children: React.ReactNode;
    /** Additional CSS classes for custom styling (optional) */
    className?: string | undefined;
    /** Click handler for the card (optional) */
    onClick?: (() => void) | undefined;
    /** Whether the card should show hover effects (optional) */
    hoverable?: boolean | undefined;
    /** Whether the card is disabled (optional) */
    disabled?: boolean | undefined;
}

export function Card({
    children,
    className = '',
    onClick,
    hoverable = false,
    disabled = false,
}: CardProps) {
    const cardClasses = [
        styles.card,
        className,
        hoverable || onClick ? styles.hoverable : '',
        disabled ? styles.disabled : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={cardClasses}
            onClick={!disabled && onClick ? onClick : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick && !disabled ? 0 : undefined}
            onKeyPress={
                onClick && !disabled
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              onClick();
                          }
                      }
                    : undefined
            }
        >
            {children}
        </div>
    );
}
