"use client";

import { MotionButton, MotionLink } from "@/components/ui/Motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft as ArrowLeft, LuEllipsisVertical as MoreVertical, LuPencil as Pencil, LuArrowLeft, LuX } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { btnGhost, btnPrimary, card } from "@/lib/ui";
import { durationLabel, instalmentsTotal, money, num, totalAtJoining } from "@/lib/plans";
import { StatusBadge, TypeBadge } from "./Badges";
import { usePlans } from "./PlansProvider";
import { Can, useAuth } from "@/components/AuthProvider";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-4"><div className="text-muted">{label}</div><div className="mt-0.5 text-[15px]">{children || <span className="text-muted">—</span>}</div></div>
);
const Chips = ({ items }: { items: string[] }) =>
  items.length ? <div className="flex flex-wrap gap-2">{items.map((i) => <span key={i} className="rounded-full bg-primary-50 px-3.5 py-1.5 font-medium text-primary-600">{i}</span>)}</div> : <span className="text-muted">None selected</span>;

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { plans, ready, patch, remove } = usePlans();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const plan = plans.find((p) => p.id === id);

  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  if (!plan) return (
    <div className={`${card} p-10 text-center`}>
      <h2 className="text-xl font-bold">Plan not found</h2>
      <p className="mb-4 mt-1 text-muted">It may have been deleted.</p>
      <MotionLink href="/plans" className={btnPrimary}><LuArrowLeft size={17} />Back to Plans</MotionLink>
    </div>
  );

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-background";
  return (
    <>
      <nav className="mb-3 text-muted"><Link href="/plans" className="hover:text-foreground">Membership Plans</Link> <span className="mx-1.5">/</span> <b className="text-foreground">{plan.name}</b></nav>
      <div className="mb-5 flex items-center gap-4">
        <h2 className="text-[34px] font-bold tracking-tight">{plan.name}</h2>
        <StatusBadge status={plan.status} />
        <div className="ml-auto flex items-center gap-3">
          <Can perm="Edit plans"><MotionLink href={`/plans/${plan.id}/edit`} className={btnPrimary}><Pencil size={17} />Edit Plan</MotionLink></Can>
          {(can("Activate/deactivate plans") || can("Delete plans")) && <div className="relative">
            <button aria-label="More actions" onClick={() => setMenu((v) => !v)} className="grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-surface"><MoreVertical size={18} /></button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-11 z-20 min-w-[190px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl">
                  {can("Activate/deactivate plans") && (plan.status === "active"
                    ? <button className={item} onClick={() => { patch(plan.id, { status: "archived" }); setMenu(false); toast("Plan archived"); }}>Archive plan</button>
                    : <button className={item} onClick={() => { patch(plan.id, { status: "active" }); setMenu(false); toast("Plan activated"); }}>Activate plan</button>)}
                  {can("Delete plans") && <button className={`${item} text-bad`} onClick={() => { setMenu(false); setConfirm(true); }}>Delete plan</button>}
                </div>
              </>
            )}
          </div>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className={`${card} p-6`}>
          <h3 className="mb-4 text-xl font-bold">Basic Information</h3>
          <Field label="Plan Name">{plan.name}</Field>
          <Field label="Description">{plan.description}</Field>
          <hr className="mb-4 border-line" />
          <div className="flex items-center gap-8"><span className="text-muted">Plan Status</span><StatusBadge status={plan.status} /></div>
        </section>

        <section className={`${card} p-6`}>
          <h3 className="mb-4 text-xl font-bold">Plan Type</h3>
          <TypeBadge type={plan.type} large />
          <div className="mt-4 text-[28px] font-bold">{money(num(plan.price))}</div>
          <div className="text-xl text-muted">{durationLabel(plan)}</div>
          <hr className="my-4 border-line" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Total Price">{money(num(plan.price))}</Field>
            <Field label="Total Units">{plan.duration}</Field>
            <Field label="Unit"><span className="capitalize">{plan.per}</span></Field>
          </div>
        </section>

        <section className={`${card} p-6`}>
          <h3 className="mb-4 text-xl font-bold">Payments</h3>
          <Field label="Joining Fee">{money(num(plan.joiningFee))}</Field>
          <Field label="Payment Schedule">{plan.schedule === "instalments" ? "Instalments" : "Full Payment"}</Field>
          {plan.schedule === "instalments" && (
            <table className="mb-4 w-full text-left text-[13px]">
              <thead className="text-muted"><tr><th className="py-1.5">#</th><th>Amount</th><th>Due after start</th></tr></thead>
              <tbody>{plan.instalments.map((i, n) => <tr key={i.id} className="border-t border-line"><td className="py-1.5">{n + 1}</td><td>{money(num(i.amount))}</td><td>{i.dueAfter} {i.dueUnit}</td></tr>)}</tbody>
              <tfoot><tr className="border-t border-line font-semibold"><td /><td className="py-1.5">{money(instalmentsTotal(plan))}</td><td /></tr></tfoot>
            </table>
          )}
          <hr className="mb-4 border-line" />
          <Field label="Total at joining"><b className="text-lg">{money(totalAtJoining(plan))}</b></Field>
        </section>

        <section className={`${card} p-6`}>
          <h3 className="mb-4 text-xl font-bold">Access &amp; Inclusions</h3>
          <div className="mb-2 text-muted">Included Free Amenities</div>
          <Chips items={plan.freeAmenities} />
          <hr className="my-4 border-line" />
          <div className="mb-2 text-muted">Included Paid Amenities</div>
          <Chips items={plan.paidAmenities} />
          {plan.paidAmenities.length > 0 && <p className="mt-3 text-[13px] text-muted">Included in this plan at no additional charge.</p>}
        </section>
      </div>

      <section className={`${card} mt-5 grid grid-cols-1 gap-6 p-6 md:grid-cols-2`}>
        <div className="md:col-span-2"><h3 className="text-xl font-bold">Terms &amp; Conditions</h3></div>
        <Field label="Cancellation Policy">{plan.cancellationPolicy}</Field>
        <Field label="Refund Policy">{plan.refundPolicy}</Field>
      </section>

      <MotionLink href="/plans" title="Back to Plans" className={`${btnGhost} mt-5`}><ArrowLeft size={17} /><span className="sr-only">Back to Plans</span></MotionLink>

      <Modal open={confirm} title="Delete plan?" onClose={() => setConfirm(false)}
        footer={<>
          <MotionButton className={btnGhost} onClick={() => setConfirm(false)}><LuX size={17} />Cancel</MotionButton>
          <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white" onClick={() => { remove(plan.id); toast("Plan deleted"); router.push("/plans"); }}>Delete</button>
        </>}>
        <p><b>{plan.name}</b> will be removed permanently. Archive it instead if members are still on this plan.</p>
      </Modal>
    </>
  );
}
