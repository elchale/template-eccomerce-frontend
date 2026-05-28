import { Check, MapPin, User } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { COUNTRIES, DEFAULT_COUNTRY, PE_DEPARTAMENTOS } from '@/constants/addressData';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import { logger } from '@/lib/logger';

import styles from './AddressPicker.module.css';
import { SuggestionsDropdown, type Suggestion } from './SuggestionsDropdown';

/**
 * Internal shape held in component state. Kept separate from
 * `formatAddressForBackend` so callers can also persist the structured
 * pieces alongside the joined string if a future schema gains a JSONB
 * column.
 *
 * `lat`/`lng` are the coordinates of the draggable confirmation pin. They
 * are `null` until the buyer picks a Places suggestion or drags the pin.
 * The backend still stores a free-text address, so these get appended as a
 * Google Maps link by `formatAddressForBackend` (no schema change needed).
 */
export interface AddressFields {
    recipient: string;
    phone: string;
    country: string;
    departamento: string;
    provincia: string;
    distrito: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    lat: number | null;
    lng: number | null;
}

export const EMPTY_ADDRESS: AddressFields = {
    recipient: '',
    phone: '',
    country: DEFAULT_COUNTRY,
    departamento: '',
    provincia: '',
    distrito: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    lat: null,
    lng: null,
};

/**
 * Build the multi-line string that we POST as `shipping_address`. The
 * backend storage is still a TextField, so we keep the contract intact —
 * the structured fields are a UX layer only.
 *
 * When the buyer has confirmed a pin location we append a final
 * `Ubicación: https://maps.google.com/?q=<lat>,<lng>` line so delivery can
 * open the exact point without any backend migration.
 *
 * NOTE: This output contract is depended on by /checkout/pay and must not
 * change — only the way the fields get populated (the search UI) changes.
 */
export function formatAddressForBackend(a: AddressFields): string {
    const lines: string[] = [];
    if (a.recipient.trim()) lines.push(a.recipient.trim());

    const street = a.addressLine2.trim()
        ? `${a.addressLine1.trim()} — ${a.addressLine2.trim()}`
        : a.addressLine1.trim();
    if (street) lines.push(street);

    const adminParts = [a.distrito, a.provincia, a.departamento].map((s) => s.trim()).filter(Boolean);
    if (adminParts.length) lines.push(adminParts.join(', '));

    const localityParts = [a.postalCode, countryLabelForCode(a.country)]
        .map((s) => s.trim())
        .filter(Boolean);
    if (localityParts.length) lines.push(localityParts.join(' '));

    if (a.phone.trim()) lines.push(`Tel: ${a.phone.trim()}`);

    if (typeof a.lat === 'number' && typeof a.lng === 'number') {
        lines.push(`Ubicación: https://maps.google.com/?q=${a.lat},${a.lng}`);
    }

    return lines.join('\n');
}

function countryLabelForCode(code: string): string {
    // Convert ISO code to a human display in the joined address. We
    // intentionally don't translate this — the printed shipping label
    // should stay stable across the customer's UI language.
    const map: Record<string, string> = {
        PE: 'Perú',
        CL: 'Chile',
        CO: 'Colombia',
        MX: 'México',
        AR: 'Argentina',
        BR: 'Brasil',
        EC: 'Ecuador',
        BO: 'Bolivia',
        US: 'United States',
        ES: 'España',
        OTHER: '',
    };
    return map[code] ?? '';
}

/** Default map center (Lima, Perú) when no pin has been dropped yet. */
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };
const PIN_ZOOM = 16;
const OVERVIEW_ZOOM = 12;
/** Min characters before we query Google (avoids noisy 1–2 char lookups). */
const MIN_QUERY_LENGTH = 3;
/** Debounce window for the suggestions fetch so typing doesn't spam Google. */
const SEARCH_DEBOUNCE_MS = 280;

interface AddressPickerProps {
    value: AddressFields;
    onChange: (next: AddressFields) => void;
    /** Optional inline error map keyed by field name */
    errors?: Partial<Record<keyof AddressFields, string>>;
}

