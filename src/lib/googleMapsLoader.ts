/**
 * Single-shot Google Maps JS API loader.
 *
 * The Maps SDK is opt-in: if `VITE_GOOGLE_MAPS_API_KEY` is missing we never
 * touch the network and `loadGoogleMapsPlaces()` resolves to `null`, letting
 * the UI fall back to manual address entry without a runtime error.
 *
 * The loader is idempotent. The first call kicks off a single script tag
 * and shares the resulting promise with any subsequent caller, so multiple
 * mounted Autocomplete inputs / maps don't each spawn their own script.
 *
 * We load `libraries=places,marker` plus the core `maps` + `geocoding`
 * services (the latter two ship with the base bundle, so no extra library
 * param is needed). This single bundle backs both the address autocomplete
 * input AND the visual confirmation map with its draggable pin.
 *
 * We intentionally don't pull in `@react-google-maps/api` — the dependency
 * surface is large for what we need, and a static import would pull the
 * Google bundle into every page that touches checkout. A small dynamic
 * loader is plenty.
 */
type GoogleMapsNamespace = typeof google.maps;

let inflight: Promise<GoogleMapsNamespace | null> | null = null;

/**
 * Resolves the full `google.maps` namespace (places + maps + marker +
 * geocoding) or `null` when no API key is configured / the script fails to
 * load. Callers that only need Places can keep using the alias below.
 */
export function loadGoogleMaps(): Promise<GoogleMapsNamespace | null> {
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,marker&loading=async`;
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

/**
 * Back-compat alias: the Places autocomplete only needs the same namespace.
 * Keeping the original name avoids churn in existing callers.
 */
export const loadGoogleMapsPlaces = loadGoogleMaps;

declare global {
    // Minimal ambient typing — we only use the namespaces we touch below.
    namespace google {
        namespace maps {
            // Returned by addListener; we hold onto it so cleanup can remove
            // the same listener instead of every listener on the instance.
            interface MapsEventListener {
                remove(): void;
            }

            namespace event {
                function removeListener(listener: MapsEventListener): void;
                function clearInstanceListeners(instance: object): void;
            }

            interface LatLngLiteral {
                lat: number;
                lng: number;
            }

            interface LatLng {
                lat(): number;
                lng(): number;
            }

            interface MapMouseEvent {
                latLng?: LatLng | null;
            }

            interface MapOptions {
                center?: LatLngLiteral;
                zoom?: number;
                disableDefaultUI?: boolean;
                zoomControl?: boolean;
                streetViewControl?: boolean;
                mapTypeControl?: boolean;
                fullscreenControl?: boolean;
                clickableIcons?: boolean;
                gestureHandling?: string;
            }

            class Map {
                constructor(el: HTMLElement, opts?: MapOptions);
                setCenter(latLng: LatLngLiteral): void;
                setZoom(zoom: number): void;
                addListener(name: string, fn: (e: MapMouseEvent) => void): MapsEventListener;
            }

            interface MarkerOptions {
                position?: LatLngLiteral;
                map?: Map;
                draggable?: boolean;
                title?: string;
            }

            class Marker {
                constructor(opts?: MarkerOptions);
                setPosition(latLng: LatLngLiteral): void;
                setMap(map: Map | null): void;
                getPosition(): LatLng | null;
                addListener(name: string, fn: (e: MapMouseEvent) => void): MapsEventListener;
            }

            interface GeocoderRequest {
                location?: LatLngLiteral;
                address?: string;
            }

            interface GeocoderAddressComponent {
                long_name: string;
                short_name: string;
                types: string[];
            }

            interface GeocoderResult {
                address_components: GeocoderAddressComponent[];
                formatted_address: string;
            }

            class Geocoder {
                geocode(
                    request: GeocoderRequest,
                    callback: (results: GeocoderResult[] | null, status: string) => void,
                ): void;
            }

            namespace places {
                class Autocomplete {
                    constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
                    addListener(name: string, fn: () => void): MapsEventListener;
                    getPlace(): PlaceResult;
                    setFields(fields: string[]): void;
                }
                interface AutocompleteOptions {
                    fields?: string[];
                    types?: string[];
                    componentRestrictions?: { country: string | string[] };
                    // A LatLngBoundsLiteral that biases (not restricts)
                    // suggestions toward a geographic box.
                    bounds?: { north: number; south: number; east: number; west: number };
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
