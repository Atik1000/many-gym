"use client";

/**
 * The gym's administration audit log — who changed what, and when.
 *
 * `GET /gyms/admin-logs/` (list), `/metrics/`, `/actions/` (filter options), `/{log_id}/` (detail),
 * `/export/` (CSV or JSON file) and `POST /gyms/admin-logs/` (record a custom entry). The whole set is also
 * published under `/gyms/logs/admin/`; the first prefix is tried first and `firstAvailable` falls back.
 *
 * These routes postdate the committed OpenAPI document, so they go through `request()` directly rather than
 * the generated client.
 */
import { firstAvailable } from "./fallback";
import { ApiError, buildUrl, currentGymId, getTokens, mediaUrl, request } from "./http";

const PREFIXES = ["/api/v1/gyms/admin-logs/", "/api/v1/gyms/logs/admin/"] as const;

/** Tries the canonical prefix, then its alias. `tail` is appended to the prefix ("metrics/", "<id>/", ""). */
const viaEither = <T,>(feature: string, tail: string, call: (path: string) => Promise<T>) =>
  firstAvailable<T>(`admin-logs:${feature}`, PREFIXES.map((p) => ({ path: `${p}${tail}`, call: () => call(`${p}${tail}`) })));

const gymQuery = () => ({ gym_id: currentGymId() ?? undefined });

// ---------------------------------------------------------------- types

export type LogAdmin = { id: string; name: string; email: string; avatarUrl: string };

export type AdminLog = {
  id: string;
  admin: LogAdmin;
  /** Human-readable label — "Updated page information". */
  action: string;
  /** Machine code — `update_page_info`. */
  actionType: string;
  category: string;
  categoryLabel: string;
  details: string;
  targetType: string;
  targetId: string;
  /** Free-form context the server attached; shape varies by action. */
  metadata: unknown;
  at: string;
  /** The server's own formatting of `at`, when it sends one. */
  atLabel: string;
};

export type LogOption = { value: string; label: string };
export type LogOptions = { categories: LogOption[]; actionTypes: LogOption[] };
export type LogMetrics = { total: number; today: number; byCategory: Record<string, number>; recent: AdminLog[] };
export type LogPage = { logs: AdminLog[]; total: number; page: number; pages: number; pageSize: number };

export type LogFilters = {
  category?: string;
  actionType?: string;
  actorId?: string;
  /** `YYYY-MM-DD`, inclusive, in the viewer's own timezone. */
  from?: string;
  to?: string;
  search?: string;
};

// ---------------------------------------------------------------- mapping

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** `admin` is documented only as "an object", so read every spelling a user summary is likely to use. */
const adminOf = (raw: unknown, fallbackName: string): LogAdmin => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: str(o.user_id) || str(o.id),
    name: fallbackName || str(o.full_name) || str(o.name) || `${str(o.first_name)} ${str(o.last_name)}`.trim() || str(o.email) || "System",
    email: str(o.email),
    avatarUrl: mediaUrl(str(o.avatar_url) || str(o.avatar) || null),
  };
};

const logOf = (raw: unknown): AdminLog => {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(o.id),
    admin: adminOf(o.admin, str(o.admin_name)),
    action: str(o.action) || str(o.action_type).replace(/_/g, " "),
    actionType: str(o.action_type),
    category: str(o.category),
    categoryLabel: str(o.category_display) || str(o.category).replace(/_/g, " "),
    details: str(o.details),
    targetType: str(o.target_type),
    targetId: str(o.target_id),
    metadata: o.metadata ?? null,
    at: str(o.date_and_time) || str(o.created_at),
    atLabel: str(o.formatted_date_time),
  };
};

const optionsOf = (raw: unknown): LogOption[] =>
  (Array.isArray(raw) ? raw : [])
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return { value: str(o.value), label: str(o.label) || str(o.value).replace(/_/g, " ") };
    })
    .filter((o) => o.value);

/**
 * The list filters as query parameters. The API compares against timestamps, so a calendar day is sent as
 * the first and last instant of that day where the viewer is — otherwise "to 12 May" would stop at midnight
 * and drop the whole of the 12th.
 */
