/**
 * Single-shot Google Maps JS API loader.
 *
 * The Maps SDK is opt-in: if `VITE_GOOGLE_MAPS_API_KEY` is missing we never
 * touch the network and `loadGoogleMapsPlaces()` resolves to `null`, letting
 * the UI fall back to manual address entry without a runtime error.
 *
 * The loader is idempotent. The first call kicks off a single script tag
 * and shares the resulting promise with any subsequent caller, so multiple
 * mounted Autocomplete inputs don't each spawn their own script.
 *
 * We intentionally don't pull in `@react-google-maps/api` — the dependency
 * surface is large for what amounts to a single Autocomplete widget, and a
 * static import would pull the Google bundle into every page that touches
 * checkout. A 30-line dynamic loader is plenty.
 */
type GoogleMapsNamespace = typeof google.maps;

let inflight: Promise<GoogleMapsNamespace | null> | null = null;

export function loadGoogleMapsPlaces(): Promise<GoogleMapsNamespace | null> {
    if (inflight) return inflight;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
        // Resolve to null so callers can short-circuit to manual mode without
        // triggering a load. Cached on the module so we don't keep checking.
        inflight = Promise.resolve(null);
        return inflight;
    }

    // Already loaded by some other corner of the app.
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
        inflight = Promise.resolve(window.google.maps);
        return inflight;
    }

    inflight = new Promise<GoogleMapsNamespace | null>((resolve) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google?.maps?.places) {
                resolve(window.google.maps);
            } else {
                resolve(null);
            }
        };
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });

    return inflight;
}

declare global {
    // Minimal ambient typing — we only use the namespaces we touch below.
    namespace google {
        namespace maps {
            namespace places {
                class Autocomplete {
                    constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
                    addListener(name: string, fn: () => void): void;
                    getPlace(): PlaceResult;
                    setFields(fields: string[]): void;
                }
                interface AutocompleteOptions {
                    fields?: string[];
                    types?: string[];
                    componentRestrictions?: { country: string | string[] };
                }
                interface PlaceResult {
                    formatted_address?: string;
                    address_components?: {
                        long_name: string;
                        short_name: string;
                        types: string[];
                    }[];
                    geometry?: { location?: { lat(): number; lng(): number } };
                }
            }
        }
    }

    interface Window {
        google?: { maps: GoogleMapsNamespace };
    }
}
