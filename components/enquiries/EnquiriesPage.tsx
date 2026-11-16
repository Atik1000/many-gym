"use client";

/**
 * Enquiries — the gym's inbox of questions, callback requests and complaints.
 *
 * Same shape as the Leads screen: a filterable table, and a slide-over that shows one enquiry and turns into
 * its form. Saves go straight to `/enquiries/` rather than through the list diff, so a rejected field comes
 * back to the form it belongs to instead of a toast.
 */
import { useState } from "react";
import { LuChevronRight, LuInbox, LuPencil, LuPlus, LuSave, LuSearch, LuTrash2, LuX } from "react-icons/lu";
import Offcanvas from "@/components/ui/Offcanvas";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import { Avatar, ConfirmModal, EmptyState, Pagination, Pill, Select, usePaged } from "@/components/ui/parts";
import { Can, EditableIf, useAuth } from "@/components/AuthProvider";
import { refreshResource, useResource } from "@/lib/api";
import { enquiries as enquiriesApi, enquiryErrors } from "@/lib/api/enquiries";
import { ApiError } from "@/lib/api/http";
import {
  ENQUIRIES_KEY, ENQUIRY_STATUSES, ENQUIRY_TYPES, NAME_MAX, PHONE_MAX, STATUS_LABEL, STATUS_TONE, TYPE_LABEL,
  blankEnquiry, enquiryName, validateEnquiry,
  type Enquiry, type EnquiryStatus, type EnquiryType,
} from "@/lib/enquiries";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

const when = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const day = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
};

