import { ArrowLeft } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { GoogleLoginButton } from '@/components/features/GoogleLoginButton/GoogleLoginButton';
import { Input, PasswordEyeInput } from '@/components/forms';
import { Button, Spinner, Card } from '@/components/ui';
import { LOGO } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/logger';
import { sanitizeEmail } from '@/lib/sanitize';
import { useAuthStore } from '@/stores/useAuthStore';
import type { LoginRequest, AuthResult } from '@/types/auth';

import authStyles from '../Auth.module.css';

import styles from './Login.module.css';

/**
 * `/login` — email/password sign-in plus Google OAuth.
 *
 * Status branches handled inline:
 *  - `success` → toast + `/`
 *  - `confirm_email` → user must verify email first → `/verify-email`
 *  - 2FA / error states surface their own toasts from the store
 *
 * Redirects to `/` if `isLogged` flips true mid-render (e.g., another tab
 * just logged in via storage event).
 */
export function Login() {
    const navigate = useNavigate();
    const logIn = useAuthStore((s) => s.logIn);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isLogged = useAuthStore((s) => s.isLogged);
    const { t } = useTranslation('auth');

    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
    });

    useEffect(() => {
        if (isLogged) {
            navigate(ROUTES.home);
        }
    }, [isLogged, navigate]);

    const handleFormDataChange = (key: string, value: string) => {
        setFormData((prevState: LoginRequest) => ({
            ...prevState,
            [key]: value,
        }));
    };

    const validateForm = (formData: LoginRequest) => {
        const { email, password } = formData;

        if (!email || !password) {
            return { isValid: false, message: t('validation_fill_all') };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: t('validation_valid_email') };
        }

        return { isValid: true, message: '' };
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = validateForm(formData);
        if (!validation.isValid) {
            toast.error(validation.message);
            return;
        }

        const sanitizedData: LoginRequest = {
            email: sanitizeEmail(formData.email),
            password: formData.password,
        };

        try {
            const status: AuthResult = await logIn(sanitizedData, () =>
                logger.info('2FA required'),
            );

            if (status === 'success') {
                toast.success(t('login_success'));
                navigate(ROUTES.home);
            }

            if (status === 'confirm_email') {
                toast.success(t('login_confirm_email'));
                navigate(ROUTES.verifyEmail);
            }

            return;
        } catch (error) {
            toast.error(t('login_error'));
            logger.error('Login error:', error);
        }
    };

    const handleGoogleSuccess = () => {
        navigate(ROUTES.home);
    };

    return (
        <div className={authStyles.container}>
            <div className={authStyles.header}>
                <button
                    className={authStyles.backButton}
                    onClick={() => navigate(ROUTES.home)}
                    aria-label={t('back_to_home')}
                >
                    <ArrowLeft size={16} weight="bold" /> {t('back_to_home')}
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
                <h1 className={authStyles.title}>{t('login_title')}</h1>

                <form className={authStyles.form} onSubmit={handleFormSubmit}>
                    <Input
                        name="email"
                        value={formData.email}
                        setValue={(value) => handleFormDataChange('email', value)}
                        label={t('login_email_label')}
                        placeholder={t('login_email_placeholder')}
                    />
                    <PasswordEyeInput
                        name="password"
                        value={formData.password}
                        setValue={(value) => handleFormDataChange('password', value)}
                        label={t('login_password_label')}
                        placeholder={t('login_password_placeholder')}
                    />

                    <Button variant="primary" size="md" type="submit" disabled={isLoading}>
                        {isLoading ? <Spinner variant="secondary" size="sm" /> : t('login_button')}
                    </Button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerText}>{t('login_or_continue')}</span>
                </div>

                <GoogleLoginButton onSuccess={handleGoogleSuccess} />

                <div className={authStyles.footer}>
                    <button className="text-btn" onClick={() => navigate(ROUTES.forgotPassword)}>
                        {t('login_forgot_password')}
                    </button>
                </div>

                <div className={authStyles.footer}>
                    <span>{t('login_no_account')}</span>
                    <button className="text-btn" onClick={() => navigate(ROUTES.register)}>
                        <span className={authStyles.link}>{t('login_sign_up')}</span>
                    </button>
                </div>
            </Card>
        </div>
    );
}
