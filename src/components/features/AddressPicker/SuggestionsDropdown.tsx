import { useTranslation } from 'react-i18next';

import styles from './AddressPicker.module.css';

/** A single rendered suggestion in the custom dropdown. */
export interface Suggestion {
    placeId: string;
    main: string;
    secondary: string;
}

interface SuggestionsDropdownProps {
    suggestions: Suggestion[];
    searching: boolean;
    noResults: boolean;
    activeIndex: number;
    onHover: (index: number) => void;
    onSelect: (suggestion: Suggestion) => void;
}

/**
 * The CUSTOM suggestions dropdown rendered BELOW the search input. Owning
 * this list (instead of Google's native widget) is what lets us show a
 * LOADING SPINNER while predictions are fetched. Keyboard-navigable via the
 * parent's listbox/option roles + `activeIndex` highlight.
 */
export function SuggestionsDropdown({
    suggestions,
    searching,
    noResults,
    activeIndex,
    onHover,
    onSelect,
}: SuggestionsDropdownProps) {
    const { t } = useTranslation('shop');

    if (searching) {
        return (
            <ul
                id="addr-search-listbox"
                className={styles.dropdown}
                role="listbox"
                aria-label={t('address_search_label')}
                aria-busy="true"
            >
                <li className={styles.dropdownStatus} aria-live="polite">
                    <span className={styles.spinner} aria-hidden="true" />
                    <span>{t('address_search_searching')}</span>
                </li>
            </ul>
        );
    }

    if (noResults) {
        return (
            <ul
                id="addr-search-listbox"
                className={styles.dropdown}
                role="listbox"
                aria-label={t('address_search_label')}
            >
                <li className={styles.dropdownStatus} aria-live="polite">
                    {t('address_search_no_results')}
                </li>
            </ul>
        );
    }

    return (
        <ul
            id="addr-search-listbox"
            className={styles.dropdown}
            role="listbox"
            aria-label={t('address_search_label')}
        >
            {suggestions.map((s, i) => (
                <li
                    key={s.placeId}
                    id={`addr-suggestion-${i}`}
                    className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ''}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    // mousedown (not click) so it fires before the input's
                    // onBlur closes the dropdown.
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(s);
                    }}
                    onMouseEnter={() => onHover(i)}
                >
                    <span className={styles.dropdownIcon} aria-hidden="true">
                        📍
                    </span>
                    <span className={styles.dropdownTexts}>
                        <span className={styles.dropdownMain}>{s.main}</span>
                        {s.secondary ? (
                            <span className={styles.dropdownSecondary}>{s.secondary}</span>
                        ) : null}
                    </span>
                </li>
            ))}
        </ul>
    );
}
