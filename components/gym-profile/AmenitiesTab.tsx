"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useGym } from "@/lib/api";
import { AMENITY_GROUPS } from "@/lib/gym-data";
import { amenityIcon } from "@/lib/icons";
import TabSkeleton from "./Skeleton";
import SaveBar from "./SaveBar";

type Sel = { free: string[]; paid: string[] };

function Collection({ title, desc, selected, disabled, onToggle }: {
  title: string; desc: string; selected: string[]; disabled: string[]; onToggle: (a: string) => void;
}) {
  return (
    <section>
      <h3 className="text-base font-bold">{title} <span className="ml-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">{selected.length} selected</span></h3>
      <p className="mb-4 mt-0.5 text-muted">{desc}</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {AMENITY_GROUPS.map(({ group, items }) => (
          <fieldset key={group}>
            <legend className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{group}</legend>
            <div className="grid gap-1.5">
              {items.map((a) => {
                const off = disabled.includes(a);
                return (
                  <label key={a} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${off ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-background"}`}>
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected.includes(a)} disabled={off} onChange={() => onToggle(a)} />
                    {(() => { const Icon = amenityIcon(a); return <Icon size={17} className="shrink-0 text-muted" />; })()}
                    {a}
                    {off && <span className="ml-auto text-xs text-muted">already free</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

function Form({ initial, onSave }: { initial: Sel; onSave: (s: Sel) => void }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [sel, setSel] = useState(initial);
  const dirty = JSON.stringify(sel) !== JSON.stringify(saved);
  const flip = (list: string[], a: string) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]);

  return (
    <div className="grid gap-8">
      <Collection
        title="Free amenities" desc="Included for every member."
        selected={sel.free} disabled={[]}
        // marking something free removes it from paid, so an amenity is never in both lists
        onToggle={(a) => setSel((s) => ({ free: flip(s.free, a), paid: s.paid.filter((x) => x !== a) }))}
      />
      <hr className="border-line" />
      <Collection
        title="Paid amenities" desc="Available as an extra cost. Anything already marked free is unavailable here."
        selected={sel.paid} disabled={sel.free}
        onToggle={(a) => setSel((s) => ({ ...s, paid: flip(s.paid, a) }))}
      />
      <SaveBar dirty={dirty} onSave={() => { onSave(sel); setSaved(sel); toast("Amenities saved"); }} onReset={() => setSel(saved)} />
    </div>
  );
}

export default function AmenitiesTab() {
  const [gym, setGym, ready] = useGym();
  if (!ready || !gym) return <TabSkeleton />;
  return <Form initial={gym.amenities} onSave={(amenities) => setGym((g) => ({ ...g, amenities }))} />;
}
