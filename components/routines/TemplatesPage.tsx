"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { LuChevronRight as ChevronRight, LuPlus as Plus, LuSearch as Search, LuTrash2 as Trash2, LuX as X, LuPencil, LuSave, LuX } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, MultiSelect, Pagination, Pill, Select, usePaged } from "@/components/ui/parts";
import { useResource } from "@/lib/api";
import { btnGhost, btnPrimary, card, errorText, input, label } from "@/lib/ui";
import { GOALS, LEVELS, blankDays, blankRoutine, cleanRoutine, newSession, validateRoutine, type Routine } from "@/lib/routines";
import { uid } from "@/lib/id";
import RoutineEditor from "./RoutineEditor";
import RoutineViewer from "./RoutineViewer";
import { Can, EditableIf, useAuth } from "@/components/AuthProvider";

export const ROUTINES_KEY = "routines";
const levelTone = { Beginner: "green", Intermediate: "blue", Advanced: "amber" } as const;

export default function TemplatesPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [templates, setTemplates, ready] = useResource<Routine>(ROUTINES_KEY);
  const [q, setQ] = useState("");
  const [format, setFormat] = useState("all");
  const [draft, setDraft] = useState<Routine | null>(null); // null = nothing open
  const [editing, setEditing] = useState(false); // false = read-only details view
  const [errors, setErrors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // remount editor so its day/session tab resets

  const shownAll = templates.filter((t) => (format === "all" || t.format === format) && t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(shownAll, 6, `${format}|${q}`);
  const shown = pg.view;
  const open = (t: Routine) => { setDraft(structuredClone(t)); setEditing(false); setErrors([]); setEditorKey((k) => k + 1); };
  const create = () => { setDraft(blankRoutine("weekly")); setEditing(true); setErrors([]); setEditorKey((k) => k + 1); };
  const isNew = draft !== null && !templates.some((t) => t.id === draft.id);

  const setFormatOf = (f: Routine["format"]) => setDraft((d) => d && ({
    ...d, format: f,
    days: f === "weekly" && d.days.length === 0 ? blankDays() : d.days,
    sessions: f === "session" && d.sessions.length === 0 ? [newSession()] : d.sessions,
  }));

  const save = () => {
    if (!draft) return;
    const errs = validateRoutine(draft);
    setErrors(errs);
    if (errs.length) return;
    const clean = cleanRoutine({ ...draft, id: draft.id || uid() });
    setTemplates((l) => (l.some((t) => t.id === clean.id) ? l.map((t) => (t.id === clean.id ? clean : t)) : [clean, ...l]));
    setDraft(clean);
    setEditing(false);
    toast(isNew ? "Template created" : "Template saved");
  };

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${card} p-4`}>
          <label className="relative block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className={`${input} pl-10`} placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Can perm="Create templates"><MotionButton className={`${btnPrimary} mt-3 w-full`} onClick={create}><Plus size={18} />Create Template</MotionButton></Can>
          <label className="mt-4 block"><span className={label}>Format</span>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}><option value="all">All Formats</option><option value="weekly">Weekly</option><option value="session">Session-Based</option></Select>
          </label>
          <ul className="-mx-4 mt-4 border-t border-line">
            {!ready && <li className="px-4 py-8 text-center text-muted">Loading…</li>}
            {ready && shown.length === 0 && <li className="px-4 py-8 text-center text-muted">{templates.length ? "No templates match." : "No templates yet."}</li>}
            {shown.map((t) => (
              <li key={t.id}>
                <button onClick={() => open(t)} className={`flex w-full items-center gap-3 border-b border-l-4 border-b-line px-4 py-4 text-left ${draft?.id === t.id ? "border-l-primary bg-primary-50" : "border-l-transparent hover:bg-background"}`}>
                  <span className="flex-1">
                    <b className="mb-1.5 block text-[15px]">{t.name}</b>
                    <span className="flex gap-2"><Pill tone="purple">{t.format === "weekly" ? "Weekly" : "Session-Based"}</Pill><Pill tone={levelTone[t.level]}>{t.level}</Pill></span>
                  </span>
                  <ChevronRight className="text-muted" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <div className="-mx-4 border-t border-line"><Pagination {...pg} noun="templates" /></div>
        </aside>

        {!draft ? (
          <section className={`${card} grid min-h-[320px] place-items-center p-10 text-center text-muted`}>
            <div><p className="text-base font-semibold text-foreground">Select a template to edit</p><p>or create a new one to get started.</p></div>
          </section>
        ) : (
          <section className={`${card} p-6`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-2xl font-bold">{!editing ? draft.name : isNew ? "New Template" : "Edit Template"}</h3>
              <div className="flex items-center gap-3">
                {!editing && can("Edit templates") && <MotionButton className={btnGhost} onClick={() => setEditing(true)}><LuPencil size={17} />Edit</MotionButton>}
                <button aria-label="Close" onClick={() => setDraft(null)} className="text-muted"><X size={22} /></button>
              </div>
            </div>
            {!editing ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Pill tone="purple">{draft.format === "weekly" ? "Weekly" : "Session-Based"}</Pill>
                  <Pill tone={levelTone[draft.level]}>{draft.level}</Pill>
                  {draft.goals.map((g) => <Pill key={g} tone="gray">{g}</Pill>)}
                </div>
                {draft.notes && <p className="mb-5 text-muted">{draft.notes}</p>}
                <hr className="mb-5 border-line" />
                <RoutineViewer key={draft.id} routine={draft} />
              </>
            ) : (
            <>
            <EditableIf perm={isNew ? "Create templates" : "Edit templates"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label htmlFor="tn" className={label}>Template Name <span className="text-bad">*</span></label>
                <input id="tn" className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Beginner Full Body" /></div>
              <div><label htmlFor="tf" className={label}>Routine Format <span className="text-bad">*</span></label>
                <Select id="tf" value={draft.format} onChange={(e) => setFormatOf(e.target.value as Routine["format"])}><option value="weekly">Weekly</option><option value="session">Session-Based</option></Select></div>
              <div><span className={label}>Goal <span className="font-normal text-muted">(optional)</span></span>
                <MultiSelect value={draft.goals} options={GOALS} onChange={(goals) => setDraft({ ...draft, goals })} placeholder="Select goals" /></div>
              <div><label htmlFor="tl" className={label}>Level</label>
                <Select id="tl" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Routine["level"] })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</Select></div>
              <div className="md:col-span-2"><label htmlFor="tnotes" className={label}>Notes <span className="font-normal text-muted">(optional)</span></label>
                <textarea id="tnotes" rows={2} className={`${input} resize-y`} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
            </div>
            <hr className="my-5 border-line" />
            <RoutineEditor key={editorKey + draft.format} routine={draft} onChange={setDraft} />
            </EditableIf>
            {errors.length > 0 && <ul className="mt-4 rounded-xl bg-bad-bg px-4 py-3">{errors.map((e) => <li key={e} className={`${errorText} !mt-0 text-[13px]`}>• {e}</li>)}</ul>}
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
              {!isNew && can("Delete templates") ? <button className="inline-flex items-center gap-1.5 font-semibold text-bad" onClick={() => setDeleting(true)}><Trash2 size={16} />Delete template</button> : <span />}
              <div className="flex gap-3">
                <MotionButton className={btnGhost} onClick={() => (isNew ? setDraft(null) : (setDraft(templates.find((t) => t.id === draft.id) ?? null), setEditing(false), setErrors([])))}><LuX size={17} />Cancel</MotionButton>
                <MotionButton className={btnPrimary} disabled={!can(isNew ? "Create templates" : "Edit templates")} onClick={save}><LuSave size={17} />Save Template</MotionButton>
              </div>
            </div>
            </>
            )}
          </section>
        )}
      </div>

      <ConfirmModal open={deleting} title="Delete template?" onClose={() => setDeleting(false)}
        body={<>“{draft?.name}” will be removed. Routines already assigned to members keep their own copy.</>}
        onConfirm={() => { setTemplates((l) => l.filter((t) => t.id !== draft?.id)); setDraft(null); setDeleting(false); toast("Template deleted"); }} />
    </>
  );
}
