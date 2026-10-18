"use client";

import { MotionButton, MotionLink } from "@/components/ui/Motion";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft as ArrowLeft, LuArrowRight as ArrowRight, LuCheck as Check, LuPlus as Plus, LuTrash2 as Trash2, LuWandSparkles as Wand2, LuArrowLeft, LuSave } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { useGym } from "@/lib/api";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";
import {
  MIN_DESCRIPTION, STATUS_LABEL, blankPlan, durationLabel, firstPayment, instalmentsTotal, money, newInstalment, num, splitEvenly,
  totalAtJoining, validateStep, type DueUnit, type Plan, type PlanStatus, type StepErrors,
} from "@/lib/plans";
import { TypeBadge } from "./Badges";
import { usePlans } from "./PlansProvider";

const STEPS = ["Basic Information", "Plan Type", "Payments", "Access & Inclusions", "Terms & Conditions"];
type Setter = <K extends keyof Plan>(k: K, v: Plan[K]) => void;

function Money({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-50">
        <span className="grid place-items-center border-r border-line bg-background px-3 text-muted">$</span>
        <input id={id} inputMode="decimal" className="w-full bg-surface px-3 py-2 outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function StepBasic({ p, set, e }: { p: Plan; set: Setter; e: StepErrors }) {
  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor="name" className={label}>Plan name <span className="text-bad">*</span></label>
        <input id="name" className={input} value={p.name} onChange={(ev) => set("name", ev.target.value)} placeholder="e.g. Quarterly Fitness" />
        {e.name && <p className={errorText}>{e.name}</p>}
      </div>
      <div>
        <label htmlFor="desc" className={label}>Description <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="desc" rows={4} className={`${input} resize-y`} value={p.description} onChange={(ev) => set("description", ev.target.value)} />
        <div className="flex justify-between">
          {e.description ? <p className={errorText}>{e.description}</p> : <p className={hint}>If you add one, use at least {MIN_DESCRIPTION} characters.</p>}
          <p className="mt-1 text-xs text-muted">{p.description.trim().length}</p>
        </div>
      </div>
      <div>
        <span className={label}>Plan status</span>
        <div className="flex gap-2">
          {(["draft", "active", "archived"] as PlanStatus[]).map((s) => (
            <button key={s} type="button" onClick={() => set("status", s)} aria-pressed={p.status === s}
              className={`rounded-[10px] border px-4 py-2 font-semibold ${p.status === s ? "border-primary bg-primary-50 text-primary" : "border-line hover:bg-background"}`}>{STATUS_LABEL[s]}</button>
          ))}
        </div>
        <p className={hint}>Only Active plans can be sold to new members.</p>
      </div>
    </div>
  );
}

