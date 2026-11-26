"use client";

/**
 * Google Maps JavaScript API — loaded on demand, only on screens that pick a location.
 *
 * Key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (a browser key — restrict it to this site's referrers in Google Cloud).
 * It needs the **Maps JavaScript API**, **Places API (New)** and **Geocoding API** enabled. Without a key every
 * caller gets `null` and the location picker falls back to typed fields plus the device's own coordinates.
 *
 * Loading follows Google's documented "dynamic library import" bootstrap: one `<script>` that defines
 * `google.maps.importLibrary`, after which each library (`places`, `maps`, `marker`, `geocoding`) is fetched only
 * when first used. No npm dependency, and nothing is fetched on pages that never ask for it.
 *
 * Types are kept to the handful of members used here, rather than pulling in `@types/google.maps`.
 */

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Advanced markers need a map ID; Google's `DEMO_MAP_ID` works for development. */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export type LatLng = { lat: number; lng: number };

/** One place, normalised to the gym's address fields. */
export type PickedPlace = {
  address: string;
  city: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
};

// ---------------------------------------------------------------- minimal SDK typings

type Component = { longText?: string; long_name?: string; types: string[] };
type GLatLng = { lat(): number; lng(): number };
type Place = {
  formattedAddress?: string | null;
  location?: GLatLng | null;
  addressComponents?: Component[] | null;
  fetchFields(o: { fields: string[] }): Promise<unknown>;
};
type Prediction = { placeId: string; text: { text: string }; mainText?: { text: string } | null; secondaryText?: { text: string } | null; toPlace(): Place };
type PlacesLib = {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: { fetchAutocompleteSuggestions(r: Record<string, unknown>): Promise<{ suggestions: { placePrediction?: Prediction | null }[] }> };
};
type GeocodeResult = { formatted_address: string; address_components: Component[]; geometry: { location: GLatLng } };
type GeocodingLib = { Geocoder: new () => { geocode(r: { location: LatLng }): Promise<{ results: GeocodeResult[] }> } };
export type GMap = {
  setCenter(p: LatLng): void;
  setZoom(z: number): void;
  panTo(p: LatLng): void;
  addListener(ev: string, fn: (e: { latLng?: GLatLng | null }) => void): { remove(): void };
};
export type GMarker = { position: LatLng | GLatLng | null; addListener(ev: string, fn: () => void): { remove(): void }; map: GMap | null };
type MapsLib = { Map: new (el: HTMLElement, o: Record<string, unknown>) => GMap };
type MarkerLib = { AdvancedMarkerElement: new (o: Record<string, unknown>) => GMarker };

type Google = { maps: { importLibrary(name: string): Promise<unknown> } };
declare global { interface Window { google?: Google } }

// ---------------------------------------------------------------- loader

let boot: Promise<Google | null> | null = null;

/** Resolves to the SDK, or `null` when no key is configured or the script can't load (offline, blocked, bad key). */
export function loadMaps(): Promise<Google | null> {
  if (!MAPS_KEY || typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (boot) return boot;
  boot = new Promise<Google | null>((resolve) => {
    const cb = `__manygymMaps${Date.now()}`;
    const w = window as unknown as Record<string, unknown>;
    w[cb] = () => { delete w[cb]; resolve(window.google ?? null); };
    const s = document.createElement("script");
    const q = new URLSearchParams({ key: MAPS_KEY, v: "weekly", loading: "async", callback: cb, libraries: "places,marker,geocoding" });
    s.src = `https://maps.googleapis.com/maps/api/js?${q}`;
    s.async = true;
    s.onerror = () => { boot = null; resolve(null); };
    document.head.appendChild(s);
  });
  return boot;
}

const lib = async <T,>(name: string): Promise<T | null> => {
  const g = await loadMaps();
  if (!g) return null;
  try { return (await g.maps.importLibrary(name)) as T; } catch { return null; }
};

// ---------------------------------------------------------------- address parts

function partsOf(components: Component[]): Pick<PickedPlace, "city" | "country" | "postalCode"> {
  const get = (...types: string[]) => {
    for (const t of types) {
      const c = components.find((x) => x.types.includes(t));
      if (c) return c.longText ?? c.long_name ?? "";
    }
    return "";
  };
  return {
    city: get("locality", "postal_town", "administrative_area_level_2", "sublocality", "administrative_area_level_1"),
    country: get("country"),
    postalCode: get("postal_code"),
  };
}

// ---------------------------------------------------------------- places autocomplete

export type Suggestion = { id: string; main: string; secondary: string; prediction: Prediction };

/**
 * Address suggestions as the person types. One session token covers a run of keystrokes plus the final
 * `place()` lookup, which Google bills as a single session.
 */
export class PlaceSearch {
  private token: object | null = null;
  private places: PlacesLib | null = null;

  async suggest(input: string, near?: LatLng | null): Promise<Suggestion[] | null> {
    this.places ??= await lib<PlacesLib>("places");
    if (!this.places) return null;
    this.token ??= new this.places.AutocompleteSessionToken();
    const req: Record<string, unknown> = { input, sessionToken: this.token };
    if (near) req.origin = near;
    if (near) req.locationBias = { center: near, radius: 50000 };
    const { suggestions } = await this.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    return suggestions
      .map((s) => s.placePrediction)
      .filter((p): p is Prediction => !!p)
      .map((p) => ({ id: p.placeId, main: p.mainText?.text ?? p.text.text, secondary: p.secondaryText?.text ?? "", prediction: p }));
  }

  /** Resolves a chosen suggestion to an address and coordinates, and ends the billing session. */
  async place(s: Suggestion): Promise<PickedPlace | null> {
    const place = s.prediction.toPlace();
    await place.fetchFields({ fields: ["formattedAddress", "location", "addressComponents"] });
    this.token = null;
    if (!place.location) return null;
    return {
      address: place.formattedAddress ?? s.prediction.text.text,
      ...partsOf(place.addressComponents ?? []),
      lat: place.location.lat(),
      lng: place.location.lng(),
    };
  }
}

// ---------------------------------------------------------------- reverse geocoding

/** The street address at a point — used after "Use my current location" and after dragging the pin. */
export async function addressAt(p: LatLng): Promise<PickedPlace | null> {
  const g = await lib<GeocodingLib>("geocoding");
  if (!g) return null;
  try {
    const { results } = await new g.Geocoder().geocode({ location: p });
    const best = results[0];
    if (!best) return null;
    return { address: best.formatted_address, ...partsOf(best.address_components), lat: p.lat, lng: p.lng };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- map with a draggable pin

export async function mountMap(el: HTMLElement, at: LatLng, zoom: number): Promise<{ map: GMap; marker: GMarker } | null> {
  const [maps, markers] = await Promise.all([lib<MapsLib>("maps"), lib<MarkerLib>("marker")]);
  if (!maps || !markers) return null;
  const map = new maps.Map(el, {
    center: at, zoom, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, clickableIcons: false, gestureHandling: "cooperative",
  });
  const marker = new markers.AdvancedMarkerElement({ map, position: at, gmpDraggable: true, title: "Drag to the gym's entrance" });
  return { map, marker };
}

export const positionOf = (m: GMarker): LatLng | null => {
  const p = m.position;
  if (!p) return null;
  return typeof (p as GLatLng).lat === "function" ? { lat: (p as GLatLng).lat(), lng: (p as GLatLng).lng() } : (p as LatLng);
};

/** The API keeps 8 decimal places; sending more is a validation error. */
export const round8 = (n: number) => Math.round(n * 1e8) / 1e8;
