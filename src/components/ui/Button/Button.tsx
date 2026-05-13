import type React from 'react';

import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Style variant of the button */
    variant?:
        | 'primary'
        | 'secondary'
        | 'danger'
        | 'warning'
        | 'info'
        | 'success'
        | 'outline'
        | 'ghost';
    /** Size variant of the button */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Whether the button takes full width */
    fullWidth?: boolean;
    /** Content of the button, can include text and/or icons */
    children: React.ReactNode;
}

/**
 * Button component that follows the design system.
 * Can include an optional icon as a child element.
 */
export function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    children,
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
