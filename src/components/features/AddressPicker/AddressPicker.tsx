import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { COUNTRIES, DEFAULT_COUNTRY, PE_DEPARTAMENTOS } from '@/constants/addressData';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';

import styles from './AddressPicker.module.css';

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

interface AddressPickerProps {
    value: AddressFields;
    onChange: (next: AddressFields) => void;
    /** Optional inline error map keyed by field name */
    errors?: Partial<Record<keyof AddressFields, string>>;
}

/**
 * Multi-field address input modelled on Temu's flow:
 *   1. Country selector. Drives whether `Departamento` becomes a dropdown
 *      (PE only) or a free-text input.
 *   2. Recipient name + phone (top of the card — usually the first thing
 *      a buyer needs to confirm).
 *   3. A single address line with Google Places autocomplete when
 *      `VITE_GOOGLE_MAPS_API_KEY` is configured. The autocomplete result
 *      back-fills `addressLine1` and best-effort `distrito` / `provincia`
 *      / `departamento` / `postalCode`, AND drops the confirmation pin.
 *      If the env var is missing the input degrades to a normal text field
 *      and the map is simply not rendered — no error, no warning.
 *   4. Address line 2 (apt / floor / cross-street).
 *   5. Distrito + Provincia + Departamento + Postal code.
 *   6. A visual confirmation map with a DRAGGABLE pin. The pin is the
 *      source of truth the buyer confirms: dragging it reverse-geocodes the
 *      new point and refreshes distrito / provincia / departamento /
 *      postalCode so the form always matches the pin.
 *
 * The component is controlled. Parents own the state; we just call
 * `onChange` with a fresh `AddressFields` whenever any field updates,
 * and `formatAddressForBackend(value)` produces the string the backend
 * still expects.
 */
