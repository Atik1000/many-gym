"use client";

import { paymentIcon } from "@/lib/icons";
import { MotionButton, MotionLink } from "@/components/ui/Motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft as ArrowLeft, LuEllipsis as MoreHorizontal, LuPencil as Pencil, LuArrowLeft, LuBanknote, LuClipboardList, LuPencil, LuRefreshCw, LuSave, LuTicket, LuUserCheck, LuWandSparkles, LuX } from "react-icons/lu";
import RoutineEditor from "@/components/routines/RoutineEditor";
import RoutineViewer from "@/components/routines/RoutineViewer";
import { useToast } from "@/components/ui/Toast";
import { Avatar, ConfirmModal, Dot, Pill, Select } from "@/components/ui/parts";
import Modal from "@/components/ui/Modal";
import { fmtDate, today } from "@/lib/dates";
import { MEMBERS_KEY, PAYMENT_METHODS, balance, buildMembership, charges, currentMembership, endDate, fullName, isExpiringSoon, memberStatus, paidAmount, paymentStatus, type Member, type Membership, type MemberStatus, type PaymentStatus } from "@/lib/members";
import { PEOPLE_KEY, type Person } from "@/lib/people";
import { money, num, type Plan } from "@/lib/plans";
import { blankRoutine, cleanRoutine, copyRoutine, validateRoutine, type Routine } from "@/lib/routines";
import { uid } from "@/lib/id";
import { useResource } from "@/lib/api";
import { addDays } from "@/lib/dates";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";
import { useAuth } from "@/components/AuthProvider";

const STATUS_TONE: Record<MemberStatus, "green" | "blue" | "amber" | "gray" | "red"> = { active: "green", scheduled: "blue", paused: "amber", expired: "gray", cancelled: "red" };
const PAY_TONE: Record<PaymentStatus, "green" | "amber" | "red"> = { paid: "green", partial: "amber", unpaid: "red" };
const PAY_LABEL: Record<PaymentStatus, string> = { paid: "Fully paid", partial: "Partially paid", unpaid: "Unpaid" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const TABS = ["Overview", "Memberships", "Payments", "Routine", "Trainer"] as const;

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex gap-4 py-1.5"><dt className="w-36 shrink-0 text-muted">{k}</dt><dd className="font-medium">{v || <span className="text-muted">—</span>}</dd></div>;
const Card = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className={`${card} p-6`}><div className="mb-3 flex items-center justify-between border-b border-line pb-3"><h3 className="text-xl font-bold">{title}</h3>{action}</div>{children}</section>
);

