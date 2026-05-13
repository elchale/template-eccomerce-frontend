import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useSearchSuggestions } from '@/api/useMarketing';
import { ROUTES, buildRoute } from '@/constants/routes';
import { useClickOutside, useDebounce } from '@/hooks';
import { formatCurrency } from '@/lib/formatCurrency';

import styles from './SearchAutocomplete.module.css';

/**
 * Navbar search input with debounced server-side suggestions.
 *
 * Behavior:
 *  - 300ms debounce on the query so we don't hit the API per keystroke.
 *  - Keyboard navigation through suggestions (ArrowUp/Down + Enter).
 *  - Click-outside / Escape closes the dropdown.
 *  - Selecting a suggestion routes to PDP; pressing Enter on the input
 *    submits a search and routes to `/search?q=...`.
 */
interface SearchAutocompleteProps {
    className?: string;
    placeholder?: string;
}

export function SearchAutocomplete({ className = '', placeholder }: SearchAutocompleteProps) {
    const { t } = useTranslation();
    const effectivePlaceholder = placeholder ?? t('search_products_placeholder');
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(query, 300);
    const { data: suggestions = [], isFetching } = useSearchSuggestions(debouncedQuery);

    const handleSelect = useCallback(
        (slug: string) => {
            setQuery('');
            setOpen(false);
            navigate(buildRoute.shopProduct(slug));
        },
        [navigate],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setOpen(false);
            navigate(`${ROUTES.search}?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            const active = suggestions[activeIndex];
            if (active) handleSelect(active.slug);
        } else if (e.key === 'Escape') {
            setOpen(false);
            setActiveIndex(-1);
        }
    };

    useClickOutside(containerRef, () => setOpen(false), open);

    // Open dropdown when suggestions come in
    useEffect(() => {
        if (debouncedQuery.length >= 2) {
            setOpen(true);
            setActiveIndex(-1);
        } else {
            setOpen(false);
        }
    }, [debouncedQuery]);

    return (
        <div ref={containerRef} className={`${styles.container} ${className}`}>
            <form onSubmit={handleSubmit} className={styles.form} role="search">
                <MagnifyingGlass size={18} className={styles.searchIcon} aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    className={styles.input}
                    placeholder={effectivePlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => debouncedQuery.length >= 2 && setOpen(true)}
                    role="combobox"
                    aria-label={t('search_products_aria')}
                    aria-autocomplete="list"
                    aria-controls="search-suggestions"
                    aria-expanded={open}
                    autoComplete="off"
                />
                {!!query && (
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => {
                            setQuery('');
                            setOpen(false);
                            inputRef.current?.focus();
                        }}
                        aria-label={t('search_clear_aria')}
                    >
                        <X size={16} />
                    </button>
                )}
            </form>

            {!!open && (
                <ul
                    id="search-suggestions"
                    className={styles.dropdown}
                    role="listbox"
                    aria-label={t('search_suggestions_aria')}
                >
                    {!!isFetching && <li className={styles.loadingItem}>{t('searching')}</li>}
                    {!isFetching && suggestions.length === 0 && debouncedQuery.length >= 2 && (
                        <li className={styles.emptyItem}>
                            {t('search_no_results', { query: debouncedQuery })}
                        </li>
                    )}
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`${styles.suggestionItem} ${i === activeIndex ? styles.active : ''}`}
                            onMouseDown={() => handleSelect(s.slug)}
                        >
                            {!!s.primary_image && (
                                <img
                                    src={s.primary_image}
                                    alt={s.name}
                                    className={styles.thumbnail}
                                    loading="lazy"
                                    decoding="async"
                                    width={40}
                                    height={40}
                                />
                            )}
                            <span className={styles.suggestionText}>
                                <span className={styles.suggestionName}>{s.name}</span>
                                <span className={styles.suggestionPrice}>
                                    {formatCurrency(s.base_price)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
