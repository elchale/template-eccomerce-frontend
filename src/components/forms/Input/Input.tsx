import { Eye, EyeSlash } from '@phosphor-icons/react';
import type React from 'react';
import { useState, useEffect } from 'react';

import styles from './Input.module.css';

interface InputProps {
    /** Unique identifier for the input field */
    name: string;
    /** Current value of the input field */
    value: string;
    /** Callback function to update the input value */
    setValue: (value: string) => void;
    /** Visual style variant of the input */
    variant?: 'flat' | 'bordered' | 'faded' | 'underlined' | undefined;
    /** Color scheme based on theme variables */
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | undefined;
    /** Size preset from global size variables */
    size?: 'sm' | 'md' | 'lg' | undefined;
    /** Border radius preset from global radius variables */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full' | undefined;
    /** Label text displayed adjacent to the input */
    label?: string | undefined;
    /** Placeholder text when input is empty */
    placeholder?: string | undefined;
    /** Validation error message displayed below the input */
    errorMessage?: string | undefined;
    /** Minimum allowed character length */
    minLength?: number | undefined;
    /** Maximum allowed character length */
    maxLength?: number | undefined;
    /** Step increment for number inputs */
    step?: string | undefined;
    /** Minimum value for number inputs */
    min?: string | undefined;
    /** Maximum value for number inputs */
    max?: string | undefined;
    /** HTML input type attribute */
    type?: 'text' | 'email' | 'url' | 'password' | 'tel' | 'search' | 'file' | 'number' | undefined;
    /** Enable multiline textarea functionality */
    multiline?: boolean | undefined;
    /** Number of visible text lines for textarea */
    rows?: number | undefined;
    /** Content to display before the input */
    startContent?: React.ReactNode | undefined;
    /** Content to display after the input */
    endContent?: React.ReactNode | undefined;
    /** Position of the label relative to the input */
    labelPlacement?: 'inside' | 'outside' | 'outside-left' | undefined;
    /** Whether the input should span full container width */
    fullWidth?: boolean | undefined;
    /** Show clear button when input has content */
    isClearable?: boolean | undefined;
    /** Mark field as required with asterisk */
    isRequired?: boolean | undefined;
    /** HTML required attribute (alternative to isRequired) */
    required?: boolean | undefined;
    /** Prevent user interaction while maintaining value */
    isReadOnly?: boolean | undefined;
    /** Disable input interaction completely */
    isDisabled?: boolean | undefined;
    /** Manual validation state override */
    isInvalid?: boolean | undefined;
    /** Ref object for the wrapper div element */
    baseRef?: React.RefObject<HTMLDivElement> | undefined;
    /** Additional CSS classes for custom styling */
    classNames?: string | undefined;
}

