"use client";

/**
 * Joining requests sent to this gym — people who asked to become members from the gym's public page.
 *
 * Staff review each one: **Accept** enrols the person as a member (optionally straight onto a plan, with a
 * trainer and a first payment), **Reject** declines it with an optional reason. Reading needs `members:read`;
 * answering needs `members:edit` (lib/api/member-requests.ts).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuCheck, LuChevronRight, LuInbox, LuSearch, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import Offcanvas from "@/components/ui/Offcanvas";
import { Avatar, EmptyState, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { refreshResource, useResource } from "@/lib/api";
import { ApiError } from "@/lib/api/http";
import {
  PAYMENT_METHODS, REQUEST_STATUSES, REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE,
  acceptMemberRequest, getMemberRequest, listMemberRequests, memberRequestsChanged, rejectMemberRequest,
  type MemberRequest, type PaymentMethod, type RequestStatus,
} from "@/lib/api/member-requests";
import { fmtDate, today } from "@/lib/dates";
import { MEMBERS_KEY, endDate } from "@/lib/members";
import { PEOPLE_KEY, type Person, isTrainer } from "@/lib/people";
import { money, num, type Plan } from "@/lib/plans";
import { timeAgo } from "@/lib/posts";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

const PAGE = 10;
const day = (iso: string) => (iso ? fmtDate(iso.slice(0, 10)) : "—");

/** Server field names → the inputs they belong under. */
const FIELD: Record<string, string> = {
  plan_id: "plan", start_date: "start", end_date: "end", assigned_trainer_id: "trainer",
  initial_payment_amount: "amount", initial_payment_method: "method", initial_payment_date: "payDate",
  rejection_reason: "reason",
};
function problems(e: unknown, fallback: string): Record<string, string> {
  if (!(e instanceof ApiError)) return { form: fallback };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.fieldErrors())) out[FIELD[k] ?? "form"] ??= v;
  if (!Object.keys(out).length) out.form = e.status === 409 ? "This request has already been answered." : e.message || fallback;
  return out;
}