export default function EnquiriesPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [enquiries, , ready] = useResource<Enquiry>(ENQUIRIES_KEY);
  const [status, setStatus] = useState<"all" | EnquiryStatus>("all");
  const [type, setType] = useState<"all" | EnquiryType>("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Enquiry | null>(null);
  const [editing, setEditing] = useState(false); // false = read-only details view
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const needle = q.trim().toLowerCase();
  const matches = (e: Enquiry) =>
    (type === "all" || e.type === type) &&
    `${enquiryName(e)} ${e.email} ${e.phone} ${e.summary}`.toLowerCase().includes(needle);
  // The status chips count what the other filters leave, so a chip's number is what clicking it shows.
  const pool = enquiries.filter(matches);
  const count = (s: "all" | EnquiryStatus) => (s === "all" ? pool.length : pool.filter((e) => e.status === s).length);
  const shown = pool.filter((e) => status === "all" || e.status === status);
  const pg = usePaged(shown, 8, `${status}|${type}|${q}`);

  const isNew = draft !== null && !draft.id;
  const set = <K extends keyof Enquiry>(k: K, v: Enquiry[K]) => setDraft((d) => d && { ...d, [k]: v });
  const reset = () => { setErrors({}); setNewNote(""); };
  const open = (e: Enquiry) => { setDraft(structuredClone(e)); setEditing(false); reset(); };
  const create = () => { setDraft(blankEnquiry()); setEditing(true); reset(); };
  const close = () => setDraft(null);
  const cancel = () => {
    if (isNew || !draft) return close();
    setDraft(enquiries.find((x) => x.id === draft.id) ?? null); setEditing(false); reset();
  };

  /**
   * Notes. While the form is open a note is just part of the draft and travels with Save. From the details
   * view it is its own request — `POST /enquiries/{id}/notes/` — so nothing else on the record is touched.
   */
  const addNote = async () => {
    const text = newNote.trim();
    if (!text || !draft || busy) return;
    if (editing) { set("notes", [...draft.notes, text]); setNewNote(""); return; }
    setBusy(true);
    try {
      const fresh = await enquiriesApi.addNote(draft.id, text);
      setDraft(fresh); setNewNote("");
      void refreshResource(ENQUIRIES_KEY);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't add that note.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft || busy) return;
    const pending = newNote.trim(); // don't lose a note typed but not added
    const d = pending ? { ...draft, notes: [...draft.notes, pending] } : draft;
    const problems = validateEnquiry(d);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      const before = enquiries.find((x) => x.id === d.id);
      const saved = isNew ? await enquiriesApi.create(d) : await enquiriesApi.update(d, before);
      await refreshResource(ENQUIRIES_KEY);
      setDraft(saved); setEditing(false); reset();
      toast(isNew ? "Enquiry added" : "Enquiry saved");
    } catch (err) {
      setErrors(enquiryErrors(err, "Couldn't save that enquiry."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    setDeleting(false);
    try {
      await enquiriesApi.remove(draft.id);
      close();
      toast("Enquiry deleted");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't delete that enquiry.");
    }
    await refreshResource(ENQUIRIES_KEY);
  };

  const canEditNotes = can("Edit enquiries");
  const noteInput = (
    <div className="mt-2 flex gap-2">
      <input aria-label="New note" className={input} placeholder="Add a note…" value={newNote} onChange={(e) => setNewNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addNote())} />
      <button type="button" className="whitespace-nowrap font-semibold text-primary disabled:opacity-40" disabled={!newNote.trim() || busy} onClick={() => void addNote()}>+ Add Note</button>
    </div>
  );

  return (
    <>
      <section className={`${card} overflow-hidden`}>
        <div className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", ...ENQUIRY_STATUSES] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} className={`rounded-full px-4 py-2 font-semibold ${status === s ? "bg-primary text-white" : "bg-background hover:bg-line"}`}>
                {s === "all" ? "All" : STATUS_LABEL[s]} <span className={`ml-1 rounded-full px-2 text-xs ${status === s ? "bg-white/25" : "bg-white"}`}>{count(s)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full max-w-[340px]"><LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${input} pl-10`} placeholder="Search name, contact or summary…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <Select aria-label="Type" className="w-full max-w-[220px]" value={type} onChange={(e) => setType(e.target.value as "all" | EnquiryType)}>
              <option value="all">All Types</option>
              {ENQUIRY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
            <span className="ml-auto"><Can perm="Create enquiries"><MotionButton className={btnPrimary} onClick={create}><LuPlus size={18} />Add Enquiry</MotionButton></Can></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="rt w-full min-w-[720px] text-left">
            <thead className="bg-background text-[13px] text-muted"><tr>{["Enquiry", "Type", "Status", "Received", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {!ready && <tr><td colSpan={5} className="p-10 text-center text-muted">Loading enquiries…</td></tr>}
              {ready && shown.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-muted"><EmptyState icon={LuInbox} title={enquiries.length ? "No enquiries match" : "No enquiries yet"} hint={enquiries.length ? "Try a different search or filter." : "Enquiries people send this gym will appear here."} /></td></tr>}
              {pg.view.map((e) => (
                <tr key={e.id} onClick={() => open(e)} className={`cursor-pointer border-t border-line hover:bg-background ${draft?.id === e.id ? "bg-primary-50" : ""}`}>
                  <td className={`border-l-4 px-4 py-3.5 ${draft?.id === e.id ? "border-l-primary" : "border-l-transparent"}`}>
                    <b className="block">{enquiryName(e)}</b>
                    <span className="block text-muted">{e.email || e.phone}</span>
                    {e.summary && <span className="block max-w-[360px] truncate text-[13px] text-muted">{e.summary}</span>}
                  </td>
                  <td className="px-4"><Pill tone={e.type === "EMERGENCY" || e.type === "COMPLAINT" ? "red" : "gray"}>{TYPE_LABEL[e.type]}</Pill></td>
                  <td className="px-4"><Pill tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Pill></td>
                  <td className="px-4"><span className="block">{day(e.createdAt)}</span><span className="text-[13px] text-muted">{e.notes.length} note{e.notes.length === 1 ? "" : "s"}</span></td>
                  <td className="px-4 text-muted"><LuChevronRight size={18} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line"><Pagination {...pg} noun="enquiries" /></div>
      </section>

      <Offcanvas open={!!draft} onClose={close}>
        {draft && (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-2xl font-bold">{isNew ? "New Enquiry" : editing ? "Edit Enquiry" : enquiryName(draft)}</h3>
              <div className="flex items-center gap-3">
                {can(isNew ? "Create enquiries" : "Edit enquiries") && (editing
                  ? <MotionButton className={btnGhost} onClick={cancel}><LuX size={17} />Cancel</MotionButton>
                  : <MotionButton className={btnGhost} onClick={() => { setEditing(true); reset(); }}><LuPencil size={17} />Edit</MotionButton>)}
                <button aria-label="Close" onClick={close} className="text-muted"><LuX size={22} /></button>
              </div>
            </div>

            {!editing ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Pill tone={STATUS_TONE[draft.status]}>{STATUS_LABEL[draft.status]}</Pill>
                  <Pill tone={draft.type === "EMERGENCY" || draft.type === "COMPLAINT" ? "red" : "gray"}>{TYPE_LABEL[draft.type]}</Pill>
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
                  {([["Email", draft.email], ["Phone", draft.phone], ["Received", when(draft.createdAt)], ["Last Updated", when(draft.updatedAt)]] as const).map(([k, v]) => (
                    <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd className="break-words font-semibold">{v || "—"}</dd></div>
                  ))}
                </dl>
                <LinkedUser enquiry={draft} />
                <h4 className="mb-2 mt-6 text-lg font-bold">Summary</h4>
                {draft.summary ? <p className="whitespace-pre-wrap">{draft.summary}</p> : <p className="text-muted">No summary.</p>}
                <h4 className="mb-2 mt-6 text-lg font-bold">Notes</h4>
                {draft.notes.length === 0 ? <p className="text-muted">No notes.</p> : (
                  <ol className="grid gap-2">{draft.notes.map((n, i) => <li key={`${i}-${n}`} className="whitespace-pre-wrap rounded-[10px] bg-background px-3 py-2">{n}</li>)}</ol>)}
                {canEditNotes && noteInput}
                {can("Delete enquiries") && (
                  <div className="mt-6 border-t border-line pt-4">
                    <button className="inline-flex items-center gap-1.5 font-semibold text-bad" onClick={() => setDeleting(true)}><LuTrash2 size={16} />Delete enquiry</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <EditableIf perm={isNew ? "Create enquiries" : "Edit enquiries"}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><label htmlFor="ef" className={label}>First Name <span className="text-bad">*</span></label><input id="ef" className={input} maxLength={NAME_MAX} value={draft.firstName} onChange={(e) => set("firstName", e.target.value)} />{errors.firstName && <p className={errorText}>{errors.firstName}</p>}</div>
                    <div><label htmlFor="el" className={label}>Last Name <span className="text-bad">*</span></label><input id="el" className={input} maxLength={NAME_MAX} value={draft.lastName} onChange={(e) => set("lastName", e.target.value)} />{errors.lastName && <p className={errorText}>{errors.lastName}</p>}</div>
                    <div><label htmlFor="ee" className={label}>Email</label><input id="ee" type="email" className={input} value={draft.email} onChange={(e) => set("email", e.target.value)} />{errors.email && <p className={errorText}>{errors.email}</p>}</div>
                    <div><label htmlFor="ep" className={label}>Phone</label><input id="ep" type="tel" className={input} maxLength={PHONE_MAX} value={draft.phone} onChange={(e) => set("phone", e.target.value)} />{errors.phone && <p className={errorText}>{errors.phone}</p>}</div>
                    <p className={`-mt-2 md:col-span-2 ${errors.contact ? "text-xs text-bad" : hint}`}>{errors.contact ?? "Either an email or a phone number is required"}</p>
                    <div><label htmlFor="et" className={label}>Type</label><Select id="et" value={draft.type} onChange={(e) => set("type", e.target.value as EnquiryType)}>{ENQUIRY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>{errors.type && <p className={errorText}>{errors.type}</p>}</div>
                    <div><label htmlFor="es" className={label}>Status</label><Select id="es" value={draft.status} onChange={(e) => set("status", e.target.value as EnquiryStatus)}>{ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>{errors.status && <p className={errorText}>{errors.status}</p>}</div>
                    <div className="md:col-span-2"><label htmlFor="esum" className={label}>Summary</label><textarea id="esum" rows={4} className={input} value={draft.summary} onChange={(e) => set("summary", e.target.value)} placeholder="What are they asking about?" />{errors.summary && <p className={errorText}>{errors.summary}</p>}</div>
                  </div>
                  <LinkedUser enquiry={draft} />

                  <h4 className="mb-2 mt-6 text-lg font-bold">Notes</h4>
                  <ul className="grid gap-2">{draft.notes.map((n, i) => (
                    <li key={`${i}-${n}`} className="flex items-center gap-2 rounded-[10px] bg-background px-3 py-2"><span className="flex-1 whitespace-pre-wrap">{n}</span><button type="button" aria-label="Remove note" className="text-bad" onClick={() => set("notes", draft.notes.filter((_, j) => j !== i))}><LuTrash2 size={16} /></button></li>))}</ul>
                  {noteInput}
                  {errors.notes && <p className={errorText}>{errors.notes}</p>}
                </EditableIf>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <div>{!isNew && can("Delete enquiries") && <button className="inline-flex items-center gap-1.5 font-semibold text-bad" onClick={() => setDeleting(true)}><LuTrash2 size={16} />Delete enquiry</button>}</div>
                  {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
                  <div className="flex gap-3">
                    <MotionButton className={btnGhost} onClick={cancel}><LuX size={17} />Cancel</MotionButton>
                    <MotionButton className={btnPrimary} disabled={busy || !can(isNew ? "Create enquiries" : "Edit enquiries")} onClick={() => void save()}><LuSave size={17} />{busy ? "Saving…" : isNew ? "Add Enquiry" : "Save Changes"}</MotionButton>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </Offcanvas>

      <ConfirmModal open={deleting} title="Delete enquiry?" onClose={() => setDeleting(false)}
        body={<>The enquiry from <b>{draft && enquiryName(draft)}</b> and its notes will be removed permanently.</>}
        onConfirm={() => void remove()} />
    </>
  );
}

/** The registered manygym account behind an enquiry. The API links it; nothing here can change it. */
function LinkedUser({ enquiry }: { enquiry: Enquiry }) {
  const u = enquiry.user;
  if (!u) return null;
  return (
    <div className="mt-5">
      <p className="mb-1.5 text-[13px] text-muted">Manygym account</p>
      <div className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
        <Avatar name={u.name || u.email} size={38} src={u.avatar || undefined} />
        <span className="min-w-0"><b className="block truncate">{u.name || "manygym user"}</b><span className="block truncate text-muted">{[u.email, u.phone].filter(Boolean).join(" · ")}</span></span>
      </div>
    </div>
  );
}
