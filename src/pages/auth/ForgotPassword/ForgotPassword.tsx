import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Input } from '@/components/forms';
import { Card, Button, Spinner } from '@/components/ui';
import { LOGO } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/logger';
import { sanitizeEmail } from '@/lib/sanitize';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ResetPasswordRequest } from '@/types/auth';

import authStyles from '../Auth.module.css';

/**
 * `/forgot-password` — request a password-reset email.
 *
 * Submission always returns a success message (even on unknown email) so
 * the page does not leak whether an account exists. The reset link emailed
 * to the user lands on `/reset-password/:uid/:token`.
 */
export function ForgotPassword() {
    const navigate = useNavigate();
    const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isLogged = useAuthStore((s) => s.isLogged);
    const { t } = useTranslation('auth');

    const [formData, setFormData] = useState<ResetPasswordRequest>({
        email: '',
    });

    useEffect(() => {
        if (isLogged) {
            navigate(ROUTES.home);
        }
    }, [isLogged, navigate]);

    const handleFormDataChange = (key: string, value: string) => {
        setFormData((prevState: ResetPasswordRequest) => ({
            ...prevState,
            [key]: value,
        }));
    };

    const validateForm = (formData: ResetPasswordRequest) => {
        const { email } = formData;

        if (!email) {
            return { isValid: false, message: t('validation_fill_all') };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: t('validation_valid_email') };
        }

        return { isValid: true, message: '' };
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = validateForm(formData);
        if (!validation.isValid) {
            toast.error(validation.message);
            return;
        }

        // Sanitize inputs before sending to API
        const sanitizedData: ResetPasswordRequest = {
            email: sanitizeEmail(formData.email),
        };

        try {
            const status: boolean = await requestPasswordReset(sanitizedData);
            if (status) {
                navigate(ROUTES.login);
                return;
            }
        } catch (error) {
            toast.error(t('forgot_error'));
            logger.error('Password reset request error:', error);
        }
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.header}>
                <button
                    className={authStyles.backButton}
                    onClick={() => navigate(ROUTES.login)}
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
                <h1 className={authStyles.title}>{t('forgot_title')}</h1>
                <form className={authStyles.form} onSubmit={onSubmit}>
                    <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        setValue={(value) => handleFormDataChange('email', value)}
                        label={t('forgot_email_label')}
                        placeholder={t('forgot_email_placeholder')}
                    />
                    <Button variant="primary" size="md" type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner variant="secondary" size="sm" /> : t('forgot_button')}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
