import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/forms';
import { Button, Spinner, Card } from '@/components/ui';
import { LOGO } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storage';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/useAuthStore';

import authStyles from '../Auth.module.css';

import styles from './VerifyEmail.module.css';

/**
 * `/verify-email` — 6-digit code verification for newly-registered accounts.
 *
 * Resend cooldown logic (FE-3): the cooldown deadline is persisted to
 * `STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL` so a page reload
 * doesn't grant a free retry. Two cooldown values are used:
 *  - 30s after a successful send
 *  - 5min when the backend reports "in_progress" (a recent send is still
 *    in the email queue)
 *
 * On a successful `confirmEmail` the backend auto-issues tokens, so the
 * user is routed straight to `/` instead of back to `/login`.
 */
export function VerifyEmail() {
    const navigate = useNavigate();
    const confirmEmail = useAuthStore((s) => s.confirmEmail);
    const resendConfirmationEmail = useAuthStore((s) => s.resendConfirmationEmail);
    const confirmEmailToken = useAuthStore((s) => s.confirmEmailToken);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isLogged = useAuthStore((s) => s.isLogged);
    const { t } = useTranslation('auth');

    const handleBackToLogin = () => {
        navigate(ROUTES.login);
    };

    const [code, setCode] = useState('');
    const [resendCooldownSeconds, setResendCooldownSeconds] = useState(() => {
        // If no token (after signup), clear any old cooldown and return 0
        if (!confirmEmailToken) {
            localStorage.removeItem(STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL);
            return 0;
        }

        // Token exists (after login) - check if there's an existing cooldown
        const rawUntil = localStorage.getItem(STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL);
        const untilMs = rawUntil ? Number(rawUntil) : 0;
        const remainingSeconds = Math.ceil((untilMs - Date.now()) / 1000);

        // If valid cooldown exists, use it
        if (remainingSeconds > 0) {
            return remainingSeconds;
        }

        // No valid cooldown - set 5 minute cooldown after login
        const initialSeconds = 300;
        localStorage.setItem(
            STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL,
            String(Date.now() + initialSeconds * 1000),
        );
        return initialSeconds;
    });
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (isLogged) {
            navigate(ROUTES.home);
        }
    }, [isLogged, navigate]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldownSeconds <= 0) return;

        const intervalId = window.setInterval(() => {
            setResendCooldownSeconds((s) => Math.max(0, s - 1));
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [resendCooldownSeconds]);

    useEffect(() => {
        if (resendCooldownSeconds > 0) return;
        localStorage.removeItem(STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL);
    }, [resendCooldownSeconds]);

    const formatCooldown = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;
        if (minutes <= 0) return `${seconds}s`;
        return `${minutes}:${String(remaining).padStart(2, '0')}`;
    };

    const setCooldownFromNow = (seconds: number) => {
        localStorage.setItem(
            STORAGE_KEYS.VERIFY_EMAIL_RESEND_COOLDOWN_UNTIL,
            String(Date.now() + seconds * 1000),
        );
        setResendCooldownSeconds(seconds);
    };

    const validateCode = (code: string) => {
        if (!code || code.length !== 6) {
            return { isValid: false, message: t('validation_code_6digits') };
        }

        if (!/^\d{6}$/.test(code)) {
            return { isValid: false, message: t('validation_code_numbers_only') };
        }

        return { isValid: true, message: '' };
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = validateCode(code);
        if (!validation.isValid) {
            toast.error(validation.message);
            return;
        }

        try {
            const success = await confirmEmail(code);
            if (success) {
                // Check if user was auto-logged in after verification
                const state = useAuthStore.getState();

                if (state.isLogged) {
                    navigate(ROUTES.home);
                } else {
                    navigate(ROUTES.login);
                }
                return;
            }
        } catch (error) {
            toast.error(t('verify_failed'));
            logger.error('Verification error:', error);
        }
    };

    const handleResendCode = async () => {
        if (!confirmEmailToken) {
            toast.error(t('verify_login_required'));
            return;
        }

        if (resendCooldownSeconds > 0 || isResending) return;

        try {
            setIsResending(true);
            const result = await resendConfirmationEmail(confirmEmailToken);

            if (result === 'sent') {
                setCooldownFromNow(30);
            }

            if (result === 'in_progress') {
                setCooldownFromNow(5 * 60);
            }
        } catch (error) {
            toast.error(t('verify_resend_failed'));
            logger.error('Resend code error:', error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.header}>
                <button
                    className={authStyles.backButton}
                    onClick={handleBackToLogin}
                    aria-label={t('back_to_login')}
                >
                    <ArrowLeft size={16} weight="bold" /> {t('back_to_login')}
                </button>
            </div>

            <Card className={authStyles.card}>
                <div className={authStyles.logo}>
                    <img
                        src={LOGO.src}
                        alt={LOGO.alt}
                        className={authStyles.logoImg}
                        width={64}
                        height={64}
                    />
                </div>
                <h1 className={authStyles.title}>{t('verify_email_title')}</h1>

                <p className={styles.description}>{t('verify_email_description')}</p>

                <form className={authStyles.form} onSubmit={handleSubmit}>
                    <Input
                        name="code"
                        type="text"
                        value={code}
                        setValue={setCode}
                        label={t('verify_code_label')}
                        placeholder={t('verify_code_placeholder')}
                        maxLength={6}
                        variant="bordered"
                    />

                    <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        disabled={isLoading || isResending}
                    >
                        {isLoading ? <Spinner variant="secondary" size="sm" /> : t('verify_button')}
                    </Button>

                    <Button
                        variant="secondary"
                        size="md"
                        type="button"
                        onClick={handleResendCode}
                        disabled={isLoading || isResending || resendCooldownSeconds > 0}
                    >
                        {isResending ? (
                            <Spinner variant="primary" size="sm" />
                        ) : resendCooldownSeconds > 0 ? (
                            t('verify_resend_cooldown', {
                                time: formatCooldown(resendCooldownSeconds),
                            })
                        ) : (
                            t('verify_resend')
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
