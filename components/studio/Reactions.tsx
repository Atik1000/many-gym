"use client";

/**
 * Reactions on a post, comment or story (lib/api/reactions.ts).
 *
 * Three pieces share one piece of state from `useReactions`:
 *  - `ReactionButton` — shows the viewer's reaction; a click gives (or takes back) the default one, and
 *    hovering, long-pressing or pressing ↑/↓ opens the picker with the whole catalogue;
 *  - `ReactionSummaryChip` — the most used emoji and the total, opening the list of who reacted;
 *  - the default export, which puts both on one line for tight spots (a comment, a story).
 *
 * A post card needs the two halves in different places, which is why they are separate.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LuLoaderCircle, LuThumbsUp } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/reactions";
import type { ReactionItem, ReactionSummary, ReactionTarget, Reactor } from "@/lib/api/reactions";

const NOUN = { post: "post", comment: "comment", story: "story" } as const;
/** Ids minted in the browser for a post that hasn't been saved yet are not UUIDs; nothing can react to those. */
const isServerId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** The summary as it will look once the viewer's reaction becomes `item` (null = taken back). */
function withViewer(s: ReactionSummary, item: ReactionItem | null): ReactionSummary {
  let counts = s.counts.map((c) => ({ ...c }));
  if (s.viewer) counts = counts.map((c) => (c.code === s.viewer!.code ? { ...c, count: c.count - 1 } : c));
  if (item) {
    const hit = counts.find((c) => c.code === item.code);
    if (hit) hit.count += 1;
    else counts.push({ code: item.code, emoji: item.emoji, label: item.label, count: 1 });
  }
  counts = counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  return {
    total: Math.max(0, s.total - (s.viewer ? 1 : 0) + (item ? 1 : 0)),
    counts,
    top: counts.slice(0, 3),
    viewer: item ? { code: item.code, emoji: item.emoji, label: item.label } : null,
  };
}

export type ReactionState = {
  target: ReactionTarget;
  summary: ReactionSummary;
  /** False until the breakdown and the viewer's own reaction are known. */
  loaded: boolean;
  busy: boolean;
  /** False for something that only exists in this browser so far. */
  enabled: boolean;
  /** React with `item`, or take the reaction back with null. */
  set: (item: ReactionItem | null) => Promise<void>;
};

/** Attach as a `ref`: the summary is fetched when that element scrolls into view. */
export type ReactionWatch = (el: HTMLElement | null) => (() => void) | void;

/**
 * Returns the shared state and a `ref` callback, separately so the state can be handed to children freely.
 *
 * `initialCount` is the `reactions_count` the list payload carried. Zero means nobody has reacted — the
 * viewer included — so nothing is fetched until they do something.
 */
