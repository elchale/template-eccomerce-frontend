import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { COUNTRIES, DEFAULT_COUNTRY, PE_DEPARTAMENTOS } from '@/constants/addressData';
import { loadGoogleMapsPlaces } from '@/lib/googleMapsLoader';

import styles from './AddressPicker.module.css';

/**
 * Internal shape held in component state. Kept separate from
 * `formatAddressForBackend` so callers can also persist the structured
 * pieces alongside the joined string if a future schema gains a JSONB
 * column.
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
};

/**
 * Build the multi-line string that we POST as `shipping_address`. The
 * backend storage is still a TextField, so we keep the contract intact —
 * the structured fields are a UX layer only.
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
 *      / `departamento` / `postalCode`. If the env var is missing the
 *      input degrades to a normal text field — no error, no warning.
 *   4. Address line 2 (apt / floor / cross-street).
 *   5. Distrito + Provincia + Departamento + Postal code.
 *
 * The component is controlled. Parents own the state; we just call
 * `onChange` with a fresh `AddressFields` whenever any field updates,
 * and `formatAddressForBackend(value)` produces the string the backend
 * still expects.
 */
export function AddressPicker({ value, onChange, errors }: AddressPickerProps) {
    const { t } = useTranslation('shop');
    const lineRef = useRef<HTMLInputElement>(null);
    const [autocompleteReady, setAutocompleteReady] = useState(false);

    const setField = <K extends keyof AddressFields>(key: K, val: AddressFields[K]) => {
        onChange({ ...value, [key]: val });
    };

    const isPeru = value.country === 'PE';

    // Attach Google Places autocomplete once the maps SDK is available.
    // Effect re-runs when the country changes so the search bias updates.
    useEffect(() => {
        let cancelled = false;
        loadGoogleMapsPlaces().then((maps) => {
            if (cancelled || !maps || !lineRef.current) return;

            const restrictions =
                value.country === 'OTHER' ? undefined : { country: value.country.toLowerCase() };
            const autocomplete = new maps.places.Autocomplete(lineRef.current, {
                fields: ['address_components', 'formatted_address'],
                types: ['address'],
                ...(restrictions && { componentRestrictions: restrictions }),
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.address_components) return;

                const partsByType: Record<string, string> = {};
                for (const c of place.address_components) {
                    for (const type of c.types) {
                        partsByType[type] = c.long_name;
                    }
                }

                const next: AddressFields = {
                    ...value,
                    addressLine1:
                        [partsByType['route'], partsByType['street_number']]
                            .filter(Boolean)
                            .join(' ') || place.formatted_address || value.addressLine1,
                    distrito: partsByType['sublocality_level_1']
                        ?? partsByType['locality']
                        ?? partsByType['sublocality']
                        ?? value.distrito,
                    provincia: partsByType['administrative_area_level_2'] ?? value.provincia,
                    departamento: partsByType['administrative_area_level_1'] ?? value.departamento,
                    postalCode: partsByType['postal_code'] ?? value.postalCode,
                };
                onChange(next);
            });

            setAutocompleteReady(true);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.country]);

    const departamentoOptions = useMemo(
        () => PE_DEPARTAMENTOS.map((d) => ({ value: d, label: d })),
        [],
    );

    const renderError = (key: keyof AddressFields) =>
        errors?.[key] ? <span className={styles.errorText}>{errors[key]}</span> : null;

    return (
        <div className={styles.grid}>
            {/* Country */}
            <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.label} htmlFor="addr-country">
                    {t('address_country')}
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
                    autoComplete="postal-code"
                    inputMode="numeric"
                />
                {renderError('postalCode')}
            </div>
        </div>
    );
}
