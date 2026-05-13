import { ArrowLeft, CheckCircle, XCircle } from '@phosphor-icons/react';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { GoogleLoginButton } from '@/components/features/GoogleLoginButton/GoogleLoginButton';
import { Input, PasswordEyeInput } from '@/components/forms';
import { Button, Card, Spinner } from '@/components/ui';
import { LOGO } from '@/constants/common';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/logger';
import { sanitizeEmail } from '@/lib/sanitize';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SignupRequest } from '@/types/auth';

import authStyles from '../Auth.module.css';

import styles from './Register.module.css';

/**
 * `/register` — email/password signup with a live password-strength meter.
 *
 * Validation runs client-side via `passwordRequirements` (memoized on
 * `password1`) and again on submit. The backend re-validates server-side
 * — these are UX scaffolding, not authoritative. On success the user is
 * sent to `/verify-email` to complete account confirmation.
 */
export function Register() {
    const navigate = useNavigate();
    const register = useAuthStore((s) => s.register);
    const isLoading = useAuthStore((s) => s.isLoading);
    const isLogged = useAuthStore((s) => s.isLogged);
    const { t } = useTranslation('auth');

    const [formData, setFormData] = useState<SignupRequest>({
        email: '',
        password1: '',
        password2: '',
    });

    useEffect(() => {
        if (isLogged) {
            navigate(ROUTES.home);
        }
    }, [isLogged, navigate]);

    const handleFormDataChange = (key: string, value: string) => {
        setFormData((prevState: SignupRequest) => ({
            ...prevState,
            [key]: value,
        }));
    };

    // Password strength requirements
    const passwordRequirements = useMemo(() => {
        const password = formData.password1;
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    }, [formData.password1]);

    const validateForm = (formData: SignupRequest) => {
        const { email, password1, password2 } = formData;

        if (!email || !password1 || !password2) {
            return { isValid: false, message: t('validation_fill_all') };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { isValid: false, message: t('validation_valid_email') };
        }

        if (!passwordRequirements.minLength) {
            return { isValid: false, message: t('validation_password_min') };
        }
        if (!passwordRequirements.hasUppercase) {
            return { isValid: false, message: t('validation_password_uppercase') };
        }
        if (!passwordRequirements.hasLowercase) {
            return { isValid: false, message: t('validation_password_lowercase') };
        }
        if (!passwordRequirements.hasNumber) {
            return { isValid: false, message: t('validation_password_number') };
        }
        if (!passwordRequirements.hasSpecialChar) {
            return { isValid: false, message: t('validation_password_special') };
        }

        if (password1 !== password2) {
            return { isValid: false, message: t('validation_passwords_match') };
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

        // Sanitize inputs before sending to API
        const sanitizedData: SignupRequest = {
            email: sanitizeEmail(formData.email),
            password1: formData.password1, // Don't sanitize passwords
            password2: formData.password2, // Don't sanitize passwords
        };

        try {
            const status: boolean = await register(sanitizedData);
            if (status) {
                navigate(ROUTES.verifyEmail);
                return;
            }
            toast.error(t('register_failed'));
        } catch (error) {
            toast.error(t('register_error'));
            logger.error('Registration error:', error);
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
                <h1 className={authStyles.title}>{t('register_title')}</h1>

                <form className={authStyles.form} onSubmit={handleSubmit}>
                    <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        setValue={(v) => handleFormDataChange('email', v)}
                        label={t('register_email_label')}
                        placeholder={t('register_email_placeholder')}
                    />
                    <div>
                        <PasswordEyeInput
                            name="password1"
                            value={formData.password1}
                            setValue={(v) => handleFormDataChange('password1', v)}
                            label={t('register_password_label')}
                            placeholder={t('register_password_placeholder')}
                        />

                        {!!formData.password1 && (
                            <div className={styles.passwordRequirements}>
                                <div
                                    className={`${styles.requirement} ${passwordRequirements.minLength ? styles.met : ''}`}
                                >
                                    {passwordRequirements.minLength ? (
                                        <CheckCircle className={styles.iconMet} />
                                    ) : (
                                        <XCircle className={styles.iconUnmet} />
                                    )}
                                    <span>{t('register_req_min_length')}</span>
                                </div>
                                <div
                                    className={`${styles.requirement} ${passwordRequirements.hasUppercase ? styles.met : ''}`}
                                >
                                    {passwordRequirements.hasUppercase ? (
                                        <CheckCircle className={styles.iconMet} />
                                    ) : (
                                        <XCircle className={styles.iconUnmet} />
                                    )}
                                    <span>{t('register_req_uppercase')}</span>
                                </div>
                                <div
                                    className={`${styles.requirement} ${passwordRequirements.hasLowercase ? styles.met : ''}`}
                                >
                                    {passwordRequirements.hasLowercase ? (
                                        <CheckCircle className={styles.iconMet} />
                                    ) : (
                                        <XCircle className={styles.iconUnmet} />
                                    )}
                                    <span>{t('register_req_lowercase')}</span>
                                </div>
                                <div
                                    className={`${styles.requirement} ${passwordRequirements.hasNumber ? styles.met : ''}`}
                                >
                                    {passwordRequirements.hasNumber ? (
                                        <CheckCircle className={styles.iconMet} />
                                    ) : (
                                        <XCircle className={styles.iconUnmet} />
                                    )}
                                    <span>{t('register_req_number')}</span>
                                </div>
                                <div
                                    className={`${styles.requirement} ${passwordRequirements.hasSpecialChar ? styles.met : ''}`}
                                >
                                    {passwordRequirements.hasSpecialChar ? (
                                        <CheckCircle className={styles.iconMet} />
                                    ) : (
                                        <XCircle className={styles.iconUnmet} />
                                    )}
                                    <span>{t('register_req_special')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <PasswordEyeInput
                        name="password2"
                        value={formData.password2}
                        setValue={(v) => handleFormDataChange('password2', v)}
                        label={t('register_confirm_password_label')}
                        placeholder={t('register_confirm_password_placeholder')}
                    />

                    <Button variant="primary" size="md" type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <Spinner variant="secondary" size="sm" />
                        ) : (
                            t('register_button')
                        )}
                    </Button>
                </form>

                <div className={styles.divider}>
                    <span className={styles.dividerText}>{t('register_or_with_google')}</span>
                </div>

                <GoogleLoginButton onSuccess={handleGoogleSuccess} />

                <div className={authStyles.footer}>
                    <span>{t('register_already_account')}</span>
                    <button className="text-btn" onClick={() => navigate(ROUTES.login)}>
                        <span className={authStyles.link}>{t('register_login')}</span>
                    </button>
                </div>
            </Card>
        </div>
    );
}
