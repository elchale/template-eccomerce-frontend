import { Calendar } from '@phosphor-icons/react';
import { useRef } from 'react';
import ReactDatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';
import styles from './DatePicker.module.css';

interface DatePickerProps {
    /** Label text displayed above the input */
    label?: string;
    /** Current selected date value */
    value: Date | null;
    /** Callback function when date changes */
    onChange: (date: Date | null) => void;
    /** Validation error message */
    error?: string;
    /** Disable input interaction */
    disabled?: boolean;
    /** Mark field as required with asterisk */
    required?: boolean;
    /** Minimum selectable date */
    minDate?: Date;
    /** Maximum selectable date */
    maxDate?: Date;
    /** Placeholder text when no date selected */
    placeholderText?: string;
    /** Size preset - matches Input component */
    size?: 'sm' | 'md' | 'lg';
    /** Border radius preset - matches Input component */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    /** Whether the input should span full container width */
    fullWidth?: boolean;
}

export function DatePicker({
    label,
    value,
    onChange,
    error,
    disabled = false,
    required = false,
    minDate,
    maxDate,
    placeholderText = 'Select date',
    size = 'md',
    radius = 'md',
    fullWidth = true,
}: DatePickerProps) {
    const datePickerRef = useRef<ReactDatePicker>(null);

    const handleIconClick = () => {
        if (!disabled && datePickerRef.current) {
            datePickerRef.current.setFocus();
        }
    };

    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
    const radiusClass = styles[`radius${radius.charAt(0).toUpperCase() + radius.slice(1)}`];

    return (
        <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
            {!!label && (
                <label className={styles.label}>
                    {label}
                    {!!required && <span className={styles.requiredMark}>*</span>}
                </label>
            )}
            <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
                {/* react-datepicker's discriminated-union types interact badly with
                    exactOptionalPropertyTypes: the single-date variant marks
                    `selectsMultiple?: never`, and Pick<> in the resolved union makes it
                    structurally "required" under exact-optional. The prop is correctly
                    omitted for our single-date use case. */}
                {/* @ts-expect-error - react-datepicker types vs exactOptionalPropertyTypes */}
                <ReactDatePicker
                    ref={datePickerRef}
                    selected={value}
                    onChange={onChange}
                    className={`${styles.input} ${sizeClass} ${radiusClass}`}
                    dateFormat="dd/MM/yyyy"
                    disabled={disabled}
                    minDate={minDate}
                    maxDate={maxDate}
                    placeholderText={placeholderText}
                    showPopperArrow={false}
                    autoComplete="off"
                />
                <Calendar
                    className={styles.icon}
                    onClick={handleIconClick}
                    role="button"
                    aria-label="Open calendar"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleIconClick();
                        }
                    }}
                />
            </div>
            {!!error && <span className={styles.errorMsg}>{error}</span>}
        </div>
    );
}
