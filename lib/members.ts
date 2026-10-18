// Member model (spec: "Members"). Statuses and payment status are derived, never stored, so they can't go stale.
import { addDays, addMonths, daysBetween, today } from "./dates";
import { uid } from "./id";
import type { Plan } from "./plans";
import { num } from "./plans";
import { SEED_ROUTINES, copyRoutine, type Routine } from "./routines";

export type Payment = { id: string; amount: number; method: string; date: string };
export type Membership = {
  id: string; planId: string; planName: string; type: "time" | "session"; price: number; joiningFee: number;
  extras: { name: string; price: number }[]; start: string; end: string; sessionsTotal: number; sessionsUsed: number; payments: Payment[];
};
export type Member = {
  id: string; memberNo: string; firstName: string; lastName: string; email: string; phone: string;
  address: string; city: string; country: string; dob: string; sex: string; nationality: string;
  emergency: { name: string; phone: string; relationship: string };
  memberships: Membership[]; trainerId: string; routine: Routine | null;
  joiningStatus: "joined" | "sent_invitation"; notes: string; joinedAt: string; hold: "" | "paused" | "cancelled";
  photo: string; // small data-URL thumbnail ("" = none)
};

export type MemberStatus = "scheduled" | "active" | "paused" | "expired" | "cancelled";
export type PaymentStatus = "paid" | "partial" | "unpaid";
export const MEMBERS_KEY = "members";
export const PAYMENT_METHODS = ["Card", "Cash", "Bank transfer", "Direct debit", "Other"];
export const EXPIRING_DAYS = 14;

export const fullName = (m: Pick<Member, "firstName" | "lastName">) => `${m.firstName} ${m.lastName}`.trim();
export const currentMembership = (m: Member) => [...m.memberships].sort((a, b) => b.start.localeCompare(a.start))[0];

export const charges = (ms: Membership) => ms.price + ms.joiningFee + ms.extras.reduce((s, e) => s + e.price, 0);
export const paidAmount = (ms: Membership) => ms.payments.reduce((s, p) => s + p.amount, 0);
export const balance = (ms: Membership) => Math.max(0, Math.round((charges(ms) - paidAmount(ms)) * 100) / 100);
export function paymentStatus(ms: Membership): PaymentStatus {
  const paid = paidAmount(ms);
  return paid <= 0 && charges(ms) > 0 ? "unpaid" : balance(ms) > 0 ? "partial" : "paid";
}

export function memberStatus(m: Member, now = today()): MemberStatus {
  if (m.hold) return m.hold;
  const ms = currentMembership(m);
  if (!ms) return "expired";
  if (now < ms.start) return "scheduled";
  if (now > ms.end) return "expired";
  return "active";
}
export const isExpiringSoon = (m: Member, now = today()) => {
  const ms = currentMembership(m);
  return memberStatus(m, now) === "active" && !!ms && daysBetween(now, ms.end) <= EXPIRING_DAYS;
};

/** Time-based: end = start + duration − 1 day (1 Oct + 1 month → 31 Oct). Session packs: admin chooses the expiry. */
export function endDate(plan: Plan, start: string): string {
  const n = parseInt(plan.duration, 10) || 1;
  const end = plan.per === "day" ? addDays(start, n) : plan.per === "week" ? addDays(start, n * 7) : addMonths(start, n);
  return addDays(end, -1);
}

export function buildMembership(plan: Plan, start: string, end: string, extras: Membership["extras"], joiningFee = num(plan.joiningFee)): Membership {
  return {
    id: uid(), planId: plan.id, planName: plan.name, type: plan.type, price: num(plan.price), joiningFee, extras, start, end,
    sessionsTotal: plan.type === "session" ? parseInt(plan.duration, 10) || 0 : 0, sessionsUsed: 0, payments: [],
  };
}

export const memberNo = (n: number) => `MG-${String(n).padStart(5, "0")}`;
export const blankMember = (): Member => ({
  id: "", memberNo: "", firstName: "", lastName: "", email: "", phone: "", address: "", city: "", country: "", dob: "", sex: "", nationality: "",
  emergency: { name: "", phone: "", relationship: "" }, memberships: [], trainerId: "", routine: null, joiningStatus: "sent_invitation", notes: "", joinedAt: today(), hold: "", photo: "",
});

