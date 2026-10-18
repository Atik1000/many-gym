"use client";

import { useRef, useState } from "react";
import { LuCamera as Camera, LuLoaderCircle as Loader2 } from "react-icons/lu";
import { uploadFile, useGym } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { GENDER_REQUIRED, GYM_TYPES, type GymProfile } from "@/lib/gym-data";
import { errorText, hint, input, label } from "@/lib/ui";
import SaveBar from "./SaveBar";
import TabSkeleton from "./Skeleton";

type Overview = GymProfile["overview"];
const MIN_DESC = 120;

function ImagePicker({ title, note, round, url, onPick }: { title: string; note: string; round?: boolean; url: string; onPick: (f: File) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <span className={label}>{title}</span>
      <button
        type="button" onClick={() => ref.current?.click()} disabled={busy}
        className={`group relative grid place-items-center overflow-hidden border-[1.5px] border-dashed border-[#c6c9dc] bg-background text-muted hover:border-primary ${round ? "h-[120px] w-[120px] rounded-full" : "h-[120px] w-full rounded-xl"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-xs"><Camera size={20} />Upload</span>}
        {(url || busy) && <span className={`absolute inset-0 place-items-center bg-black/45 text-white ${busy ? "grid" : "hidden group-hover:grid"}`}>{busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}</span>}
      </button>
      <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setBusy(true); try { await onPick(f); } finally { setBusy(false); } } }} />
      <p className={hint}>{note}</p>
    </div>
  );
}

function Form({ initial, onSave }: { initial: Overview; onSave: (o: Overview) => void }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Overview>(k: K, v: Overview[K]) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const primary = GYM_TYPES.find((t) => t.value === f.primaryType);

  const pick = (key: "profileUrl" | "coverUrl") => async (file: File) => {
    try { set(key, (await uploadFile(file)).url); } catch (e) { toast((e as Error).message); }
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Gym name is required";
    if (f.description.trim().length < MIN_DESC) e.description = `Description needs at least ${MIN_DESC} characters`;
    if (!f.primaryType) e.primaryType = "Choose a primary gym type";
    const age = Number(f.minAge);
    if (!Number.isInteger(age) || age < 1 || age > 99) e.minAge = "Enter a whole number from 1 to 99";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(f); setSaved(f); toast("Overview saved");
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[140px_minmax(0,1fr)]">
        <ImagePicker title="Profile picture" note="1 image, square works best" round url={f.profileUrl} onPick={pick("profileUrl")} />
        <ImagePicker title="Cover photo" note="1 image, wide (e.g. 1600×400)" url={f.coverUrl} onPick={pick("coverUrl")} />
      </div>

      <div>
        <label htmlFor="name" className={label}>Gym name <span className="text-bad">*</span></label>
        <input id="name" className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
        {errors.name && <p className={errorText}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="desc" className={label}>Short description</label>
        <textarea id="desc" rows={4} className={`${input} resize-y`} value={f.description} onChange={(e) => set("description", e.target.value)} />
        <div className="flex justify-between">
          {errors.description ? <p className={errorText}>{errors.description}</p> : <span />}
          <p className={`mt-1 text-xs ${f.description.trim().length < MIN_DESC ? "text-warn" : "text-muted"}`}>{f.description.trim().length} / {MIN_DESC} min</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="pt" className={label}>Primary gym type <span className="text-bad">*</span></label>
          <select id="pt" className={input} value={f.primaryType} onChange={(e) => set("primaryType", e.target.value)}>
            {GYM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {primary && <p className={hint}>{primary.info}</p>}
          {errors.primaryType && <p className={errorText}>{errors.primaryType}</p>}
        </div>
        <div>
          <label htmlFor="st" className={label}>Secondary gym type</label>
          <select id="st" className={input} value={f.secondaryType} onChange={(e) => set("secondaryType", e.target.value)}>
            <option value="">None</option>
            {GYM_TYPES.map((t) => <option key={t.value} value={t.value} disabled={t.value === f.primaryType}>{t.label}</option>)}
          </select>
          <p className={hint}>Same list as primary; the primary type can&apos;t be repeated.</p>
        </div>
        <div>
          <label htmlFor="gr" className={label}>Who can join?</label>
          <select id="gr" className={input} value={f.gender} onChange={(e) => set("gender", e.target.value)}>
            {GENDER_REQUIRED.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="age" className={label}>Minimum age</label>
          <input id="age" type="number" min={1} max={99} className={input} value={f.minAge} onChange={(e) => set("minAge", e.target.value)} />
          {errors.minAge && <p className={errorText}>{errors.minAge}</p>}
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={save} onReset={() => { setF(saved); setErrors({}); }} />
    </div>
  );
}

export default function OverviewTab() {
  const [gym, setGym, ready] = useGym();
  if (!ready || !gym) return <TabSkeleton />;
  return <Form initial={gym.overview} onSave={(overview) => setGym((g) => ({ ...g, overview }))} />;
}
