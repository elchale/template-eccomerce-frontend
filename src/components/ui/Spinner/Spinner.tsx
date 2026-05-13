import styles from './Spinner.module.css';

interface SpinnerProps {
    /** Style variant of the spinner */
    variant?: 'primary' | 'secondary';
    /** Additional CSS classes */
    className?: string;
    /** Size of the spinner */
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Spinner component for loading states.
 * Supports primary and secondary variants.
 */
export function Spinner({ variant = 'primary', className = '', size = 'md' }: SpinnerProps) {
    return <div className={`${styles.spinner} ${styles[variant]} ${className} ${styles[size]}`} />;
}