/**
 * Address input with a single, address-first flow.
 *
 * Field order (top → bottom) — STABLE regardless of Google Maps SDK state:
 *   1. The "Dirección completa" input. ALWAYS the first visible field, with
 *      a big tap target (~52px) and required asterisk. This single input IS
 *      the `addressLine1` form field.
 *      • When the Maps SDK + new Places API are available, typing in it
 *        debounces a call to `AutocompleteSuggestion.fetchAutocompleteSuggestions`
 *        and our custom dropdown renders below with predictions + a loading
 *        spinner. Selecting a suggestion calls `Place.fetchFields` and fills
 *        distrito / provincia / departamento / postalCode + drops the map pin.
 *      • When the SDK is missing (no API key) OR fails to load OR the new
 *        Places API isn't available, the same input is a plain controlled
 *        text input — no dropdown, no spinner, no map. The buyer fills the
 *        detail fields below manually. No errors, no layout shift: this
 *        field stays first.
 *      • While the SDK is STILL loading (first paint) it already renders as
 *        a normal text input — we just don't attach autocomplete yet. The
 *        buyer never sees a "weird disabled placeholder" flash that turns
 *        into the real input after the loader resolves.
 *   2. The confirmation MAP with a DRAGGABLE pin (only when the SDK is ready
 *      AND the buyer has selected a suggestion / dragged a point).
 *   3. Country selector (default Perú/PE, changeable).
 *   4. Recipient name + phone.
 *   5. Detail fields: line2 (departamento/piso/referencia), distrito,
 *      provincia, departamento (PE = dropdown), postal code.
 *
 * The component is controlled. Parents own the state; we call `onChange`
 * with a fresh `AddressFields` on every field update, and
 * `formatAddressForBackend(value)` produces the string the backend expects.
 */
