"use client";

import { MotionLink } from "@/components/ui/Motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LuEllipsis as MoreHorizontal, LuPlus as Plus, LuSearch as Search } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { Avatar, ConfirmModal, Dot, Pagination, Pill, Select } from "@/components/ui/parts";
import { balance, currentMembership, fullName, isExpiringSoon, memberStatus, paymentStatus, MEMBERS_KEY, type Member, type MemberStatus, type PaymentStatus } from "@/lib/members";
import { fmtDate, today } from "@/lib/dates";
import { PEOPLE_KEY, type Person } from "@/lib/people";
import { money, type Plan } from "@/lib/plans";
import { useResource } from "@/lib/api";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import { Can, useAuth } from "@/components/AuthProvider";

const PAGE = 8;
const TABS = [["all", "All Members"], ["active", "Active"], ["expiring", "Expiring Soon"], ["expired", "Expired"], ["scheduled", "Scheduled"]] as const;
const STATUS_TONE: Record<MemberStatus, "green" | "blue" | "amber" | "gray" | "red"> = { active: "green", scheduled: "blue", paused: "amber", expired: "gray", cancelled: "red" };
const PAY_TONE: Record<PaymentStatus, "green" | "amber" | "red"> = { paid: "green", partial: "amber", unpaid: "red" };
const PAY_LABEL: Record<PaymentStatus, string> = { paid: "Fully paid", partial: "Partially paid", unpaid: "Unpaid" };
const label = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function MembersList() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { can, trainerOnly, user } = useAuth();
  const [members, setMembers, ready] = useResource<Member>(MEMBERS_KEY);
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [plans] = useResource<Plan>("plans");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const [q, setQ] = useState(""); const [planF, setPlanF] = useState("all"); const [payF, setPayF] = useState("all");
  const [trainerF, setTrainerF] = useState(params.get("trainer") ?? "all");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  // changing any filter returns to page 1
  const f = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const trainers = people.filter((p) => p.roleId === "trainer");
  const trainerName = (id: string) => people.find((p) => p.id === id)?.name || "Unassigned";
  const now = today();

  const rows = members.filter((m) => {
    const ms = currentMembership(m); if (!ms) return false;
    if (trainerOnly && m.trainerId !== user?.id) return false; // trainers only see their assigned members
    const st = memberStatus(m, now);
    if (tab === "active" && st !== "active") return false;
    if (tab === "expiring" && !isExpiringSoon(m, now)) return false;
    if (tab === "expired" && st !== "expired") return false;
    if (tab === "scheduled" && st !== "scheduled") return false;
    if (planF !== "all" && ms.planId !== planF) return false;
    if (payF !== "all" && paymentStatus(ms) !== payF) return false;
    if (trainerF === "none" ? m.trainerId : trainerF !== "all" && m.trainerId !== trainerF) return false;
    return `${fullName(m)} ${m.email} ${m.phone}`.toLowerCase().includes(q.trim().toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const patch = (id: string, p: Partial<Member>) => setMembers((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const th = "px-5 py-3.5 font-semibold";

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[34px] font-bold tracking-tight">Members</h2>
        <Can perm="Create members"><MotionLink href="/members/new" className={btnPrimary}><Plus size={18} />Add Member</MotionLink></Can>
      </div>
      <div className={`${card} mb-4 inline-flex max-w-full gap-1 overflow-x-auto p-1.5`}>
        {TABS.map(([id, t]) => <button key={id} onClick={() => f(setTab)(id)} className={`whitespace-nowrap rounded-[10px] px-5 py-2.5 font-medium ${tab === id ? "bg-primary-50 font-semibold text-primary" : "text-foreground hover:bg-background"}`}>{t}</button>)}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[minmax(0,1fr)_190px_180px_180px]">
          <label className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className={`${input} pl-10`} placeholder="Search name, email or phone…" value={q} onChange={(e) => f(setQ)(e.target.value)} /></label>
          <Select aria-label="Plan" value={planF} onChange={(e) => f(setPlanF)(e.target.value)}><option value="all">All Plans</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select aria-label="Payment status" value={payF} onChange={(e) => f(setPayF)(e.target.value)}><option value="all">Payment Status</option><option value="paid">Fully paid</option><option value="partial">Partially paid</option><option value="unpaid">Unpaid</option></Select>
          <Select aria-label="Trainer" value={trainerF} onChange={(e) => f(setTrainerF)(e.target.value)}><option value="all">All Trainers</option><option value="none">Unassigned</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}</Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-background text-[13px] text-muted"><tr>{["Member", "Membership Plan", "Status", "Payment", "Expiry / Sessions", "Trainer", "Actions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {!ready && <tr><td colSpan={7} className="p-10 text-center text-muted">Loading members…</td></tr>}
              {ready && view.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted">{members.length ? "No members match your filters." : "No members yet. Add your first member."}</td></tr>}
              {view.map((m) => {
                const ms = currentMembership(m); const st = memberStatus(m, now); const pay = paymentStatus(ms); const soon = isExpiringSoon(m, now);
                return (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-5 py-3.5"><Link href={`/members/${m.id}`} className="flex items-center gap-3"><Avatar name={fullName(m)} src={m.photo} size={44} /><span><b className="block">{fullName(m)}</b><span className="text-muted">{m.email}</span></span></Link></td>
                    <td className="px-5">{ms.planName}</td>
                    <td className="px-5"><Pill tone={STATUS_TONE[st]}><Dot tone={STATUS_TONE[st]} />{label(st)}</Pill>{m.joiningStatus === "sent_invitation" && <span className="mt-1 block text-xs text-muted">Invitation sent</span>}</td>
                    <td className="px-5"><Pill tone={PAY_TONE[pay]}><Dot tone={PAY_TONE[pay]} />{PAY_LABEL[pay]}</Pill>{pay !== "paid" && <span className="mt-1 block text-[13px] text-muted">{money(balance(ms))} due</span>}</td>
                    <td className="px-5">
                      {ms.type === "session" ? <><b className="block font-medium">{ms.sessionsTotal - ms.sessionsUsed} of {ms.sessionsTotal} left</b><span className="text-[13px] text-muted">Expires {fmtDate(ms.end)}</span></>
                        : st === "scheduled" ? <><span className="block">Starts {fmtDate(ms.start)}</span><span className="text-muted">Ends {fmtDate(ms.end)}</span></>
                        : <><span className={`block ${soon ? "font-semibold text-warn" : ""}`}>{fmtDate(ms.end)}</span>{soon && <span className="text-[13px] text-warn">Expiring soon</span>}</>}
                    </td>
                    <td className="px-5">{trainerName(m.trainerId)}</td>
                    <td className="px-5">
                      <div className="flex items-center gap-2">
                        <MotionLink href={`/members/${m.id}`} className={`${btnGhost} !px-3.5 !py-2 !text-primary-600`}>View Details</MotionLink>
                        {(can("Edit members") || can("Manage member information") || can("Delete members")) && <div className="relative">
                          <button aria-label={`Actions for ${fullName(m)}`} onClick={() => setMenu(menu === m.id ? null : m.id)} className="rounded-lg p-2 text-muted hover:bg-background"><MoreHorizontal size={18} /></button>
                          {menu === m.id && (<>
                            <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                            <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl" onClick={() => setMenu(null)}>
                              {can("Edit members") && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => router.push(`/members/${m.id}/edit`)}>Edit member</button>}
                              {can("Manage member information") && (m.hold === "paused" ? <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch(m.id, { hold: "" }); toast("Membership resumed"); }}>Resume membership</button>
                                : st === "active" && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch(m.id, { hold: "paused" }); toast("Membership paused"); }}>Pause membership</button>)}
                              {can("Manage member information") && m.hold !== "cancelled" && st !== "expired" && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { patch(m.id, { hold: "cancelled" }); toast("Membership cancelled"); }}>Cancel membership</button>}
                              {can("Delete members") && <button className="block w-full rounded-lg px-3 py-2 text-left text-bad hover:bg-background" onClick={() => setDeleting(m)}>Delete member</button>}
                            </div>
                          </>)}
                        </div>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={Math.min(page, pages)} pages={pages} onPage={setPage} total={rows.length} size={PAGE} shown={view.length} />
      </div>

      <ConfirmModal open={!!deleting} title="Delete member?" onClose={() => setDeleting(null)}
        body={<><b>{deleting && fullName(deleting)}</b> and their payment history will be permanently removed. Cancel the membership instead to keep the records.</>}
        onConfirm={() => { if (deleting) { setMembers((l) => l.filter((m) => m.id !== deleting.id)); toast("Member deleted"); } setDeleting(null); }} />
    </>
  );
}