function msStatus(ms: Membership, now: string): MemberStatus { return now < ms.start ? "scheduled" : now > ms.end ? "expired" : "active"; }

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast(); const router = useRouter();
  const { can, trainerOnly, user } = useAuth();
  const canManage = can("Manage member information"); const canEdit = can("Edit members"); const canRoutine = can("Manage Routine");
  const [members, setMembers, ready] = useResource<Member>(MEMBERS_KEY);
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [plans] = useResource<Plan>("plans");
  const [templates] = useResource<Routine>("routines");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [modal, setModal] = useState<null | "pay" | "renew" | "assign" | "delete" | "customConfirm">(null);
  const [menu, setMenu] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [routineErr, setRoutineErr] = useState<string[]>([]);
  // record-payment form
  const [amt, setAmt] = useState(""); const [method, setMethod] = useState("Card"); const [pdate, setPdate] = useState(today()); const [msId, setMsId] = useState(""); const [formErr, setFormErr] = useState("");
  // renew form
  const [renewPlan, setRenewPlan] = useState(""); const [renewStart, setRenewStart] = useState(""); const [renewEnd, setRenewEnd] = useState("");
  const [tplId, setTplId] = useState("");

  const m = members.find((x) => x.id === id);
  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  if (!m) return <div className={`${card} p-10 text-center`}><h2 className="text-xl font-bold">Member not found</h2><MotionLink href="/members" className={`${btnPrimary} mt-4`}><LuArrowLeft size={17} />Back to Members</MotionLink></div>;

  if (trainerOnly && m.trainerId !== user?.id) return <div className={`${card} p-10 text-center`}><h2 className="text-xl font-bold">Not your member</h2><p className="mb-4 mt-1 text-muted">Trainers can only open members assigned to them.</p><MotionLink href="/members" className={btnPrimary}><LuArrowLeft size={17} />Back to Members</MotionLink></div>;
  const now = today();
  const ms = currentMembership(m);
  const st = memberStatus(m, now); const pay = paymentStatus(ms); const soon = isExpiringSoon(m, now);
  const trainer = people.find((p) => p.id === m.trainerId);
  const trainers = people.filter((p) => p.roleId === "trainer" && p.status === "active");
  const patch = (p: Partial<Member>) => setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
  const patchMs = (msid: string, f: (x: Membership) => Membership) => patch({ memberships: m.memberships.map((x) => (x.id === msid ? f(x) : x)) });

  const openPay = () => { setAmt(balance(ms) > 0 ? balance(ms).toFixed(2) : ""); setMethod("Card"); setPdate(now); setMsId(ms.id); setFormErr(""); setModal("pay"); };
  const savePay = () => {
    const target = m.memberships.find((x) => x.id === msId)!;
    const a = num(amt);
    if (!(a > 0)) return setFormErr("Enter an amount greater than 0");
    if (a > balance(target) + 0.001) return setFormErr(`That's more than the ${money(balance(target))} still owed on this membership`);
    if (!pdate) return setFormErr("Choose the payment date");
    patchMs(msId, (x) => ({ ...x, payments: [...x.payments, { id: uid(), amount: a, method, date: pdate }] }));
    setModal(null); toast("Payment recorded");
  };

  const openRenew = () => {
    const p = plans.find((x) => x.id === ms.planId) ?? plans.find((x) => x.status === "active");
    setRenewPlan(p?.id ?? ""); setRenewStart(ms.end >= now ? addDays(ms.end, 1) : now); setRenewEnd(""); setFormErr(""); setModal("renew");
  };
  const rp = plans.find((x) => x.id === renewPlan);
  const rEnd = rp ? (rp.type === "time" ? endDate(rp, renewStart) : renewEnd) : "";
  const saveRenew = () => {
    if (!rp) return setFormErr("Select a plan");
    if (!renewStart) return setFormErr("Choose a start date");
    if (rp.type === "session" && (!renewEnd || renewEnd < renewStart)) return setFormErr("Choose an expiry date on or after the start date");
    patch({ memberships: [...m.memberships, buildMembership(rp, renewStart, rEnd, [], 0)], hold: m.hold === "cancelled" ? "" : m.hold });
    setModal(null); toast("Membership renewed — record the payment when received");
  };

  const assign = (r: Routine) => { patch({ routine: r }); setEditingRoutine(null); setModal(null); toast("Routine assigned"); };
  const saveRoutine = () => {
    if (!editingRoutine) return;
    const errs = validateRoutine({ ...editingRoutine, name: editingRoutine.name || "x" });
    setRoutineErr(errs); if (errs.length) return;
    patch({ routine: cleanRoutine(editingRoutine) }); setEditingRoutine(null); toast("Routine saved");
  };

  return (
    <>
      <nav className="mb-3 text-muted"><Link href="/members" className="text-primary">Members</Link> / {fullName(m)}</nav>
      <div className="mb-5 flex flex-wrap items-center gap-5">
        <Avatar name={fullName(m)} src={m.photo} size={96} />
        <div>
          <h2 className="text-[34px] font-bold tracking-tight">{fullName(m)}</h2>
          <div className="flex flex-wrap items-center gap-3 text-muted"><span>Member ID {m.memberNo}</span><span>|</span><span>Joined {fmtDate(m.joinedAt)}</span>
            <Pill tone={STATUS_TONE[st]}><Dot tone={STATUS_TONE[st]} />{cap(st)}</Pill>
            {m.joiningStatus === "sent_invitation" && <Pill tone="amber">Invitation sent</Pill>}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {canEdit && <MotionLink href={`/members/${m.id}/edit`} title="Edit member" className={btnGhost}><LuPencil size={17} /><span className="sr-only">Edit Member</span></MotionLink>}
          {canManage && <MotionButton className={btnPrimary} onClick={openPay}><LuBanknote size={17} />Record Payment</MotionButton>}
          {(canManage || can("Delete members")) && <div className="relative">
            <button aria-label="More actions" onClick={() => setMenu((v) => !v)} className="grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-surface"><MoreHorizontal size={18} /></button>
            {menu && (<>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-11 z-20 min-w-[190px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl" onClick={() => setMenu(false)}>
                {canManage && m.joiningStatus === "sent_invitation" && <>
                  <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => toast(`Confirmation email resent to ${m.email}`)}>Resend invitation</button>
                  <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch({ joiningStatus: "joined" }); toast("Marked as joined"); }}>Mark as joined</button></>}
                {canManage && (m.hold === "paused" ? <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch({ hold: "" }); toast("Membership resumed"); }}>Resume membership</button>
                  : st === "active" && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch({ hold: "paused" }); toast("Membership paused"); }}>Pause membership</button>)}
                {canManage && m.hold !== "cancelled" && st !== "expired" && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch({ hold: "cancelled" }); toast("Membership cancelled"); }}>Cancel membership</button>}
                {can("Delete members") && <button className="block w-full rounded-lg px-3 py-2 text-left text-bad hover:bg-background" onClick={() => setModal("delete")}>Delete member</button>}
              </div></>)}
          </div>}
        </div>
      </div>

      <div className={`${card} mb-5 grid grid-cols-1 gap-5 p-6 md:grid-cols-4`}>
        <div><div className="text-muted">Plan</div><b className="text-xl">{ms.planName}</b></div>
        <div><div className="text-muted">Validity</div><b className="text-xl">{fmtDate(ms.start)} – {fmtDate(ms.end)}</b>{soon && <div className="text-[13px] font-semibold text-warn">Expiring soon</div>}</div>
        <div><div className="mb-1 text-muted">Payment</div><Pill tone={PAY_TONE[pay]}><Dot tone={PAY_TONE[pay]} />{PAY_LABEL[pay]}</Pill></div>
        <div><div className="text-muted">Trainer</div><b className="text-xl">{trainer?.name || "Unassigned"}</b></div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.filter((t) => t !== "Payments" || canManage).map((t) => <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-5 py-3 font-semibold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-5">
            <Card title="Personal Information" action={canEdit ? <Link href={`/members/${m.id}/edit`} className="inline-flex items-center gap-1.5 text-muted"><Pencil size={15} />Edit</Link> : undefined}>
              <dl className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
                <Row k="First Name" v={m.firstName} /><Row k="Last Name" v={m.lastName} /><Row k="Email" v={m.email} /><Row k="Phone" v={m.phone} />
                <Row k="Date of Birth" v={m.dob && fmtDate(m.dob)} /><Row k="Sex" v={m.sex} /><Row k="Nationality" v={m.nationality} /><Row k="Address" v={[m.address, m.city, m.country].filter(Boolean).join(", ")} />
              </dl>
            </Card>
            <Card title="Emergency Contact" action={canEdit ? <Link href={`/members/${m.id}/edit`} className="inline-flex items-center gap-1.5 text-muted"><Pencil size={15} />Edit</Link> : undefined}>
              <dl><Row k="Name" v={m.emergency.name} /><Row k="Relationship" v={m.emergency.relationship} /><Row k="Phone" v={m.emergency.phone} /></dl>
            </Card>
            <Card title="Internal Notes" action={canEdit ? <Link href={`/members/${m.id}/edit`} className="inline-flex items-center gap-1.5 text-muted"><Pencil size={15} />Edit</Link> : undefined}>
              <p>{m.notes || <span className="text-muted">No notes.</span>}</p>
            </Card>
          </div>
          <div className="grid gap-5">
            <section className={`${card} p-6`}>
              <h3 className="text-xl font-bold">Current Membership</h3>
              <b className="mt-3 block text-lg">{ms.planName}</b>
              <div className="mb-3 text-muted">{money(ms.price)} {ms.type === "session" ? `for ${ms.sessionsTotal} sessions` : ""}</div>
              <dl className="grid gap-1.5">
                {([["Start Date", fmtDate(ms.start)], ["End Date", fmtDate(ms.end)], ["Joining fee", money(ms.joiningFee)]] as const).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
                {ms.extras.map((e) => <div key={e.name} className="flex justify-between"><dt className="text-muted">Extra: {e.name}</dt><dd>{money(e.price)}</dd></div>)}
                <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Total charges</dt><dd className="font-semibold">{money(charges(ms))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="font-semibold text-ok">{money(paidAmount(ms))}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Balance</dt><dd className="font-semibold">{money(balance(ms))}</dd></div>
              </dl>
              {canManage && <MotionButton className={`${btnGhost} mt-4 w-full !text-primary`} onClick={openRenew}><LuRefreshCw size={17} />Renew Membership</MotionButton>}
            </section>
            <section className={`${card} p-6`}>
              <h3 className="mb-3 text-xl font-bold">Training</h3>
              <div className="flex items-center gap-3 border-b border-line pb-3"><Avatar name={trainer?.name || "?"} size={48} /><div><b className="block text-lg">{trainer?.name || "No trainer"}</b><span className="text-muted">{trainer ? "Assigned trainer" : "Assign one in the Trainer tab"}</span></div></div>
              <div className="flex items-center justify-between pt-3"><span className="text-muted">Routine</span>
                {m.routine ? <div className="text-right"><b className="block">{m.routine.name}</b><button className="text-[13px] font-semibold text-primary" onClick={() => setTab("Routine")}>View Routine</button></div> : <button className="font-semibold text-primary" onClick={() => setTab("Routine")}>Add routine</button>}</div>
            </section>
          </div>
        </div>
      )}

      {tab === "Memberships" && (
        <div className="grid gap-4">
          {canManage && <div className="flex justify-end"><MotionButton className={btnPrimary} onClick={openRenew}><LuRefreshCw size={17} />Renew / add membership</MotionButton></div>}
          {[...m.memberships].sort((a, b) => b.start.localeCompare(a.start)).map((x) => {
            const s = x.id === ms.id ? st : msStatus(x, now);
            return (
              <section key={x.id} className={`${card} p-5`}>
                <div className="flex flex-wrap items-center gap-3"><b className="text-lg">{x.planName}</b><Pill tone={STATUS_TONE[s]}><Dot tone={STATUS_TONE[s]} />{cap(s)}</Pill><Pill tone={PAY_TONE[paymentStatus(x)]}>{PAY_LABEL[paymentStatus(x)]}</Pill>
                  <span className="ml-auto text-muted">{fmtDate(x.start)} – {fmtDate(x.end)}</span></div>
                <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-muted"><span>Charges {money(charges(x))}</span><span>Paid {money(paidAmount(x))}</span><span>Balance {money(balance(x))}</span></div>
                {x.type === "session" && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-background"><div className="h-full bg-primary" style={{ width: `${(x.sessionsUsed / x.sessionsTotal) * 100}%` }} /></div>
                    <span className="font-medium">{x.sessionsTotal - x.sessionsUsed} of {x.sessionsTotal} sessions left</span>
                    {x.id === ms.id && <>
                      <MotionButton className={`${btnGhost} !py-1.5`} disabled={x.sessionsUsed >= x.sessionsTotal || s !== "active"} onClick={() => { patchMs(x.id, (y) => ({ ...y, sessionsUsed: y.sessionsUsed + 1 })); toast("Session used"); }}><LuTicket size={17} />Use a session</MotionButton>
                      <button className="font-semibold text-muted disabled:opacity-40" disabled={x.sessionsUsed === 0} onClick={() => patchMs(x.id, (y) => ({ ...y, sessionsUsed: y.sessionsUsed - 1 }))}>Undo</button></>}
                  </div>)}
              </section>
            );
          })}
        </div>
      )}

      {tab === "Payments" && (
        <div className="grid gap-4">
          {[...m.memberships].sort((a, b) => b.start.localeCompare(a.start)).map((x) => (
            <section key={x.id} className={`${card} p-5`}>
              <div className="mb-3 flex items-center justify-between"><b className="text-lg">{x.planName} <span className="font-normal text-muted">· {fmtDate(x.start)}</span></b><span className="text-muted">Balance <b className="text-foreground">{money(balance(x))}</b> of {money(charges(x))}</span></div>
              {x.payments.length === 0 ? <p className="text-muted">No payments recorded.</p> : (
                <table className="w-full text-left"><thead className="text-[13px] text-muted"><tr><th className="py-1.5">Date</th><th>Method</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>{[...x.payments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => <tr key={p.id} className="border-t border-line"><td className="py-2">{fmtDate(p.date)}</td><td><span className="inline-flex items-center gap-2">{(() => { const Icon = paymentIcon(p.method); return <Icon size={16} className="text-muted" />; })()}{p.method}</span></td><td className="text-right font-medium">{money(p.amount)}</td></tr>)}</tbody></table>)}
            </section>
          ))}
          <div><MotionButton className={btnPrimary} onClick={openPay} disabled={m.memberships.every((x) => balance(x) === 0)}><LuBanknote size={17} />Record Payment</MotionButton>{m.memberships.every((x) => balance(x) === 0) && <span className="ml-3 text-muted">Everything is paid.</span>}</div>
        </div>
      )}

      {tab === "Routine" && (
        <section className={`${card} p-6`}>
          {!m.routine && !editingRoutine ? (
            <div className="py-8 text-center"><p className="text-lg font-semibold">No routine yet</p><p className="mb-4 text-muted">Assign a template or build a custom routine for {m.firstName}.</p>
              {canRoutine ? <div className="flex justify-center gap-3"><MotionButton className={btnGhost} onClick={() => { setTplId(templates[0]?.id ?? ""); setModal("assign"); }}><LuClipboardList size={17} />Assign Template</MotionButton><MotionButton className={btnPrimary} onClick={() => assign({ ...blankRoutine("weekly"), id: uid(), name: `${m.firstName}'s routine` })}><LuWandSparkles size={17} />Create Custom</MotionButton></div> : <p className="text-muted">Your role can&apos;t manage routines.</p>}</div>
          ) : editingRoutine ? (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                <div><label htmlFor="rn" className={label}>Routine name</label><input id="rn" className={input} value={editingRoutine.name} onChange={(e) => setEditingRoutine({ ...editingRoutine, name: e.target.value })} /></div>
                <div><label htmlFor="rf" className={label}>Format</label><input id="rf" className={input} disabled value={editingRoutine.format === "weekly" ? "Weekly" : "Session-Based"} /></div>
              </div>
              <RoutineEditor routine={editingRoutine} onChange={setEditingRoutine} />
              {routineErr.length > 0 && <ul className="mt-3">{routineErr.map((e) => <li key={e} className={errorText}>• {e}</li>)}</ul>}
              <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4"><MotionButton className={btnGhost} onClick={() => { setEditingRoutine(null); setRoutineErr([]); }}><LuX size={17} />Cancel</MotionButton><MotionButton className={btnPrimary} onClick={saveRoutine}><LuSave size={17} />Save Routine</MotionButton></div>
            </>
          ) : m.routine && (
            <>
              <div className="mb-5 flex flex-wrap items-start gap-3">
                <div><div className="flex items-center gap-3"><h3 className="text-2xl font-bold">{m.routine.name}</h3><Pill tone="purple">{m.routine.format === "weekly" ? "Weekly" : "Session-Based"}</Pill><Pill tone="blue">{m.routine.level}</Pill></div>
                  <p className="text-muted">Assigned trainer: {trainer?.name || "—"}</p></div>
                {canRoutine && <div className="ml-auto flex flex-wrap gap-3"><MotionButton className={btnGhost} onClick={() => { setTplId(templates[0]?.id ?? ""); setModal("assign"); }}><LuClipboardList size={17} />Assign Template</MotionButton><MotionButton className={btnGhost} onClick={() => setModal("customConfirm")}><LuWandSparkles size={17} />Create Custom</MotionButton>
                  <MotionButton className={btnPrimary} onClick={() => { setEditingRoutine(structuredClone(m.routine)); setRoutineErr([]); }}><LuPencil size={17} />Edit Routine</MotionButton></div>}
              </div>
              <p className="mb-3 text-right text-muted">Personal copy · Changes apply only to {m.firstName}&apos;s routine.</p>
              <RoutineViewer routine={m.routine} />
              {m.routine.notes && <div className="mt-5 border-t border-line pt-4"><h4 className="text-lg font-bold">Routine Notes</h4><p className="text-muted">{m.routine.notes}</p></div>}
              {canRoutine && <button className="mt-4 font-semibold text-bad" onClick={() => { patch({ routine: null }); toast("Routine removed"); }}>Remove routine</button>}
            </>
          )}
        </section>
      )}

      {tab === "Trainer" && (
        <section className={`${card} max-w-xl p-6`}>
          <h3 className="mb-4 text-xl font-bold">Assigned Trainer</h3>
          <label htmlFor="tr" className={label}>Trainer</label>
          <Select id="tr" disabled={!canManage} value={m.trainerId} onChange={(e) => { patch({ trainerId: e.target.value }); toast("Trainer updated"); }}><option value="">Unassigned</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <p className={hint}>Trainers can see this member and manage their routine once assigned.</p>
        </section>
      )}

      <MotionLink href="/members" title="Back to Members" className={`${btnGhost} mt-6`}><ArrowLeft size={17} /><span className="sr-only">Back to Members</span></MotionLink>

      <Modal open={modal === "pay"} title="Record Payment" onClose={() => setModal(null)} footer={<><MotionButton className={btnGhost} onClick={() => setModal(null)}><LuX size={17} />Cancel</MotionButton><MotionButton className={btnPrimary} onClick={savePay}><LuBanknote size={17} />Save Payment</MotionButton></>}>
        <div><label htmlFor="pm" className={label}>Membership</label><Select id="pm" value={msId} onChange={(e) => { setMsId(e.target.value); const t = m.memberships.find((x) => x.id === e.target.value)!; setAmt(balance(t) > 0 ? balance(t).toFixed(2) : ""); }}>
          {m.memberships.map((x) => <option key={x.id} value={x.id}>{x.planName} · {fmtDate(x.start)} — {money(balance(x))} due</option>)}</Select></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div><label htmlFor="pa" className={label}>Amount</label><input id="pa" inputMode="decimal" className={input} value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
          <div><label htmlFor="pmt" className={label}>Method</label><Select id="pmt" value={method} onChange={(e) => setMethod(e.target.value)}>{PAYMENT_METHODS.map((x) => <option key={x}>{x}</option>)}</Select></div>
          <div><label htmlFor="pd" className={label}>Date</label><input id="pd" type="date" className={input} value={pdate} onChange={(e) => setPdate(e.target.value)} /></div>
        </div>
        {formErr && <p className={errorText}>{formErr}</p>}
      </Modal>

      <Modal open={modal === "renew"} title="Renew Membership" onClose={() => setModal(null)} footer={<><MotionButton className={btnGhost} onClick={() => setModal(null)}><LuX size={17} />Cancel</MotionButton><MotionButton className={btnPrimary} onClick={saveRenew}><LuRefreshCw size={17} />Renew</MotionButton></>}>
        <div><label htmlFor="rpl" className={label}>Plan</label><Select id="rpl" value={renewPlan} onChange={(e) => { setRenewPlan(e.target.value); setRenewEnd(""); }}>{plans.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name} — {money(num(p.price))}</option>)}</Select></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label htmlFor="rs" className={label}>Start date</label><input id="rs" type="date" className={input} value={renewStart} onChange={(e) => setRenewStart(e.target.value)} /></div>
          <div><label htmlFor="re" className={label}>{rp?.type === "session" ? "Expiry date" : "End date"}</label>
            {rp?.type === "session" ? <input id="re" type="date" min={renewStart} className={input} value={renewEnd} onChange={(e) => setRenewEnd(e.target.value)} /> : <input id="re" className={input} disabled value={rEnd} />}</div>
        </div>
        <p className={hint}>No joining fee is charged on renewal.</p>
        {formErr && <p className={errorText}>{formErr}</p>}
      </Modal>

      <Modal open={modal === "assign"} title="Assign Template" onClose={() => setModal(null)} footer={<><MotionButton className={btnGhost} onClick={() => setModal(null)}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} disabled={!tplId} onClick={() => { const t = templates.find((x) => x.id === tplId); if (t) assign(copyRoutine(t)); }}><LuUserCheck size={17} />Assign</MotionButton></>}>
        {templates.length === 0 ? <p className="text-muted">No templates yet — create one in Routine Templates.</p> : <><Select aria-label="Template" value={tplId} onChange={(e) => setTplId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.format === "weekly" ? "Weekly" : "Session-Based"})</option>)}</Select>
          {m.routine && <p className="text-bad">This replaces the member&apos;s current routine.</p>}<p className={hint}>The member gets their own copy; later template edits won&apos;t change it.</p></>}
      </Modal>

      <ConfirmModal open={modal === "customConfirm"} title="Replace current routine?" confirmLabel="Create custom" danger={false} onClose={() => setModal(null)}
        body="This replaces the current routine with a blank custom one." onConfirm={() => assign({ ...blankRoutine("weekly"), id: uid(), name: `${m.firstName}'s routine` })} />
      <ConfirmModal open={modal === "delete"} title="Delete member?" onClose={() => setModal(null)} body={<><b>{fullName(m)}</b> and their payment history will be permanently removed. Cancel the membership instead to keep the records.</>}
        onConfirm={() => { setMembers((l) => l.filter((x) => x.id !== m.id)); toast("Member deleted"); router.push("/members"); }} />
    </>
  );
}
