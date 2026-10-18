"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { LuChevronDown as ChevronDown, LuChevronLeft as ChevronLeft, LuChevronRight as ChevronRight, LuX as X, LuX } from "react-icons/lu";
import Modal from "./Modal";
import { btnGhost, input } from "@/lib/ui";
import { avatarUrl } from "@/lib/media";

/** `src` undefined → a stock portrait for the name; `src=""` → initials only (e.g. a member who has no photo). */
export function Avatar({ name, size = 40, src }: { name: string; size?: number; src?: string }) {
  const [failed, setFailed] = useState(false);
  const url = src === undefined ? (name && name !== "?" ? avatarUrl(name, size) : "") : src;
  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} style={{ width: size, height: size }} className="shrink-0 rounded-full bg-background object-cover ring-1 ring-black/5" />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  // stable hue per name so the same person always gets the same colour
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return (
    <span style={{ width: size, height: size, background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 50% 30%)`, fontSize: size * 0.36 }}
      className="grid shrink-0 place-items-center rounded-full font-bold">{initials}</span>
  );
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" | "purple" }) {
  const t = { gray: "bg-background text-muted", green: "bg-ok-bg text-ok", amber: "bg-warn-bg text-warn", red: "bg-bad-bg text-bad", blue: "bg-[#e4edff] text-[#2563eb]", purple: "bg-primary-50 text-primary" }[tone];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${t}`}>{children}</span>;
}

export function Dot({ tone }: { tone: "green" | "amber" | "red" | "blue" | "gray" }) {
  const c = { green: "bg-ok", amber: "bg-amber-500", red: "bg-bad", blue: "bg-[#2563eb]", gray: "bg-muted" }[tone];
  return <span className={`h-2 w-2 rounded-full ${c}`} />;
}

/** Chips + dropdown checklist (Goal, Fitness Goal, permissions). */
export function MultiSelect({ value, options, onChange, placeholder = "Select…", id }: {
  value: string[]; options: string[]; onChange: (v: string[]) => void; placeholder?: string; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="relative">
      <div id={id} role="button" aria-haspopup="listbox" aria-expanded={open} tabIndex={0} onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((v) => !v))}
        className="flex min-h-[42px] cursor-pointer flex-wrap items-center gap-1.5 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 focus:border-primary focus:outline-none">
        {value.length === 0 && <span className="px-1 text-muted">{placeholder}</span>}
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[13px] font-medium text-primary">
            {v}<button type="button" aria-label={`Remove ${v}`} onClick={(e) => { e.stopPropagation(); toggle(v); }}><X size={13} /></button>
          </span>
        ))}
        <ChevronDown size={16} className="ml-auto text-muted" />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-full overflow-auto rounded-[10px] border border-line bg-surface p-1.5 shadow-xl">
            {options.map((o) => (
              <li key={o}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-background">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.includes(o)} onChange={() => toggle(o)} />{o}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function ConfirmModal({ open, title, body, confirmLabel = "Delete", danger = true, onConfirm, onClose }: {
  open: boolean; title: string; body: React.ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} footer={<>
      <MotionButton className={btnGhost} onClick={onClose}><LuX size={17} />Cancel</MotionButton>
      <button className={`rounded-[10px] px-4 py-2 font-semibold text-white ${danger ? "bg-bad" : "bg-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      <div>{body}</div>
    </Modal>
  );
}

/** Slices a list into pages. Pass a `resetKey` built from the filters so changing one returns to page 1. */
export function usePaged<T>(items: T[], size: number, resetKey = "") {
  const [page, setPage] = useState(1);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) { setPrevKey(resetKey); setPage(1); }
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const view = items.slice((current - 1) * size, current * size);
  return { view, page: current, pages, onPage: setPage, total: items.length, size, shown: view.length };
}

export function Pagination({ page, pages, onPage, total, size, shown, noun = "results" }: { page: number; pages: number; onPage: (p: number) => void; total: number; size: number; shown: number; noun?: string }) {
  const id = useId();
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const base = "relative grid h-9 min-w-9 place-items-center rounded-[10px] px-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-35";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-muted">
      <span className="text-sm">Showing <b className="text-foreground">{from}–{from + shown - (shown ? 1 : 0)}</b> of {total} {noun}</span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <motion.button whileTap={{ scale: 0.92 }} className={`${base} border border-line bg-surface text-foreground hover:bg-background`} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></motion.button>
          {nums.map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
              <motion.button whileTap={{ scale: 0.92 }} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)} className={`${base} ${n === page ? "text-white" : "text-foreground hover:bg-background"}`}>
                {n === page && <motion.span layoutId={`pg-${id}`} className="absolute inset-0 rounded-[10px] bg-primary shadow-[0_4px_10px_-2px_rgba(91,63,245,.5)]" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                <span className="relative">{n}</span>
              </motion.button>
            </span>
          ))}
          <motion.button whileTap={{ scale: 0.92 }} className={`${base} border border-line bg-surface text-foreground hover:bg-background`} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></motion.button>
        </div>
      )}
    </nav>
  );
}

export const Select = ({ className = "", ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className={`${input} ${className}`} {...p} />;
