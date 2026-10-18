"use client";

import { MotionButton, MotionLink } from "@/components/ui/Motion";
import { Pagination, usePaged } from "@/components/ui/parts";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuArchive as Archive, LuCopy as Copy, LuEllipsisVertical as MoreVertical, LuPencil as Pencil, LuPlus as Plus, LuPower as Power, LuSearch as Search, LuTrash2 as Trash2 } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import { durationLabel, money, num, type Plan, type PlanStatus, type PlanType } from "@/lib/plans";
import { StatusBadge, TypeBadge } from "./Badges";
import { usePlans } from "./PlansProvider";
import { Can, useAuth } from "@/components/AuthProvider";

const TABS: { id: "all" | PlanStatus; label: string }[] = [
  { id: "all", label: "All Plans" }, { id: "active", label: "Active" }, { id: "draft", label: "Draft" }, { id: "archived", label: "Archived" },
];

function RowMenu({ plan, onDelete }: { plan: Plan; onDelete: () => void }) {
  const { patch, save } = usePlans();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-background";
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  const canToggle = can("Activate/deactivate plans");
  if (!can("Edit plans") && !can("Create plans") && !canToggle && !can("Delete plans")) return null; // nothing to offer this role
  return (
    <div className="relative">
      <button aria-label={`Actions for ${plan.name}`} onClick={() => setOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-line hover:bg-background"><MoreVertical size={16} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 min-w-[190px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl">
            {can("Edit plans") && <button className={item} onClick={run(() => router.push(`/plans/${plan.id}/edit`))}><Pencil size={16} />Edit plan</button>}
            {can("Create plans") && <button className={item} onClick={run(() => { save({ ...plan, id: "", name: `${plan.name} (copy)`, status: "draft" }); toast("Plan duplicated as draft"); })}><Copy size={16} />Duplicate</button>}
            {canToggle && (plan.status === "active"
              ? <button className={item} onClick={run(() => { patch(plan.id, { status: "archived" }); toast("Plan archived"); })}><Archive size={16} />Archive</button>
              : <button className={item} onClick={run(() => { patch(plan.id, { status: "active" }); toast("Plan activated"); })}><Power size={16} />Activate</button>)}
            {can("Delete plans") && <button className={`${item} text-bad`} onClick={run(onDelete)}><Trash2 size={16} />Delete</button>}
          </div>
        </>
      )}
    </div>
  );
}

export default function PlansList() {
  const { plans, ready, remove } = usePlans();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | PlanStatus>("all");
  const [type, setType] = useState<"all" | PlanType>("all");
  const [deleting, setDeleting] = useState<Plan | null>(null);

  const shown = plans.filter((p) =>
    (status === "all" || p.status === status) && (type === "all" || p.type === type) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(shown, 8, `${status}|${type}|${q}`);
  const count = (s: "all" | PlanStatus) => (s === "all" ? plans.length : plans.filter((p) => p.status === s).length);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[28px] font-bold tracking-tight">Membership Plans</h2>
        <Can perm="Create plans"><MotionLink href="/plans/new" className={btnPrimary}><Plus size={18} />Create Plan</MotionLink></Can>
      </div>

      <div className={`${card} mb-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_200px_200px]`}>
        <label className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`${input} pl-10`} placeholder="Search plans…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label="Status" className={input} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All Statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select aria-label="Type" className={input} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">All Types</option><option value="time">Time based</option><option value="session">Session based</option>
        </select>
      </div>

      <div className="mb-3 flex gap-1 border-b border-line px-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setStatus(t.id)}
            className={`border-b-2 px-4 py-2.5 font-semibold ${status === t.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
            {t.label} <span className="ml-1 text-xs opacity-70">{count(t.id)}</span>
          </button>
        ))}
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-line text-[13px] text-muted">
              {["Plan Name", "Type", "Price & Duration", "Payment Schedule", "Status", "Actions"].map((h) => <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {!ready && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">Loading plans…</td></tr>}
            {ready && shown.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">
                {plans.length === 0 ? "No plans yet. Create your first membership plan." : "No plans match your filters."}
              </td></tr>
            )}
            {pg.view.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-5 py-4"><Link href={`/plans/${p.id}`} className="text-base font-semibold text-primary-600 underline-offset-2 hover:underline">{p.name}</Link></td>
                <td className="px-5 py-4"><TypeBadge type={p.type} /></td>
                <td className="px-5 py-4"><b className="block text-base">{money(num(p.price))}</b><span className="text-muted">{durationLabel(p)}</span></td>
                <td className="px-5 py-4">{p.schedule === "instalments" ? "Instalments" : "Full Payment"}</td>
                <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <MotionLink href={`/plans/${p.id}`} className={btnGhost}>View Details</MotionLink>
                    <RowMenu plan={p} onDelete={() => setDeleting(p)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pg} noun="plans" />
      </div>

      <Modal open={!!deleting} title="Delete plan?" onClose={() => setDeleting(null)}
        footer={<>
          <MotionButton className={btnGhost} onClick={() => setDeleting(null)}>Cancel</MotionButton>
          <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white" onClick={() => { if (deleting) { remove(deleting.id); toast("Plan deleted"); } setDeleting(null); }}>Delete</button>
        </>}>
        <p><b>{deleting?.name}</b> will be removed permanently. Archive it instead if members are still on this plan.</p>
      </Modal>
    </>
  );
}
