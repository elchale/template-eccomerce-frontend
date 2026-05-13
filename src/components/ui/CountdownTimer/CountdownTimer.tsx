import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useInterval } from '@/hooks';

import styles from './CountdownTimer.module.css';

interface CountdownTimerProps {
    targetDate: string;
    onExpire?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
    const difference = new Date(targetDate).getTime() - Date.now();
    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    };
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function CountdownTimer({ targetDate, onExpire, size = 'md' }: CountdownTimerProps) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
    const [expired, setExpired] = useState(false);

    const tick = useCallback(() => {
        const next = calculateTimeLeft(targetDate);
        setTimeLeft(next);
        if (next.days === 0 && next.hours === 0 && next.minutes === 0 && next.seconds === 0) {
            setExpired(true);
            onExpire?.();
        }
    }, [targetDate, onExpire]);

    useInterval(tick, expired ? null : 1000);

    if (expired) {
        return (
            <span className={`${styles.timer} ${styles[size]} ${styles.expired}`}>
                {t('expired')}
            </span>
        );
    }

    const showDays = timeLeft.days > 0;

    return (
        <div className={`${styles.timer} ${styles[size]}`} aria-label={t('time_remaining_aria')}>
            {!!showDays && (
                <>
                    <span className={styles.unit}>
                        <span className={styles.value}>{pad(timeLeft.days)}</span>
                        <span className={styles.label}>d</span>
                    </span>
                    <span className={styles.separator}>:</span>
                </>
            )}
            <span className={styles.unit}>
                <span className={styles.value}>{pad(timeLeft.hours)}</span>
                <span className={styles.label}>h</span>
            </span>
            <span className={styles.separator}>:</span>
            <span className={styles.unit}>
                <span className={styles.value}>{pad(timeLeft.minutes)}</span>
                <span className={styles.label}>m</span>
            </span>
            <span className={styles.separator}>:</span>
            <span className={`${styles.unit} ${timeLeft.minutes === 0 ? styles.urgent : ''}`}>
                <span className={styles.value}>{pad(timeLeft.seconds)}</span>
                <span className={styles.label}>s</span>
            </span>
        </div>
    );
}
