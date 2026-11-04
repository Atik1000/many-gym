"use client";

import { MotionButton } from "@/components/ui/Motion";
import { Pagination, usePaged } from "@/components/ui/parts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { animate } from "framer-motion";
import { LuDownload as Download } from "react-icons/lu";
import { Can } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { daysBetween, fmtDate, today } from "@/lib/dates";
import { LEADS_KEY, type Lead } from "@/lib/leads";
import { MEMBERS_KEY, type Member } from "@/lib/members";
import { money } from "@/lib/plans";
import { RANGES, niceScale, outstandingList, type Bucket, type RangeId, type Row } from "@/lib/reports";
import { useResource } from "@/lib/api";
import { useInsights } from "@/lib/api/insights";
import { btnGhost, card } from "@/lib/ui";
import { isExpiringSoon, memberExpiry, memberPlanName, fullName } from "@/lib/members";

// ---- tooltip: follows the pointer on hover, anchors to the mark on keyboard focus ----
type Tip = { x: number; y: number; title: string; value: string } | null;
function useTip() {
  const [tip, setTip] = useState<Tip>(null);
  const props = (title: string, value: string) => ({
    tabIndex: 0,
    "aria-label": `${title}: ${value}`,
    onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, title, value }),
    onMouseLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, title, value }); },
    onBlur: () => setTip(null),
  });
  const node = tip && (
    <div role="tooltip" style={{ left: tip.x, top: tip.y - 12 }} className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-white shadow-lg">
      <div className="text-xs text-white/70">{tip.title}</div><b className="text-sm">{tip.value}</b>
    </div>
  );
  return { props, node };
}

const SERIES = "bg-primary"; // single series → single hue; text always uses text tokens, never the series colour

/** Counts a number up to its value (keeping any $ / % / thousands separators) so changes in the range are noticed. */
function CountUp({ text }: { text: string }) {
  const [shown, setShown] = useState<string | null>(null); // null = show the real value
  useEffect(() => {
    const m = /-?[\d,]*\.?\d+/.exec(text);
    if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseFloat(m[0].replace(/,/g, "")), decimals = m[0].includes(".") ? m[0].split(".")[1].length : 0;
    const controls = animate(0, target, {
      duration: 0.8, ease: "easeOut",
      onUpdate: (v) => setShown(text.replace(m[0], v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))),
      onComplete: () => setShown(null),
    });
    return () => controls.stop();
  }, [text]);
  return <>{shown ?? text}</>;
}

function Tile({ label, value, note, href }: { label: string; value: string; note?: React.ReactNode; href?: string }) {
  const inner = (<><div className="text-muted">{label}</div><div className="mt-1 text-[28px] font-bold leading-tight tabular-nums"><CountUp text={value} /></div><div className="mt-1 min-h-[18px] text-[13px] text-muted">{note}</div></>);
  return href ? <Link href={href} className={`${card} block p-5 hover:border-primary`}>{inner}</Link> : <div className={`${card} p-5`}>{inner}</div>;
}

