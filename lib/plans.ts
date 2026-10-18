// Membership plan model + pure helpers (spec: "Membership plans", 5 steps).
export type PlanStatus = "draft" | "active" | "archived";
export type PlanType = "time" | "session";
export type PerUnit = "day" | "week" | "month" | "session";
export type DueUnit = "days" | "weeks" | "months";

export type Instalment = { id: string; amount: string; dueAfter: string; dueUnit: DueUnit };

export type Plan = {
  id: string;
  name: string;
  description: string;
  status: PlanStatus;
  type: PlanType;
  price: string; // kept as strings while editing; parsed by helpers
  duration: string;
  per: PerUnit;
  joiningFee: string;
  schedule: "full" | "instalments";
  instalments: Instalment[];
  freeAmenities: string[];
  paidAmenities: string[];
  cancellationPolicy: string;
  refundPolicy: string;
};

export const MIN_DESCRIPTION = 50;
export const STATUS_LABEL: Record<PlanStatus, string> = { draft: "Draft", active: "Active", archived: "Archived" };

export const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cents = (n: number) => Math.round(n * 100);

/** "$69.99 for 3 months" / "$105.00 for 10 sessions" — singular when the unit count is 1. */
export function durationLabel(p: Pick<Plan, "duration" | "per">) {
  const n = parseInt(p.duration, 10) || 0;
  return `for ${n} ${p.per}${n === 1 ? "" : "s"}`;
}

export const instalmentsTotal = (p: Pick<Plan, "instalments">) => p.instalments.reduce((s, i) => s + num(i.amount), 0);
export const totalAtJoining = (p: Pick<Plan, "price" | "joiningFee">) => num(p.price) + num(p.joiningFee);
export const firstPayment = (p: Plan) =>
  (p.schedule === "instalments" && p.instalments.length ? num(p.instalments[0].amount) : num(p.price)) + num(p.joiningFee);

export function splitEvenly(price: number, count: number): string[] {
  const total = cents(price);
  const base = Math.floor(total / count);
  // put the leftover cents on the first instalment so the sum is exact
  return Array.from({ length: count }, (_, i) => ((i === 0 ? base + (total - base * count) : base) / 100).toFixed(2));
}

export const newInstalment = (amount = "", dueAfter = "0", dueUnit: DueUnit = "days"): Instalment => ({ id: crypto.randomUUID(), amount, dueAfter, dueUnit });

export const blankPlan = (): Plan => ({
  id: "", name: "", description: "", status: "draft", type: "time", price: "", duration: "", per: "month",
  joiningFee: "0", schedule: "full", instalments: [], freeAmenities: [], paidAmenities: [], cancellationPolicy: "", refundPolicy: "",
});

export type StepErrors = Record<string, string>;

/** Validation per wizard step (1–5). Returns {} when the step is valid. */
export function validateStep(step: number, p: Plan): StepErrors {
  const e: StepErrors = {};
  if (step === 1) {
    if (!p.name.trim()) e.name = "Plan name is required";
    if (p.description.trim() && p.description.trim().length < MIN_DESCRIPTION) e.description = `Description needs at least ${MIN_DESCRIPTION} characters (or leave it empty)`;
  }
  if (step === 2) {
    if (!(num(p.price) > 0)) e.price = "Enter a price greater than 0";
    if (!(Number.isInteger(Number(p.duration)) && Number(p.duration) >= 1)) e.duration = "Enter a whole number of 1 or more";
  }
  if (step === 3) {
    if (p.joiningFee.trim() !== "" && num(p.joiningFee) < 0) e.joiningFee = "Joining fee can't be negative";
    if (p.schedule === "instalments") {
      if (p.instalments.length < 2) e.instalments = "Add at least 2 instalments, or choose Full Payment";
      else if (p.instalments.some((i) => !(num(i.amount) > 0))) e.instalments = "Every instalment needs an amount greater than 0";
      else if (cents(instalmentsTotal(p)) !== cents(num(p.price))) e.instalments = `Instalments total ${money(instalmentsTotal(p))} but the plan price is ${money(num(p.price))}`;
    }
  }
  return e;
}

export const SEED_PLANS: Plan[] = [
  { ...blankPlan(), id: "quarterly-fitness", name: "Quarterly Fitness", description: "Three months of gym access with essential facilities and selected wellness benefits.", status: "active", type: "time", price: "69.99", duration: "3", per: "month", joiningFee: "10.00", schedule: "full", freeAmenities: ["Showers", "Day-use lockers", "Wi-Fi"], paidAmenities: ["Sauna"], cancellationPolicy: "Contact the gym before your next renewal to cancel.", refundPolicy: "Refund requests are reviewed by the gym under this plan's terms." },
  { ...blankPlan(), id: "yoga-10-sessions", name: "Yoga 10 Sessions", description: "A ten-session pass for instructor-led yoga classes. Use it any time before the expiry date.", status: "active", type: "session", price: "105.00", duration: "10", per: "session", joiningFee: "0", freeAmenities: ["Changing rooms", "Showers"], cancellationPolicy: "Unused sessions can't be cancelled after the first class.", refundPolicy: "No refunds once a session has been used." },
  { ...blankPlan(), id: "monthly-unlimited", name: "Monthly Unlimited", description: "Unlimited gym access for one month, with every free amenity included.", status: "active", type: "time", price: "35.00", duration: "1", per: "month", freeAmenities: ["Changing rooms", "Showers", "Wi-Fi", "Air conditioning"], cancellationPolicy: "Cancel any time before the next renewal date.", refundPolicy: "Payments are non-refundable after the start date." },
  { ...blankPlan(), id: "annual-fitness", name: "Annual Fitness", description: "Twelve months of full access with a lower monthly cost, paid in three instalments.", status: "active", type: "time", price: "300.00", duration: "12", per: "month", joiningFee: "15.00", schedule: "instalments", instalments: [{ id: "i1", amount: "100.00", dueAfter: "0", dueUnit: "days" }, { id: "i2", amount: "100.00", dueAfter: "4", dueUnit: "months" }, { id: "i3", amount: "100.00", dueAfter: "8", dueUnit: "months" }], freeAmenities: ["Showers", "Wi-Fi", "Parking"], paidAmenities: ["Personal lockers"], cancellationPolicy: "Cancellation takes effect after the final instalment.", refundPolicy: "Refunds are not available on instalment plans." },
  { ...blankPlan(), id: "weekly-access", name: "Weekly Access", description: "", status: "draft", type: "time", price: "12.00", duration: "1", per: "week" },
  { ...blankPlan(), id: "legacy-membership", name: "Legacy Membership", description: "Retired plan kept for existing members only.", status: "archived", type: "time", price: "25.00", duration: "1", per: "month" },
];