// ---- seed (dates are relative to today so every status shows up) ----
type SeedArgs = { n: number; first: string; last: string; plan: string; start: number; end: number; pay: number; trainer: string; extra?: number; used?: number; hold?: Member["hold"]; routine?: boolean };
const PLAN_DEFS: Record<string, { id: string; type: "time" | "session"; price: number; fee: number; sessions?: number }> = {
  "Monthly Unlimited": { id: "monthly-unlimited", type: "time", price: 35, fee: 0 },
  "Quarterly Fitness": { id: "quarterly-fitness", type: "time", price: 69.99, fee: 10 },
  "Yoga 10 Sessions": { id: "yoga-10-sessions", type: "session", price: 105, fee: 0, sessions: 10 },
  "Weekly Access": { id: "weekly-access", type: "time", price: 12, fee: 0 },
  "Annual Fitness": { id: "annual-fitness", type: "time", price: 300, fee: 15 },
};

export function SEED_MEMBERS(templates: Routine[] = []): Member[] {
  const t = today();
  const mk = (a: SeedArgs): Member => {
    const def = PLAN_DEFS[a.plan];
    const extras = a.extra ? [{ name: "Personal locker", price: a.extra }] : [];
    const ms: Membership = { id: uid(), planId: def.id, planName: a.plan, type: def.type, price: def.price, joiningFee: def.fee, extras, start: addDays(t, a.start), end: addDays(t, a.end), sessionsTotal: def.sessions ?? 0, sessionsUsed: a.used ?? 0, payments: [] };
    const total = charges(ms);
    const paid = a.pay < 0 ? total : a.pay;
    if (paid > 0) ms.payments.push({ id: uid(), amount: paid, method: "Card", date: ms.start });
    return {
      ...blankMember(), id: `m-${a.n}`, memberNo: memberNo(a.n), firstName: a.first, lastName: a.last, email: `${a.first.toLowerCase()}@example.com`, phone: `+44 7700 900${100 + a.n}`,
      country: "United Kingdom", city: "Manchester", memberships: [ms], trainerId: a.trainer, hold: a.hold ?? "", joiningStatus: "joined", joinedAt: addDays(t, a.start - 30),
      routine: a.routine && templates[0] ? copyRoutine(templates[0]) : null,
    };
  };
  return [
    mk({ n: 248, first: "Olivia", last: "Bennett", plan: "Monthly Unlimited", start: -10, end: 20, pay: -1, trainer: "p-alex", extra: 5, routine: true }),
    mk({ n: 247, first: "James", last: "Wilson", plan: "Quarterly Fitness", start: -80, end: 9, pay: 59.99, trainer: "p-alex" }),
    mk({ n: 246, first: "Amara", last: "Okafor", plan: "Yoga 10 Sessions", start: -30, end: 45, pay: -1, trainer: "p-priya", used: 4 }),
    mk({ n: 245, first: "Daniel", last: "Clarke", plan: "Weekly Access", start: -20, end: -8, pay: -1, trainer: "" }),
    mk({ n: 244, first: "Sofia", last: "Ahmed", plan: "Monthly Unlimited", start: 5, end: 35, pay: 0, trainer: "p-alex" }),
    mk({ n: 243, first: "Ethan", last: "Brooks", plan: "Quarterly Fitness", start: -20, end: 70, pay: 0, trainer: "p-priya" }),
    mk({ n: 242, first: "Grace", last: "Thompson", plan: "Monthly Unlimited", start: -12, end: 18, pay: -1, trainer: "p-priya", hold: "paused" }),
    mk({ n: 241, first: "Noah", last: "Williams", plan: "Annual Fitness", start: -100, end: 265, pay: 215, trainer: "p-alex" }),
    mk({ n: 240, first: "Maya", last: "Patel", plan: "Monthly Unlimited", start: -45, end: -15, pay: -1, trainer: "p-priya", hold: "cancelled" }),
  ];
}

/** One seed used by every page so list, profile and trainer views agree before the first write. */
export const MEMBERS_SEED = () => SEED_MEMBERS(SEED_ROUTINES());