export function AddressPicker({ value, onChange, errors }: AddressPickerProps) {
    const { t } = useTranslation('shop');
    const lineRef = useRef<HTMLInputElement>(null);
    const mapElRef = useRef<HTMLDivElement>(null);
    const [autocompleteReady, setAutocompleteReady] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // Live Google objects. Held in refs because they outlive renders and we
    // mutate them imperatively (center, marker position, geocode).
    const mapsRef = useRef<typeof google.maps | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    // Latest-value refs so async listeners (place_changed, marker dragend)
    // always read the CURRENT form state. Without these, a listener closes
    // over the `value` snapshot at attach time — when the user types in
    // other fields then picks a Google suggestion / drags the pin, the
    // spread `...value` would discard their typing.
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    valueRef.current = value;
    onChangeRef.current = onChange;

    const setField = <K extends keyof AddressFields>(key: K, val: AddressFields[K]) => {
        onChange({ ...value, [key]: val });
    };

    const isPeru = value.country === 'PE';

    // Map address_components (from Places OR Geocoder) onto our fields. Only
    // overwrites the administrative fields + coordinates; the user-typed
    // street line is preserved unless we have a better value.
    const applyComponents = useCallback(
        (
            components: { long_name: string; types: string[] }[],
            coords: { lat: number; lng: number },
            formatted?: string,
            keepLine1 = false,
        ) => {
            const partsByType: Record<string, string> = {};
            for (const c of components) {
                for (const type of c.types) {
                    partsByType[type] = c.long_name;
                }
            }
            const current = valueRef.current;
            const nextLine1 = keepLine1
                ? current.addressLine1
                : [partsByType['route'], partsByType['street_number']].filter(Boolean).join(' ') ||
                  formatted ||
                  current.addressLine1;

            onChangeRef.current({
                ...current,
                addressLine1: nextLine1,
                distrito:
                    partsByType['sublocality_level_1'] ??
                    partsByType['locality'] ??
                    partsByType['sublocality'] ??
                    current.distrito,
                provincia: partsByType['administrative_area_level_2'] ?? current.provincia,
                departamento: partsByType['administrative_area_level_1'] ?? current.departamento,
                postalCode: partsByType['postal_code'] ?? current.postalCode,
                lat: coords.lat,
                lng: coords.lng,
            });
        },
        [],
    );

    // Reverse-geocode a dragged point and refresh the admin fields. Keeps
    // the typed street line (the buyer is fine-tuning the pin, not the
    // street text) but always updates the coordinates.
    const reverseGeocode = useCallback(
        (coords: { lat: number; lng: number }) => {
            const geocoder = geocoderRef.current;
            if (!geocoder) {
                // No geocoder (shouldn't happen if maps loaded) — at least
                // persist the coordinates so the link is still correct.
                onChangeRef.current({ ...valueRef.current, lat: coords.lat, lng: coords.lng });
                return;
            }
            geocoder.geocode({ location: coords }, (results, status) => {
                if (status === 'OK' && results?.[0]) {
                    applyComponents(results[0].address_components, coords, results[0].formatted_address, true);
                } else {
                    onChangeRef.current({ ...valueRef.current, lat: coords.lat, lng: coords.lng });
                }
            });
        },
        [applyComponents],
    );

    // Move (or create) the pin and recenter the map.
    const placePin = useCallback((coords: { lat: number; lng: number }) => {
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
    }, [reverseGeocode]);

    // Attach Google Places autocomplete + initialise the map once the SDK is
    // available. Effect re-runs when the country changes so the search bias
    // updates. We intentionally only depend on `value.country` — re-binding
    // on every keystroke would be wasteful; the latest-value refs above keep
    // the closures honest.
    useEffect(() => {
        let cancelled = false;
        let autocomplete: google.maps.places.Autocomplete | null = null;
        let listener: google.maps.MapsEventListener | null = null;
        let clickListener: google.maps.MapsEventListener | null = null;

        loadGoogleMaps().then((maps) => {
            if (cancelled || !maps || !lineRef.current) return;

            mapsRef.current = maps;
            geocoderRef.current = new maps.Geocoder();

            // --- Map + draggable pin -------------------------------------
            if (mapElRef.current && !mapRef.current) {
                const start =
                    typeof valueRef.current.lat === 'number' &&
                    typeof valueRef.current.lng === 'number'
                        ? { lat: valueRef.current.lat, lng: valueRef.current.lng }
                        : DEFAULT_CENTER;
                const hasPin =
                    typeof valueRef.current.lat === 'number' &&
                    typeof valueRef.current.lng === 'number';

                mapRef.current = new maps.Map(mapElRef.current, {
                    center: start,
                    zoom: hasPin ? PIN_ZOOM : OVERVIEW_ZOOM,
                    disableDefaultUI: true,
                    zoomControl: true,
                    clickableIcons: false,
                    gestureHandling: 'cooperative',
                });

                if (hasPin) placePin(start);

                // Let the buyer tap anywhere on the map to move the pin too.
                clickListener = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                    placePin(coords);
                    reverseGeocode(coords);
                });

                if (!cancelled) setMapReady(true);
            }

            // --- Places autocomplete -------------------------------------
            const restrictions =
                value.country === 'OTHER' ? undefined : { country: value.country.toLowerCase() };
            autocomplete = new maps.places.Autocomplete(lineRef.current, {
                fields: ['address_components', 'formatted_address', 'geometry'],
                types: ['address'],
                ...(restrictions && { componentRestrictions: restrictions }),
            });

            listener = autocomplete.addListener('place_changed', () => {
                if (!autocomplete) return;
                const place = autocomplete.getPlace();
                if (!place.address_components) return;

                const loc = place.geometry?.location;
                const coords = loc ? { lat: loc.lat(), lng: loc.lng() } : null;

                if (coords) {
                    applyComponents(place.address_components, coords, place.formatted_address);
                    placePin(coords);
                } else {
                    // No geometry (rare) — fill fields without moving the pin.
                    applyComponents(
                        place.address_components,
                        { lat: valueRef.current.lat ?? DEFAULT_CENTER.lat, lng: valueRef.current.lng ?? DEFAULT_CENTER.lng },
                        place.formatted_address,
                    );
                }
            });

            if (!cancelled) setAutocompleteReady(true);
        });

        return () => {
            cancelled = true;
            // Tear down the listeners + dropdown container Google appends to
            // <body>. Without this, switching country (or unmounting the
            // checkout) leaks Autocomplete instances + their pac-container
            // popovers — each one keeps a reference to the input element
            // and a place_changed listener that still fires.
            const ev = window.google?.maps?.event;
            if (ev) {
                if (listener) ev.removeListener(listener);
                if (clickListener) ev.removeListener(clickListener);
                if (autocomplete) ev.clearInstanceListeners(autocomplete);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.country]);

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

    return (
        <div className={styles.grid}>
            {/* Country */}
            <div className={`${styles.field} ${styles.full}`}>
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

            {/* Recipient + Phone */}
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

            {/* Address line 1 + Google Places autocomplete */}
            <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.label} htmlFor="addr-line1">
                    {t('address_line1')}
                    {requiredMark}
                    {autocompleteReady && (
                        <span className={styles.assistTag}>{t('address_autocomplete_hint')}</span>
                    )}
                </label>
                <input
                    id="addr-line1"
                    ref={lineRef}
                    className={styles.input}
                    type="text"
                    value={value.addressLine1}
                    onChange={(e) => setField('addressLine1', e.target.value)}
                    placeholder={t('address_line1_placeholder')}
                    autoComplete="address-line1"
                />
                {renderError('addressLine1')}
            </div>

            {/* Address line 2 */}
            <div className={`${styles.field} ${styles.full}`}>
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

            {/* Departamento / State */}
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

            {/* Provincia / City (always free text — too many to enumerate) */}
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

            {/* Distrito */}
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

            {/* Postal code */}
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

            {/*
                Visual confirmation map. Only rendered when the Maps SDK is
                configured (mapReady). With no API key the loader resolves to
                null, this block stays hidden, and the form works exactly as
                before — graceful degrade, no errors.
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
            </div>
        </div>
    );
}