export function AddressPicker({ value, onChange, errors }: AddressPickerProps) {
    const { t } = useTranslation('shop');
    const mapElRef = useRef<HTMLDivElement>(null);
    const [mapReady, setMapReady] = useState(false);
    // True only when a Maps API key + the new Places API are available.
    // Drives whether the top input attaches autocomplete behavior and the
    // confirmation map renders. Field order does NOT depend on this.
    const [mapsEnabled, setMapsEnabled] = useState(false);
    // Human-readable formatted address Google resolved for the current pin.
    const [resolvedAddress, setResolvedAddress] = useState('');

    // --- Custom search dropdown state ---------------------------------
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searching, setSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    // True once we've actually queried and got zero results (so we can show
    // an empty-state in the dropdown rather than a stale list / spinner).
    const [noResults, setNoResults] = useState(false);

    // Live Google objects. Held in refs because they outlive renders and we
    // mutate them imperatively (center, marker position, geocode).
    const mapsRef = useRef<typeof google.maps | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Monotonic token so a slow in-flight fetch can't clobber a newer one
    // (out-of-order responses are dropped).
    const fetchSeqRef = useRef(0);

    // Latest-value refs so async callbacks (suggestion select, marker
    // dragend) always read the CURRENT form state. Without these, a callback
    // closes over the `value` snapshot at attach time — when the user types
    // in other fields then picks a suggestion / drags the pin, the spread
    // `...value` would discard their typing.
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    valueRef.current = value;
    onChangeRef.current = onChange;

    const setField = <K extends keyof AddressFields>(key: K, val: AddressFields[K]) => {
        onChange({ ...value, [key]: val });
    };

    const isPeru = value.country === 'PE';

    // Map address components (from the new Place API OR the Geocoder) onto
    // our fields. Only overwrites the administrative fields + coordinates;
    // the user-typed street line is preserved unless we have a better value.
    const applyComponents = useCallback(
        (
            components: { long: string; types: string[] }[],
            coords: { lat: number; lng: number },
            formatted?: string,
            keepLine1 = false,
        ) => {
            const partsByType: Record<string, string> = {};
            for (const c of components) {
                for (const type of c.types) {
                    partsByType[type] = c.long;
                }
            }
            const current = valueRef.current;
            const nextLine1 = keepLine1
                ? current.addressLine1
                : [partsByType['route'], partsByType['street_number']].filter(Boolean).join(' ') ||
                  streetFromFormatted(formatted) ||
                  current.addressLine1;

            if (formatted) setResolvedAddress(formatted);

            onChangeRef.current({
                ...current,
                addressLine1: nextLine1,
                distrito:
                    partsByType['sublocality_level_1'] ??
                    partsByType['locality'] ??
                    partsByType['sublocality'] ??
                    current.distrito,
                provincia: partsByType['administrative_area_level_2'] ?? current.provincia,
                departamento:
                    current.country === 'PE'
                        ? matchPeDepartamento(
                              partsByType['administrative_area_level_1'] ?? current.departamento,
                          )
                        : partsByType['administrative_area_level_1'] ?? current.departamento,
                postalCode: partsByType['postal_code'] ?? current.postalCode,
                lat: coords.lat,
                lng: coords.lng,
            });
        },
        [],
    );

    // Reverse-geocode a dragged point and refresh the admin fields. Keeps
    // the typed street line (the buyer is fine-tuning the pin, not the
    // street text) but always updates the coordinates. If the Geocoding API
    // isn't enabled the callback errors out and we simply persist lat/lng —
    // saving is NEVER blocked on reverse-geocode.
    const reverseGeocode = useCallback(
        (coords: { lat: number; lng: number }) => {
            const geocoder = geocoderRef.current;
            if (!geocoder) {
                onChangeRef.current({ ...valueRef.current, lat: coords.lat, lng: coords.lng });
                return;
            }
            try {
                geocoder.geocode({ location: coords }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const mapped = results[0].address_components.map((c) => ({
                            long: c.long_name,
                            types: c.types,
                        }));
                        applyComponents(mapped, coords, results[0].formatted_address, true);
                    } else {
                        onChangeRef.current({ ...valueRef.current, lat: coords.lat, lng: coords.lng });
                    }
                });
            } catch {
                onChangeRef.current({ ...valueRef.current, lat: coords.lat, lng: coords.lng });
            }
        },
        [applyComponents],
    );

    // Move (or create) the pin and recenter the map.
    const placePin = useCallback(
        (coords: { lat: number; lng: number }) => {
            const maps = mapsRef.current;
            const map = mapRef.current;
            if (!maps || !map) return;

            map.setCenter(coords);
            map.setZoom(PIN_ZOOM);

            if (!markerRef.current) {
                markerRef.current = new maps.Marker({
                    position: coords,
                    map,
                    draggable: true,
                });
                markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    reverseGeocode({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                });
            } else {
                markerRef.current.setPosition(coords);
            }
        },
        [reverseGeocode],
    );

    // Initialise the SDK + map once on mount. The NEW Places API is queried
    // imperatively per keystroke (see fetchSuggestions) rather than bound to
    // the input, so this effect only needs to run once.
    useEffect(() => {
        let cancelled = false;
        let clickListener: google.maps.MapsEventListener | null = null;

        loadGoogleMaps().then((maps) => {
            if (cancelled) return;
            // No API key / load failure, OR the new Places API isn't present
            // on this project — graceful degrade. The top "Dirección completa"
            // input stays exactly where it is and works as a plain text
            // field; the manual detail fields below remain fully usable.
            if (!maps?.places?.AutocompleteSuggestion || !maps.places.Place) {
                return;
            }

            mapsRef.current = maps;
            try {
                geocoderRef.current = new maps.Geocoder();
            } catch {
                // Geocoding API may be disabled — pin drag will just keep
                // coordinates without reverse-geocoding. Not fatal.
                geocoderRef.current = null;
            }
            setMapsEnabled(true);

            // --- Map + draggable pin -------------------------------------
            if (mapElRef.current && !mapRef.current) {
                const { lat, lng } = valueRef.current;
                const hasPin = typeof lat === 'number' && typeof lng === 'number';
                const start = hasPin ? { lat, lng } : DEFAULT_CENTER;

                mapRef.current = new maps.Map(mapElRef.current, {
                    center: start,
                    zoom: hasPin ? PIN_ZOOM : OVERVIEW_ZOOM,
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                    gestureHandling: 'cooperative',
                });

                if (hasPin) {
                    placePin(start);
                    // Best-effort: resolve text for a pin that arrived via
                    // restored form state so the confirm line isn't blank.
                    if (geocoderRef.current) {
                        try {
                            geocoderRef.current.geocode({ location: start }, (results, status) => {
                                if (!cancelled && status === 'OK' && results?.[0]) {
                                    setResolvedAddress(results[0].formatted_address);
                                }
                            });
                        } catch {
                            /* no-op: confirm line stays from typed fields */
                        }
                    }
                }

                // Let the buyer tap anywhere on the map to move the pin too.
                clickListener = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                    placePin(coords);
                    reverseGeocode(coords);
                });

                if (!cancelled) setMapReady(true);
            }
        });

        return () => {
            cancelled = true;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            const ev = window.google?.maps?.event;
            if (ev && clickListener) ev.removeListener(clickListener);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Query the NEW Places API for predictions, restricted to the selected
    // country. Uses a sequence token to ignore out-of-order responses.
    const fetchSuggestions = useCallback(async (input: string, country: string) => {
        const maps = mapsRef.current;
        if (!maps?.places?.AutocompleteSuggestion) return;

        const seq = ++fetchSeqRef.current;
        setSearching(true);
        setNoResults(false);

        try {
            const request: google.maps.places.AutocompleteRequest = { input };
            if (country !== 'OTHER') request.includedRegionCodes = [country.toLowerCase()];

            const { suggestions: raw } =
                await maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

            // A newer query already started — drop this stale response.
            if (seq !== fetchSeqRef.current) return;

            const items: Suggestion[] = raw.flatMap((s) => {
                const p = s.placePrediction;
                if (!p) return [];
                return [
                    {
                        placeId: p.placeId,
                        main: p.mainText?.text ?? p.text?.text ?? '',
                        secondary: p.secondaryText?.text ?? '',
                    },
                ];
            });

            setSuggestions(items);
            setNoResults(items.length === 0);
            setShowDropdown(true);
            setActiveIndex(-1);
        } catch (error) {
            if (seq !== fetchSeqRef.current) return;
            // Likely the Places API (New) isn't enabled — degrade quietly:
            // empty the dropdown, no toast, manual fields still work.
            logger.debug('Places autocomplete fetch failed', error);
            setSuggestions([]);
            setNoResults(true);
            setShowDropdown(true);
        } finally {
            if (seq === fetchSeqRef.current) setSearching(false);
        }
    }, []);

    /**
     * Single handler for the "Dirección completa" input. Always updates the
     * controlled `addressLine1` field. When the SDK is wired up, ALSO debounces
     * an autocomplete fetch and toggles the dropdown / spinner. With the SDK
     * off, the rest is a no-op — the input behaves like a plain text field.
     */
    const handleAddressLine1Change = (next: string) => {
        setField('addressLine1', next);

        if (!mapsEnabled) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        const trimmed = next.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            // Too short — clear and hide the dropdown, cancel any pending hit.
            fetchSeqRef.current++;
            setSuggestions([]);
            setNoResults(false);
            setSearching(false);
            setShowDropdown(false);
            return;
        }

        // Show the dropdown immediately with the spinner; the debounced fetch
        // fills it. This gives instant "Buscando…" feedback.
        setSearching(true);
        setShowDropdown(true);
        const country = valueRef.current.country;
        debounceRef.current = setTimeout(() => {
            void fetchSuggestions(trimmed, country);
        }, SEARCH_DEBOUNCE_MS);
    };

    // Resolve a selected suggestion to its full place + fill the form.
    const selectSuggestion = useCallback(
        async (suggestion: Suggestion) => {
            const maps = mapsRef.current;
            if (!maps?.places?.Place) return;

            // Reflect the choice in the address input, then close the dropdown.
            const composed = [suggestion.main, suggestion.secondary].filter(Boolean).join(', ');
            onChangeRef.current({ ...valueRef.current, addressLine1: composed });
            setShowDropdown(false);
            setSuggestions([]);
            setNoResults(false);
            setActiveIndex(-1);

            try {
                const place = new maps.places.Place({ id: suggestion.placeId });
                await place.fetchFields({
                    fields: ['location', 'addressComponents', 'formattedAddress'],
                });

                const loc = place.location;
                const coords = loc
                    ? { lat: loc.lat(), lng: loc.lng() }
                    : {
                          lat: valueRef.current.lat ?? DEFAULT_CENTER.lat,
                          lng: valueRef.current.lng ?? DEFAULT_CENTER.lng,
                      };

                const components = (place.addressComponents ?? []).map((c) => ({
                    long: c.longText ?? c.shortText ?? '',
                    types: c.types,
                }));

                applyComponents(components, coords, place.formattedAddress ?? undefined);
                if (loc) placePin(coords);
            } catch (error) {
                // fetchFields can fail if the Places API (New) Details call
                // isn't enabled. Don't block the buyer: keep their typed
                // text in the field; they can fill the detail fields manually.
                logger.debug('Place.fetchFields failed', error);
            }
        },
        [applyComponents, placePin],
    );

    const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || suggestions.length === 0) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % suggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
                break;
            case 'Enter': {
                const picked = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
                if (picked) {
                    e.preventDefault();
                    void selectSuggestion(picked);
                }
                break;
            }
            case 'Escape':
                setShowDropdown(false);
                break;
            default:
                break;
        }
    };

    const departamentoOptions = useMemo(
        () => PE_DEPARTAMENTOS.map((d) => ({ value: d, label: d })),
        [],
    );

    const renderError = (key: keyof AddressFields) =>
        errors?.[key] ? <span className={styles.errorText}>{errors[key]}</span> : null;

    // Small reusable required marker. `aria-hidden` because the visual `*`
    // is decorative; required state is also conveyed by the field itself.
    const requiredMark = (
        <span className={styles.requiredMark} aria-hidden="true">
            *
        </span>
    );

    const hasPin = typeof value.lat === 'number' && typeof value.lng === 'number';
    // The confirm text near the map: prefer Google's formatted string, else
    // fall back to the pieces the buyer has entered.
    const confirmText =
        resolvedAddress ||
        [value.addressLine1, value.distrito, value.provincia, value.departamento]
            .map((s) => s.trim())
            .filter(Boolean)
            .join(', ');

    const dropdownOpen =
        mapsEnabled && showDropdown && (searching || suggestions.length > 0 || noResults);

    return (
        <div className={styles.grid}>
            {/*
                Dirección completa — ALWAYS FIRST. Single prominent input that
                doubles as the autocomplete trigger when the Maps SDK is wired
                up. With no SDK / on load failure, it stays a plain controlled
                text input — no errors, no layout shift, no spinner. The field
                order below is identical regardless of SDK state.
            */}
            <div className={`${styles.field} ${styles.full} ${styles.addressBlock}`}>
                <label className={styles.addressLabel} htmlFor="addr-line1">
                    {t('address_line1')}
                    {requiredMark}
                    {mapsEnabled ? (
                        <span className={styles.assistTag}>{t('address_autocomplete_hint')}</span>
                    ) : null}
                </label>
                <div className={styles.addressWrap}>
                    <MapPin
                        size={20}
                        weight="bold"
                        className={styles.addressIcon}
                        aria-hidden="true"
                    />
                    <input
                        id="addr-line1"
                        className={`${styles.input} ${styles.addressInput}`}
                        type="text"
                        value={value.addressLine1}
                        onChange={(e) => handleAddressLine1Change(e.target.value)}
                        onFocus={() => {
                            if (mapsEnabled && (suggestions.length > 0 || searching)) {
                                setShowDropdown(true);
                            }
                        }}
                        onBlur={() => {
                            // Delay so a click on an option (mousedown) wins
                            // before the dropdown unmounts.
                            window.setTimeout(() => setShowDropdown(false), 150);
                        }}
                        placeholder={t('address_line1_placeholder')}
                        autoComplete="address-line1"
                        aria-required="true"
                        {...(mapsEnabled
                            ? {
                                  role: 'combobox',
                                  'aria-expanded': dropdownOpen,
                                  'aria-controls': 'addr-search-listbox',
                                  'aria-autocomplete': 'list' as const,
                                  'aria-busy': searching,
                                  onKeyDown: handleAddressKeyDown,
                              }
                            : {})}
                    />
                    {mapsEnabled && searching ? (
                        <span className={styles.searchSpinner} aria-hidden="true" />
                    ) : null}

                    {dropdownOpen ? (
                        <SuggestionsDropdown
                            suggestions={suggestions}
                            searching={searching}
                            noResults={noResults}
                            activeIndex={activeIndex}
                            onHover={setActiveIndex}
                            onSelect={(s) => void selectSuggestion(s)}
                        />
                    ) : null}
                </div>
                <p className={styles.addressHelp}>
                    {mapsEnabled ? t('address_search_help') : t('address_manual_hint')}
                </p>
                {renderError('addressLine1')}
            </div>

            {/*
                Visual confirmation map. Only rendered when the Maps SDK is
                configured (mapReady). With no API key the loader resolves to
                null, this block stays hidden, and the form works exactly the
                same — graceful degrade, no errors.
            */}
            <div className={`${styles.field} ${styles.full} ${mapReady ? '' : styles.hidden}`}>
                <label className={styles.label} htmlFor="addr-map">
                    {t('address_map_label')}
                </label>
                <p className={styles.mapHint}>
                    {hasPin ? t('address_map_hint_drag') : t('address_map_hint_search')}
                </p>
                <div
                    id="addr-map"
                    ref={mapElRef}
                    className={styles.map}
                    role="application"
                    aria-label={t('address_map_label')}
                />
                {hasPin && confirmText ? (
                    <div className={styles.confirmBox}>
                        <Check
                            size={16}
                            weight="bold"
                            className={styles.confirmIcon}
                            aria-hidden="true"
                        />
                        <span className={styles.confirmText}>{confirmText}</span>
                    </div>
                ) : null}
            </div>

            {/* Location fields — order: distrito → provincia → departamento →
                country → postal → referencia, laid out via the parent .grid
                in a responsive 2-column layout. */}
            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-distrito">
                    {isPeru ? t('address_distrito') : t('address_neighborhood')}
                </label>
                <input
                    id="addr-distrito"
                    className={styles.input}
                    type="text"
                    value={value.distrito}
                    onChange={(e) => setField('distrito', e.target.value)}
                    placeholder={t('address_distrito_placeholder')}
                    autoComplete="address-level3"
                />
                {renderError('distrito')}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-provincia">
                    {isPeru ? t('address_provincia') : t('address_city')}
                </label>
                <input
                    id="addr-provincia"
                    className={styles.input}
                    type="text"
                    value={value.provincia}
                    onChange={(e) => setField('provincia', e.target.value)}
                    placeholder={t('address_provincia_placeholder')}
                    autoComplete="address-level2"
                />
                {renderError('provincia')}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-departamento">
                    {isPeru ? t('address_departamento') : t('address_state')}
                    {isPeru ? requiredMark : null}
                </label>
                {isPeru ? (
                    <select
                        id="addr-departamento"
                        className={styles.input}
                        value={value.departamento}
                        onChange={(e) => setField('departamento', e.target.value)}
                    >
                        <option value="">{t('address_select_placeholder')}</option>
                        {departamentoOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        id="addr-departamento"
                        className={styles.input}
                        type="text"
                        value={value.departamento}
                        onChange={(e) => setField('departamento', e.target.value)}
                        placeholder={t('address_departamento_placeholder')}
                        autoComplete="address-level1"
                    />
                )}
                {renderError('departamento')}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-country">
                    {t('address_country')}
                    {requiredMark}
                </label>
                <select
                    id="addr-country"
                    className={styles.input}
                    value={value.country}
                    onChange={(e) => setField('country', e.target.value)}
                >
                    {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                            {t(c.nameKey)}
                        </option>
                    ))}
                </select>
                {renderError('country')}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-postal">
                    {t('address_postal_code')}
                </label>
                <input
                    id="addr-postal"
                    className={styles.input}
                    type="text"
                    value={value.postalCode}
                    onChange={(e) => setField('postalCode', e.target.value)}
                    placeholder={t('address_postal_placeholder')}
                    autoComplete="postal-code"
                    inputMode="numeric"
                />
                {renderError('postalCode')}
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="addr-line2">
                    {t('address_line2')}
                </label>
                <input
                    id="addr-line2"
                    className={styles.input}
                    type="text"
                    value={value.addressLine2}
                    onChange={(e) => setField('addressLine2', e.target.value)}
                    placeholder={t('address_line2_placeholder')}
                    autoComplete="address-line2"
                />
                {renderError('addressLine2')}
            </div>

            {/* Contact info — separate visual box with its own 2-col grid */}
            <div className={`${styles.full} ${styles.contactBlock}`}>
                <h3 className={styles.contactTitle}>
                    <User
                        size={18}
                        weight="bold"
                        className={styles.contactIcon}
                        aria-hidden="true"
                    />
                    {t('address_contact_title')}
                </h3>
                <div className={styles.contactGrid}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="addr-recipient">
                            {t('address_recipient')}
                            {requiredMark}
                        </label>
                        <input
                            id="addr-recipient"
                            className={styles.input}
                            type="text"
                            value={value.recipient}
                            onChange={(e) => setField('recipient', e.target.value)}
                            placeholder={t('address_recipient_placeholder')}
                            autoComplete="name"
                        />
                        {renderError('recipient')}
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="addr-phone">
                            {t('address_phone')}
                        </label>
                        <input
                            id="addr-phone"
                            className={styles.input}
                            type="tel"
                            value={value.phone}
                            onChange={(e) => setField('phone', e.target.value)}
                            placeholder={t('address_phone_placeholder')}
                            autoComplete="tel"
                            inputMode="tel"
                        />
                        {renderError('phone')}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Heuristic: derive a street line from a full formatted address when Google
 * gives us no `route`/`street_number` components — take everything before the
 * last two comma-separated chunks (which are usually city + country).
 */
