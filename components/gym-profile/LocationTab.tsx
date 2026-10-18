"use client";

import { useRef, useState } from "react";
import { LuMapPin as MapPin, LuSearch as Search } from "react-icons/lu";
import { useGym } from "@/lib/api";
import TabSkeleton from "./Skeleton";
import type { GymProfile } from "@/lib/gym-data";
import { useToast } from "@/components/ui/Toast";
import { errorText, hint, input, label } from "@/lib/ui";
import SaveBar from "./SaveBar";

// Stand-in for a places-search API (Google Places / Mapbox) — swap `PLACES` for a real fetch later.
const PLACES = [
  { name: "Ironworks Gym", address: "14 Canal Street", city: "Manchester", postcode: "M1 3HE", country: "United Kingdom", x: 52, y: 46 },
  { name: "Ironworks Gym (Northern Quarter)", address: "88 Oldham Street", city: "Manchester", postcode: "M4 1LE", country: "United Kingdom", x: 40, y: 30 },
];
type AddrKey = "address" | "city" | "postcode" | "country";

type Loc = GymProfile["location"];

function Form({ initial, onSave }: { initial: Loc; onSave: (l: Loc) => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<typeof PLACES>([]);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(initial.pin);
  const [addr, setAddr] = useState({ address: initial.address, city: initial.city, postcode: initial.postcode, country: initial.country });
  const [saved, setSaved] = useState({ addr, pin: initial.pin as { x: number; y: number } | null });
  const [error, setError] = useState("");
  const map = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dirty = JSON.stringify({ addr, pin }) !== JSON.stringify(saved);

  const search = (v: string) => {
    setQ(v);
    setResults(v.trim().length < 2 ? [] : PLACES.filter((p) => (p.name + p.address).toLowerCase().includes(v.toLowerCase().trim()) || "ironworks".includes(v.toLowerCase().trim())));
  };
  const choose = (p: (typeof PLACES)[number]) => {
    setPin({ x: p.x, y: p.y });
    setAddr({ address: p.address, city: p.city, postcode: p.postcode, country: p.country }); // auto-fill; still editable
    setResults([]); setQ(p.name);
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current || !map.current) return;
    const r = map.current.getBoundingClientRect();
    setPin({ x: Math.min(98, Math.max(2, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(98, Math.max(2, ((e.clientY - r.top) / r.height) * 100)) });
  };
  const save = () => {
    if (!pin) return setError("Place the pin on your gym's entrance");
    if (!addr.address.trim() || !addr.city.trim() || !addr.country.trim()) return setError("Address, city and country are required");
    setError(""); setSaved({ addr, pin }); onSave({ ...addr, pin }); toast("Location saved");
  };
  const field = (k: AddrKey, title: string, req = true) => (
    <div>
      <label htmlFor={k} className={label}>{title} {req && <span className="text-bad">*</span>}</label>
      <input id={k} className={input} value={addr[k]} onChange={(e) => setAddr((a) => ({ ...a, [k]: e.target.value }))} />
    </div>
  );

  return (
    <div className="grid gap-5">
      <div className="relative">
        <label htmlFor="q" className={label}>Search for a gym name or address</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id="q" className={`${input} pl-10`} placeholder="e.g. Ironworks Gym, Canal Street" value={q} onChange={(e) => search(e.target.value)} />
        </div>
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[10px] border border-line bg-surface shadow-xl">
            {results.map((p) => (
              <li key={p.name}>
                <button className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-background" onClick={() => choose(p)}>
                  <MapPin size={18} className="mt-0.5 text-muted" />
                  <span><b className="block">{p.name}</b><span className="text-muted">{p.address}, {p.city} {p.postcode}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <span className={label}>Pin location</span>
        <div
          ref={map} onPointerMove={move} onPointerUp={() => (dragging.current = false)} onPointerLeave={() => (dragging.current = false)}
          onClick={(e) => { if (!map.current) return; const r = map.current.getBoundingClientRect(); setPin({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
          className="relative h-[320px] cursor-crosshair touch-none overflow-hidden rounded-xl border border-line bg-[#e9eef5] bg-[linear-gradient(#fff_2px,transparent_2px),linear-gradient(90deg,#fff_2px,transparent_2px)] bg-[length:64px_64px]"
        >
          <div className="absolute left-[8%] top-[55%] h-[10px] w-[90%] -rotate-6 bg-[#cfe0f5]" />
          <div className="absolute left-[60%] top-[8%] h-24 w-32 rounded-xl bg-[#d7ecd6]" />
          {pin && (
            <button
              aria-label="Gym entrance pin"
              onPointerDown={(e) => { e.stopPropagation(); dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onClick={(e) => e.stopPropagation()}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-full cursor-grab text-primary drop-shadow-lg active:cursor-grabbing"
            >
              <MapPin size={44} fill="currentColor" className="text-primary" stroke="white" />
            </button>
          )}
          <span className="absolute bottom-2 right-3 rounded bg-white/80 px-2 py-0.5 text-[11px] text-muted">Map preview — real map connects later</span>
        </div>
        <p className={hint}>Click or drag the pin to the gym&apos;s entrance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">{field("address", "Address")}<p className={hint}>Filled automatically from the pin, but you can edit it.</p></div>
        {field("city", "City")}
        {field("postcode", "Postcode", false)}
        {field("country", "Country")}
      </div>
      {error && <p className={errorText}>{error}</p>}
      <SaveBar dirty={dirty} onSave={save} onReset={() => { setAddr(saved.addr); setPin(saved.pin); setError(""); }} />
    </div>
  );
}

export default function LocationTab() {
  const [gym, setGym, ready] = useGym();
  if (!ready || !gym) return <TabSkeleton />;
  return <Form initial={gym.location} onSave={(location) => setGym((g) => ({ ...g, location }))} />;
}
