"use client";

import { MotionButton, MotionLink } from "@/components/ui/Motion";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { LuArrowLeft as ArrowLeft, LuCamera as Camera } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { Avatar, Select } from "@/components/ui/parts";
import { today } from "@/lib/dates";
import { MEMBERS_KEY, PAYMENT_METHODS, balance, blankMember, buildMembership, charges, endDate, fullName, memberNo, type Member } from "@/lib/members";
import { PEOPLE_KEY, isValidEmail, type Person } from "@/lib/people";
import { money, num, type Plan } from "@/lib/plans";
import { blankRoutine, copyRoutine, type Routine } from "@/lib/routines";
import { uid } from "@/lib/id";
import { useGym, useResource } from "@/lib/api";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

import { LEADS_KEY, type Lead } from "@/lib/leads";

type Errors = Record<string, string>;

/** Shrinks a profile photo to a ~160px JPEG so it fits in localStorage. */
function toThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = 160, side = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = s;
      c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className={`${card} p-6`}><h3 className="mb-4 text-xl font-bold">{title}</h3><div className="grid gap-4 md:grid-cols-2">{children}</div></section>
);
const Field = ({ id, title, req, error, children, wide }: { id: string; title: string; req?: boolean; error?: string; children: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? "md:col-span-2" : ""}><label htmlFor={id} className={label}>{title} {req && <span className="text-bad">*</span>}</label>{children}{error && <p className={errorText}>{error}</p>}</div>
);