function streetFromFormatted(formatted?: string): string {
    if (!formatted) return '';
    const parts = formatted.split(',').map((s) => s.trim());
    if (parts.length <= 1) return parts[0] ?? '';
    return parts.slice(0, Math.max(1, parts.length - 2)).join(', ');
}

/**
 * Strip diacritics + lowercase + trim. Used to match free-form names
 * (e.g. Google's "Ancash", "Lima Region") against the canonical
 * `PE_DEPARTAMENTOS` entries ("Áncash", "Lima") regardless of accents/case.
 */
function normalize(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Map a Google-supplied department name onto our canonical PE departamento
 * list so the <select> can actually highlight the value. Falls back to the
 * input string when no fuzzy match exists.
 */
function matchPeDepartamento(googleName: string): string {
    if (!googleName) return '';
    const target = normalize(googleName);
    // exact normalized match first
    const exact = PE_DEPARTAMENTOS.find((d) => normalize(d) === target);
    if (exact) return exact;
    // tolerate Google's "X Region" / "Region X" / "Departamento de X" wrappers
    const stripped = target
        .replace(/\b(region|regi[oó]n|departamento(?:\s+de)?|provincia(?:\s+de)?)\b/g, '')
        .trim();
    return PE_DEPARTAMENTOS.find((d) => normalize(d) === stripped) ?? googleName;
}
