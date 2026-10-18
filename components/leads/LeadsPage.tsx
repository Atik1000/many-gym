"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuChevronRight as ChevronRight, LuPlus as Plus, LuSearch as Search, LuTrash2 as Trash2, LuUserCheck as UserCheck, LuX as X } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, MultiSelect, Pagination, Pill, Select, usePaged } from "@/components/ui/parts";
import { fmtDate, today } from "@/lib/dates";
import { BASE_REASONS, CUSTOM_REASONS_KEY, FITNESS_GOALS, LEADS_KEY, SOURCES, STAGES, STAGE_LABEL, STAGE_TONE, blankLead, leadName, nextMoveOf, validateLead, type Lead, type Stage } from "@/lib/leads";
import { PEOPLE_KEY, type Person } from "@/lib/people";
import { type Plan } from "@/lib/plans";
import { uid } from "@/lib/id";
import { useResource } from "@/lib/api";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";
import { Can, EditableIf, useAuth } from "@/components/AuthProvider";

export default function LeadsPage() {
  const toast = useToast(); const router = useRouter();
  const { can } = useAuth();
  const [leads, setLeads, ready] = useResource<Lead>(LEADS_KEY);
  const [customReasons, setCustomReasons] = useResource<{ id: string; label: string }>(CUSTOM_REASONS_KEY);
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [plans] = useResource<Plan>("plans");
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Lead | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState("");
  const [deleting, setDeleting] = useState(false);

  const assignable = people.filter((p) => p.roleId !== "trainer" && p.status === "active"); // "admin/staff selection"
  const reasons = [...BASE_REASONS.filter((r) => r !== "Other"), ...customReasons.map((r) => r.label), "Other"];
  const count = (s: "all" | Stage) => (s === "all" ? leads.length : leads.filter((l) => l.stage === s).length);
  const shown = leads.filter((l) => (stage === "all" || l.stage === stage) && `${leadName(l)} ${l.phone} ${l.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(shown, 8, `${stage}|${q}`);
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "Undecided";
  const isNew = draft !== null && !leads.some((l) => l.id === draft.id);
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setDraft((d) => d && { ...d, [k]: v });

  const open = (l: Lead) => { setDraft(structuredClone(l)); setErrors({}); setNewNote(""); };
  const create = () => { setDraft({ ...blankLead(), id: uid() }); setErrors({}); setNewNote(""); };
  const addNote = () => { if (newNote.trim() && draft) { set("notes", [...draft.notes, newNote.trim()]); setNewNote(""); } };

  /** Validates and saves the open lead. Returns the saved lead, or null if validation failed. */
  const save = (): Lead | null => {
    if (!draft) return null;
    const pendingNote = newNote.trim(); // don't lose a note typed but not added
    const d = pendingNote ? { ...draft, notes: [...draft.notes, pendingNote] } : draft;
    const e = validateLead(d); setErrors(e);
    if (Object.keys(e).length) return null;
    const clean: Lead = { ...d, reason: d.stage === "not_joining" ? d.reason : "", customReason: d.stage === "not_joining" && d.reason === "Other" ? d.customReason.trim() : "", firstName: d.firstName.trim(), lastName: d.lastName.trim() };
    setLeads((l) => (l.some((x) => x.id === clean.id) ? l.map((x) => (x.id === clean.id ? clean : x)) : [clean, ...l]));
    setDraft(clean); setNewNote(""); toast(isNew ? "Lead added" : "Lead saved");
    return clean;
  };
  const convert = () => { const l = save(); if (l) router.push(`/members/new?lead=${l.id}`); };

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[34px] font-bold tracking-tight">Leads</h2>
        <Can perm="Create leads"><MotionButton className={btnPrimary} onClick={create}><Plus size={18} />Add Lead</MotionButton></Can>
      </div>

      <div className={`grid items-start gap-5 ${draft ? "xl:grid-cols-[minmax(0,1fr)_560px]" : ""}`}>
        <section className={`${card} overflow-hidden`}>
          <div className="p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", ...STAGES] as const).map((s) => (
                <button key={s} onClick={() => setStage(s)} className={`rounded-full px-4 py-2 font-semibold ${stage === s ? "bg-primary text-white" : "bg-background hover:bg-line"}`}>
                  {s === "all" ? "All" : STAGE_LABEL[s]} <span className={`ml-1 rounded-full px-2 text-xs ${stage === s ? "bg-white/25" : "bg-white"}`}>{count(s)}</span>
                </button>
              ))}
            </div>
            <label className="relative block"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${input} pl-10`} placeholder="Search name, phone or email…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-background text-[13px] text-muted"><tr>{["Lead", "Interested Plan", "Stage", "Next Move", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {!ready && <tr><td colSpan={5} className="p-10 text-center text-muted">Loading leads…</td></tr>}
                {ready && shown.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-muted">{leads.length ? "No leads match." : "No leads yet. Add your first lead."}</td></tr>}
                {pg.view.map((l) => {
                  const nm = nextMoveOf(l); const overdue = nm && nm.date < today() && l.stage !== "joined" && l.stage !== "not_joining";
                  return (
                    <tr key={l.id} onClick={() => open(l)} className={`cursor-pointer border-t border-line hover:bg-background ${draft?.id === l.id ? "bg-primary-50" : ""}`}>
                      <td className={`border-l-4 px-4 py-3.5 ${draft?.id === l.id ? "border-l-primary" : "border-l-transparent"}`}><b className="block">{leadName(l)}</b><span className="text-muted">{l.email || l.phone}</span></td>
                      <td className="px-4">{planName(l.planId)}</td>
                      <td className="px-4"><Pill tone={STAGE_TONE[l.stage]}>{STAGE_LABEL[l.stage]}</Pill></td>
                      <td className="px-4">{nm ? <><span className={`block ${overdue ? "font-semibold text-bad" : ""}`}>{fmtDate(nm.date)}{overdue && " · overdue"}</span><span className="text-[13px] text-muted">{nm.description}</span></> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 text-muted"><ChevronRight size={18} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line"><Pagination {...pg} noun="leads" /></div>
        </section>

        {draft && (
          <section className={`${card} p-6`}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-2xl font-bold">{isNew ? "New Lead" : leadName(draft)}</h3><button aria-label="Close" onClick={() => setDraft(null)} className="text-muted"><X size={22} /></button></div>
            <EditableIf perm={isNew ? "Create leads" : "Edit leads"}>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label htmlFor="lf" className={label}>First Name <span className="text-bad">*</span></label><input id="lf" className={input} value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />{errors.firstName && <p className={errorText}>{errors.firstName}</p>}</div>
              <div><label htmlFor="ll" className={label}>Last Name</label><input id="ll" className={input} value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
              <div><label htmlFor="lp" className={label}>Phone</label><input id="lp" type="tel" className={input} value={draft.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><label htmlFor="le" className={label}>Email</label><input id="le" type="email" className={input} value={draft.email} onChange={(e) => set("email", e.target.value)} />{errors.email && <p className={errorText}>{errors.email}</p>}</div>
              <p className={`md:col-span-2 -mt-2 ${errors.contact ? "text-xs text-bad" : hint}`}>{errors.contact ?? "Phone or email required"}</p>
              <div><label htmlFor="lpl" className={label}>Interested Plan</label><Select id="lpl" value={draft.planId} onChange={(e) => set("planId", e.target.value)}><option value="">Undecided</option>{plans.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
              <div><label htmlFor="ls" className={label}>Stage</label><Select id="ls" value={draft.stage} onChange={(e) => set("stage", e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</Select></div>

              {draft.stage === "not_joining" && (<>
                <div><label htmlFor="lr" className={label}>Reason for Not Joining <span className="text-bad">*</span></label>
                  <Select id="lr" value={draft.reason} onChange={(e) => set("reason", e.target.value)}><option value="">Select a reason</option>{reasons.map((r) => <option key={r}>{r}</option>)}</Select>{errors.reason && <p className={errorText}>{errors.reason}</p>}</div>
                {draft.reason === "Other" && (
                  <div><label htmlFor="lcr" className={label}>Custom Reason <span className="text-bad">*</span></label><input id="lcr" className={input} value={draft.customReason} onChange={(e) => set("customReason", e.target.value)} />
                    {errors.customReason && <p className={errorText}>{errors.customReason}</p>}
                    <button type="button" className="mt-1.5 text-[13px] font-semibold text-primary disabled:opacity-40" disabled={!draft.customReason.trim() || reasons.some((r) => r.toLowerCase() === draft.customReason.trim().toLowerCase())}
                      onClick={() => { const r = draft.customReason.trim(); setCustomReasons((l) => [...l, { id: uid(), label: r }]); setDraft({ ...draft, reason: r, customReason: "" }); toast("Reason saved for this gym"); }}>+ Save reason for this gym</button></div>)}
              </>)}

              <div className="md:col-span-2"><span className={label}>Fitness Goal <span className="font-normal text-muted">(optional)</span></span><MultiSelect value={draft.goals} options={FITNESS_GOALS} onChange={(v) => set("goals", v)} placeholder="Select goals" /></div>
              <div><label htmlFor="lx" className={label}>Expected Start Date</label><input id="lx" type="date" className={input} value={draft.expectedStart} onChange={(e) => set("expectedStart", e.target.value)} /></div>
              <div><label htmlFor="lsrc" className={label}>Source</label><Select id="lsrc" value={draft.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</Select></div>
              <div><label htmlFor="la" className={label}>Assigned To</label><Select id="la" value={draft.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}><option value="">Unassigned</option>{assignable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
              <div><label htmlFor="lt" className={label}>Trial Booked <span className="font-normal text-muted">(optional)</span></label><input id="lt" type="datetime-local" className={input} value={draft.trialBooked} onChange={(e) => set("trialBooked", e.target.value)} /></div>
            </div>

            <h4 className="mb-2 mt-6 text-lg font-bold">Next Moves</h4>
            <div className="grid gap-2">
              {draft.nextMoves.map((m) => (
                <div key={m.id} className="grid grid-cols-[170px_minmax(0,1fr)_32px] items-center gap-2">
                  <input aria-label="Next move date" type="date" className={input} value={m.date} onChange={(e) => set("nextMoves", draft.nextMoves.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)))} />
                  <input aria-label="Next move description" className={input} placeholder="Short description" value={m.description} onChange={(e) => set("nextMoves", draft.nextMoves.map((x) => (x.id === m.id ? { ...x, description: e.target.value } : x)))} />
                  <button aria-label="Remove next move" className="text-bad" onClick={() => set("nextMoves", draft.nextMoves.filter((x) => x.id !== m.id))}><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
            {errors.nextMoves && <p className={errorText}>{errors.nextMoves}</p>}
            <button type="button" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary" onClick={() => set("nextMoves", [...draft.nextMoves, { id: uid(), date: today(), description: "" }])}><Plus size={15} />Add Next Move</button>

            <h4 className="mb-2 mt-6 text-lg font-bold">Notes</h4>
            <ul className="grid gap-2">{draft.notes.map((n, i) => (
              <li key={`${i}-${n}`} className="flex items-center gap-2 rounded-[10px] bg-background px-3 py-2"><span className="flex-1">{n}</span><button aria-label="Remove note" className="text-bad" onClick={() => set("notes", draft.notes.filter((_, j) => j !== i))}><Trash2 size={16} /></button></li>))}</ul>
            <div className="mt-2 flex gap-2"><input aria-label="New note" className={input} placeholder="Add a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNote())} />
              <button className="whitespace-nowrap font-semibold text-primary" onClick={addNote}>+ Add Note</button></div>

            </EditableIf>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-5">
                {!isNew && can("Delete leads") && <button className="inline-flex items-center gap-1.5 font-semibold text-bad" onClick={() => setDeleting(true)}><Trash2 size={16} />Delete lead</button>}
                {!isNew && draft.stage !== "joined" && can("Create members") && <button className="inline-flex items-center gap-1.5 font-semibold text-primary" onClick={convert}><UserCheck size={16} />Convert to member</button>}
              </div>
              <div className="flex gap-3"><MotionButton className={btnGhost} onClick={() => setDraft(null)}>Cancel</MotionButton><MotionButton className={btnPrimary} disabled={!can(isNew ? "Create leads" : "Edit leads")} onClick={() => save()}>{isNew ? "Add Lead" : "Save Changes"}</MotionButton></div>
            </div>
          </section>
        )}
      </div>

      <ConfirmModal open={deleting} title="Delete lead?" onClose={() => setDeleting(false)} body={<><b>{draft && leadName(draft)}</b> will be removed permanently.</>}
        onConfirm={() => { setLeads((l) => l.filter((x) => x.id !== draft?.id)); setDraft(null); setDeleting(false); toast("Lead deleted"); }} />
    </>
  );
}
