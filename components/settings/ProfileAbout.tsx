"use client";

/**
 * Settings → Profile: the "About" page other people see — `GET/PATCH /users/profile/about/`, with education
 * and social links on their own per-record routes (lib/api/profile.ts).
 *
 * Each section saves on its own. Education and social links save per row, because each row is its own
 * request and a half-finished one shouldn't block the rest.
 *
 * Contact info is shown here but not edited here: the email can never change, and the phone number is the
 * same fact Login & Security already edits (it is also the two-factor SMS fallback), so there is one editor
 * for it rather than two that could disagree.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LuExternalLink, LuGraduationCap, LuLink2, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { MotionButton } from "@/components/ui/Motion";
import { ConfirmModal, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import * as profile from "@/lib/api/profile";
import { fmtDate, today } from "@/lib/dates";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

type Errors = Record<string, string>;

/**
 * Field errors for a section. A nested PATCH can report them nested (`{personal_details: {gender: […]}}`) or
 * flat, so one level of nesting is flattened onto the field names the forms use.
 */
function errorsOf(e: unknown, fallback: string): Errors {
  if (!(e instanceof ApiError)) return { form: fallback };
  const out: Errors = {};
  const take = (k: string, v: unknown) => {
    if (Array.isArray(v) && v.length) out[k] = String(v[0]);
    else if (typeof v === "string") out[k] = v;
    else if (v && typeof v === "object") for (const [k2, v2] of Object.entries(v)) take(k2, v2);
  };
  for (const [k, v] of Object.entries(e.details ?? {})) take(k, v);
  if (!Object.keys(out).length || out.non_field_errors) out.form = out.non_field_errors ?? e.message;
  return out;
}

const Counter = ({ value, max }: { value: string; max: number }) => (
  <span className={`ml-auto text-xs ${value.length > max ? "text-bad" : "text-muted"}`}>{value.length}/{max}</span>
);

// ================================================================ personal details

