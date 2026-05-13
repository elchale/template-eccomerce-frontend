import { CaretDown, Check } from '@phosphor-icons/react';
import type React from 'react';
import { useState, useRef, useEffect } from 'react';

import { useClickOutside } from '@/hooks';

import styles from './Select.module.css';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    /** Label text displayed above the select */
    label?: string;
    /** Current selected value */
    value: string;
    /** Callback function when selection changes */
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    /** Array of options to display */
    options: SelectOption[];
    /** Validation error message */
    error?: string;
    /** Disable select interaction */
    disabled?: boolean;
    /** Mark field as required with asterisk */
    required?: boolean;
    /** Placeholder text when no option selected */
    placeholder?: string;
    /** Size preset - matches Input component */
    size?: 'sm' | 'md' | 'lg';
    /** Border radius preset - matches Input component */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    /** Whether the select should span full container width */
    fullWidth?: boolean;
}

export function Select({
    label,
    value,
    onChange,
    options,
    error,
    disabled = false,
    required = false,
    placeholder = 'Select an option...',
    size = 'md',
    radius = 'md',
    fullWidth = true,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    // Detect mobile devices
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(
                window.innerWidth <= 768 ||
                    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                        navigator.userAgent,
                    ),
            );
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useClickOutside(dropdownRef, () => setIsOpen(false), isOpen);

    const handleCustomSelect = (optionValue: string) => {
        const syntheticEvent = {
            target: { value: optionValue },
            currentTarget: { value: optionValue },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
        setIsOpen(false);
    };

    const selectedOption = options.find((option) => option.value === value);

    // Size and radius classes for consistent styling
    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
    const radiusClass = styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`];

    // Use native select on mobile
    if (isMobile) {
        return (
            <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
                {!!label && (
                    <label className={styles.label}>
                        {label}
                        {!!required && <span className={styles.requiredMark}>*</span>}
                    </label>
                )}
                <select
                    ref={selectRef}
                    className={`${styles.input} ${styles.native} ${sizeClass} ${radiusClass} ${error ? styles.hasError : ''}`}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                >
                    <option value="" disabled>
                        {placeholder}
                    </option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {!!error && <span className={styles.errorMsg}>{error}</span>}
            </div>
        );
    }

    // Custom dropdown for desktop
    return (
        <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
            {!!label && (
                <label className={styles.label}>
                    {label}
                    {!!required && <span className={styles.requiredMark}>*</span>}
                </label>
            )}
            <div
                ref={dropdownRef}
                className={`${styles.customSelect} ${isOpen ? styles.open : ''} ${error ? styles.hasError : ''} ${disabled ? styles.disabled : ''}`}
            >
                <div
                    className={`${styles.trigger} ${sizeClass} ${radiusClass}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!disabled) setIsOpen(!isOpen);
                        }
                    }}
                    tabIndex={disabled ? -1 : 0}
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className={styles.value}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <CaretDown className={`${styles.arrow} ${isOpen ? styles.rotated : ''}`} />
                </div>

                {!!isOpen && (
                    <div className={styles.dropdown}>
                        <div className={styles.options} role="listbox">
                            {options.map((option) => (
                                <div
                                    key={option.value}
                                    className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
                                    onClick={() => handleCustomSelect(option.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleCustomSelect(option.value);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="option"
                                    aria-selected={value === option.value}
                                >
                                    <span className={styles.optionText}>{option.label}</span>
                                    {value === option.value && (
                                        <Check className={styles.optionCheck} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!!error && <span className={styles.errorMsg}>{error}</span>}
        </div>
    );
}
