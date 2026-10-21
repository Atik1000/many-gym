"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LuCreditCard, LuCornerDownLeft, LuSearch, LuUserPlus, LuUsers } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useResource } from "@/lib/api";
import { LEADS_KEY, STAGE_LABEL, leadName, type Lead } from "@/lib/leads";
import { MEMBERS_KEY, currentMembership, fullName, memberStatus, type Member } from "@/lib/members";
import type { Plan } from "@/lib/plans";

type Hit = { key: string; group: string; title: string; sub: string; href: string; icon: IconType; avatar?: { name: string; src?: string } };
const GROUP_ICON: Record<string, IconType> = { Members: LuUsers, Leads: LuUserPlus, Plans: LuCreditCard };

/** ⌘K / Ctrl-K palette: finds members, leads and plans the signed-in role may see. */
export default function GlobalSearch() {
  const router = useRouter();
  const { can } = useAuth();
  const [members] = useResource<Member>(MEMBERS_KEY);
  const [leads] = useResource<Lead>(LEADS_KEY);
  const [plans] = useResource<Plan>("plans");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const has = (...s: string[]) => s.some((x) => x.toLowerCase().includes(term));
    const out: Hit[] = [];
    if (can("View members")) members.filter((m) => has(fullName(m), m.email, m.phone, m.memberNo)).slice(0, 5)
      .forEach((m) => out.push({ key: m.id, group: "Members", title: fullName(m), sub: `${currentMembership(m)?.planName ?? "No plan"} · ${memberStatus(m)}`, href: `/members/${m.id}`, icon: LuUsers, avatar: { name: fullName(m), src: m.photo } }));
    if (can("View leads")) leads.filter((l) => has(leadName(l), l.email, l.phone)).slice(0, 4)
      .forEach((l) => out.push({ key: l.id, group: "Leads", title: leadName(l), sub: STAGE_LABEL[l.stage], href: "/leads", icon: LuUserPlus, avatar: { name: leadName(l), src: "" } }));
    if (can("View plans")) plans.filter((p) => has(p.name)).slice(0, 4)
      .forEach((p) => out.push({ key: p.id, group: "Plans", title: p.name, sub: `${p.status} · ${p.type === "time" ? "Time based" : "Session based"}`, href: `/plans/${p.id}`, icon: LuCreditCard }));
    return out;
  }, [q, members, leads, plans, can]);

  const go = (h: Hit) => { setOpen(false); setQ(""); router.push(h.href); };
  const close = () => { setOpen(false); setQ(""); setCursor(0); };
  const active = Math.min(cursor, Math.max(0, hits.length - 1));

  return (
    <>
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setOpen(true)} aria-label="Search"
        className="flex items-center gap-2 rounded-[10px] border border-line bg-background p-2 text-muted transition-colors hover:border-primary/40 md:w-[300px] md:px-3 xl:w-[340px]">
        <LuSearch size={18} />
        <span className="hidden flex-1 text-left md:block">Search Manygym</span>
        <kbd className="hidden rounded-md border border-line bg-surface px-1.5 text-[11px] font-semibold md:block">⌘K</kbd>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 grid place-items-start justify-items-center bg-foreground/50 px-4 pt-[12vh] backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <motion.div role="dialog" aria-modal aria-label="Search" className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-surface shadow-2xl"
              initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ type: "spring", stiffness: 460, damping: 34 }}>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <LuSearch size={19} className="text-muted" />
                <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setCursor(0); }} placeholder="Search Manygym" aria-label="Search"
                  className="h-14 flex-1 bg-transparent text-base outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(Math.min(active + 1, hits.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(Math.max(active - 1, 0)); }
                    else if (e.key === "Enter" && hits[active]) go(hits[active]);
                  }} />
                <kbd className="rounded-md border border-line px-1.5 text-[11px] font-semibold text-muted">Esc</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {!q.trim() && <p className="px-3 py-8 text-center text-muted">Type a name, email, phone number or plan.</p>}
                {q.trim() && hits.length === 0 && <p className="px-3 py-8 text-center text-muted">Nothing found for “{q.trim()}”.</p>}
                {hits.map((h, i) => {
                  const GroupIcon = GROUP_ICON[h.group];
                  return (
                    <div key={h.key}>
                      {(i === 0 || hits[i - 1].group !== h.group) && <p className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted"><GroupIcon size={13} />{h.group}</p>}
                      <button onMouseEnter={() => setCursor(i)} onClick={() => go(h)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === active ? "bg-primary-50" : ""}`}>
                        {h.avatar ? <Avatar name={h.avatar.name} src={h.avatar.src} size={34} /> : <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-primary-50 text-primary"><h.icon size={17} /></span>}
                        <span className="min-w-0 flex-1"><b className="block truncate font-semibold">{h.title}</b><span className="block truncate text-[13px] capitalize text-muted">{h.sub}</span></span>
                        {i === active && <LuCornerDownLeft size={16} className="text-primary" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