export function useReactions(target: ReactionTarget, initialCount: number, onCountChange?: (total: number) => void): [ReactionState, ReactionWatch] {
  const toast = useToast();
  const enabled = isServerId(target.id);
  const [summary, setSummary] = useState<ReactionSummary>(() => ({ ...api.EMPTY_SUMMARY, total: Math.max(0, initialCount) }));
  const [loaded, setLoaded] = useState(initialCount <= 0);
  const [busy, setBusy] = useState(false);
  const fetching = useRef<Promise<ReactionSummary | null> | null>(null);
  // The latest summary, for the async paths below that must not act on a stale closure.
  const current = useRef(summary);
  const { kind, id } = target;

  const commit = useCallback((s: ReactionSummary) => {
    current.current = s;
    setSummary(s);
  }, []);

  const load = useCallback((): Promise<ReactionSummary | null> => {
    fetching.current ??= api
      .reactionSummary({ kind, id })
      .then((s) => {
        commit(s);
        setLoaded(true);
        return s;
      })
      .catch(() => {
        fetching.current = null; // let a later attempt retry; the count from the list still shows
        return null;
      });
    return fetching.current;
  }, [kind, id, commit]);

  const needsLoad = enabled && initialCount > 0;
  const watch = useCallback((el: HTMLElement | null) => {
    if (!el || !needsLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      void load();
      return;
    }
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        io.disconnect();
        void load();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [needsLoad, load]);

  const set = useCallback(async (item: ReactionItem | null) => {
    if (!enabled || busy) return;
    setBusy(true);
    // Without the viewer's current reaction a "like" could silently toggle an existing one off.
    if (!loaded) await load();
    const before = current.current;
    if (!item && !before.viewer) {
      setBusy(false);
      return;
    }
    commit(withViewer(before, item));
    try {
      const after = item ? await api.react({ kind, id }, item.code) : await api.unreact({ kind, id }, before.viewer?.id);
      commit(after);
      setLoaded(true);
      onCountChange?.(after.total);
    } catch (e) {
      commit(before);
      toast(
        !(e instanceof ApiError) ? "Couldn't save your reaction. Try again."
          : e.status === 404 ? `This ${NOUN[kind]} is no longer available.`
            : e.message,
      );
    } finally {
      setBusy(false);
    }
  }, [enabled, busy, loaded, load, commit, kind, id, onCountChange, toast]);

  return [{ target, summary, loaded, busy, enabled, set }, watch];
}

// ---------------------------------------------------------------- the button + picker

const HOVER_OPEN_MS = 350;
const HOVER_CLOSE_MS = 280;
const LONG_PRESS_MS = 450;

export function ReactionButton({ state, className = "", tone = "light", compact = false, align = "left", onPickerChange }: {
  state: ReactionState;
  className?: string;
  /** `dark` for use over a story. */
  tone?: "light" | "dark";
  compact?: boolean;
  /** Which edge of the button the picker lines up with. */
  align?: "left" | "right" | "center";
  onPickerChange?: (open: boolean) => void;
}) {
  const { summary, set, enabled, busy } = state;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReactionItem[]>([]);
  const [focusFirst, setFocusFirst] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swallowClick = useRef(false);
  const viewer = summary.viewer;
  const fallback = api.defaultReaction(items);

  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const show = useCallback((viaKeyboard = false) => {
    setFocusFirst(viaKeyboard);
    setOpen(true);
    // The catalogue is cached for the session; until it arrives the picker shows a spinner.
    api.reactionItems().then(setItems).catch(() => setItems([api.DEFAULT_REACTION]));
  }, []);
  const hide = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  useEffect(() => { onPickerChange?.(open); }, [open, onPickerChange]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Close on a press anywhere else. (A backdrop element would sit under the pointer and defeat hover-out.)
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (open && focusFirst && items.length) picker.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [open, focusFirst, items.length]);

  const choose = (item: ReactionItem) => {
    hide(focusFirst);
    void set(viewer?.code === item.code ? null : item);
  };

  const onPickerKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      hide(true);
      return;
    }
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    e.stopPropagation(); // a story behind the picker uses the same keys to change story
    const all = [...(picker.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const to = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
    all[to]?.focus();
  };

  const dark = tone === "dark";
  const base = compact
    ? `inline-flex items-center gap-1 font-semibold ${viewer ? "text-primary" : dark ? "text-white" : "text-muted hover:text-primary"}`
    : `flex w-full items-center justify-center gap-2 rounded-lg p-2.5 font-semibold ${dark ? "hover:bg-white/15" : "hover:bg-background"} ${viewer ? "text-primary" : ""}`;
  const side = align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0";

  return (
    <span
      ref={wrap}
      className={`relative ${compact ? "inline-flex" : "block"}`}
      onPointerEnter={(e) => { if (e.pointerType === "mouse" && enabled) { clear(); timer.current = setTimeout(() => show(), HOVER_OPEN_MS); } }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") { clear(); timer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS); } }}
    >
      <button
        ref={button}
        type="button"
        disabled={!enabled}
        aria-pressed={!!viewer}
        aria-haspopup="true"
        aria-expanded={open}
        aria-busy={busy}
        aria-label={viewer ? `You reacted ${viewer.label}. Press to remove, or use the arrow keys to change it` : `${fallback.label}. Use the arrow keys for more reactions`}
        title={enabled ? undefined : "Available once this is saved"}
        className={`${base} select-none [-webkit-touch-callout:none] disabled:opacity-50 ${className}`}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" || !enabled) return;
          clear();
          timer.current = setTimeout(() => { swallowClick.current = true; show(); }, LONG_PRESS_MS);
        }}
        onPointerUp={(e) => { if (e.pointerType !== "mouse") clear(); }}
        onPointerCancel={clear}
        onContextMenu={(e) => { if (swallowClick.current || open) e.preventDefault(); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); show(true); }
          else if (e.key === "Escape" && open) { e.stopPropagation(); hide(); }
        }}
        onClick={() => {
          // The click that ends a long-press opened the picker; it must not also toggle the reaction.
          if (swallowClick.current) { swallowClick.current = false; return; }
          clear();
          setOpen(false);
          void set(viewer ? null : fallback);
        }}
      >
        {viewer
          ? <span aria-hidden className={compact ? "text-[13px] leading-none" : "text-lg leading-none"}>{viewer.emoji}</span>
          : <LuThumbsUp size={compact ? 13 : 18} aria-hidden />}
        <span>{viewer ? viewer.label : fallback.label}</span>
      </button>

      {open && (
        <div
          ref={picker}
          role="group"
          aria-label="Choose a reaction"
          onKeyDown={onPickerKey}
          className={`absolute bottom-full z-30 mb-1.5 ${side} grid w-max max-w-[calc(100vw-2rem)] grid-cols-7 gap-0.5 rounded-2xl border border-line bg-surface p-1.5 text-foreground shadow-xl`}
        >
          {items.length === 0
            ? <span className="col-span-7 grid h-9 w-24 place-items-center text-muted"><LuLoaderCircle size={16} className="motion-safe:animate-spin" aria-label="Loading reactions" /></span>
            : items.map((it) => (
              <button
                key={it.code}
                type="button"
                title={it.label}
                aria-label={viewer?.code === it.code ? `${it.label} (your reaction — press to remove)` : it.label}
                aria-pressed={viewer?.code === it.code}
                onClick={() => choose(it)}
                className={`grid h-9 w-9 place-items-center rounded-full text-xl leading-none outline-none transition-transform hover:bg-background focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:scale-125 ${viewer?.code === it.code ? "bg-primary-50" : ""}`}
              >
                <span aria-hidden>{it.emoji}</span>
              </button>
            ))}
        </div>
      )}
    </span>
  );
}

