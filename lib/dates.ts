// Dates are stored as local "YYYY-MM-DD" strings so they never shift with timezones.
const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const today = () => toISO(new Date());

export function addDays(iso: string, n: number) { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
export function addMonths(iso: string, n: number) {
  const d = fromISO(iso); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); // 31 Jan + 1 month → 28/29 Feb
  return toISO(d);
}
export const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDate = (iso: string) => { if (!iso) return "—"; const d = fromISO(iso); return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtDateTime = (v: string) => { if (!v) return "—"; const [date, time] = v.split("T"); return `${fmtDate(date)}${time ? `, ${time}` : ""}`; };
