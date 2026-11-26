"use client";

/**
 * Pick a place: search an address (Google Places suggestions), or take the device's live location, then fine-tune
 * with a draggable pin. Whatever is picked fills the street address, city, postcode and country, which stay
 * editable, and the coordinates that "Find Gyms → Near me" measures from.
 *
 * Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` there are no suggestions and no map, but the location button still
 * records the device's coordinates and the address can be typed.
 */
import { useEffect, useRef, useState } from "react";
import { LuLoaderCircle, LuLocateFixed, LuMapPin, LuSearch, LuX } from "react-icons/lu";
import { MAPS_KEY, PlaceSearch, addressAt, mountMap, positionOf, round8, type GMap, type GMarker, type LatLng, type PickedPlace, type Suggestion } from "@/lib/google-maps";
import { errorText, hint, input, label } from "@/lib/ui";

export type PlaceValue = { address: string; city: string; country: string; postalCode: string; lat: number | null; lng: number | null };
export const EMPTY_PLACE: PlaceValue = { address: "", city: "", country: "", postalCode: "", lat: null, lng: null };

type Problem = "denied" | "unavailable" | "timeout" | "unsupported";
const PROBLEM: Record<Problem, string> = {
  denied: "Location access is blocked. Allow it for this site in your browser settings, or search for the address instead.",
  unavailable: "Your device couldn't work out where you are. Try again, or search for the address instead.",
  timeout: "Finding your location took too long. Try again, or search for the address instead.",
  unsupported: "This browser can't share a location here. Search for the address instead.",
};