// ---------------------------------------------------------------- the summary chip + who reacted

function ReactorsModal({ target, summary, onClose }: { target: ReactionTarget; summary: ReactionSummary; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Reactor[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The modal's own copy of the breakdown, refreshed from the list response so the tabs are current.
  const [fresh, setFresh] = useState(summary);
  const run = useRef(0);
  const { kind, id } = target;

  const load = useCallback(async (next: number, filter: string) => {
    const mine = ++run.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.reactors({ kind, id }, { code: filter, page: next });
      if (mine !== run.current) return;
      setRows((prev) => {
        if (next === 1) return res.rows;
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...res.rows.filter((r) => !seen.has(r.id))];
      });
      setPage(next);
      setHasMore(res.hasMore && res.rows.length > 0);
      if (res.summary) setFresh(res.summary);
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof ApiError ? (e.status === 404 ? `This ${NOUN[kind]} is no longer available.` : e.message) : "Couldn't load reactions.");
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, [kind, id]);

  useEffect(() => {
    void Promise.resolve().then(() => load(1, code));
  }, [load, code]);

  const tab = (active: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold ${active ? "bg-primary-50 text-primary" : "text-muted hover:bg-background"}`;

  return (
    <Modal open title="Reactions" onClose={onClose}>
      <div role="tablist" aria-label="Filter by reaction" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <button role="tab" aria-selected={code === ""} className={tab(code === "")} onClick={() => setCode("")}>All <span className="font-normal">{fresh.total}</span></button>
        {fresh.counts.map((c) => (
          <button key={c.code} role="tab" aria-selected={code === c.code} aria-label={`${c.label}, ${c.count}`} className={tab(code === c.code)} onClick={() => setCode(c.code)}>
            <span aria-hidden className="text-base leading-none">{c.emoji}</span><span className="font-normal">{c.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="py-6 text-center text-muted">{error} <button className="font-semibold text-primary" onClick={() => void load(Math.max(1, page), code)}>Try again</button></p>
      ) : page === 0 && loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-background" />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-muted">No reactions yet.</p>
      ) : (
        <ul className="grid gap-1">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <span className="relative shrink-0">
                <Avatar name={r.name} size={40} src={r.avatarUrl} />
                <span aria-hidden className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface text-[13px] leading-none shadow">{r.emoji}</span>
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate">{r.name}</b>
                {r.via && <span className="block truncate text-[13px] text-muted">{r.via}</span>}
              </span>
              <span className="sr-only">reacted {r.label}</span>
            </li>
          ))}
        </ul>
      )}
      {hasMore && !error && (
        <button className="self-center font-semibold text-primary disabled:opacity-50" disabled={loading} onClick={() => void load(page + 1, code)}>
          {loading ? "Loading…" : "Show more"}
        </button>
      )}
    </Modal>
  );
}

export function ReactionSummaryChip({ state, tone = "light", compact = false, onModalChange }: {
  state: ReactionState;
  tone?: "light" | "dark";
  compact?: boolean;
  onModalChange?: (open: boolean) => void;
}) {
  const { summary, target } = state;
  const [open, setOpen] = useState(false);
  useEffect(() => { onModalChange?.(open); }, [open, onModalChange]);
  if (summary.total <= 0) return null;
  const dark = tone === "dark";
  const bubble = `grid ${compact ? "h-[18px] w-[18px] text-[11px]" : "h-5 w-5 text-[13px]"} place-items-center rounded-full leading-none ring-2 ${dark ? "bg-white/25 ring-transparent" : "bg-background ring-surface"}`;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${summary.total} reaction${summary.total === 1 ? "" : "s"} — see who reacted`}
        className={`inline-flex items-center gap-1.5 hover:underline ${dark ? "text-white" : ""}`}
      >
        <span className="flex -space-x-1" aria-hidden>
          {summary.top.length
            ? summary.top.slice(0, 3).map((t) => <span key={t.code} className={bubble}>{t.emoji}</span>)
            // The breakdown hasn't loaded yet; the count from the list is still right.
            : <span className={`${bubble} ${dark ? "" : "!bg-primary text-white"}`}><LuThumbsUp size={compact ? 10 : 11} fill="currentColor" /></span>}
        </span>
        {summary.total}
      </button>
      {open && <ReactorsModal target={target} summary={summary} onClose={() => setOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------- both, on one line

/**
 * Button and summary side by side — for a comment's action row or the foot of a story. Give it a `key` of
 * the target id when the same slot shows different targets over time (stories), so state starts fresh.
 */
export default function Reactions({ target, count, tone = "light", align = "left", onCountChange, onOpenChange }: {
  target: ReactionTarget;
  /** `reactions_count` from the payload. */
  count: number;
  tone?: "light" | "dark";
  align?: "left" | "right" | "center";
  onCountChange?: (total: number) => void;
  /** True while the picker or the who-reacted list is open — a story pauses on it. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [state, watch] = useReactions(target, count, onCountChange);
  const [picker, setPicker] = useState(false);
  const [modal, setModal] = useState(false);
  const anyOpen = picker || modal;
  useEffect(() => {
    onOpenChange?.(anyOpen);
    // Unmounting with something open (the story moved on) must not leave the owner thinking it still is.
    return () => { if (anyOpen) onOpenChange?.(false); };
  }, [anyOpen, onOpenChange]);
  return (
    <span ref={watch} className="inline-flex items-center gap-2">
      <ReactionButton state={state} tone={tone} compact align={align} onPickerChange={setPicker} />
      <ReactionSummaryChip state={state} tone={tone} compact onModalChange={setModal} />
    </span>
  );
}