export default function MemberRequests({ onCount }: { onCount?: (pending: number) => void }) {
  const toast = useToast();
  const { can } = useAuth();
  const canAnswer = can("Create members") || can("Edit members");
  const [status, setStatus] = useState<RequestStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MemberRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<MemberRequest | null>(null);
  const [accepting, setAccepting] = useState<MemberRequest | null>(null);
  const [rejecting, setRejecting] = useState<MemberRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await listMemberRequests({ status: status === "all" ? undefined : status, search, page, pageSize: PAGE });
      setRows(res.rows);
      setTotal(res.total);
      setHasMore(res.hasMore);
      // The pending tab's total is exactly the badge number, so report it without a second request.
      if (status === "pending" && !search) onCount?.(res.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setHasMore(false);
      setError(e instanceof ApiError
        ? e.status === 403 ? "You don't have permission to see joining requests." : e.message
        : "Couldn't load joining requests.");
    }
  }, [status, search, page, onCount]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  /** The list row has no rejection reason or gym name — fetch the full record when one is opened. */
  const show = (r: MemberRequest) => {
    setOpen(r);
    getMemberRequest(r.id).then((full) => setOpen((cur) => (cur?.id === r.id ? full : cur))).catch(() => undefined);
  };

  const answered = async (message: string) => {
    toast(message);
    setAccepting(null);
    setRejecting(null);
    setOpen(null);
    memberRequestsChanged();
    await load();
    // Keep the tab badge right even when the visible filter isn't "pending".
    if (status !== "pending" || search) {
      listMemberRequests({ status: "pending", pageSize: 1 }).then((r) => onCount?.(r.total)).catch(() => undefined);
    }
  };

  const th = "px-5 py-3.5 font-semibold";
  const from = total === 0 ? 0 : (page - 1) * PAGE + 1;

  return (
    <>
      <div className={`${card} overflow-hidden`}>
        <div className="grid grid-cols-1 gap-3 border-b border-line p-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <label className="relative"><LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" className={`${input} pl-10`} placeholder="Search name or email…" aria-label="Search joining requests" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as RequestStatus | "all"); setPage(1); }}>
            {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>)}
            <option value="all">All statuses</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="rt w-full min-w-[680px] text-left">
            <thead className="bg-background text-[13px] text-muted"><tr>{["Person", "Interested plan", "Asked", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows === null && <tr><td colSpan={5} className="p-10 text-center text-muted">Loading requests…</td></tr>}
              {rows !== null && error && <tr><td colSpan={5} className="p-10 text-center text-muted">{error} <button className="font-semibold text-primary" onClick={() => void load()}>Try again</button></td></tr>}
              {rows !== null && !error && rows.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-muted">
                  <EmptyState icon={LuInbox}
                    title={search ? "No requests match" : status === "pending" ? "No requests waiting" : "Nothing here"}
                    hint={search ? "Try a different search." : "People ask to join from your gym's public page."} />
                  {!search && <p className="mt-2 text-[13px]">Whether people can send joining requests is switched on or off in <Link href="/settings?tab=gym" className="font-semibold text-primary">Settings → Gym</Link> (&ldquo;Who can request to join&rdquo;).</p>}
                </td></tr>
              )}
              {(rows ?? []).map((r) => (
                <tr key={r.id} onClick={() => show(r)} className={`cursor-pointer border-t border-line hover:bg-background ${open?.id === r.id ? "bg-primary-50" : ""}`}>
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={r.user.name} src={r.user.avatarUrl} /><div className="min-w-0"><b className="block truncate">{r.user.name}</b><span className="block truncate text-muted">{r.user.email}</span></div></div></td>
                  <td className="px-5">{r.plan ? <><span className="block">{r.plan.name}</span><span className="text-[13px] text-muted">{money(num(r.plan.price))}</span></> : <span className="text-muted">Undecided</span>}</td>
                  <td className="px-5 text-muted">{r.createdAt ? timeAgo(r.createdAt) : "—"}</td>
                  <td className="px-5"><Pill tone={REQUEST_STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Pill></td>
                  <td className="px-5 text-right">
                    {r.status === "pending" && canAnswer ? (
                      <span className="inline-flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary-50" onClick={() => setAccepting(r)}><LuCheck size={15} />Accept</button>
                        <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-bad hover:bg-bad-bg" onClick={() => setRejecting(r)}><LuX size={15} />Reject</button>
                      </span>
                    ) : <LuChevronRight size={18} className="inline text-muted" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted">
          <span>{total === 0 ? "No requests" : `Showing ${from}–${from + (rows?.length ?? 0) - 1} of ${total} request${total === 1 ? "" : "s"}`}</span>
          <span className="flex gap-2">
            <button className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className={btnGhost} disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
          </span>
        </div>
      </div>

      <Offcanvas open={!!open} onClose={() => setOpen(null)}>
        {open && (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><Avatar name={open.user.name} size={52} src={open.user.avatarUrl} />
                <div className="min-w-0"><h3 className="truncate text-2xl font-bold">{open.user.name}</h3><Pill tone={REQUEST_STATUS_TONE[open.status]}>{REQUEST_STATUS_LABEL[open.status]}</Pill></div></div>
              <button aria-label="Close" onClick={() => setOpen(null)} className="text-muted"><LuX size={22} /></button>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
              {([
                ["Email", open.user.email], ["Phone", open.user.phone],
                ["Interested plan", open.plan ? `${open.plan.name} · ${money(num(open.plan.price))}` : "Undecided"],
                ["Asked on", day(open.createdAt)],
                ["Reviewed by", open.reviewedBy], ["Reviewed on", open.reviewedAt ? day(open.reviewedAt) : ""],
              ] as const).filter(([k, v]) => v || (k !== "Reviewed by" && k !== "Reviewed on")).map(([k, v]) => (
                <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd className="break-words font-semibold">{v || "—"}</dd></div>
              ))}
            </dl>
            <h4 className="mb-2 mt-6 text-lg font-bold">Their message</h4>
            {open.notes ? <p className="whitespace-pre-wrap rounded-[10px] bg-background px-3 py-2">{open.notes}</p> : <p className="text-muted">No message.</p>}
            {open.status === "rejected" && (<>
              <h4 className="mb-2 mt-6 text-lg font-bold">Reason for rejecting</h4>
              {open.rejectionReason ? <p className="whitespace-pre-wrap rounded-[10px] bg-background px-3 py-2">{open.rejectionReason}</p> : <p className="text-muted">No reason recorded.</p>}
            </>)}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              {open.status === "pending" && canAnswer && (<>
                <MotionButton className={btnPrimary} onClick={() => setAccepting(open)}><LuCheck size={17} />Accept as member</MotionButton>
                <MotionButton className={btnGhost} onClick={() => setRejecting(open)}><LuX size={17} />Reject</MotionButton>
              </>)}
              {open.status === "pending" && !canAnswer && <p className="text-muted">You can view requests but not answer them.</p>}
              {open.status === "accepted" && open.createdMemberId && <Link href={`/members/${open.createdMemberId}`} className="font-semibold text-primary">Open their member profile</Link>}
            </div>
          </section>
        )}
      </Offcanvas>

      {accepting && <AcceptModal req={accepting} onClose={() => setAccepting(null)} onDone={(name) => answered(`${name} is now a member`)} />}
      {rejecting && <RejectModal req={rejecting} onClose={() => setRejecting(null)} onDone={(name) => answered(`Request from ${name} rejected`)} />}
    </>
  );
}

/**
 * Accepting enrols the person. Nothing is required by the API — their name and contact details come from
 * their own account — so this collects only the membership: plan and dates, a trainer, and a first payment.
 */
function AcceptModal({ req, onClose, onDone }: { req: MemberRequest; onClose: () => void; onDone: (name: string) => Promise<void> }) {
  const [plans] = useResource<Plan>("plans");
  const [people] = useResource<Person>(PEOPLE_KEY);
  const active = plans.filter((p) => p.status === "active");
  const trainers = people.filter((p) => isTrainer(p) && p.status === "active");
  // Start on the plan they asked for, when it is still one this gym sells.
  const [planId, setPlanId] = useState(req.plan?.id ?? "");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState<string | null>(null); // null = follow the plan
  const [trainer, setTrainer] = useState("");
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [payDate, setPayDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plan = active.find((p) => p.id === planId);
  // A time-based plan fixes its own end date; a session pack's expiry is the admin's call.
  const autoEnd = plan && plan.type === "time" && start ? endDate(plan, start) : "";
  const shownEnd = end ?? autoEnd;
  // The requested plan may have been archived since; say so rather than silently dropping it.
  const stale = !!req.plan && !active.some((p) => p.id === req.plan!.id);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (plan && !start) e.start = "Choose a start date";
    if (shownEnd && start && shownEnd < start) e.end = "The end date can't be before the start date";
    if (paid && !(num(amount) > 0)) e.amount = "Enter the amount paid";
    if (paid && !payDate) e.payDate = "Choose the payment date";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await acceptMemberRequest(req.id, {
        planId: plan?.id,
        startDate: plan ? start : undefined,
        endDate: plan ? shownEnd || undefined : undefined,
        trainerId: trainer || undefined,
        payment: paid ? { amount: num(amount).toFixed(2), method, date: payDate } : undefined,
      });
      void refreshResource(MEMBERS_KEY);
      await onDone(req.user.name);
    } catch (err) {
      setErrors(problems(err, "Couldn't accept that request."));
      setBusy(false);
    }
  };

  return (
    <Modal open title={`Accept ${req.user.name}`} onClose={onClose}
      footer={<><MotionButton className={btnGhost} onClick={onClose} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} onClick={submit} disabled={busy}><LuCheck size={17} />{busy ? "Accepting…" : "Accept as member"}</MotionButton></>}>
      <p className="text-muted">They become a member of this gym. Their name and contact details come from their manygym account.</p>

      <div>
        <label htmlFor="mr-plan" className={label}>Membership plan</label>
        <Select id="mr-plan" value={plan ? planId : ""} onChange={(e) => { setPlanId(e.target.value); setEnd(null); }}>
          <option value="">No plan yet</option>
          {active.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(num(p.price))}</option>)}
        </Select>
        {errors.plan ? <p className={errorText}>{errors.plan}</p>
          : stale ? <p className={hint}>They asked about &ldquo;{req.plan!.name}&rdquo;, which isn&apos;t an active plan any more.</p>
            : req.plan && <p className={hint}>They asked about {req.plan.name}.</p>}
      </div>

      {plan && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label htmlFor="mr-start" className={label}>Start date</label><input id="mr-start" type="date" className={input} value={start} onChange={(e) => { setStart(e.target.value); setEnd(null); }} />{errors.start && <p className={errorText}>{errors.start}</p>}</div>
          <div><label htmlFor="mr-end" className={label}>{plan.type === "session" ? "Sessions expire" : "End date"}</label><input id="mr-end" type="date" className={input} value={shownEnd} min={start} onChange={(e) => setEnd(e.target.value)} />
            {errors.end ? <p className={errorText}>{errors.end}</p> : <p className={hint}>{plan.type === "session" ? "Optional." : "Worked out from the plan — change it if needed."}</p>}</div>
        </div>
      )}

      <div>
        <label htmlFor="mr-trainer" className={label}>Trainer <span className="font-normal text-muted">(optional)</span></label>
        <Select id="mr-trainer" value={trainer} onChange={(e) => setTrainer(e.target.value)}>
          <option value="">Unassigned</option>
          {trainers.map((t) => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
        </Select>
        {errors.trainer && <p className={errorText}>{errors.trainer}</p>}
      </div>

      <div>
        <label className="flex items-center gap-2.5 font-semibold"><input type="checkbox" checked={paid} onChange={(e) => { setPaid(e.target.checked); if (e.target.checked && !amount && plan) setAmount((num(plan.price) + num(plan.joiningFee)).toFixed(2)); }} />Record a first payment</label>
        {paid && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><label htmlFor="mr-amount" className={label}>Amount</label><input id="mr-amount" inputMode="decimal" className={input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />{errors.amount && <p className={errorText}>{errors.amount}</p>}</div>
            <div><label htmlFor="mr-method" className={label}>Method</label><Select id="mr-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>{errors.method && <p className={errorText}>{errors.method}</p>}</div>
            <div><label htmlFor="mr-paydate" className={label}>Paid on</label><input id="mr-paydate" type="date" className={input} value={payDate} max={today()} onChange={(e) => setPayDate(e.target.value)} />{errors.payDate && <p className={errorText}>{errors.payDate}</p>}</div>
          </div>
        )}
      </div>
      {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
    </Modal>
  );
}

function RejectModal({ req, onClose, onDone }: { req: MemberRequest; onClose: () => void; onDone: (name: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      await rejectMemberRequest(req.id, reason);
      await onDone(req.user.name);
    } catch (err) {
      setErrors(problems(err, "Couldn't reject that request."));
      setBusy(false);
    }
  };
  return (
    <Modal open title={`Reject ${req.user.name}'s request?`} onClose={onClose}
      footer={<><MotionButton className={btnGhost} onClick={onClose} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={submit} disabled={busy}>{busy ? "Rejecting…" : "Reject request"}</button></>}>
      <p className="text-muted">They won&apos;t become a member. They can ask again later.</p>
      <div>
        <label htmlFor="mr-reason" className={label}>Reason <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="mr-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Kept on the request for your team."
          className="min-h-[84px] w-full resize-y rounded-[10px] border border-line px-3.5 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50" />
        {errors.reason && <p className={errorText}>{errors.reason}</p>}
      </div>
      {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
    </Modal>
  );
}
