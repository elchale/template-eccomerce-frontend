import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { PasswordEyeInput } from '@/components/forms';
import { Button, Spinner, Card } from '@/components/ui';
import { LOGO } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ChangePasswordRequest } from '@/types/auth';

import authStyles from '../Auth.module.css';

/**
 * `/change-password` — in-session password rotation. Requires the old
 * password. Wrapped in `ProtectedRoute`; on success the backend starts an
 * `actions_freeze` window that temporarily blocks sensitive operations.
 *
 * Passwords are intentionally NOT sanitized — sanitization would silently
 * mangle a perfectly valid password containing `<`, `>`, or other
 * characters and lock the user out of their own account.
 */
export function ChangePassword() {
    const navigate = useNavigate();
    const changePassword = useAuthStore((s) => s.changePassword);
    const { t } = useTranslation('auth');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<ChangePasswordRequest>({
        old_password: '',
        new_password1: '',
        new_password2: '',
    });
    // Auth check is handled by ProtectedRoute

    const handleFormDataChange = (key: string, value: string) => {
        setFormData((prevState: ChangePasswordRequest) => ({
            ...prevState,
            [key]: value,
        }));
    };

    const validateForm = (formData: ChangePasswordRequest) => {
        const { old_password, new_password1, new_password2 } = formData;

        if (!old_password || !new_password1 || !new_password2) {
            return { isValid: false, message: t('validation_fill_all') };
        }

        if (new_password1 !== new_password2) {
            return { isValid: false, message: t('validation_passwords_match') };
        }

        if (old_password === new_password1) {
            return { isValid: false, message: t('validation_password_different') };
        }

        if (new_password1.length < 8) {
            return { isValid: false, message: t('validation_password_min') };
        }

        return { isValid: true, message: '' };
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = validateForm(formData);
        if (!validation.isValid) {
            toast.error(validation.message);
            return;
        }

        let didNavigate = false;

        try {
            setIsSubmitting(true);
            // Note: Passwords are NOT sanitized - they're sent as-is to preserve user intent
            const success = await changePassword(formData);
            if (success) {
                didNavigate = true;
                navigate(ROUTES.profile, { replace: true });
                return;
            }
        } catch (error) {
            logger.error('Change password error:', error);
        } finally {
            if (!didNavigate) {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.header}>
                <button
                    className={authStyles.backButton}
                    onClick={() => navigate(ROUTES.profile)}
                    aria-label={t('back_to_profile')}
                >
                    <ArrowLeft size={16} weight="bold" /> {t('back_to_profile')}
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
                <h1 className={authStyles.title}>{t('change_password_title')}</h1>

                <form className={authStyles.form} onSubmit={handleSubmit}>
                    <PasswordEyeInput
                        name="old_password"
                        value={formData.old_password}
                        setValue={(value) => handleFormDataChange('old_password', value)}
                        label={t('change_current_password')}
                        placeholder={t('change_current_placeholder')}
                    />
                    <PasswordEyeInput
                        name="new_password1"
                        value={formData.new_password1}
                        setValue={(value) => handleFormDataChange('new_password1', value)}
                        label={t('change_new_password')}
                        placeholder={t('change_new_placeholder')}
                    />
                    <PasswordEyeInput
                        name="new_password2"
                        value={formData.new_password2}
                        setValue={(value) => handleFormDataChange('new_password2', value)}
                        label={t('change_confirm_password')}
                        placeholder={t('change_confirm_placeholder')}
                    />

                    <Button variant="primary" size="md" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Spinner variant="secondary" size="sm" />
                        ) : (
                            t('change_button')
                        )}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