/** The device's position, as precise as it can manage — this is where the gym is, not a rough "near me". */
function here(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) return reject("unsupported" satisfies Problem);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject((e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable") satisfies Problem),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export default function LocationPicker({ value, onChange, error, idPrefix = "loc" }: {
  value: PlaceValue;
  /** A state setter: every change is applied to the latest value, so a location that resolves while someone is
   *  typing can't be overwritten by a keystroke holding an older copy (or the other way round). */
  onChange: React.Dispatch<React.SetStateAction<PlaceValue>>;
  error?: string;
  idPrefix?: string;
}) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searchFailed, setSearchFailed] = useState(false);
  const [busy, setBusy] = useState<null | "locating" | "resolving">(null);
  const [problem, setProblem] = useState("");
  const [mapFailed, setMapFailed] = useState(false);

  const search = useRef<PlaceSearch | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ map: GMap; marker: GMarker } | null>(null);
  // Map listeners outlive renders; they call the latest onChange through a ref.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const hasPoint = value.lat !== null && value.lng !== null;
  const point = hasPoint ? { lat: value.lat as number, lng: value.lng as number } : null;

  /** Takes a resolved place (or bare coordinates); keeps anything the geocoder left blank as it was. */
  const apply = (p: PickedPlace | LatLng) => {
    const found = "address" in p ? p : null;
    onChangeRef.current((v) => ({
      address: found?.address || v.address, city: found?.city || v.city, country: found?.country || v.country, postalCode: found?.postalCode || v.postalCode,
      lat: round8(p.lat), lng: round8(p.lng),
    }));
  };

  // Suggestions, debounced. The term is re-checked when the answer lands so a slow reply can't overwrite a newer one.
  const term = q.trim();
  useEffect(() => {
    if (!MAPS_KEY || term.length < 3) return;
    let live = true;
    const t = setTimeout(() => {
      search.current ??= new PlaceSearch();
      search.current.suggest(term, point)
        .then((rows) => { if (!live) return; setSearchFailed(rows === null); setSuggestions(rows ?? []); setActive(-1); })
        .catch(() => { if (live) { setSearchFailed(true); setSuggestions([]); } });
    }, 250);
    return () => { live = false; clearTimeout(t); };
    // `point` only biases results; re-querying on every pin move would waste requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  // The map appears once there is a point, and follows it.
  const lat = value.lat;
  const lng = value.lng;
  useEffect(() => {
    if (!MAPS_KEY || lat === null || lng === null || !mapEl.current) return;
    const at = { lat, lng };
    if (mapRef.current) {
      mapRef.current.marker.position = at;
      mapRef.current.map.panTo(at);
      return;
    }
    let live = true;
    void mountMap(mapEl.current, at, 17).then((m) => {
      if (!live) return;
      if (!m) return setMapFailed(true);
      mapRef.current = m;
      const moveTo = async (p: LatLng) => {
        m.marker.position = p;
        setBusy("resolving");
        const found = await addressAt(p);
        setBusy(null);
        // A pin dropped where there's no street address still moves the coordinates.
        apply(found ?? p);
      };
      m.marker.addListener("dragend", () => { const p = positionOf(m.marker); if (p) void moveTo(p); });
      m.map.addListener("click", (e) => { if (e.latLng) void moveTo({ lat: e.latLng.lat(), lng: e.latLng.lng() }); });
    });
    return () => { live = false; };
  }, [lat, lng]);

  const pick = async (s: Suggestion) => {
    setOpen(false); setSuggestions([]); setQ(""); setProblem("");
    setBusy("resolving");
    try {
      const p = await search.current?.place(s);
      if (p) apply(p);
      else setProblem("Google couldn't place that address on the map. Try another, or use your current location.");
    } catch {
      setProblem("Couldn't look up that address. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const takeHere = async () => {
    setProblem("");
    setBusy("locating");
    try {
      const p = await here();
      const found = await addressAt(p);
      apply(found ?? p);
    } catch (e) {
      setProblem(PROBLEM[(typeof e === "string" ? e : "unavailable") as Problem] ?? PROBLEM.unavailable);
    } finally {
      setBusy(null);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); void pick(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  const set = (k: keyof PlaceValue) => (e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value; onChange((cur) => ({ ...cur, [k]: v })); };
  const listId = `${idPrefix}-suggestions`;
  const showList = open && term.length >= 3 && suggestions.length > 0;

  return (
    <div className="grid gap-3">
      {MAPS_KEY && (
        <div className="relative">
          <label htmlFor={`${idPrefix}-search`} className={label}>Find the address</label>
          <div className="relative">
            <LuSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input id={`${idPrefix}-search`} className={`${input} pl-10 pr-9`} value={q} autoComplete="off" placeholder="Start typing the gym's address or name"
              role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey} />
            {q && <button type="button" aria-label="Clear search" onClick={() => { setQ(""); setSuggestions([]); }} className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-background"><LuX size={14} /></button>}
          </div>
          {showList && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
              {suggestions.map((s, i) => (
                <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void pick(s)}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left ${i === active ? "bg-background" : "hover:bg-background"}`}>
                    <LuMapPin size={16} className="mt-0.5 shrink-0 text-muted" />
                    <span className="min-w-0"><b className="block truncate font-semibold">{s.main}</b>{s.secondary && <span className="block truncate text-[13px] text-muted">{s.secondary}</span>}</span>
                  </button>
                </li>
              ))}
              <li aria-hidden className="px-3 pb-1 pt-1.5 text-right text-[11px] text-muted">powered by Google</li>
            </ul>
          )}
          {searchFailed && <p className={`${errorText} text-[13px]`}>Address search isn&apos;t available right now. Use your current location or type the address below.</p>}
        </div>
      )}

      <button type="button" onClick={() => void takeHere()} disabled={!!busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary-50 px-4 py-2.5 font-semibold text-primary hover:bg-primary/10 disabled:opacity-60">
        {busy === "locating" ? <LuLoaderCircle size={17} className="animate-spin" /> : <LuLocateFixed size={17} />}
        {busy === "locating" ? "Finding your location…" : "Use my current location"}
      </button>
      {problem && <p role="alert" className={`${errorText} text-[13px]`}>{problem}</p>}

      {MAPS_KEY && point && !mapFailed && (
        <div>
          <div ref={mapEl} className="h-56 w-full overflow-hidden rounded-xl border border-line bg-background" aria-label="Map — drag the pin to the gym's entrance" />
          <p className={`${hint} flex items-center gap-1.5`}>
            {busy === "resolving" ? <><LuLoaderCircle size={12} className="animate-spin" />Updating the address…</> : "Drag the pin, or tap the map, to put it on the entrance."}
          </p>
        </div>
      )}
      {!MAPS_KEY && point && <p className={hint}>Location saved: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>}

      <div>
        <label htmlFor={`${idPrefix}-address`} className={label}>Street address</label>
        <input id={`${idPrefix}-address`} className={input} value={value.address} onChange={set("address")} autoComplete="street-address" placeholder="12 High Street" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-city`} className={label}>City</label>
          <input id={`${idPrefix}-city`} className={input} value={value.city} onChange={set("city")} autoComplete="address-level2" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-postcode`} className={label}>Postcode</label>
          <input id={`${idPrefix}-postcode`} className={input} value={value.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-country`} className={label}>Country</label>
        <input id={`${idPrefix}-country`} className={input} value={value.country} onChange={set("country")} autoComplete="country-name" />
      </div>
      {error && <p role="alert" className={`${errorText} text-[13px]`}>{error}</p>}
    </div>
  );
}
