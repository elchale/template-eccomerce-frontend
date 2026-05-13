import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useState } from 'react';

import styles from './PasswordEyeInput.module.css';

interface PasswordEyeInputProps {
    /** Unique identifier for the input field */
    name: string;
    /** Label text displayed above the input */
    label?: string;
    /** Placeholder text when input is empty */
    placeholder?: string;
    /** Current value of the input field */
    value?: string;
    /** Callback function to update the input value */
    setValue?: (value: string) => void;
    /** Size preset - matches Input component */
    size?: 'sm' | 'md' | 'lg';
    /** Border radius preset - matches Input component */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    /** Whether the input should span full container width */
    fullWidth?: boolean;
    /** Mark field as required with asterisk */
    isRequired?: boolean;
    /** Disable input interaction */
    isDisabled?: boolean;
    /** Validation error message */
    errorMessage?: string;
}

export function PasswordEyeInput({
    name,
    label = '',
    placeholder = '',
    value = '',
    setValue = () => {},
    size = 'md',
    radius = 'md',
    fullWidth = true,
    isRequired = false,
    isDisabled = false,
    errorMessage,
}: PasswordEyeInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
    const radiusClass = styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`];

    return (
        <div className={`${styles.group} ${fullWidth ? styles.fullWidth : ''}`}>
            {!!label && (
                <label className={styles.label} htmlFor={name}>
                    {label}
                    {!!isRequired && <span className={styles.requiredMark}>*</span>}
                </label>
            )}

            <div className={styles.wrapper}>
                <input
                    className={`${styles.field} ${sizeClass} ${radiusClass}`}
                    type={showPassword ? 'text' : 'password'}
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={isDisabled}
                />

                <button
                    type="button"
                    className={styles.icon}
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                >
                    {showPassword ? <EyeSlash /> : <Eye />}
                </button>
            </div>

            {!!errorMessage && <span className={styles.errorMsg}>{errorMessage}</span>}
        </div>
    );
}
