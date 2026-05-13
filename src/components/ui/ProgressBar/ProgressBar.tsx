import styles from './ProgressBar.module.css';

interface ProgressBarProps {
    value: number;
    max: number;
    label?: string;
    color?: string;
}

export function ProgressBar({ value, max, label, color }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={styles.container}>
            {!!label && <span className={styles.label}>{label}</span>}
            <div
                className={styles.track}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
            >
                <div
                    className={styles.fill}
                    style={{
                        width: `${percentage}%`,
                        ...(color ? { backgroundColor: color } : {}),
                    }}
                />
            </div>
        </div>
    );
}
