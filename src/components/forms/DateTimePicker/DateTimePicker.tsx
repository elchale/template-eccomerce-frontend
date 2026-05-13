import type React from 'react';
import { useState, useEffect } from 'react';

import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
    /** Unique identifier for the input field */
    name: string;
    /** Current value of the input field */
    value: string;
    /** Callback function to update the input value */
    setValue: (value: string) => void;
    /** Visual style variant of the input */
    variant?: 'flat' | 'bordered' | 'faded' | 'underlined';
    /** Color scheme based on theme variables */
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    /** Size preset from global size variables */
    size?: 'sm' | 'md' | 'lg';
    /** Border radius preset from global radius variables */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    /** Label text displayed adjacent to the input */
    label?: string;
    /** Validation error message displayed below the input */
    errorMessage?: string;
    /** Minimum allowed datetime value */
    min?: string;
    /** Maximum allowed datetime value */
    max?: string;
    /** Only allow date selection, time will be set to 00:00 */
    dateOnly?: boolean;
    /** Content to display before the input */
    startContent?: React.ReactNode;
    /** Content to display after the input */
    endContent?: React.ReactNode;
    /** Whether the input should span full container width */
    fullWidth?: boolean;
    /** Show clear button when input has content */
    isClearable?: boolean;
    /** Mark field as required with asterisk */
    isRequired?: boolean;
    /** HTML required attribute (alternative to isRequired) */
    required?: boolean;
    /** Prevent user interaction while maintaining value */
    isReadOnly?: boolean;
    /** Disable input interaction completely */
    isDisabled?: boolean;
    /** Manual validation state override */
    isInvalid?: boolean;
    /** Ref object for the wrapper div element */
    baseRef?: React.RefObject<HTMLDivElement>;
    /** Additional CSS classes for custom styling */
    classNames?: string;
}

export function DateTimePicker({
    name,
    value,
    setValue,
    variant = 'flat',
    color = 'default',
    size = 'md',
    radius = 'md',
    label,
    errorMessage,
    min,
    max,
    dateOnly = false,
    startContent,
    endContent,
    fullWidth = true,
    isClearable = false,
    isRequired = false,
    required,
    isReadOnly = false,
    isDisabled = false,
    isInvalid,
    baseRef,
    classNames = '',
}: DateTimePickerProps) {
    const [validationError, setValidationError] = useState<string>('');

    // Combine validation errors from prop and internal validation
    const computedErrorMessage = errorMessage || validationError;
    const invalid = isInvalid || !!computedErrorMessage;
    const showClearButton = isClearable && value.length > 0 && !isDisabled;

    // Validate datetime input
    useEffect(() => {
        if (isDisabled || isReadOnly) {
            setValidationError('');
            return;
        }

        // Only validate if there's a value
        if (value) {
            // Check if the datetime is valid
            const dateTime = new Date(value);
            if (Number.isNaN(dateTime.getTime())) {
                setValidationError('Please enter a valid date and time');
                return;
            }

            // Min datetime validation
            if (min && new Date(value) < new Date(min)) {
                setValidationError('Date and time must be after the minimum allowed');
                return;
            }

            // Max datetime validation
            if (max && new Date(value) > new Date(max)) {
                setValidationError('Date and time must be before the maximum allowed');
                return;
            }
        }

        // Clear validation error if all checks pass
        setValidationError('');
    }, [value, min, max, isDisabled, isReadOnly]);

    const handleClear = () => setValue('');

    // Size class for consistent sizing with Input component
    const sizeClass = `size${size.charAt(0).toUpperCase() + size.slice(1)}`;

    // Handle date change and automatically set time to 00:00 if dateOnly is true
    const handleDateTimeChange = (newValue: string) => {
        if (dateOnly && newValue) {
            // For date-only inputs, append T00:00 to make it a valid datetime
            setValue(newValue + 'T00:00');
        } else {
            setValue(newValue);
        }
    };

    // Color class for CSS module approach
    const colorClass = `color${color.charAt(0).toUpperCase() + color.slice(1)}`;

    return (
        <div
            ref={baseRef}
            className={`${styles.group} ${fullWidth ? styles.fullWidth : ''} ${classNames}`}
        >
            {/* Always show label above the input */}
            {!!label && (
                <label className={styles.label} htmlFor={name}>
                    {label}
                    {!!isRequired && <span className={styles.requiredMark}>*</span>}
                </label>
            )}

            <div className={styles.inputContainer}>
                {!!startContent && <div className={styles.startContent}>{startContent}</div>}

                <input
                    id={name}
                    className={`${styles.field} ${styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${styles[sizeClass]} 
                    ${variant !== 'underlined' ? styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`] : ''} 
                    ${invalid ? styles.inputInvalid : ''} 
                    ${startContent ? styles.hasStart : ''} 
                    ${endContent || showClearButton ? styles.hasEnd : ''}
                    ${styles[colorClass] || ''}`}
                    name={name}
                    type={dateOnly ? 'date' : 'datetime-local'}
                    value={dateOnly && value ? value.split('T')[0] : value}
                    onChange={(e) => handleDateTimeChange(e.target.value)}
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    min={min}
                    max={max}
                    required={required || isRequired}
                    aria-invalid={invalid}
                    aria-describedby={computedErrorMessage ? `${name}-error` : undefined}
                />

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

                {!!endContent && <div className={styles.endContent}>{endContent}</div>}
            </div>

            {/* Error message */}
            {!!computedErrorMessage && (
                <div className={styles.errorMsg} id={`${name}-error`}>
                    {computedErrorMessage}
                </div>
            )}
        </div>
    );
}
