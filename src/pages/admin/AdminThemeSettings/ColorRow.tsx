import { ArrowsClockwise } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { HEX_REGEX } from '@/lib/validation';

import styles from './ColorRow.module.css';

/**
 * Single row of the theme color editor. Renders the live computed value
 * of `--cssVar` next to a color picker; emits override changes to the
 * parent only when the value validates as a CSS hex. Reset button clears
 * the override and falls back to the theme's default value.
 */
interface ColorRowProps {
    cssVar: string;
    labelKey: string;
    overrideValue: string | undefined;
    onChangeColor: (val: string) => void;
    onResetColor: () => void;
}

function getComputedCssVar(cssVar: string): string {
    try {
        return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    } catch {
        return '#000000';
    }
}

export function ColorRow({
    cssVar,
    labelKey,
    overrideValue,
    onChangeColor,
    onResetColor,
}: ColorRowProps) {
    const { t } = useTranslation('admin');

    const effectiveValue = overrideValue ?? getComputedCssVar(cssVar);
    const displayValue = effectiveValue || '#000000';

    const [hexInput, setHexInput] = useState(displayValue);
    const [hasError, setHasError] = useState(false);

    // Sync from outside (e.g. reset)
    useEffect(() => {
        setHexInput(overrideValue ?? getComputedCssVar(cssVar));
        setHasError(false);
    }, [overrideValue, cssVar]);

    const handleHexChange = (val: string) => {
        setHexInput(val);
        setHasError(false);
        // Live preview only if valid while typing
        if (HEX_REGEX.test(val)) {
            onChangeColor(val);
        }
    };

    const handleHexBlur = () => {
        if (!HEX_REGEX.test(hexInput)) {
            setHasError(true);
            toast.error(t('toast_theme_color_invalid'), { duration: 3000 });
            // Revert to effective value
            setHexInput(overrideValue ?? getComputedCssVar(cssVar));
        }
    };

    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setHexInput(val);
        setHasError(false);
        onChangeColor(val);
    };

    // Ensure the color picker gets a valid 6-char hex
    const pickerValue = HEX_REGEX.test(hexInput) ? hexInput.slice(0, 7) : '#000000';

    return (
        <div className={styles.row}>
            <div
                className={styles.swatch}
                style={{ backgroundColor: pickerValue }}
                aria-hidden="true"
            />

            <span className={styles.label}>{t(labelKey)}</span>

            <input
                type="text"
                className={`${styles.hexInput} ${hasError ? styles.hexInputError : ''}`}
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                onBlur={handleHexBlur}
                maxLength={9}
                aria-label={`${t(labelKey)} hex value`}
                placeholder="#RRGGBB"
            />

            <input
                type="color"
                className={styles.colorPicker}
                value={pickerValue}
                onChange={handleColorPickerChange}
                aria-label={`${t(labelKey)} color picker`}
            />

            <button
                type="button"
                className={styles.resetBtn}
                onClick={onResetColor}
                disabled={overrideValue === undefined}
                aria-label={t('theme_reset_one')}
                title={t('theme_reset_one')}
            >
                <ArrowsClockwise />
            </button>
        </div>
    );
}
