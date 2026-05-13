import { CaretDown, Check, Translate } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { LANGUAGES } from '@/constants/languages';
import type { LanguageCode } from '@/constants/languages';
import { STORAGE_KEYS } from '@/constants/storage';
import { useClickOutside, useEscapeKey } from '@/hooks';

import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
    const { i18n, t } = useTranslation('common');
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentCode = (i18n.language?.split('-')[0] ?? 'es') as LanguageCode;
    const currentLang = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

    const select = useCallback(
        (code: LanguageCode) => {
            const lang = LANGUAGES.find((l) => l.code === code);
            if (!lang || code === currentCode) {
                setOpen(false);
                return;
            }
            i18n.changeLanguage(code);
            localStorage.setItem(STORAGE_KEYS.LANG, code);
            queryClient.invalidateQueries();
            toast.success(t('language_changed', { language: lang.label }));
            setOpen(false);
        },
        [currentCode, i18n, queryClient, t],
    );

    useClickOutside(containerRef, () => setOpen(false), open);
    useEscapeKey(() => setOpen(false), open);

    return (
        <div ref={containerRef} className={styles.wrapper}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('language_switcher_label')}
            >
                <Translate className={styles.globeIcon} />
                <span className={styles.flag}>{currentLang.flag}</span>
                <span className={styles.code}>{currentLang.code.toUpperCase()}</span>
                <CaretDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>

            <div
                className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}
                role="listbox"
                aria-label={t('language_switcher_label')}
            >
                {LANGUAGES.map((lang) => {
                    const isActive = lang.code === currentCode;
                    return (
                        <button
                            key={lang.code}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                            onClick={() => select(lang.code)}
                        >
                            <span className={styles.optionFlag}>{lang.flag}</span>
                            <span className={styles.optionLabel}>{lang.label}</span>
                            {!!isActive && <Check className={styles.checkIcon} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
