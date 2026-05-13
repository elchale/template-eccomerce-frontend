/**
 * Address-form reference data.
 *
 * Two parts:
 *   - `COUNTRIES`: ISO-3166 alpha-2 codes for the country picker. Order
 *     reflects expected traffic — Peru first, common LATAM next, then the
 *     rest alphabetically. Names are localised at render time via i18n.
 *   - `PE_DEPARTAMENTOS`: the 24 departments + the Constitutional Province
 *     of Callao. We don't enumerate provincias/distritos here because the
 *     full Peruvian INEI dataset would be too heavy to bundle on every
 *     checkout — those fields stay free-text and Google Places handles
 *     autocomplete for users who pick that path.
 */
export const COUNTRIES: { code: string; nameKey: string }[] = [
    { code: 'PE', nameKey: 'country_PE' },
    { code: 'CL', nameKey: 'country_CL' },
    { code: 'CO', nameKey: 'country_CO' },
    { code: 'MX', nameKey: 'country_MX' },
    { code: 'AR', nameKey: 'country_AR' },
    { code: 'BR', nameKey: 'country_BR' },
    { code: 'EC', nameKey: 'country_EC' },
    { code: 'BO', nameKey: 'country_BO' },
    { code: 'US', nameKey: 'country_US' },
    { code: 'ES', nameKey: 'country_ES' },
    { code: 'OTHER', nameKey: 'country_OTHER' },
];

export const DEFAULT_COUNTRY = 'PE';

export const PE_DEPARTAMENTOS: string[] = [
    'Amazonas',
    'Áncash',
    'Apurímac',
    'Arequipa',
    'Ayacucho',
    'Cajamarca',
    'Callao',
    'Cusco',
    'Huancavelica',
    'Huánuco',
    'Ica',
    'Junín',
    'La Libertad',
    'Lambayeque',
    'Lima',
    'Loreto',
    'Madre de Dios',
    'Moquegua',
    'Pasco',
    'Piura',
    'Puno',
    'San Martín',
    'Tacna',
    'Tumbes',
    'Ucayali',
];