function ChartCard({ title, subtitle, table, children, className = "" }: { title: string; subtitle?: string; table: { cols: string[]; rows: (string | number)[][] }; children: React.ReactNode; className?: string }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className={`${card} p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h3 className="text-base font-bold">{title}</h3>{subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}</div>
        <div role="group" aria-label={`${title} view`} className="flex shrink-0 rounded-lg border border-line p-0.5 text-[13px] font-semibold">
          {(["chart", "table"] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md px-2.5 py-1 capitalize ${view === v ? "bg-primary-50 text-primary" : "text-muted"}`}>{v}</button>)}
        </div>
      </div>
      {view === "chart" ? children : (
        <div className="max-h-[260px] overflow-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-surface text-muted"><tr>{table.cols.map((c, i) => <th key={c} className={`py-1.5 font-semibold ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, n) => <tr key={n} className="border-t border-line">{r.map((c, i) => <td key={i} className={`py-1.5 ${i ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Horizontal bars: label left, value at the bar tip. Bars are ≤14px with a 4px rounded data end, square at the baseline. */
function HBars({ rows, unit = "", emptyNote }: { rows: Row[]; unit?: string; emptyNote: string }) {
  const tip = useTip();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <p className="py-8 text-center text-muted">{emptyNote}</p>;
  return (
    <div className="grid gap-1.5">
      {rows.map((r) => (
        <div key={r.label} {...tip.props(r.label, `${r.value}${unit}`)} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] items-center gap-3 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-background">
          <span className="truncate text-[13px] text-foreground" title={r.label}>{r.label}</span>
          <span className="flex items-center gap-2">
            {r.value > 0 && <span className={`h-3.5 rounded-r-[4px] ${SERIES}`} style={{ width: `${Math.max(2, (r.value / max) * 82)}%` }} />}
            <span className={`text-[13px] tabular-nums ${r.value ? "font-semibold" : "text-muted"}`}>{r.value}</span>
          </span>
        </div>
      ))}
      {tip.node}
    </div>
  );
}

function Columns({ buckets, unit }: { buckets: Bucket[]; unit: "day" | "week" | "month" }) {
  const tip = useTip();
  const maxV = Math.max(0, ...buckets.map((b) => b.value));
  const { max, ticks } = niceScale(maxV);
  const every = Math.ceil(buckets.length / 8); // ≤ ~8 x labels so they never collide
  const peak = buckets.findIndex((b) => b.value === maxV && maxV > 0);
  const title = (b: Bucket) => (unit === "day" ? fmtDate(b.from) : unit === "week" ? `Week of ${fmtDate(b.from)}` : b.label);
  if (maxV === 0) return <p className="py-16 text-center text-muted">No payments recorded in this period.</p>;
  return (
    <div>
      <div className="relative h-[220px] pl-12">
        {ticks.map((t) => (
          <div key={t} className="absolute left-0 right-0" style={{ bottom: `${(t / max) * 100}%` }}>
            <span className="absolute -top-2 left-0 w-10 text-right text-xs tabular-nums text-muted">{t >= 1000 ? `${t / 1000}K` : t}</span>
            <div className="ml-12 border-t border-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-[2px]">
          {buckets.map((b, i) => (
            <div key={b.key} {...tip.props(title(b), money(b.value))} className="group relative flex h-full flex-1 items-end justify-center outline-none">
              {/* the full-height column is the hover target; the visible mark is thinner */}
              <div className="w-full max-w-[24px] rounded-t-[4px] bg-primary group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-primary"
                style={{ height: b.value > 0 ? `max(2px, ${(b.value / max) * 100}%)` : 0 }} />
              {i === peak && <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums" style={{ bottom: `calc(${(b.value / max) * 100}% + 4px)` }}>{money(b.value)}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-[2px] overflow-hidden pl-12 pt-2">
        {buckets.map((b, i) => <span key={b.key} className="flex-1 overflow-visible whitespace-nowrap text-center text-xs text-muted">{i % every === 0 ? b.label : ""}</span>)}
      </div>
      {tip.node}
    </div>
  );
}

export default function ReportsPage() {
  const toast = useToast();
  const [members, , mReady] = useResource<Member>(MEMBERS_KEY);
  const [, , lReady] = useResource<Lead>(LEADS_KEY);
  const [range, setRange] = useState<RangeId>("30d");
  const now = today();
  // Every aggregate comes from the reporting endpoints: member/lead list rows carry no payment data at all,
  // and the lists are paginated, so anything computed here would only describe the first page.
  const ins = useInsights(range);

  const d = useMemo(() => {
    const { start, end, series } = ins;
    const len = daysBetween(start, end) + 1;
    const unit: "day" | "week" | "month" = len <= 35 ? "day" : len <= 120 ? "week" : "month";
    return {
      start, end, len, unit, buckets: series,
      k: {
        totalMembers: ins.kpi.totalMembers, active: ins.kpi.active, newMembers: ins.kpi.newMembers,
        revenue: ins.kpi.revenue, expiringSoon: ins.kpi.expiringSoon,
        leadConversion: ins.kpi.leadConversion, leadCount: ins.kpi.leadCount,
        // No endpoint reports outstanding balances across the gym; it lives per member dossier only.
        outstanding: 0,
      },
      status: ins.byStatus, plans: ins.byPlan, funnel: ins.funnel, reasons: ins.reasons,
      sources: ins.sources, trainers: ins.trainers, byMethod: ins.byMethod,
      owing: [] as ReturnType<typeof outstandingList>,
      expiring: members
        .filter((m) => isExpiringSoon(m, now))
        .map((m) => ({ id: m.id, name: fullName(m), plan: memberPlanName(m), end: memberExpiry(m) }))
        .sort((a, b) => a.end.localeCompare(b.end)),
    };
  }, [ins, members, now]);

  const owingPg = usePaged(d.owing, 5), expiringPg = usePaged(d.expiring, 5);

  if (ins.loading || !mReady || !lReady) return <div className={`${card} h-[400px] animate-pulse`} />;
  const { k } = d;
  // The revenue report covers one window only, so there is no previous period to compare against.
  const delta: number | null = null;
  const tab = (rows: Row[]) => ({ cols: ["Name", "Count"], rows: rows.map((r) => [r.label, r.value]) });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-[28px] font-bold">Insights</h2><p className="text-muted">{fmtDate(d.start)} – {fmtDate(d.end)}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
            {RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded-lg px-3.5 py-1.5 font-semibold ${range === r.id ? "bg-primary-50 text-primary" : "text-muted hover:text-foreground"}`}>{r.label}</button>)}
          </div>
          <Can perm="Manage reports">
            {/* The API has no endpoint that lists payments — they exist only inside a member dossier — so the
                export is the revenue report's daily totals rather than one row per payment. */}
            <MotionButton className={btnGhost} disabled={d.buckets.length === 0} onClick={() => {
              const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = ["Date,Revenue", ...d.buckets.map((b) => [b.from, b.value.toFixed(2)].map(esc).join(","))].join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              const a = document.createElement("a"); a.href = url; a.download = `revenue-${d.start}-to-${d.end}.csv`; a.click(); URL.revokeObjectURL(url);
              toast(`Exported ${d.buckets.length} day${d.buckets.length === 1 ? "" : "s"} of revenue`);
            }}><Download size={16} />Export revenue</MotionButton>
          </Can>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Tile label="Active members" value={String(k.active)} note={`of ${k.totalMembers} total`} href="/members" />
        <Tile label="New members" value={String(k.newMembers)} note="joined in period" />
        <Tile label="Revenue collected" value={money(k.revenue)} note={delta === null ? (range === "all" ? "all payments" : "no earlier payments to compare") : <span className={delta >= 0 ? "text-ok" : "text-bad"}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs previous {d.len} days</span>} />
        <Tile label="Outstanding balance" value={money(k.outstanding)} note={`${d.owing.length} member${d.owing.length === 1 ? "" : "s"} owe`} />
        <Tile label="Expiring soon" value={String(k.expiringSoon)} note="within 14 days" href="/members" />
        <Tile label="Lead conversion" value={`${Math.round(k.leadConversion * 100)}%`} note={`${k.leadCount} leads, all time`} href="/leads" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard className="xl:col-span-2" title="Revenue collected" subtitle={`Payments received, by ${d.unit}`}
          table={{ cols: [d.unit[0].toUpperCase() + d.unit.slice(1), "Collected"], rows: d.buckets.map((b) => [b.label, money(b.value)]) }}>
          <Columns buckets={d.buckets} unit={d.unit} />
        </ChartCard>
        <ChartCard title="Members by status" subtitle="Right now" table={tab(d.status)}><HBars rows={d.status} emptyNote="No members yet." /></ChartCard>
        <ChartCard title="Members by plan" subtitle="Current membership" table={tab(d.plans)}><HBars rows={d.plans} emptyNote="No members yet." /></ChartCard>
        <ChartCard title="Lead funnel" subtitle={`${k.leadCount} leads by stage`} table={tab(d.funnel)}><HBars rows={d.funnel} emptyNote="No leads yet." /></ChartCard>
        <ChartCard title="Why leads don't join" subtitle="Reasons given" table={tab(d.reasons)}><HBars rows={d.reasons} emptyNote="No leads have been marked Not Joining." /></ChartCard>
        <ChartCard title="Lead sources" subtitle="Where leads come from" table={tab(d.sources)}><HBars rows={d.sources} emptyNote="No leads yet." /></ChartCard>
        <ChartCard title="Trainer workload" subtitle="Members per trainer" table={tab(d.trainers)}><HBars rows={d.trainers} emptyNote="No members yet." /></ChartCard>

        <section className={`${card} p-5`}>
          <h3 className="mb-3 text-base font-bold">Outstanding payments</h3>
          {d.owing.length === 0 ? <p className="py-6 text-center text-muted">Everyone is paid up.</p> : (
            <table className="w-full text-left"><thead className="text-[13px] text-muted"><tr><th className="py-1.5 font-semibold">Member</th><th className="font-semibold">Plan</th><th className="text-right font-semibold">Owes</th></tr></thead>
              <tbody>{owingPg.view.map((o) => <tr key={o.memberId} className="border-t border-line"><td className="py-2"><Link href={`/members/${o.memberId}`} className="font-semibold text-primary">{o.name}</Link></td><td className="text-muted">{o.plan}</td><td className="text-right font-semibold tabular-nums">{money(o.owed)}</td></tr>)}</tbody></table>)}
          {d.owing.length > 5 && <div className="-mx-5 mt-2 border-t border-line"><Pagination {...owingPg} noun="members" /></div>}
        </section>
        <section className={`${card} p-5`}>
          <h3 className="mb-3 text-base font-bold">Expiring in the next 14 days</h3>
          {d.expiring.length === 0 ? <p className="py-6 text-center text-muted">No memberships are about to expire.</p> : (
            <table className="w-full text-left"><thead className="text-[13px] text-muted"><tr><th className="py-1.5 font-semibold">Member</th><th className="font-semibold">Plan</th><th className="text-right font-semibold">Ends</th></tr></thead>
              <tbody>{expiringPg.view.map((e) => <tr key={e.id} className="border-t border-line"><td className="py-2"><Link href={`/members/${e.id}`} className="font-semibold text-primary">{e.name}</Link></td><td className="text-muted">{e.plan}</td><td className="text-right tabular-nums">{fmtDate(e.end)}</td></tr>)}</tbody></table>)}
          {d.expiring.length > 5 && <div className="-mx-5 mt-2 border-t border-line"><Pagination {...expiringPg} noun="members" /></div>}
        </section>
      </div>
    </>
  );
}