const filterQuery = (f: LogFilters) => {
  const instant = (day: string | undefined, time: string) => {
    if (!day) return undefined;
    const d = new Date(`${day}T${time}`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  return {
    ...gymQuery(),
    category: f.category || undefined,
    action_type: f.actionType || undefined,
    actor_id: f.actorId || undefined,
    start_date: instant(f.from, "00:00:00"),
    end_date: instant(f.to, "23:59:59.999"),
    search: f.search?.trim() || undefined,
  };
};

// ---------------------------------------------------------------- reads

export async function listLogs(filters: LogFilters, page = 1, pageSize = 20, signal?: AbortSignal): Promise<LogPage> {
  const query = { ...filterQuery(filters), page, page_size: pageSize };
  const raw = await viaEither<unknown>("list", "", (path) => request("GET", path, { query, signal }));
  const o = (Array.isArray(raw) ? { results: raw, count: raw.length } : (raw ?? {})) as Record<string, unknown>;
  const logs = (Array.isArray(o.results) ? o.results : []).map(logOf);
  const total = typeof o.count === "number" ? o.count : logs.length;
  const size = typeof o.page_size === "number" && o.page_size > 0 ? o.page_size : pageSize;
  return {
    logs,
    total,
    page: typeof o.page === "number" ? o.page : typeof o.current_page === "number" ? o.current_page : page,
    pages: typeof o.total_pages === "number" ? Math.max(1, o.total_pages) : Math.max(1, Math.ceil(total / size)),
    pageSize: size,
  };
}

export async function logMetrics(): Promise<LogMetrics> {
  const raw = await viaEither<unknown>("metrics", "metrics/", (path) => request("GET", path, { query: gymQuery() }));
  const o = (raw ?? {}) as Record<string, unknown>;
  const by = (o.by_category && typeof o.by_category === "object" ? o.by_category : {}) as Record<string, unknown>;
  return {
    total: typeof o.total_logs === "number" ? o.total_logs : 0,
    today: typeof o.logs_today === "number" ? o.logs_today : 0,
    byCategory: Object.fromEntries(Object.entries(by).filter(([, v]) => typeof v === "number")) as Record<string, number>,
    recent: (Array.isArray(o.recent_logs) ? o.recent_logs : []).map(logOf),
  };
}

/** The categories and action types the server knows about — what the filter dropdowns offer. */
export async function logOptions(): Promise<LogOptions> {
  const raw = await viaEither<unknown>("actions", "actions/", (path) => request("GET", path));
  const o = (raw ?? {}) as Record<string, unknown>;
  return { categories: optionsOf(o.categories), actionTypes: optionsOf(o.action_types) };
}

export async function getLog(id: string): Promise<AdminLog> {
  const tail = `${encodeURIComponent(id)}/`;
  return logOf(await viaEither<unknown>("detail", tail, (path) => request("GET", path, { query: gymQuery() })));
}

// ---------------------------------------------------------------- export

export type ExportFormat = "csv" | "json";

/**
 * Downloads the log, with the same filters as the list, as a file.
 *
 * `request()` only understands JSON responses, and this one is a file (CSV by default), so it is fetched
 * here with the bearer token and handed to the browser as a download. The server records the export itself
 * (`export_logs` is one of its action types).
 */
export async function exportLogs(filters: LogFilters, format: ExportFormat = "csv"): Promise<{ filename: string; rows: number | null }> {
  const token = getTokens()?.access;
  const query = { ...filterQuery(filters), format };

  let res: Response | null = null;
  for (const prefix of PREFIXES) {
    try {
      res = await fetch(buildUrl(`${prefix}export/`, query), {
        headers: { Accept: format === "csv" ? "text/csv, application/json" : "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: "no-store",
      });
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
    }
    // A bare 404/405 means this prefix isn't served here; anything else is the answer.
    if (res.status !== 404 && res.status !== 405) break;
    const probe = await res.clone().json().catch(() => null) as { code?: string } | null;
    if (probe?.code) break;
  }
  if (!res) throw new ApiError(404, "NO_ROUTE", "The server doesn't serve the log export.");

  if (!res.ok) {
    const env = await res.json().catch(() => ({})) as { code?: string; message?: string; detail?: string; details?: Record<string, unknown> };
    throw new ApiError(res.status, env.code ?? `HTTP_${res.status}`, env.message ?? env.detail ?? `Export failed (HTTP ${res.status}).`, env.details ?? {});
  }

  const blob = await res.blob();
  // Prefer the server's filename; fall back to a dated one.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  const filename = named ? decodeURIComponent(named) : `activity-log-${new Date().toISOString().slice(0, 10)}.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  let rows: number | null = null;
  if (format === "csv" && blob.size < 5_000_000) {
    const text = await blob.text().catch(() => "");
    if (text) rows = Math.max(0, text.split(/\r?\n/).filter((l) => l.trim()).length - 1);
  }
  return { filename, rows };
}

// ---------------------------------------------------------------- write

/**
 * Records a custom entry (`POST /gyms/admin-logs/`).
 *
 * The server writes the log itself for everything done through its API — every action type but
 * `custom_action` corresponds to an endpoint — so nothing in this app calls this today. It exists for an
 * admin action the API cannot observe (something done purely in the browser, or an integration).
 */
export async function recordAdminLog(entry: {
  action: string;
  details?: string;
  category?: string;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<AdminLog> {
  const body = {
    action: entry.action.trim().slice(0, 255),
    action_type: entry.actionType ?? "custom_action",
    category: entry.category ?? "general",
    details: entry.details ?? "",
    target_type: entry.targetType || undefined,
    target_id: entry.targetId || undefined,
    metadata: entry.metadata,
  };
  return logOf(await viaEither<unknown>("record", "", (path) => request("POST", path, { body, query: gymQuery() })));
}
