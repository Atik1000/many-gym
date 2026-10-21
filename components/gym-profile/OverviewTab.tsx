"use client";

import { useRef, useState } from "react";
import { LuCamera as Camera, LuFileText, LuLoaderCircle as Loader2, LuUsers } from "react-icons/lu";
import { uploadFile, useGym } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { GENDER_REQUIRED, GYM_TYPES, type GymProfile } from "@/lib/gym-data";
import { card, errorText, hint, input, label } from "@/lib/ui";
import SaveBar from "./SaveBar";
import SectionCard, { Field } from "./SectionCard";
import TabSkeleton from "./Skeleton";

type Overview = GymProfile["overview"];
const MIN_DESC = 120;

function Panel({ icon: Icon, title, sub, className = "", children }: { icon?: React.ComponentType<{ size?: number }>; title?: string; sub?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} p-5 ${className}`}>
      {title && Icon && (
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary"><Icon size={18} /></span>
          <div><h4 className="font-bold leading-tight">{title}</h4><p className="text-[13px] text-muted">{sub}</p></div>
        </div>
      )}
      {children}
    </section>
  );
}

/** Cover photo with the profile picture overlapping it; both are clickable only while editing. */
function Appearance({ o, editing, onPick }: { o: Overview; editing: boolean; onPick: (k: "profileUrl" | "coverUrl", f: File) => Promise<void> }) {
  const coverRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "profileUrl" | "coverUrl">("");
  const choose = (k: "profileUrl" | "coverUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(k);
    try { await onPick(k, f); } finally { setBusy(""); }
  };
  const accept = "image/jpeg,image/png,image/webp";
  return (
    <Panel>
      <div className="relative h-[170px] overflow-hidden rounded-xl bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.coverUrl && <img src={o.coverUrl} alt="Cover photo" className="h-full w-full object-cover" />}
        {editing && (
          <button type="button" onClick={() => coverRef.current?.click()} disabled={busy === "coverUrl"}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-black/75">
            {busy === "coverUrl" ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}Change cover
          </button>
        )}
        <input ref={coverRef} type="file" hidden accept={accept} onChange={choose("coverUrl")} />
      </div>
      <div className="-mt-12 flex items-end gap-4 px-4">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {o.profileUrl ? <img src={o.profileUrl} alt="Profile picture" className="h-24 w-24 rounded-full border-4 border-surface object-cover" /> : <span className="grid h-24 w-24 place-items-center rounded-full border-4 border-surface bg-background text-muted"><Camera size={22} /></span>}
          {editing && (
            <button type="button" aria-label="Change profile picture" onClick={() => profileRef.current?.click()} disabled={busy === "profileUrl"}
              className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-muted shadow hover:text-primary">
              {busy === "profileUrl" ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
          )}
          <input ref={profileRef} type="file" hidden accept={accept} onChange={choose("profileUrl")} />
        </div>
        <b className="pb-2 text-lg">{o.name}</b>
      </div>
    </Panel>
  );
}

function Cards({ f, editing, errors, set, onPick }: {
  f: Overview; editing: boolean; errors: Record<string, string>;
  set: <K extends keyof Overview>(k: K, v: Overview[K]) => void; onPick: (k: "profileUrl" | "coverUrl", file: File) => Promise<void>;
}) {
  const typeLabel = (v: string) => GYM_TYPES.find((t) => t.value === v)?.label;
  const primary = GYM_TYPES.find((t) => t.value === f.primaryType);
  const descLen = f.description.trim().length;
  return (
    <div className="grid gap-5">
      <Appearance o={f} editing={editing} onPick={onPick} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel icon={LuFileText} title="Gym details" sub="Tell people about your gym and what makes it special.">
          {editing ? (
            <div className="grid gap-4">
              <div>
                <label htmlFor="name" className={label}>Gym name <span className="text-bad">*</span></label>
                <input id="name" className={input} value={f.name} onChange={(e) => set("name", e.target.value)} />
                {errors.name && <p className={errorText}>{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="desc" className={label}>Short description</label>
                <textarea id="desc" rows={4} className={`${input} resize-y`} value={f.description} onChange={(e) => set("description", e.target.value)} />
                <div className="flex justify-between gap-3">
                  {errors.description ? <p className={errorText}>{errors.description}</p> : <p className={hint}>Minimum {MIN_DESC} characters to give members a clear idea about your gym.</p>}
                  <p className={`mt-1 whitespace-nowrap text-xs ${descLen < MIN_DESC ? "text-warn" : "text-muted"}`}>{descLen} / {MIN_DESC} min</p>
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
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Field label="Gym name">{f.name}</Field></div>
              <div className="md:col-span-2"><Field label="Short description"><span className="whitespace-pre-line font-normal">{f.description}</span></Field></div>
              <Field label="Primary gym type">{typeLabel(f.primaryType)}</Field>
              <Field label="Secondary gym type">{typeLabel(f.secondaryType)}</Field>
            </dl>
          )}
        </Panel>

        <Panel icon={LuUsers} title="Member access" sub="Set who can join and any age requirements.">
          {editing ? (
            <div className="grid gap-4">
              <div>
                <label htmlFor="gr" className={label}>Who can join?</label>
                <select id="gr" className={input} value={f.gender} onChange={(e) => set("gender", e.target.value)}>
                  {GENDER_REQUIRED.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <p className={hint}>Controls who can sign up and become a member of your gym.</p>
              </div>
              <div>
                <label htmlFor="age" className={label}>Minimum age</label>
                <div className="relative">
                  <input id="age" type="number" min={1} max={99} className={`${input} pr-16`} value={f.minAge} onChange={(e) => set("minAge", e.target.value)} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">years</span>
                </div>
                <p className={hint}>Members must be this age or older to join.</p>
                {errors.minAge && <p className={errorText}>{errors.minAge}</p>}
              </div>
            </div>
          ) : (
            <dl className="grid gap-4">
              <Field label="Who can join?">{GENDER_REQUIRED.find((g) => g.value === f.gender)?.label}</Field>
              <Field label="Minimum age">{f.minAge && `${f.minAge} years`}</Field>
            </dl>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Form({ initial, onSave, onDiscard }: { initial: Overview; onSave: (o: Overview) => void; onDiscard: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Overview>(k: K, v: Overview[K]) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  const pick = async (key: "profileUrl" | "coverUrl", file: File) => {
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
    onSave(f); toast("Overview saved");
  };

  return (
    <div>
      <Cards f={f} editing errors={errors} set={set} onPick={pick} />
      <div className="sticky bottom-0 -mx-6 mt-6 bg-surface px-6 pb-4"><SaveBar dirty={dirty} alwaysDiscard onSave={save} onReset={onDiscard} /></div>
    </div>
  );
}

export default function OverviewTab() {
  const [gym, setGym, ready] = useGym();
  const [editing, setEditing] = useState(false);
  if (!ready || !gym) return <TabSkeleton />;
  return (
    <SectionCard title="Overview" editing={editing} onToggle={() => setEditing((v) => !v)}>
      {editing
        ? <Form initial={gym.overview} onSave={(overview) => { setGym((g) => ({ ...g, overview })); setEditing(false); }} onDiscard={() => setEditing(false)} />
        : <Cards f={gym.overview} editing={false} errors={{}} set={() => {}} onPick={async () => {}} />}
    </SectionCard>
  );
}