function Form({ initial, editing, lead }: { initial: Member; editing: boolean; lead?: Lead }) {
  const toast = useToast(); const router = useRouter();
  const [members, setMembers] = useResource<Member>(MEMBERS_KEY);
  const [gym] = useGym();
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [plans] = useResource<Plan>("plans");
  const [templates] = useResource<Routine>("routines");
  const [, setLeads] = useResource<Lead>(LEADS_KEY);
  const [m, setM] = useState<Member>(initial);
  const [planId, setPlanId] = useState(lead?.planId ?? ""); const [start, setStart] = useState(lead?.expectedStart || today()); const [manualEnd, setManualEnd] = useState("");
  const [extras, setExtras] = useState<Record<string, string>>({}); // amenity → price text (present = selected)
  const [payAmount, setPayAmount] = useState(""); const [payMethod, setPayMethod] = useState("Card"); const [payDate, setPayDate] = useState(today());
  const [routineChoice, setRoutineChoice] = useState("none");
  const [errors, setErrors] = useState<Errors>({});
  const photoRef = useRef<HTMLInputElement>(null);

  const plan = plans.find((p) => p.id === planId);
  const end = plan ? (plan.type === "time" ? endDate(plan, start) : manualEnd) : "";
  const extraList = Object.entries(extras).map(([name, p]) => ({ name, price: num(p) }));
  const ms = plan ? buildMembership(plan, start, end, extraList) : null;
  const total = ms ? charges(ms) : 0;
  const trainers = people.filter((p) => p.roleId === "trainer" && p.status === "active");
  const set = <K extends keyof Member>(k: K, v: Member[K]) => setM((x) => ({ ...x, [k]: v }));

  const submit = () => {
    const e: Errors = {};
    if (!m.firstName.trim()) e.firstName = "First name is required";
    if (!m.lastName.trim()) e.lastName = "Last name is required";
    if (!isValidEmail(m.email)) e.email = "Enter a valid email address";
    else if (members.some((x) => x.id !== m.id && x.email.toLowerCase() === m.email.trim().toLowerCase())) e.email = "A member with this email already exists";
    if (!editing) {
      if (!plan) e.plan = "Select a membership plan";
      if (!start) e.start = "Start date is required";
      if (plan?.type === "session") { if (!manualEnd) e.end = "Choose an expiry date for the session pack"; else if (manualEnd < start) e.end = "Expiry can't be before the start date"; }
      if (Object.entries(extras).some(([, p]) => p.trim() !== "" && !(num(p) >= 0))) e.extras = "Extra prices must be 0 or more";
      if (payAmount.trim() !== "") {
        if (!(num(payAmount) >= 0)) e.pay = "Enter a valid amount";
        else if (num(payAmount) > total) e.pay = `Amount can't exceed the total of ${money(total)}`;
        else if (num(payAmount) > 0 && !payDate) e.pay = "Choose the payment date";
      }
    }
    setErrors(e);
    if (Object.keys(e).length) { document.querySelector("[data-error]")?.scrollIntoView({ block: "center" }); return; }

    const base: Member = { ...m, firstName: m.firstName.trim(), lastName: m.lastName.trim(), email: m.email.trim() };
    if (editing) {
      setMembers((l) => l.map((x) => (x.id === base.id ? base : x)));
      toast("Member updated"); router.push(`/members/${base.id}`); return;
    }
    const full: Membership2 = ms!;
    if (num(payAmount) > 0) full.payments.push({ id: uid(), amount: num(payAmount), method: payMethod, date: payDate });
    const tpl = templates.find((t) => t.id === routineChoice);
    const routine = routineChoice === "custom" ? { ...blankRoutine("weekly"), id: uid(), name: `${base.firstName}'s routine` } : tpl ? copyRoutine(tpl) : null;
    const nextNo = Math.max(0, ...members.map((x) => parseInt(x.memberNo.replace(/\D/g, ""), 10) || 0)) + 1;
    const created: Member = { ...base, id: uid(), memberNo: memberNo(nextNo), memberships: [full], routine, joinedAt: today() };
    setMembers((l) => [created, ...l]);
    if (lead) setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, stage: "joined", reason: "", customReason: "" } : x))); // converting closes the lead
    // spec: creating a member emails a confirmation link; joining_status stays sent_invitation until they confirm
    toast(`Confirmation email sent to ${created.email}`); router.push(`/members/${created.id}`);
  };

  const text = (k: "firstName" | "lastName" | "email" | "phone" | "address" | "city" | "country" | "nationality", props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    <input id={k} className={input} value={m[k]} onChange={(e) => set(k, e.target.value)} {...props} />;
  const err = (k: string) => (errors[k] ? { "data-error": true } : {});

  return (
    <>
      <nav className="mb-3 text-muted"><Link href="/members" className="hover:text-foreground">Members</Link> / <b className="text-foreground">{editing ? `Edit ${fullName(initial)}` : "Add Member"}</b></nav>
      <h2 className="mb-5 text-[28px] font-bold tracking-tight">{editing ? `Edit ${fullName(initial)}` : "Add Member"}</h2>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <Section title="Basic Information">
            <Field id="firstName" title="First name" req error={errors.firstName}><span {...err("firstName")}>{text("firstName")}</span></Field>
            <Field id="lastName" title="Last name" req error={errors.lastName}><span {...err("lastName")}>{text("lastName")}</span></Field>
            <Field id="email" title="Email" req error={errors.email}><span {...err("email")}>{text("email", { type: "email" })}</span></Field>
            <Field id="phone" title="Phone number (optional)">{text("phone", { type: "tel" })}</Field>
          </Section>

          <Section title="Additional Information">
            <div className="flex items-center gap-4 md:col-span-2">
              <Avatar name={fullName(m) || "?"} src={m.photo} size={64} />
              <div><MotionButton type="button" className={btnGhost} onClick={() => photoRef.current?.click()}><Camera size={17} />{m.photo ? "Change photo" : "Upload photo"}</MotionButton>
                {m.photo && <button type="button" className="ml-3 font-semibold text-bad" onClick={() => set("photo", "")}>Remove</button>}
                <p className={hint}>Optional. JPG, PNG or WebP.</p></div>
              <input ref={photoRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { set("photo", await toThumb(f)); } catch { toast("Couldn't read that image"); } } e.target.value = ""; }} />
            </div>
            <Field id="address" title="Address" wide>{text("address")}</Field>
            <Field id="city" title="City">{text("city")}</Field>
            <Field id="country" title="Country">{text("country")}</Field>
            <Field id="dob" title="Date of birth"><input id="dob" type="date" max={today()} className={input} value={m.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field id="sex" title="Sex"><Select id="sex" value={m.sex} onChange={(e) => set("sex", e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></Select></Field>
            <Field id="nationality" title="Nationality">{text("nationality")}</Field>
          </Section>

          <Section title="Emergency Contact">
            <Field id="ecn" title="Name"><input id="ecn" className={input} value={m.emergency.name} onChange={(e) => set("emergency", { ...m.emergency, name: e.target.value })} /></Field>
            <Field id="ecp" title="Phone number"><input id="ecp" type="tel" className={input} value={m.emergency.phone} onChange={(e) => set("emergency", { ...m.emergency, phone: e.target.value })} /></Field>
            <Field id="ecr" title="Relationship"><input id="ecr" className={input} value={m.emergency.relationship} onChange={(e) => set("emergency", { ...m.emergency, relationship: e.target.value })} /></Field>
          </Section>

          {!editing && (
            <>
              <Section title="Membership">
                <Field id="plan" title="Membership plan" req error={errors.plan} wide>
                  <span {...err("plan")}><Select id="plan" value={planId} onChange={(e) => { setPlanId(e.target.value); setManualEnd(""); }}>
                    <option value="">Select an active plan…</option>
                    {plans.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name} — {money(num(p.price))}</option>)}
                  </Select></span>
                </Field>
                <Field id="start" title="Start date" req error={errors.start}><input id="start" type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} /><p className={hint}>Defaults to today; past or future dates are allowed.</p></Field>
                <Field id="end" title={plan?.type === "session" ? "Expiry date" : "End date"} req={plan?.type === "session"} error={errors.end}>
                  {plan?.type === "session"
                    ? <span {...err("end")}><input id="end" type="date" min={start} className={input} value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} /></span>
                    : <input id="end" className={input} value={end} disabled placeholder="Calculated from plan" />}
                  <p className={hint}>{plan?.type === "session" ? "Session packs expire on the date you choose." : "Calculated from the start date and plan duration."}</p>
                </Field>
              </Section>

              <Section title="Extra Paid Amenities">
                <div className="grid gap-2 md:col-span-2">
                  <p className="text-muted">Extras that aren&apos;t included in the plan. Set the price charged to this member.</p>
                  {(gym?.amenities.paid ?? []).map((a) => {
                    const included = plan?.paidAmenities.includes(a); const on = a in extras;
                    return (
                      <div key={a} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                        <label className="flex flex-1 cursor-pointer items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-primary" disabled={included} checked={on}
                          onChange={(e) => setExtras((x) => { const n = { ...x }; if (e.target.checked) n[a] = "5.00"; else delete n[a]; return n; })} />{a}
                          {included && <span className="text-xs text-muted">included in plan</span>}</label>
                        {on && <div className="flex w-32 overflow-hidden rounded-[10px] border border-line"><span className="bg-background px-2.5 py-2 text-muted">$</span><input aria-label={`${a} price`} className="w-full px-2 outline-none" value={extras[a]} onChange={(e) => setExtras((x) => ({ ...x, [a]: e.target.value }))} /></div>}
                      </div>
                    );
                  })}
                  {errors.extras && <p className={errorText}>{errors.extras}</p>}
                </div>
              </Section>

              <Section title="Initial Payment">
                <Field id="payAmt" title="Amount received" error={errors.pay}><div className="flex overflow-hidden rounded-[10px] border border-line"><span className="bg-background px-3 py-2 text-muted">$</span><input id="payAmt" inputMode="decimal" className="w-full px-3 outline-none" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div></Field>
                <Field id="payM" title="Payment method"><Select id="payM" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>{PAYMENT_METHODS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
                <Field id="payD" title="Payment date"><input id="payD" type="date" className={input} value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
              </Section>
            </>
          )}

          <Section title="Trainer & Routine">
            <Field id="trainer" title="Trainer (optional)"><Select id="trainer" value={m.trainerId} onChange={(e) => set("trainerId", e.target.value)}><option value="">Unassigned</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            {!editing && <Field id="routine" title="Routine (optional)"><Select id="routine" value={routineChoice} onChange={(e) => setRoutineChoice(e.target.value)}>
              <option value="none">No routine</option><optgroup label="From a template">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup><option value="custom">Create a custom routine</option></Select>
              <p className={hint}>Templates are copied — changes only apply to this member.</p></Field>}
          </Section>

          <Section title="Status & Notes">
            <Field id="joining" title="Joining status"><Select id="joining" value={m.joiningStatus} onChange={(e) => set("joiningStatus", e.target.value as Member["joiningStatus"])}><option value="sent_invitation">Sent invitation</option><option value="joined">Joined</option></Select>
              {!editing && <p className={hint}>A confirmation email with a link is sent to the member when you save.</p>}</Field>
            <Field id="notes" title="Internal notes (optional)" wide><textarea id="notes" rows={3} className={`${input} resize-y`} value={m.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          </Section>
        </div>

        <aside className={`${card} sticky top-20 p-5`}>
          <h3 className="mb-3 text-lg font-bold">{editing ? "Member" : "Summary"}</h3>
          <div className="mb-3 flex items-center gap-3"><Avatar name={fullName(m) || "?"} src={m.photo} size={48} /><div><b className="block">{fullName(m) || "New member"}</b><span className="text-muted">{m.email || "—"}</span></div></div>
          {!editing && (
            <dl className="grid gap-1.5 border-t border-line pt-3">
              {[["Plan", plan?.name ?? "—"], ["Plan price", ms ? money(ms.price) : "—"], ["Joining fee", ms ? money(ms.joiningFee) : "—"], ["Extras", money(extraList.reduce((s, x) => s + x.price, 0))]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-semibold">Total charges</dt><dd className="font-bold">{money(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Received now</dt><dd className="font-medium text-ok">{money(num(payAmount))}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Balance</dt><dd className="font-medium">{money(ms ? balance({ ...ms, payments: [{ id: "x", amount: num(payAmount), method: "", date: "" }] }) : 0)}</dd></div>
            </dl>
          )}
        </aside>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <MotionLink href={editing ? `/members/${initial.id}` : "/members"} className={btnGhost}><ArrowLeft size={17} />Cancel</MotionLink>
        <MotionButton className={btnPrimary} onClick={submit}>{editing ? "Save changes" : "Add Member"}</MotionButton>
      </div>
    </>
  );
}
type Membership2 = ReturnType<typeof buildMembership>;

/** Add Member, optionally prefilled from a lead (?lead=<id>). */
function NewMember() {
  const leadId = useSearchParams().get("lead");
  const [leads, , ready] = useResource<Lead>(LEADS_KEY);
  if (leadId && !ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
  const initial: Member = lead
    ? { ...blankMember(), firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone, notes: lead.notes.join("\n") }
    : blankMember();
  return <Form key={lead?.id ?? "blank"} initial={initial} editing={false} lead={lead} />;
}

export default function MemberForm({ editing = false }: { editing?: boolean }) {
  const { id } = useParams<{ id?: string }>();
  const [members, , ready] = useResource<Member>(MEMBERS_KEY);
  if (!editing) return <NewMember />;
  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  const found = members.find((x) => x.id === id);
  if (!found) return <div className={`${card} p-10 text-center`}><h2 className="text-xl font-bold">Member not found</h2><MotionLink href="/members" className={`${btnPrimary} mt-4`}>Back to Members</MotionLink></div>;
  return <Form initial={found} editing />;
}
