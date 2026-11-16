"use client";

/**
 * Activity Log — the gym's administration audit trail (lib/api/admin-logs.ts).
 *
 * Everything is filtered and paged by the server: the table only ever holds the page on screen, and the
 * export downloads whatever the current filters select, not just that page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronRight, LuDownload, LuHistory, LuLoaderCircle, LuLock, LuRotateCcw, LuSearch, LuUserRound, LuX } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import Offcanvas from "@/components/ui/Offcanvas";
import { Avatar, EmptyState, Pagination, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { exportLogs, getLog, listLogs, logMetrics, logOptions, type AdminLog, type ExportFormat, type LogFilters, type LogMetrics, type LogOptions, type LogPage } from "@/lib/api/admin-logs";
import { ApiError } from "@/lib/api/http";
import { btnGhost, card, hint, input, label } from "@/lib/ui";

const PAGE_SIZE = 20;
const DENIED = "You don't have access to the activity log";

// ---------------------------------------------------------------- formatting

const titleCase = (s: string) => s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());

/** Local date and time; the server's own formatting is used only when the timestamp can't be parsed. */
function when(log: AdminLog): { date: string; time: string } {
  const d = new Date(log.at);
  if (!log.at || Number.isNaN(d.getTime())) return { date: log.atLabel || "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

const TONES = ["purple", "blue", "green", "amber", "gray"] as const;
/** A stable colour per category, so the same module always reads the same in the table. */
const toneFor = (category: string) => TONES[[...category].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % TONES.length, 0)];

// ---------------------------------------------------------------- metadata

type Fact = { key: string; value?: string; before?: string; after?: string };

const BEFORE = ["old", "old_value", "before", "from", "previous"];
const AFTER = ["new", "new_value", "after", "to", "current"];

function plain(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.length ? v.map(plain).join(", ") : "—";
  // Last resort for something deeply nested: compact, but still one line per fact.
  return JSON.stringify(v);
}

/**
 * Turns whatever the server attached into readable rows. The shape varies by action and is undocumented, so
 * this recognises the common ones — `{field: {old, new}}`, `{changes: {...}}`, `{before: {...}, after: {...}}`
 * — and falls back to plain `key: value` rows, flattening one level of nesting.
 */
function facts(meta: unknown, prefix = "", depth = 0): Fact[] {
  if (meta === null || meta === undefined || meta === "") return [];
  if (typeof meta !== "object") return [{ key: prefix || "Value", value: plain(meta) }];
  if (Array.isArray(meta)) return meta.length ? [{ key: prefix || "Items", value: plain(meta) }] : [];

  const o = meta as Record<string, unknown>;
  const name = (k: string) => (prefix ? `${prefix} · ${titleCase(k)}` : titleCase(k));
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

  // Two whole snapshots: pair them up field by field and keep only what differs.
  const bKey = ["before", "old", "previous"].find((k) => isObj(o[k]));
  const aKey = ["after", "new", "current"].find((k) => isObj(o[k]));
  if (bKey && aKey) {
    const before = o[bKey] as Record<string, unknown>;
    const after = o[aKey] as Record<string, unknown>;
    const out: Fact[] = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .map((k) => ({ key: name(k), before: plain(before[k]), after: plain(after[k]) }));
    const rest = Object.fromEntries(Object.entries(o).filter(([k]) => k !== bKey && k !== aKey));
    return [...out, ...facts(rest, prefix, depth)];
  }

  const out: Fact[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (isObj(v)) {
      const b = BEFORE.find((x) => x in v);
      const a = AFTER.find((x) => x in v);
      if (b && a) out.push({ key: name(k), before: plain(v[b]), after: plain(v[a]) });
      else if (k === "changes" || k === "diff" || k === "updated_fields") out.push(...facts(v, prefix, depth));
      else if (depth < 1) out.push(...facts(v, name(k), depth + 1));
      else out.push({ key: name(k), value: plain(v) });
    } else {
      out.push({ key: name(k), value: plain(v) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- screen

const BLANK: LogFilters = { category: "", actionType: "", actorId: "", from: "", to: "", search: "" };

export default function ActivityLog() {
  const toast = useToast();
  const [filters, setFilters] = useState<LogFilters>(BLANK);
  const [query, setQuery] = useState(""); // what is typed; `filters.search` follows after a pause
  const [actorName, setActorName] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<LogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [metrics, setMetrics] = useState<LogMetrics | null>(null);
  const [options, setOptions] = useState<LogOptions>({ categories: [], actionTypes: [] });

  const [open, setOpen] = useState<AdminLog | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);
  const run = useRef(0);

  const dateError = filters.from && filters.to && filters.from > filters.to ? "The start date is after the end date" : "";

  // Typing shouldn't be one request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === query.trim() ? f : { ...f, search: query.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    if (dateError) return;
    const mine = ++run.current;
    setLoading(true);
    setError("");
    try {
      const res = await listLogs(filters, page, PAGE_SIZE);
      if (mine !== run.current) return;
      setData(res);
      setDenied(false);
      // Filters can shrink the result under the page we were on.
      if (page > res.pages) setPage(res.pages);
    } catch (e) {
      if (mine !== run.current) return;
      if (e instanceof ApiError && e.status === 403) setDenied(true);
      else setError(e instanceof ApiError ? e.message : "Couldn't load the activity log.");
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, [filters, page, dateError]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // The tiles and the dropdowns are extras: if either fails, the table still works.
  useEffect(() => {
    let live = true;
    logMetrics().then((m) => live && setMetrics(m)).catch(() => undefined);
    logOptions().then((o) => live && setOptions(o)).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const set = (patch: Partial<LogFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(BLANK); setQuery(""); setActorName(""); setPage(1); };
  const filtered = !!(filters.category || filters.actionType || filters.actorId || filters.from || filters.to || filters.search);

  // Until /actions/ answers, offer whatever categories the metrics mention so the filter isn't empty.
  const categories = useMemo(
    () => (options.categories.length ? options.categories : Object.keys(metrics?.byCategory ?? {}).map((value) => ({ value, label: titleCase(value) }))),
    [options.categories, metrics],
  );
  const categoryLabel = (value: string) => categories.find((c) => c.value === value)?.label ?? titleCase(value);
  const busiest = useMemo(() => Object.entries(metrics?.byCategory ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4), [metrics]);

  /** The list row is shown at once; the detail endpoint then fills in anything the row left out. */
  const show = async (log: AdminLog) => {
    setOpen(log);
    setDetailBusy(true);
    try {
      const full = await getLog(log.id);
      setOpen((cur) => (cur?.id === log.id ? full : cur));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) toast("That entry is no longer available.");
      // Otherwise keep showing the row we already have.
    } finally {
      setDetailBusy(false);
    }
  };

  const download = async () => {
    setExporting(true);
    try {
      const { filename, rows } = await exportLogs(filters, format);
      toast(rows === null ? `Downloaded ${filename}` : `Downloaded ${rows} entr${rows === 1 ? "y" : "ies"} — ${filename}`);
    } catch (e) {
      toast(e instanceof ApiError && e.status === 403 ? DENIED : e instanceof ApiError ? e.message : "Couldn't export the log.");
    } finally {
      setExporting(false);
    }
  };

  if (denied) {
    return (
      <div className={`${card} mx-auto mt-10 max-w-md p-10 text-center`}>
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bad-bg text-bad"><LuLock size={22} /></span>
        <h2 className="text-xl font-bold">{DENIED}</h2>
        <p className="mt-1 text-muted">Ask the gym owner or an Administrator if you need to see who changed what.</p>
      </div>
    );
  }

  const openFacts = open ? facts(open.metadata) : [];
  const openWhen = open ? when(open) : null;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile title="Actions recorded" value={metrics ? metrics.total.toLocaleString() : null} />
        <Tile title="Today" value={metrics ? metrics.today.toLocaleString() : null} />
        <div className={`${card} col-span-2 p-4`}>
          <p className="text-[13px] font-semibold text-muted">Most active areas</p>
          {!metrics ? <div className="mt-2 h-7 animate-pulse rounded-lg bg-background" /> : busiest.length === 0 ? <p className="mt-1.5 text-muted">Nothing recorded yet.</p> : (
            <div className="mt-2 flex flex-wrap gap-2">
              {busiest.map(([value, count]) => (
                <button key={value} onClick={() => set({ category: filters.category === value ? "" : value })} aria-pressed={filters.category === value}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold ${filters.category === value ? "bg-primary text-white" : "bg-background hover:bg-line"}`}>
                  {categoryLabel(value)} <span className="opacity-70">{count.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_150px_150px]">
          <label className="relative block">
            <LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" className={`${input} pl-10`} placeholder="Search action, details or admin…" aria-label="Search the activity log" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <Select aria-label="Area" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
            <option value="">All areas</option>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select aria-label="Action" value={filters.actionType} onChange={(e) => set({ actionType: e.target.value })}>
            <option value="">All actions</option>
            {options.actionTypes.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </Select>
          <input type="date" className={input} aria-label="From date" title="From" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          <input type="date" className={input} aria-label="To date" title="To" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          {filters.actorId && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-1.5 text-[13px] font-semibold text-primary">
              <LuUserRound size={14} />{actorName || "One admin"}
              <button aria-label="Show every admin" onClick={() => { set({ actorId: "" }); setActorName(""); }} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/15"><LuX size={13} /></button>
            </span>
          )}
          {dateError ? <span role="alert" className="text-[13px] text-bad">{dateError}</span>
            : <span className="text-[13px] text-muted">{data && !loading ? `${data.total.toLocaleString()} entr${data.total === 1 ? "y" : "ies"}${filtered ? " match" : ""}` : " "}</span>}
          {filtered && <button onClick={reset} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"><LuRotateCcw size={14} />Clear filters</button>}
          <span className="ml-auto flex items-center gap-2">
            <Select aria-label="Export format" className="!w-auto" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
              <option value="csv">CSV</option><option value="json">JSON</option>
            </Select>
            <MotionButton className={btnGhost} disabled={exporting || !!dateError || (!!data && data.total === 0)} onClick={download}
              title={filtered ? "Downloads every entry matching these filters" : "Downloads the whole log"}>
              {exporting ? <LuLoaderCircle size={17} className="animate-spin" /> : <LuDownload size={17} />}{exporting ? "Exporting…" : "Export"}
            </MotionButton>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="rt w-full min-w-[760px] text-left">
            <thead className="bg-background text-[13px] text-muted">
              <tr>{["Date and time", "Admin", "Action", "Details", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody aria-busy={loading}>
              {loading && !data && Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-t border-line"><td colSpan={5} className="px-4 py-3"><div className="h-9 animate-pulse rounded-lg bg-background" /></td></tr>
              ))}
              {error && (
                <tr><td colSpan={5} className="p-10 text-center text-muted">
                  <p>{error}</p>
                  <button className="mt-2 font-semibold text-primary" onClick={() => void load()}>Try again</button>
                </td></tr>
              )}
              {!error && !loading && data?.logs.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-muted">
                  <EmptyState icon={LuHistory} title={filtered ? "No entries match" : "Nothing recorded yet"}
                    hint={filtered ? "Try a wider date range or clear the filters." : "Changes admins make to this gym will appear here."} />
                </td></tr>
              )}
              {!error && data?.logs.map((log) => {
                const t = when(log);
                return (
                  <tr key={log.id} tabIndex={0} onClick={() => void show(log)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void show(log); } }}
                    className={`cursor-pointer border-t border-line outline-none hover:bg-background focus-visible:bg-background ${open?.id === log.id ? "bg-primary-50" : ""} ${loading ? "opacity-60" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3"><span className="block font-semibold">{t.date}</span><span className="text-[13px] text-muted">{t.time}</span></td>
                    <td className="px-4"><div className="flex items-center gap-2.5"><Avatar name={log.admin.name} size={32} src={log.admin.avatarUrl} /><span className="min-w-0"><b className="block truncate">{log.admin.name}</b>{log.admin.email && <span className="block truncate text-[13px] text-muted">{log.admin.email}</span>}</span></div></td>
                    <td className="px-4"><span className="block font-semibold">{log.action}</span>{log.categoryLabel && <Pill tone={toneFor(log.category)}>{log.categoryLabel}</Pill>}</td>
                    <td className="max-w-[340px] px-4"><span className="line-clamp-2 text-muted">{log.details || "—"}</span></td>
                    <td className="px-4 text-muted"><LuChevronRight size={18} aria-hidden /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && !error && (
          <div className="border-t border-line">
            <Pagination page={data.page} pages={data.pages} onPage={setPage} total={data.total} size={data.pageSize} shown={data.logs.length} noun="entries" />
          </div>
        )}
      </section>

      <Offcanvas open={!!open} onClose={() => setOpen(null)}>
        {open && openWhen && (
          <section>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">{open.action}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                  {open.categoryLabel && <Pill tone={toneFor(open.category)}>{open.categoryLabel}</Pill>}
                  <span>{openWhen.date}{openWhen.time && `, ${openWhen.time}`}</span>
                  {detailBusy && <LuLoaderCircle size={15} className="animate-spin" aria-label="Loading details" />}
                </p>
              </div>
              <button aria-label="Close" onClick={() => setOpen(null)} className="text-muted"><LuX size={22} /></button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-background p-3">
              <Avatar name={open.admin.name} size={44} src={open.admin.avatarUrl} />
              <span className="min-w-0 flex-1"><b className="block truncate">{open.admin.name}</b>{open.admin.email && <span className="block truncate text-muted">{open.admin.email}</span>}</span>
              {open.admin.id && filters.actorId !== open.admin.id && (
                <button className="text-[13px] font-semibold text-primary" onClick={() => { set({ actorId: open.admin.id }); setActorName(open.admin.name); setOpen(null); }}>
                  Show only their actions
                </button>
              )}
            </div>

            <h4 className={`${label} mt-5`}>Details</h4>
            <p className="whitespace-pre-wrap">{open.details || <span className="text-muted">No description was recorded.</span>}</p>

            {(open.targetType || open.targetId) && (<>
              <h4 className={`${label} mt-5`}>Affected item</h4>
              <p>{open.targetType ? titleCase(open.targetType) : "Item"}{open.targetId && <span className="ml-2 break-all rounded-md bg-background px-2 py-0.5 font-mono text-[12px] text-muted">{open.targetId}</span>}</p>
            </>)}

            {openFacts.length > 0 && (<>
              <h4 className={`${label} mt-5`}>What changed</h4>
              <dl className="divide-y divide-line rounded-xl border border-line">
                {openFacts.map((f, i) => (
                  <div key={`${f.key}-${i}`} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-3">
                    <dt className="text-[13px] font-semibold text-muted">{f.key}</dt>
                    <dd className="break-words">
                      {f.after !== undefined
                        ? <><span className="text-muted line-through decoration-muted/60">{f.before}</span><span className="mx-2 text-muted" aria-label="changed to">→</span><span className="font-semibold">{f.after}</span></>
                        : f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>)}

            <p className={`${hint} mt-5`}>Action code <span className="font-mono">{open.actionType || "—"}</span> · Entry <span className="break-all font-mono">{open.id}</span></p>
          </section>
        )}
      </Offcanvas>
    </>
  );
}

function Tile({ title, value }: { title: string; value: string | null }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-[13px] font-semibold text-muted">{title}</p>
      {value === null ? <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-background" /> : <p className="mt-1 text-[28px] font-bold leading-tight">{value}</p>}
    </div>
  );
}