function Personal({ about, onSaved }: { about: profile.About; onSaved: (a: profile.About) => void }) {
  const toast = useToast();
  const p = about.personal_details;
  const [address, setAddress] = useState(p.current_address ?? "");
  const [town, setTown] = useState(p.home_town ?? "");
  const [dob, setDob] = useState(p.date_of_birth ?? "");
  const [gender, setGender] = useState<string>(p.gender ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const dirty = address !== (p.current_address ?? "") || town !== (p.home_town ?? "") || dob !== (p.date_of_birth ?? "") || gender !== (p.gender ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dob && dob > today()) return setErrors({ date_of_birth: "Date of birth can't be in the future" });
    setBusy(true); setErrors({});
    try {
      onSaved(await profile.patchMyAbout({
        personal_details: { current_address: address.trim() || null, home_town: town.trim() || null, date_of_birth: dob || null, gender: (gender as profile.Gender) || null },
      }));
      toast("Personal details saved");
    } catch (err) {
      setErrors(errorsOf(err, "Couldn't save your personal details."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-6`}>
      <h2 className="text-lg font-bold">Personal details</h2>
      <p className={hint}>Shown on your profile&apos;s About section.</p>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pa-address" className={label}>Current address</label>
          <input id="pa-address" className={input} maxLength={profile.LIMITS.address} value={address} onChange={(e) => setAddress(e.target.value)} />
          {errors.current_address && <p className={errorText}>{errors.current_address}</p>}
        </div>
        <div>
          <label htmlFor="pa-town" className={label}>Home town</label>
          <input id="pa-town" className={input} maxLength={profile.LIMITS.homeTown} value={town} onChange={(e) => setTown(e.target.value)} />
          {errors.home_town && <p className={errorText}>{errors.home_town}</p>}
        </div>
        <div>
          <label htmlFor="pa-dob" className={label}>Date of birth</label>
          <input id="pa-dob" type="date" className={input} max={today()} value={dob} onChange={(e) => setDob(e.target.value)} />
          {errors.date_of_birth && <p className={errorText}>{errors.date_of_birth}</p>}
        </div>
        <div>
          <label htmlFor="pa-gender" className={label}>Gender</label>
          <Select id="pa-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Not set</option>
            {profile.GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          {errors.gender && <p className={errorText}>{errors.gender}</p>}
        </div>
        <div className="sm:col-span-2">
          {errors.form && <p role="alert" className={`${errorText} mb-2`}>{errors.form}</p>}
          <MotionButton className={btnPrimary} disabled={!dirty || busy}><LuSave size={17} />{busy ? "Saving…" : "Save personal details"}</MotionButton>
        </div>
      </form>
    </section>
  );
}

// ================================================================ details about you + hobbies

function Details({ about, onSaved }: { about: profile.About; onSaved: (a: profile.About) => void }) {
  const toast = useToast();
  const d = about.details_about_you;
  const [aboutYou, setAboutYou] = useState(d.about_you ?? "");
  const [quote, setQuote] = useState(d.favourite_quote ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const dirty = aboutYou !== (d.about_you ?? "") || quote !== (d.favourite_quote ?? "");
  const tooLong = aboutYou.length > profile.LIMITS.about || quote.length > profile.LIMITS.quote;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      onSaved(await profile.patchMyAbout({ details_about_you: { about_you: aboutYou.trim() || null, favourite_quote: quote.trim() || null } }));
      toast("About you saved");
    } catch (err) {
      setErrors(errorsOf(err, "Couldn't save that."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-6`}>
      <h2 className="text-lg font-bold">Details about you</h2>
      <form onSubmit={save} className="mt-4 grid gap-4">
        <div>
          <label htmlFor="pa-about" className={`${label} flex`}>About you<Counter value={aboutYou} max={profile.LIMITS.about} /></label>
          <textarea id="pa-about" rows={4} className={`${input} h-auto resize-y py-2.5`} value={aboutYou} onChange={(e) => setAboutYou(e.target.value)} />
          {errors.about_you && <p className={errorText}>{errors.about_you}</p>}
        </div>
        <div>
          <label htmlFor="pa-quote" className={`${label} flex`}>Favourite quote<Counter value={quote} max={profile.LIMITS.quote} /></label>
          <textarea id="pa-quote" rows={2} className={`${input} h-auto resize-y py-2.5`} value={quote} onChange={(e) => setQuote(e.target.value)} />
          {errors.favourite_quote && <p className={errorText}>{errors.favourite_quote}</p>}
        </div>
        <div>
          {errors.form && <p role="alert" className={`${errorText} mb-2`}>{errors.form}</p>}
          <MotionButton className={btnPrimary} disabled={!dirty || tooLong || busy}><LuSave size={17} />{busy ? "Saving…" : "Save about you"}</MotionButton>
        </div>
      </form>
    </section>
  );
}

function Hobbies({ about, onSaved }: { about: profile.About; onSaved: (a: profile.About) => void }) {
  const toast = useToast();
  const [list, setList] = useState(about.hobbies);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(list) !== JSON.stringify(about.hobbies);

  const add = () => {
    const h = draft.trim();
    if (!h) return;
    if (list.some((x) => x.toLowerCase() === h.toLowerCase())) return setError("That hobby is already on the list");
    setList([...list, h]); setDraft(""); setError("");
  };
  const save = async () => {
    // Don't lose a hobby that was typed but not added.
    const pending = draft.trim();
    const next = pending && !list.some((x) => x.toLowerCase() === pending.toLowerCase()) ? [...list, pending] : list;
    setBusy(true); setError("");
    try {
      const saved = await profile.patchMyAbout({ hobbies: next });
      setList(saved.hobbies); setDraft("");
      onSaved(saved);
      toast("Hobbies saved");
    } catch (err) {
      const e = errorsOf(err, "Couldn't save your hobbies.");
      setError(e.hobbies ?? e.form ?? Object.values(e)[0]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-6`}>
      <h2 className="text-lg font-bold">Hobbies</h2>
      {list.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {list.map((h) => (
            <li key={h} className="inline-flex items-center gap-1.5 rounded-full bg-background py-1 pl-3 pr-1.5 text-[14px]">
              {h}
              <button type="button" aria-label={`Remove ${h}`} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-line hover:text-bad" onClick={() => setList(list.filter((x) => x !== h))}><LuX size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input aria-label="Add a hobby" className={input} placeholder="Add a hobby…" maxLength={100} value={draft} onChange={(e) => { setDraft(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <MotionButton type="button" className={btnGhost} disabled={!draft.trim()} onClick={add}><LuPlus size={17} />Add</MotionButton>
      </div>
      {error && <p role="alert" className={errorText}>{error}</p>}
      <MotionButton type="button" className={`${btnPrimary} mt-4`} disabled={(!dirty && !draft.trim()) || busy} onClick={() => void save()}><LuSave size={17} />{busy ? "Saving…" : "Save hobbies"}</MotionButton>
    </section>
  );
}

// ================================================================ education

const blankEducation = (): profile.EducationInput => ({ university_name: "", subject: "", from_year: "", till_year: null, graduated: false });

function EducationForm({ initial, onCancel, onSubmit }: {
  initial: profile.EducationInput; onCancel: () => void; onSubmit: (v: profile.EducationInput) => Promise<Errors | null>;
}) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof profile.EducationInput>(k: K, val: profile.EducationInput[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!v.university_name.trim()) errs.university_name = "Enter the school or university";
    if (!v.subject.trim()) errs.subject = "Enter what you studied";
    if (!v.from_year) errs.from_year = "Choose a start date";
    if (v.from_year && v.till_year && v.till_year < v.from_year) errs.till_year = "The end date can't be before the start date";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const problem = await onSubmit({ ...v, university_name: v.university_name.trim(), subject: v.subject.trim(), till_year: v.till_year || null });
    setBusy(false);
    if (problem) setErrors(problem);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="ed-uni" className={label}>School or university <span className="text-bad">*</span></label>
        <input id="ed-uni" autoFocus className={input} maxLength={profile.LIMITS.university} value={v.university_name} onChange={(e) => set("university_name", e.target.value)} />
        {errors.university_name && <p className={errorText}>{errors.university_name}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="ed-subject" className={label}>Subject <span className="text-bad">*</span></label>
        <input id="ed-subject" className={input} maxLength={profile.LIMITS.subject} value={v.subject} onChange={(e) => set("subject", e.target.value)} />
        {errors.subject && <p className={errorText}>{errors.subject}</p>}
      </div>
      <div>
        <label htmlFor="ed-from" className={label}>From <span className="text-bad">*</span></label>
        <input id="ed-from" type="date" className={input} value={v.from_year} onChange={(e) => set("from_year", e.target.value)} />
        {errors.from_year && <p className={errorText}>{errors.from_year}</p>}
      </div>
      <div>
        <label htmlFor="ed-till" className={label}>Until</label>
        <input id="ed-till" type="date" className={input} min={v.from_year || undefined} value={v.till_year ?? ""} onChange={(e) => set("till_year", e.target.value || null)} />
        <p className={errors.till_year ? errorText : hint}>{errors.till_year ?? "Leave empty if you're still studying."}</p>
      </div>
      <label className="flex items-center gap-2.5 sm:col-span-2">
        <input type="checkbox" checked={v.graduated} onChange={(e) => set("graduated", e.target.checked)} />
        <span>I graduated</span>
      </label>
      {errors.graduated && <p className={`${errorText} sm:col-span-2`}>{errors.graduated}</p>}
      {errors.form && <p role="alert" className={`${errorText} sm:col-span-2`}>{errors.form}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <MotionButton className={btnPrimary} disabled={busy}><LuSave size={17} />{busy ? "Saving…" : "Save"}</MotionButton>
        <MotionButton type="button" className={btnGhost} onClick={onCancel} disabled={busy}><LuX size={17} />Cancel</MotionButton>
      </div>
    </form>
  );
}

function EducationSection({ items, onChange }: { items: profile.Education[]; onChange: (next: profile.Education[]) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<profile.Education | null>(null);
  const sorted = [...items].sort((a, b) => b.from_year.localeCompare(a.from_year));

  const submit = async (v: profile.EducationInput, id?: string): Promise<Errors | null> => {
    try {
      if (id) {
        const saved = await profile.updateEducation(id, v);
        onChange(items.map((x) => (x.id === id ? saved : x)));
      } else {
        onChange([...items, await profile.addEducation(v)]);
      }
      setEditing(null);
      toast(id ? "Education updated" : "Education added");
      return null;
    } catch (e) {
      return errorsOf(e, "Couldn't save that education record.");
    }
  };

  return (
    <section className={`${card} p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuGraduationCap size={19} />Education</h2>
        {editing !== "new" && <MotionButton className={btnGhost} onClick={() => setEditing("new")}><LuPlus size={17} />Add</MotionButton>}
      </div>
      <div className="mt-4 grid gap-3">
        {editing === "new" && <EducationForm initial={blankEducation()} onCancel={() => setEditing(null)} onSubmit={(v) => submit(v)} />}
        {sorted.length === 0 && editing !== "new" && <p className="text-muted">No education added yet.</p>}
        {sorted.map((ed) => editing === ed.id ? (
          <EducationForm key={ed.id} initial={{ university_name: ed.university_name, subject: ed.subject, from_year: ed.from_year, till_year: ed.till_year, graduated: ed.graduated }}
            onCancel={() => setEditing(null)} onSubmit={(v) => submit(v, ed.id)} />
        ) : (
          <div key={ed.id} className="flex items-start gap-3 rounded-xl bg-background px-4 py-3">
            <div className="min-w-0 flex-1">
              <b className="block">{ed.university_name}</b>
              <span className="block text-muted">{ed.subject}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                {fmtDate(ed.from_year)} – {ed.till_year ? fmtDate(ed.till_year) : "Present"}
                {ed.graduated && <Pill tone="green">Graduated</Pill>}
              </span>
            </div>
            <button aria-label={`Edit ${ed.university_name}`} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" onClick={() => setEditing(ed.id)}><LuPencil size={17} /></button>
            <button aria-label={`Delete ${ed.university_name}`} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-bad" onClick={() => setRemoving(ed)}><LuTrash2 size={17} /></button>
          </div>
        ))}
      </div>
      <ConfirmModal open={!!removing} title="Delete this education record?" onClose={() => setRemoving(null)}
        body={<><b>{removing?.university_name}</b> — {removing?.subject} will be removed from your profile.</>}
        onConfirm={async () => {
          const target = removing; setRemoving(null);
          if (!target) return;
          try {
            await profile.removeEducation(target.id);
            onChange(items.filter((x) => x.id !== target.id));
            toast("Education deleted");
          } catch (e) {
            // Already gone (deleted from another device) is the outcome that was asked for.
            if (e instanceof ApiError && e.status === 404) onChange(items.filter((x) => x.id !== target.id));
            else toast(e instanceof ApiError ? e.message : "Couldn't delete that record.");
          }
        }} />
    </section>
  );
}

// ================================================================ contact info + social links

function LinkForm({ initial, onCancel, onSubmit }: {
  initial: profile.SocialLinkInput; onCancel: () => void; onSubmit: (v: profile.SocialLinkInput) => Promise<Errors | null>;
}) {
  const [platform, setPlatform] = useState<profile.Platform>(initial.platform);
  const [link, setLink] = useState(initial.link);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // People paste "instagram.com/me"; treat a bare host as https rather than refusing it.
    const typed = link.trim();
    const url = profile.safeLink(/^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`);
    if (!typed) return setErrors({ link: "Enter the link" });
    if (!url || !new URL(url).hostname.includes(".")) return setErrors({ link: "Enter a full web address, like https://instagram.com/yourname" });
    if (url.length > profile.LIMITS.link) return setErrors({ link: `Keep the link under ${profile.LIMITS.link} characters` });
    setBusy(true); setErrors({});
    const problem = await onSubmit({ platform, link: url });
    setBusy(false);
    if (problem) setErrors(problem);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <label htmlFor="sl-platform" className={label}>Platform</label>
        <Select id="sl-platform" value={platform} onChange={(e) => setPlatform(e.target.value as profile.Platform)}>
          {profile.PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        {errors.platform && <p className={errorText}>{errors.platform}</p>}
      </div>
      <div>
        <label htmlFor="sl-link" className={label}>Link</label>
        <input id="sl-link" autoFocus type="url" inputMode="url" className={input} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
        {errors.link && <p className={errorText}>{errors.link}</p>}
      </div>
      {errors.form && <p role="alert" className={`${errorText} sm:col-span-2`}>{errors.form}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <MotionButton className={btnPrimary} disabled={busy}><LuSave size={17} />{busy ? "Saving…" : "Save"}</MotionButton>
        <MotionButton type="button" className={btnGhost} onClick={onCancel} disabled={busy}><LuX size={17} />Cancel</MotionButton>
      </div>
    </form>
  );
}

function Contact({ about, links, onLinks }: { about: profile.About; links: profile.SocialLink[]; onLinks: (next: profile.SocialLink[]) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<profile.SocialLink | null>(null);

  const submit = async (v: profile.SocialLinkInput, id?: string): Promise<Errors | null> => {
    try {
      if (id) {
        const saved = await profile.updateSocialLink(id, v);
        onLinks(links.map((x) => (x.id === id ? saved : x)));
      } else {
        onLinks([...links, await profile.addSocialLink(v)]);
      }
      setEditing(null);
      toast(id ? "Link updated" : "Link added");
      return null;
    } catch (e) {
      return errorsOf(e, "Couldn't save that link.");
    }
  };

  return (
    <section className={`${card} p-6`}>
      <h2 className="text-lg font-bold">Contact info</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><dt className="text-[13px] text-muted">Email</dt><dd className="break-all font-semibold">{about.contact_info.email || "—"}</dd></div>
        <div><dt className="text-[13px] text-muted">Phone</dt><dd className="font-semibold">{about.contact_info.phone_number || "Not set"}</dd></div>
      </dl>
      <p className={hint}>Your email can&apos;t be changed. Your phone number is managed in <Link href="/settings?tab=security" className="font-semibold text-primary">Login &amp; Security</Link>.</p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <h3 className="flex items-center gap-2 font-bold"><LuLink2 size={17} />Social links</h3>
        {editing !== "new" && <MotionButton className={btnGhost} onClick={() => setEditing("new")}><LuPlus size={17} />Add</MotionButton>}
      </div>
      <div className="mt-3 grid gap-3">
        {editing === "new" && <LinkForm initial={{ platform: "instagram", link: "" }} onCancel={() => setEditing(null)} onSubmit={(v) => submit(v)} />}
        {links.length === 0 && editing !== "new" && <p className="text-muted">No links added yet.</p>}
        {links.map((l) => editing === l.id ? (
          <LinkForm key={l.id} initial={{ platform: l.platform, link: l.link }} onCancel={() => setEditing(null)} onSubmit={(v) => submit(v, l.id)} />
        ) : (
          <div key={l.id} className="flex items-center gap-3 rounded-xl bg-background px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <b className="block">{profile.platformLabel(l.platform)}</b>
              {profile.safeLink(l.link)
                ? <a href={profile.safeLink(l.link)!} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 truncate text-[14px] text-primary hover:underline"><span className="truncate">{l.link}</span><LuExternalLink size={13} className="shrink-0" /></a>
                : <span className="block truncate text-[14px] text-muted">{l.link}</span>}
            </div>
            <button aria-label={`Edit ${profile.platformLabel(l.platform)} link`} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-primary" onClick={() => setEditing(l.id)}><LuPencil size={17} /></button>
            <button aria-label={`Delete ${profile.platformLabel(l.platform)} link`} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-bad" onClick={() => setRemoving(l)}><LuTrash2 size={17} /></button>
          </div>
        ))}
      </div>
      <ConfirmModal open={!!removing} title="Delete this link?" onClose={() => setRemoving(null)}
        body={<>Your <b>{removing && profile.platformLabel(removing.platform)}</b> link will be removed from your profile.</>}
        onConfirm={async () => {
          const target = removing; setRemoving(null);
          if (!target) return;
          try {
            await profile.removeSocialLink(target.id);
            onLinks(links.filter((x) => x.id !== target.id));
            toast("Link deleted");
          } catch (e) {
            if (e instanceof ApiError && e.status === 404) onLinks(links.filter((x) => x.id !== target.id));
            else toast(e instanceof ApiError ? e.message : "Couldn't delete that link.");
          }
        }} />
    </section>
  );
}

// ================================================================ the tab

export default function ProfileAbout() {
  const { user } = useAuth();
  const [about, setAbout] = useState<profile.About | null>(null);
  const [education, setEducation] = useState<profile.Education[]>([]);
  const [links, setLinks] = useState<profile.SocialLink[]>([]);
  const [failed, setFailed] = useState("");

  const load = useCallback(async () => {
    setFailed("");
    try {
      const a = await profile.myAbout();
      setAbout(a);
      setEducation(a.education_list);
      setLinks(a.contact_info.social_links);
    } catch (e) {
      setFailed(e instanceof ApiError ? e.message : "Couldn't load your profile.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (failed) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Profile</h2>
        <p className="mt-1 text-muted">{failed}</p>
        <MotionButton className={`${btnGhost} mt-3`} onClick={() => void load()}>Try again</MotionButton>
      </section>
    );
  }
  if (!about) return <div className={`${card} h-[320px] animate-pulse`} />;

  // A section save returns the whole profile; keep the sub-collections this screen edits per row.
  const saved = (a: profile.About) => setAbout(a);
  const viewId = about.user_id || user?.id;

  return (
    <>
      <section className={`${card} flex flex-wrap items-center gap-3 p-6`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Profile</h2>
          <p className="text-muted">What people see on your profile&apos;s About section.{about.is_private && " Your profile is private, so only your followers see it."}</p>
        </div>
        {viewId && <Link href={`/users/${viewId}`} className={btnGhost}><LuExternalLink size={17} />View my profile</Link>}
      </section>
      <Personal about={about} onSaved={saved} />
      <Details about={about} onSaved={saved} />
      <Hobbies about={about} onSaved={saved} />
      <EducationSection items={education} onChange={setEducation} />
      <Contact about={about} links={links} onLinks={setLinks} />
    </>
  );
}
