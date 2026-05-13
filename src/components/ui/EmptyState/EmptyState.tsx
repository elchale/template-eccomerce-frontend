import type React from 'react';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    message?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
    return (
        <div className={styles.container}>
            {!!icon && <div className={styles.icon}>{icon}</div>}
            <h3 className={styles.title}>{title}</h3>
            {!!message && <p className={styles.message}>{message}</p>}
            {!!action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
