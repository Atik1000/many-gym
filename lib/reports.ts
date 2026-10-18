// Report calculations. Pure functions over members/leads so the numbers can be tested without any UI.
import { addDays, addMonths, daysBetween, fromISO, toISO } from "./dates";
import { STAGES, STAGE_LABEL, type Lead } from "./leads";
import { balance, currentMembership, fullName, isExpiringSoon, memberStatus, type Member, type MemberStatus } from "./members";

export type RangeId = "month" | "30d" | "90d" | "year" | "all";
export const RANGES: { id: RangeId; label: string }[] = [
  { id: "month", label: "This month" }, { id: "30d", label: "Last 30 days" }, { id: "90d", label: "Last 90 days" }, { id: "year", label: "This year" }, { id: "all", label: "All time" },
];

export type PaymentRow = { date: string; amount: number; method: string; member: string; memberId: string; planName: string };
export type Bucket = { key: string; from: string; to: string; label: string; value: number };
export type Row = { label: string; value: number };

export function allPayments(members: Member[]): PaymentRow[] {
  return members.flatMap((m) => m.memberships.flatMap((ms) => ms.payments.map((p) => ({ date: p.date, amount: p.amount, method: p.method, member: fullName(m), memberId: m.id, planName: ms.planName }))));
}

export function rangeBounds(id: RangeId, today: string, earliest: string): { start: string; end: string } {
  const d = fromISO(today);
  if (id === "month") return { start: toISO(new Date(d.getFullYear(), d.getMonth(), 1)), end: today };
  if (id === "30d") return { start: addDays(today, -29), end: today };
  if (id === "90d") return { start: addDays(today, -89), end: today };
  if (id === "year") return { start: toISO(new Date(d.getFullYear(), 0, 1)), end: today };
  return { start: earliest < today ? earliest : addDays(today, -29), end: today };
}

const inRange = (date: string, start: string, end: string) => date >= start && date <= end;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso: string) => { const d = fromISO(iso); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const mondayOf = (iso: string) => { const d = fromISO(iso); return addDays(iso, -((d.getDay() + 6) % 7)); };

/** Daily buckets for short ranges, weekly for ~a quarter, monthly beyond. Empty periods are kept as zero so gaps show. */
export function bucketRevenue(payments: PaymentRow[], start: string, end: string): { unit: "day" | "week" | "month"; buckets: Bucket[] } {
  const days = daysBetween(start, end) + 1;
  const unit = days <= 35 ? "day" : days <= 120 ? "week" : "month";
  const buckets: Bucket[] = [];
  if (unit === "day") for (let d = start; d <= end; d = addDays(d, 1)) buckets.push({ key: d, from: d, to: d, label: dayLabel(d), value: 0 });
  else if (unit === "week") for (let d = mondayOf(start); d <= end; d = addDays(d, 7)) buckets.push({ key: d, from: d, to: addDays(d, 6), label: dayLabel(d), value: 0 });
  else { const s = fromISO(start); for (let d = toISO(new Date(s.getFullYear(), s.getMonth(), 1)); d <= end; d = addMonths(d, 1)) { const x = fromISO(d); buckets.push({ key: d, from: d, to: addDays(addMonths(d, 1), -1), label: `${MON[x.getMonth()]} ${String(x.getFullYear()).slice(2)}`, value: 0 }); } }
  for (const p of payments) {
    if (!inRange(p.date, start, end)) continue;
    const b = buckets.find((x) => p.date >= x.from && p.date <= x.to);
    if (b) b.value = Math.round((b.value + p.amount) * 100) / 100;
  }
  return { unit, buckets };
}

/** A round axis maximum and evenly spaced ticks (1/2/5 × 10^k), so the axis reads 0 / 50 / 100 rather than 0 / 43.7. */
export function niceScale(max: number, maxIntervals = 5): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const pow = 10 ** Math.floor(Math.log10(max / maxIntervals));
  // smallest round step that needs no more than `maxIntervals` gridlines, so there's little wasted headroom
  const step = [1, 2, 5, 10, 20].map((m) => m * pow).find((st) => Math.ceil(max / st) <= maxIntervals)!;
  const top = Math.ceil(max / step) * step;
  return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100) };
}

export function kpis(members: Member[], leads: Lead[], payments: PaymentRow[], start: string, end: string, now: string) {
  const statuses = members.map((m) => memberStatus(m, now));
  const open = members.filter((m) => m.hold !== "cancelled");
  return {
    totalMembers: members.length,
    active: statuses.filter((s) => s === "active").length,
    newMembers: members.filter((m) => inRange(m.joinedAt, start, end)).length,
    revenue: payments.filter((p) => inRange(p.date, start, end)).reduce((s, p) => s + p.amount, 0),
    outstanding: open.reduce((s, m) => s + m.memberships.reduce((a, ms) => a + balance(ms), 0), 0),
    expiringSoon: members.filter((m) => isExpiringSoon(m, now)).length,
    leadConversion: leads.length ? leads.filter((l) => l.stage === "joined").length / leads.length : 0,
    leadCount: leads.length,
  };
}

export const STATUS_ORDER: MemberStatus[] = ["active", "scheduled", "paused", "expired", "cancelled"];
const tally = (items: string[]): Row[] => { const m = new Map<string, number>(); items.forEach((i) => m.set(i, (m.get(i) ?? 0) + 1)); return [...m].map(([label, value]) => ({ label, value })); };
const byValue = (r: Row[]) => [...r].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

export const membersByStatus = (members: Member[], now: string): Row[] => {
  const t = new Map(tally(members.map((m) => memberStatus(m, now))).map((r) => [r.label, r.value]));
  return STATUS_ORDER.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: t.get(s) ?? 0 }));
};
export const membersByPlan = (members: Member[]): Row[] => byValue(tally(members.map((m) => currentMembership(m)?.planName ?? "No plan")));
export const leadFunnel = (leads: Lead[]): Row[] => STAGES.map((s) => ({ label: STAGE_LABEL[s], value: leads.filter((l) => l.stage === s).length }));
export const notJoiningReasons = (leads: Lead[]): Row[] => byValue(tally(leads.filter((l) => l.stage === "not_joining").map((l) => (l.reason === "Other" ? l.customReason || "Other" : l.reason || "No reason given"))));
export const leadSources = (leads: Lead[]): Row[] => byValue(tally(leads.map((l) => l.source || "Unknown")));
export const trainerLoad = (members: Member[], nameOf: (id: string) => string): Row[] => byValue(tally(members.map((m) => (m.trainerId ? nameOf(m.trainerId) : "Unassigned"))));

export type Owing = { memberId: string; name: string; plan: string; owed: number };
export const outstandingList = (members: Member[]): Owing[] =>
  members.filter((m) => m.hold !== "cancelled")
    .map((m) => ({ memberId: m.id, name: fullName(m), plan: currentMembership(m)?.planName ?? "", owed: m.memberships.reduce((a, ms) => a + balance(ms), 0) }))
    .filter((o) => o.owed > 0.004).sort((a, b) => b.owed - a.owed);

export function paymentsCsv(rows: PaymentRow[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return ["Date,Member,Plan,Method,Amount", ...rows.sort((a, b) => a.date.localeCompare(b.date)).map((r) => [r.date, r.member, r.planName, r.method, r.amount.toFixed(2)].map(esc).join(","))].join("\n");
}
