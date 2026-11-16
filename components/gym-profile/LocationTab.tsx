"use client";

/**
 * The gym's address and map coordinates — `GET`/`PATCH /gyms/profile/location/`.
 *
 * `location.pin` holds real coordinates (`x` = longitude, `y` = latitude), which is what the adapter loads and
 * sends. They are what "Find Gyms → Near me" measures distance from, so they are entered as numbers (or taken
 * from the device) rather than dragged on a picture: without a maps SDK a drawn pin can't yield a coordinate.
 */
import { useState } from "react";
import { LuExternalLink, LuLocateFixed } from "react-icons/lu";
import { useGym } from "@/lib/api";
import TabSkeleton from "./Skeleton";
import type { GymProfile } from "@/lib/gym-data";
import { useToast } from "@/components/ui/Toast";
import { btnGhost, errorText, hint, input, label } from "@/lib/ui";
import SaveBar from "./SaveBar";
import SectionCard, { Field } from "./SectionCard";

type AddrKey = "address" | "city" | "postcode" | "country";
type Loc = GymProfile["location"];

const LIMITS: Partial<Record<AddrKey, number>> = { city: 100, country: 100, postcode: 30 };
/** The API keeps 8 decimal places; sending more is a validation error. */
const round8 = (n: number) => Math.round(n * 1e8) / 1e8;
/** A gym that has never set a location reports 0,0 — treat that as "not set", not as a point in the Atlantic. */
const isSet = (pin: Loc["pin"] | null | undefined) => !!pin && !(pin.x === 0 && pin.y === 0);
const mapsLink = (lat: number, lon: number) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;

/** Reads a coordinate field: a number within ±`max`, or an error message. */
function coordinate(raw: string, name: string, max: number): { value: number } | { error: string } {
  const text = raw.trim();
  if (!text) return { error: `${name} is required` };
  const n = Number(text);
  if (!Number.isFinite(n)) return { error: `${name} must be a number` };
  if (n < -max || n > max) return { error: `${name} must be between -${max} and ${max}` };
  return { value: round8(n) };
}

function Form({ initial, onSave, onDiscard }: { initial: Loc; onSave: (l: Loc) => void; onDiscard: () => void }) {
  const toast = useToast();
  const start = { address: initial.address, city: initial.city, postcode: initial.postcode, country: initial.country };
  const startCoords = isSet(initial.pin) ? { lat: String(initial.pin.y), lon: String(initial.pin.x) } : { lat: "", lon: "" };
  const [addr, setAddr] = useState(start);
  const [coords, setCoords] = useState(startCoords);
  const [saved, setSaved] = useState({ addr: start, coords: startCoords });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);
  const dirty = JSON.stringify({ addr, coords }) !== JSON.stringify(saved);

  const useDevice = () => {
    if (!("geolocation" in navigator) || !window.isSecureContext) return toast("This browser can't share a location here. Enter the coordinates instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: String(round8(p.coords.latitude)), lon: String(round8(p.coords.longitude)) }); setErrors((e) => ({ ...e, lat: "", lon: "" })); setLocating(false); },
      (e) => { setLocating(false); toast(e.code === e.PERMISSION_DENIED ? "Location access was declined. Enter the coordinates instead." : "Couldn't get this device's location. Enter the coordinates instead."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!addr.address.trim()) e.address = "Address is required";
    for (const k of ["city", "country", "postcode"] as const) {
      if (addr[k].trim().length > LIMITS[k]!) e[k] = `Use ${LIMITS[k]} characters or fewer`;
    }
    const lat = coordinate(coords.lat, "Latitude", 90);
    const lon = coordinate(coords.lon, "Longitude", 180);
    if ("error" in lat) e.lat = lat.error;
    if ("error" in lon) e.lon = lon.error;
    setErrors(e);
    if (Object.keys(e).length || "error" in lat || "error" in lon) return;
    const clean = { address: addr.address.trim(), city: addr.city.trim(), postcode: addr.postcode.trim(), country: addr.country.trim() };
    const shown = { lat: String(lat.value), lon: String(lon.value) };
    setAddr(clean); setCoords(shown); setSaved({ addr: clean, coords: shown });
    onSave({ ...clean, pin: { x: lon.value, y: lat.value } });
    toast("Location saved");
  };

  const field = (k: AddrKey, title: string, req = false) => (
    <div>
      <label htmlFor={k} className={label}>{title} {req && <span className="text-bad">*</span>}</label>
      <input id={k} className={input} maxLength={LIMITS[k]} value={addr[k]} aria-invalid={!!errors[k]} onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} />
      {errors[k] && <p className={errorText}>{errors[k]}</p>}
    </div>
  );
  const coord = (k: "lat" | "lon", title: string, example: string) => (
    <div>
      <label htmlFor={k} className={label}>{title} <span className="text-bad">*</span></label>
      <input id={k} className={input} inputMode="decimal" placeholder={example} value={coords[k]} aria-invalid={!!errors[k]} onChange={(e) => setCoords((c) => ({ ...c, [k]: e.target.value }))} />
      {errors[k] && <p className={errorText}>{errors[k]}</p>}
    </div>
  );
  const lat = Number(coords.lat); const lon = Number(coords.lon);
  const previewable = coords.lat.trim() !== "" && coords.lon.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">{field("address", "Address", true)}</div>
        {field("city", "City")}
        {field("postcode", "Postcode")}
        {field("country", "Country")}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Map position</span>
          <button type="button" className={btnGhost} disabled={locating} onClick={useDevice}><LuLocateFixed size={17} />{locating ? "Getting location…" : "Use this device's location"}</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {coord("lat", "Latitude", "e.g. 23.7465")}
          {coord("lon", "Longitude", "e.g. 90.3760")}
        </div>
        <p className={hint}>
          The gym entrance&apos;s coordinates — people searching &ldquo;near me&rdquo; are matched by distance from this point. Only use the device&apos;s location while you are at the gym.
          {previewable && <> <a href={mapsLink(lat, lon)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Check this point on a map</a>.</>}
        </p>
      </div>
      <SaveBar dirty={dirty} alwaysDiscard onSave={save} onReset={onDiscard} />
    </div>
  );
}

function View({ l }: { l: Loc }) {
  const set = isSet(l.pin);
  return (
    <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2"><Field label="Address">{l.address}</Field></div>
      <Field label="City">{l.city}</Field>
      <Field label="Postcode">{l.postcode}</Field>
      <Field label="Country">{l.country}</Field>
      <Field label="Map position">
        {set ? (
          <a href={mapsLink(l.pin.y, l.pin.x)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            {l.pin.y}, {l.pin.x}<LuExternalLink size={15} /><span className="sr-only">Open in maps (new tab)</span>
          </a>
        ) : "Not set — the gym won't appear in “near me” searches"}
      </Field>
    </dl>
  );
}

export default function LocationTab() {
  const [gym, setGym, ready] = useGym();
  const [editing, setEditing] = useState(false);
  if (!ready || !gym) return <TabSkeleton />;
  return (
    <SectionCard title="Location" editing={editing} onToggle={() => setEditing((v) => !v)}>
      {editing
        ? <Form initial={gym.location} onSave={(location) => { setGym((g) => ({ ...g, location })); setEditing(false); }} onDiscard={() => setEditing(false)} />
        : <View l={gym.location} />}
    </SectionCard>
  );
}
