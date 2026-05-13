import { useState, useEffect } from 'react';

import styles from './SearchInput.module.css';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', id }: SearchInputProps) {
    const [localValue, setLocalValue] = useState(value);

    // Sync local value when external value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounce onChange by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    return (
        <div className={styles.container}>
            <svg
                className={styles.icon}
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
                id={id}
                type="text"
                className={styles.input}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {!!localValue && (
                <button
                    className={styles.clear}
                    onClick={() => {
                        setLocalValue('');
                        onChange('');
                    }}
                    aria-label="Clear search"
                >
                    {'\u00D7'}
                </button>
            )}
        </div>
    );
}
