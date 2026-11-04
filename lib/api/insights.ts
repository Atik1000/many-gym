"use client";

/**
 * Server-computed reporting.
 *
 * The Insights screen used to derive every number from the members and leads lists. That no longer works against
 * the API: `GET /members/` returns summary rows with no subscriptions or payments, so client-side revenue and
 * outstanding balances would read zero. These five endpoints are the real source —
 * `/dashboard/summary/`, `/reports/revenue/`, `/reports/leads-funnel/`, `/reports/membership-growth/`
 * and `/reports/trainer-workload/`.
 *
 * Gap worth knowing: there is no endpoint that lists payments. They exist only nested inside a member dossier,
 * so a per-payment CSV export can't be built without fetching every member individually.
 */
import { useEffect, useState } from "react";
import { addDays, today } from "../dates";
import type { RangeId, Row } from "../reports";
import { reports } from "./adapters";
import { currentGymId } from "./http";
import type * as T from "./types";

export type Insights = {
  loading: boolean;
  failed: boolean;
  start: string;
  end: string;
  /** Headline numbers, from the dashboard plus the revenue and growth reports. */
  kpi: {
    totalMembers: number;
    active: number;
    newMembers: number;
    revenue: number;
    expiringSoon: number;
    leadCount: number;
    leadConversion: number;
    churnRate: number;
    netGrowth: number;
    todaysRevenue: number;
    pendingMovesToday: number;
    overdueMoves: number;
  };
  /** Revenue per day in the selected range. */
  series: { key: string; from: string; to: string; label: string; value: number }[];
  byMethod: Row[];
  byPlan: Row[];
  byStatus: Row[];
  funnel: Row[];
  reasons: Row[];
  sources: Row[];
  trainers: Row[];
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y ? `${d} ${MON[(m ?? 1) - 1]}` : iso;
};
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const titleCase = (s: string) => s.split(/[_\s]+/).map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1)).join(" ");

/** The range the UI offers, expressed as the start/end dates the report endpoints take. */
export function rangeDates(range: RangeId, now = today()): { start: string; end: string } {
  const [y, m] = now.split("-").map(Number);
  if (range === "month") return { start: `${y}-${String(m).padStart(2, "0")}-01`, end: now };
  if (range === "30d") return { start: addDays(now, -29), end: now };
  if (range === "90d") return { start: addDays(now, -89), end: now };
  if (range === "year") return { start: `${y}-01-01`, end: now };
  return { start: "2000-01-01", end: now }; // "all time"
}

const EMPTY: Insights["kpi"] = {
  totalMembers: 0, active: 0, newMembers: 0, revenue: 0, expiringSoon: 0, leadCount: 0,
  leadConversion: 0, churnRate: 0, netGrowth: 0, todaysRevenue: 0, pendingMovesToday: 0, overdueMoves: 0,
};

export function useInsights(range: RangeId): Insights {
  const gymId = currentGymId();
  const now = today();
  const { start, end } = rangeDates(range, now);
  const [state, setState] = useState<Insights>({
    loading: true, failed: false, start, end, kpi: EMPTY,
    series: [], byMethod: [], byPlan: [], byStatus: [], funnel: [], reasons: [], sources: [], trainers: [],
  });

  useEffect(() => {
    let live = true;
    if (!gymId) {
      // No gym context yet: settle into an empty state without firing calls that must fail.
      void Promise.resolve().then(() => live && setState((s) => ({ ...s, loading: false, failed: false })));
      return () => {
        live = false;
      };
    }
    void Promise.resolve().then(() => live && setState((s) => ({ ...s, loading: true, failed: false, start, end })));

    void Promise.allSettled([
      reports.dashboard(),
      reports.revenue(start, end),
      reports.leadsFunnel(start, end),
      reports.membershipGrowth(start, end),
      reports.trainerWorkload(),
    ]).then((settled) => {
      if (!live) return;
      const [dash, rev, funnelRes, growth, workload] = settled;
      const val = <X,>(r: PromiseSettledResult<unknown>): X | null => (r.status === "fulfilled" ? (r.value as X) : null);

      const head = val<T.DashboardSummary>(dash)?.headline_metrics ?? ({} as T.HeadlineMetrics);
      const revenue = val<T.RevenueReport>(rev);
      const funnel = val<T.LeadFunnelReport>(funnelRes);
      const g = val<T.MembershipGrowthReport>(growth);
      const w = val<T.TrainerWorkloadReport>(workload);
      const stages = funnel?.funnel_stages ?? ({} as T.FunnelStages);

      setState({
        loading: false,
        // Only a total failure is worth telling the person about; a single missing report degrades quietly.
        failed: settled.every((r) => r.status === "rejected"),
        start,
        end,
        kpi: {
          totalMembers: n(head.total_members ?? g?.total_members),
          active: n(head.total_active_members ?? g?.active_subscriptions),
          newMembers: n(g?.new_members_in_period),
          revenue: n(revenue?.total_revenue),
          expiringSoon: n(head.expiring_memberships_next_7_days),
          leadCount: n(funnel?.total_leads ?? head.new_leads_this_week),
          leadConversion: n(funnel?.conversion_rates?.overall_conversion_rate_percentage) / 100,
          churnRate: n(g?.churn_rate_percentage),
          netGrowth: n(g?.net_growth),
          todaysRevenue: n(head.todays_revenue),
          pendingMovesToday: n(head.pending_next_moves_today),
          overdueMoves: n(head.overdue_next_moves),
        },
        series: (revenue?.daily_breakdown ?? []).map((d) => {
          const date = String(d.date ?? "");
          return { key: date, from: date, to: date, label: dayLabel(date), value: n(d.amount) };
        }),
        byMethod: (revenue?.payment_method_breakdown ?? []).map((r) => ({
          label: titleCase(String(r.payment_method ?? "Other")),
          value: n(r.total_amount),
        })),
        byPlan: (revenue?.plan_distribution ?? []).map((r) => ({
          label: String(r.plan_name ?? "Unknown"),
          value: n(r.total_amount),
        })),
        byStatus: (g?.status_breakdown ?? []).map((r) => ({
          label: titleCase(String(r.status ?? "")),
          value: n(r.count),
        })),
        funnel: [
          { label: "New", value: n(stages.new) },
          { label: "Contacted", value: n(stages.contacted) },
          { label: "Visit / Trial Booked", value: n(stages.trial_booked) },
          { label: "Joined", value: n(stages.joined) },
          { label: "Not Joining", value: n(stages.lost) },
        ],
        reasons: (funnel?.lost_reason_distribution ?? []).map((r) => ({
          label: titleCase(String(r.reason ?? "Unknown")),
          value: n(r.count),
        })),
        sources: (funnel?.source_breakdown ?? []).map((r) => ({
          label: titleCase(String(r.source ?? "Unknown")),
          value: n(r.count),
        })),
        trainers: (w?.trainers ?? []).map((t) => ({
          label: String(t.name ?? t.email ?? "Unknown"),
          value: n(t.assigned_members_count),
        })),
      });
    });

    return () => {
      live = false;
    };
  }, [gymId, range, start, end]);

  return state;
}