function StepType({ p, set, e }: { p: Plan; set: Setter; e: StepErrors }) {
  const pick = (type: Plan["type"]) => { set("type", type); set("per", type === "session" ? "session" : "month"); };
  return (
    <div className="grid gap-5">
      <div>
        <span className={label}>Type</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([["time", "Time based", "Access for a period — e.g. a monthly or weekly plan"], ["session", "Session based", "A pack of sessions — e.g. 10 yoga classes"]] as const).map(([v, t, d]) => (
            <button key={v} type="button" onClick={() => pick(v)} aria-pressed={p.type === v}
              className={`rounded-xl border p-4 text-left ${p.type === v ? "border-primary bg-primary-50" : "border-line hover:bg-background"}`}>
              <b className="block">{t}</b><span className="text-muted">{d}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="price" className={label}>Total price <span className="text-bad">*</span></label>
        <Money id="price" value={p.price} onChange={(v) => set("price", v)} error={e.price} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dur" className={label}>Duration <span className="text-bad">*</span></label>
          <input id="dur" type="number" min={1} className={input} value={p.duration} onChange={(ev) => set("duration", ev.target.value)} />
          {e.duration && <p className={errorText}>{e.duration}</p>}
        </div>
        <div>
          <label htmlFor="per" className={label}>Per</label>
          {p.type === "session"
            ? <input id="per" className={input} value="Session" disabled />
            : <select id="per" className={input} value={p.per} onChange={(ev) => set("per", ev.target.value as Plan["per"])}>
                <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
              </select>}
        </div>
      </div>
      {num(p.price) > 0 && Number(p.duration) > 0 && (
        <p className="rounded-[10px] bg-background px-4 py-3">Live look: <b>{money(num(p.price))}</b> {durationLabel(p)}</p>
      )}
    </div>
  );
}

function StepPayments({ p, set, e }: { p: Plan; set: Setter; e: StepErrors }) {
  const total = instalmentsTotal(p);
  const balanced = Math.round(total * 100) === Math.round(num(p.price) * 100);
  const setRows = (rows: Plan["instalments"]) => set("instalments", rows);
  const patchRow = (id: string, d: Partial<Plan["instalments"][number]>) => setRows(p.instalments.map((i) => (i.id === id ? { ...i, ...d } : i)));
  const choose = (s: Plan["schedule"]) => {
    set("schedule", s);
    if (s === "instalments" && p.instalments.length === 0) {
      const amounts = splitEvenly(num(p.price), 3);
      setRows([newInstalment(amounts[0], "0", "days"), newInstalment(amounts[1], "1", "months"), newInstalment(amounts[2], "2", "months")]);
    }
  };
  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor="fee" className={label}>Joining fee</label>
        <Money id="fee" value={p.joiningFee} onChange={(v) => set("joiningFee", v)} error={e.joiningFee} />
      </div>
      <div>
        <span className={label}>Payment schedule</span>
        <div className="flex gap-6">
          {([["full", "Full Payment"], ["instalments", "Instalments"]] as const).map(([v, t]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2"><input type="radio" name="sched" className="h-4 w-4 accent-primary" checked={p.schedule === v} onChange={() => choose(v)} />{t}</label>
          ))}
        </div>
      </div>

      {p.schedule === "instalments" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-bold">Instalment schedule</h4>
            <button type="button" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary" onClick={() => { const a = splitEvenly(num(p.price), p.instalments.length); setRows(p.instalments.map((i, n) => ({ ...i, amount: a[n] }))); }}><Wand2 size={14} />Split evenly</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[480px] text-left">
              <thead className="bg-background text-[13px] text-muted"><tr><th className="px-3 py-2.5">#</th><th>Payment amount</th><th colSpan={2}>Due after start</th><th /></tr></thead>
              <tbody>
                {p.instalments.map((i, n) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="px-3 py-2">{n + 1}</td>
                    <td className="pr-2"><Money id={`amt${n}`} value={i.amount} onChange={(v) => patchRow(i.id, { amount: v })} /></td>
                    <td className="w-24 pr-2"><input aria-label={`Instalment ${n + 1} due after`} type="number" min={0} className={input} value={i.dueAfter} onChange={(ev) => patchRow(i.id, { dueAfter: ev.target.value })} /></td>
                    <td className="w-32 pr-2">
                      <select aria-label={`Instalment ${n + 1} unit`} className={input} value={i.dueUnit} onChange={(ev) => patchRow(i.id, { dueUnit: ev.target.value as DueUnit })}>
                        <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
                      </select>
                    </td>
                    <td className="w-10 pr-2"><button type="button" aria-label={`Remove instalment ${n + 1}`} onClick={() => setRows(p.instalments.filter((x) => x.id !== i.id))} className="text-muted hover:text-bad"><Trash2 size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MotionButton type="button" className={`${btnGhost} mt-3 !text-primary`} onClick={() => setRows([...p.instalments, newInstalment("", String(p.instalments.length), "months")])}><Plus size={16} />Add Instalment</MotionButton>
          <div className={`mt-4 rounded-xl border px-4 py-3 ${balanced ? "border-ok/30 bg-ok-bg text-ok" : "border-bad/30 bg-bad-bg text-bad"}`}>
            <b>Instalments total: {money(total)} / {money(num(p.price))}</b>
            <div className="text-[13px]">{balanced ? `Joining fee of ${money(num(p.joiningFee))} is due with the first payment.` : "The instalments must add up to the plan price."}</div>
          </div>
          {e.instalments && <p className={errorText}>{e.instalments}</p>}
        </div>
      )}
    </div>
  );
}

function StepAccess({ p, toggle }: { p: Plan; toggle: (k: "freeAmenities" | "paidAmenities", a: string) => void }) {
  const [gym] = useGym(); // plans pick from the amenities saved in Gym Profile
  const box = (title: string, desc: string, options: string[], key: "freeAmenities" | "paidAmenities") => (
    <div>
      <h4 className="font-bold">{title}</h4>
      <p className="mb-3 text-muted">{desc}</p>
      {options.length === 0 ? <p className="text-muted">None set up in Gym Profile → Amenities.</p> : (
        <div className="flex flex-wrap gap-2">
          {options.map((a) => {
            const on = p[key].includes(a);
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => toggle(key, a)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium ${on ? "border-primary bg-primary-50 text-primary" : "border-line hover:bg-background"}`}>
                {on && <Check size={14} />}{a}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
  return (
    <div className="grid gap-7">
      {box("Included free amenities", "Choose from the free amenities your gym offers.", gym?.amenities.free ?? [], "freeAmenities")}
      <hr className="border-line" />
      {box("Included paid amenities", "Paid extras this plan includes at no additional charge.", gym?.amenities.paid ?? [], "paidAmenities")}
    </div>
  );
}

function StepTerms({ p, set }: { p: Plan; set: Setter }) {
  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor="cancel" className={label}>Cancellation policy</label>
        <textarea id="cancel" rows={4} className={`${input} resize-y`} value={p.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)} />
      </div>
      <div>
        <label htmlFor="refund" className={label}>Refund policy</label>
        <textarea id="refund" rows={4} className={`${input} resize-y`} value={p.refundPolicy} onChange={(e) => set("refundPolicy", e.target.value)} />
      </div>
    </div>
  );
}

function Preview({ p }: { p: Plan }) {
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between py-1.5"><span className="text-muted">{k}</span><b>{v}</b></div>;
  return (
    <aside className="grid content-start gap-5">
      <section className={`${card} p-5`}>
        <h3 className="mb-3 text-base font-bold">Live Plan Preview</h3>
        <div className="text-2xl font-bold">{p.name || <span className="text-muted">Untitled plan</span>}</div>
        <div className="mt-3"><TypeBadge type={p.type} /></div>
        <div className="mt-3 text-3xl font-bold">{money(num(p.price))}</div>
        <div className="text-xl text-muted">{Number(p.duration) > 0 ? durationLabel(p) : "for —"}</div>
        <hr className="my-4 border-line" />
        {row("Joining fee", money(num(p.joiningFee)))}
        {row("Total payable", money(totalAtJoining(p)))}
        {row("Payment schedule", p.schedule === "instalments" ? `${p.instalments.length} instalments` : "Full payment")}
        {row("First payment", money(firstPayment(p)))}
        {num(p.joiningFee) > 0 && <p className="text-right text-xs text-muted">(includes {money(num(p.joiningFee))} joining fee)</p>}
      </section>
      <section className={`${card} p-5`}>
        <h3 className="mb-2 text-base font-bold">Plan Summary</h3>
        {row("Plan name", p.name || "—")}
        {row("Status", STATUS_LABEL[p.status])}
        {row("Free amenities", p.freeAmenities.length)}
        {row("Paid amenities", p.paidAmenities.length)}
      </section>
    </aside>
  );
}

function Wizard({ initial, editing }: { initial: Plan; editing: boolean }) {
  const { save } = usePlans();
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<Plan>(initial);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [done, setDone] = useState(0); // highest step passed validation
  const set: Setter = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const toggle = (k: "freeAmenities" | "paidAmenities", a: string) =>
    setP((x) => ({ ...x, [k]: x[k].includes(a) ? x[k].filter((y) => y !== a) : [...x[k], a] }));

  const next = () => {
    const e = validateStep(step, p);
    setErrors(e);
    if (Object.keys(e).length) return;
    setDone((d) => Math.max(d, step));
    setStep((s) => s + 1);
  };
  const finish = () => {
    for (let s = 1; s <= 3; s++) { // steps 4–5 are optional
      const e = validateStep(s, p);
      if (Object.keys(e).length) { setStep(s); setErrors(e); return; }
    }
    const id = save(p);
    toast(editing ? "Plan updated" : "Plan created");
    router.push(`/plans/${id}`);
  };
  const saveDraft = () => {
    if (!p.name.trim()) { setStep(1); setErrors({ name: "Give the plan a name to save a draft" }); return; }
    save({ ...p, status: "draft" });
    toast("Draft saved");
    router.push("/plans");
  };
  const goTo = (s: number) => { if (s <= done + 1 || editing) { setStep(s); setErrors({}); } };

  return (
    <>
      <h2 className="mb-5 text-[28px] font-bold tracking-tight">{editing ? `Edit ${initial.name}` : "Create Membership Plan"}</h2>
      <ol className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {STEPS.map((t, i) => {
          const n = i + 1, complete = editing ? n < step : n <= done && n !== step, current = n === step;
          return (
            <li key={t} className="flex items-center gap-3">
              <button type="button" onClick={() => goTo(n)} aria-current={current ? "step" : undefined} className="flex items-center gap-2.5 font-medium">
                <span className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold ${complete ? "border-ok bg-ok text-white" : current ? "border-primary bg-primary text-white" : "border-line bg-surface text-muted"}`}>{complete ? <Check size={16} /> : n}</span>
                <span className={current ? "text-primary" : "text-foreground"}>{t}</span>
              </button>
              {n < STEPS.length && <span className="hidden h-px w-8 bg-line xl:block" />}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`${card} p-6`}>
          <h3 className="mb-5 text-xl font-bold">{STEPS[step - 1]}</h3>
          {step === 1 && <StepBasic p={p} set={set} e={errors} />}
          {step === 2 && <StepType p={p} set={set} e={errors} />}
          {step === 3 && <StepPayments p={p} set={set} e={errors} />}
          {step === 4 && <StepAccess p={p} toggle={toggle} />}
          {step === 5 && <StepTerms p={p} set={set} />}
        </section>
        <Preview p={p} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {step === 1
          ? <MotionLink href={editing ? `/plans/${initial.id}` : "/plans"} className={btnGhost}><ArrowLeft size={17} />Cancel</MotionLink>
          : <MotionButton className={btnGhost} onClick={() => { setStep(step - 1); setErrors({}); }}><ArrowLeft size={17} />Previous</MotionButton>}
        <div className="flex flex-wrap gap-3">
          {!editing && <MotionButton className={btnGhost} onClick={saveDraft}><LuSave size={17} />Save Draft</MotionButton>}
          {step < 5
            ? <MotionButton className={btnPrimary} onClick={next}>Next: {STEPS[step]}<ArrowRight size={17} /></MotionButton>
            : <MotionButton className={btnPrimary} onClick={finish}><LuSave size={17} />{editing ? "Save changes" : "Create plan"}</MotionButton>}
          {editing && step < 5 && <MotionButton className={btnGhost} onClick={finish}><LuSave size={17} />Save changes</MotionButton>}
        </div>
      </div>
    </>
  );
}

export default function PlanWizard({ editing = false }: { editing?: boolean }) {
  const { id } = useParams<{ id?: string }>();
  const { plans, ready } = usePlans();
  if (!editing) return <Wizard initial={blankPlan()} editing={false} />;
  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  const plan = plans.find((x) => x.id === id);
  if (!plan) return <div className={`${card} p-10 text-center`}><h2 className="text-xl font-bold">Plan not found</h2><MotionLink href="/plans" className={`${btnPrimary} mt-4`}><LuArrowLeft size={17} />Back to Plans</MotionLink></div>;
  return <Wizard initial={plan} editing />;
}