export function Input({
    name,
    value,
    setValue,
    variant = 'flat',
    color = 'default',
    size = 'md',
    radius = 'md',
    label,
    placeholder,
    errorMessage,
    minLength,
    maxLength,
    step,
    min,
    max,
    type = 'text',
    multiline = false,
    rows = 3,
    startContent,
    endContent,
    labelPlacement = 'outside',
    fullWidth = true,
    isClearable = false,
    isRequired = false,
    required,
    isReadOnly = false,
    isDisabled = false,
    isInvalid,
    baseRef,
    classNames = '',
}: InputProps) {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [validationError, setValidationError] = useState<string>('');

    // Check if we need floating label behavior (when outside placement with no placeholder)
    const needsFloatingLabel = labelPlacement === 'outside' && label && !placeholder;

    // Determine if the label should be positioned as a placeholder or float above
    const shouldShowAsPlaceholder = needsFloatingLabel && !isFocused && value.length === 0;
    const shouldFloatAbove = needsFloatingLabel && (isFocused || value.length > 0);

    // For regular inside label behavior
    const hasInsideLabel = labelPlacement === 'inside' && label;
    const shouldFloat =
        hasInsideLabel &&
        (isFocused || value.length > 0 || placeholder || startContent || endContent);

    // Combine validation errors from prop and internal validation
    const computedErrorMessage = errorMessage || validationError;
    const invalid = isInvalid || !!computedErrorMessage;
    const showClearButton = isClearable && value.length > 0 && !isDisabled;

    // Validate input based on type and constraints
    useEffect(() => {
        if (isDisabled || isReadOnly) {
            setValidationError('');
            return;
        }

        // Only validate if there's a value
        if (value) {
            // Email validation
            if (type === 'email' && value.length > 0) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    setValidationError('Please enter a valid email address');
                    return;
                }
            }

            // URL validation
            if (type === 'url' && value.length > 0) {
                try {
                    new URL(value);
                } catch {
                    setValidationError('Please enter a valid URL');
                    return;
                }
            }

            // Tel validation - simple pattern for digits, dashes, parentheses, and plus sign
            if (type === 'tel' && value.length > 0) {
                const telPattern = /^[0-9+\-() ]+$/;
                if (!telPattern.test(value)) {
                    setValidationError('Please enter a valid phone number');
                    return;
                }
            }

            // Min length validation
            if (minLength !== undefined && value.length < minLength) {
                setValidationError(`Must be at least ${minLength} characters`);
                return;
            }

            // Max length validation
            if (maxLength !== undefined && value.length > maxLength) {
                setValidationError(`Must not exceed ${maxLength} characters`);
                return;
            }
        }

        // Clear validation error if all checks pass
        setValidationError('');
    }, [value, type, minLength, maxLength, isDisabled, isReadOnly]);

    const handleClear = () => setValue('');

    // Use size directly for consistent sizing across all form components
    const sizeClass = `size${size.charAt(0).toUpperCase() + size.slice(1)}`;

    // Generate color class name
    const colorClass = `color${color.charAt(0).toUpperCase() + color.slice(1)}`;

    return (
        <div
            ref={baseRef}
            className={`${styles.group} ${fullWidth ? styles.fullWidth : ''} ${
                styles[
                    `labelPlacement${labelPlacement
                        .split('-')
                        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                        .join('')}`
                ] || ''
            } ${needsFloatingLabel ? styles.hasFloatingOutsideLabel : ''} ${classNames}`}
        >
            {/* Show outside label only if it's not the floating case */}
            {labelPlacement !== 'inside' && !needsFloatingLabel && !!label && (
                <label className={styles.label} htmlFor={name}>
                    {label}
                    {!!isRequired && <span className="required-mark">*</span>}
                </label>
            )}

            <div
                className={`${styles.inputContainer} ${needsFloatingLabel ? styles.withFloatingLabel : ''}`}
            >
                {!!startContent && (
                    <div
                        className={`${styles.startContent} ${hasInsideLabel ? styles.hasInsideLabel : ''}`}
                    >
                        {startContent}
                    </div>
                )}

                {/* Inside label OR floating outside label */}
                {!!(hasInsideLabel || needsFloatingLabel) && (
                    <label
                        className={`${styles.inputLabel} ${hasInsideLabel ? styles.insideLabel : styles.floatingOutsideLabel} ${shouldFloat ? styles.floating : ''} ${shouldShowAsPlaceholder ? styles.asPlaceholder : ''} ${shouldFloatAbove ? styles.floatAbove : ''}`}
                        htmlFor={name}
                    >
                        {label}
                        {!!isRequired && <span className="required-mark">*</span>}
                    </label>
                )}

                {multiline ? (
                    <textarea
                        id={name}
                        className={`${styles.field} ${styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${styles[sizeClass]} 
                            ${variant !== 'underlined' ? styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`] : ''} 
                            ${hasInsideLabel ? styles.hasInsideLabel : ''} 
                            ${invalid ? styles.inputInvalid : ''} 
                            ${startContent ? styles.hasStart : ''} 
                            ${endContent ? styles.hasEnd : ''}
                            ${needsFloatingLabel ? styles.withFloatingLabel : ''} 
                            ${styles[colorClass] || ''}
                            ${styles.multilineTextarea}`}
                        style={{
                            minHeight: `${rows * 1.5}rem`,
                            resize: 'vertical',
                        }}
                        name={name}
                        placeholder={shouldShowAsPlaceholder ? '' : placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={isDisabled}
                        readOnly={isReadOnly}
                        minLength={minLength}
                        maxLength={maxLength}
                        rows={rows}
                        required={required || isRequired}
                        aria-invalid={invalid}
                        aria-describedby={computedErrorMessage ? `${name}-error` : undefined}
                    />
                ) : (
                    <input
                        id={name}
                        className={`${styles.field} ${styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${styles[sizeClass]} 
                            ${variant !== 'underlined' ? styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`] : ''} 
                            ${hasInsideLabel ? styles.hasInsideLabel : ''} 
                            ${invalid ? styles.inputInvalid : ''} 
                            ${startContent ? styles.hasStart : ''} 
                            ${endContent || type === 'password' ? styles.hasEnd : ''}
                            ${needsFloatingLabel ? styles.withFloatingLabel : ''}
                            ${styles[colorClass] || ''}`}
                        name={name}
                        type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
                        placeholder={shouldShowAsPlaceholder ? '' : placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        disabled={isDisabled}
                        readOnly={isReadOnly}
                        minLength={minLength}
                        maxLength={maxLength}
                        step={step}
                        min={min}
                        max={max}
                        required={required || isRequired}
                        aria-invalid={invalid}
                        aria-describedby={computedErrorMessage ? `${name}-error` : undefined}
                    />
                )}

                {!!showClearButton && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={handleClear}
                        aria-label="Clear input"
                    >
                        ×
                    </button>
                )}

                {!!(endContent || (type === 'password' && !multiline)) && (
                    <div
                        className={`${styles.endContent} ${hasInsideLabel ? styles.hasInsideLabel : ''}`}
                    >
                        {endContent}
                        {type === 'password' &&
                            !multiline &&
                            !!(labelPlacement === 'outside' || shouldFloat) && (
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeSlash /> : <Eye />}
                                </button>
                            )}
                    </div>
                )}
            </div>

            {!!computedErrorMessage && (
                <span id={`${name}-error`} className={styles.errorMsg}>
                    {computedErrorMessage}
                </span>
            )}
        </div>
    );
}
