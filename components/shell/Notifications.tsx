"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { LuBanknote, LuBell, LuCalendarClock, LuPartyPopper, LuTimer } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuth } from "@/components/AuthProvider";
import { useResource } from "@/lib/api";
import { today } from "@/lib/dates";
import { LEADS_KEY, leadName, nextMoveOf, type Lead } from "@/lib/leads";
import { MEMBERS_KEY, currentMembership, fullName, isExpiringSoon, paymentStatus, type Member } from "@/lib/members";

type Alert = { key: string; icon: IconType; tone: string; title: string; detail: string; href: string };

const READ_KEY = "notifications-read";
const READ_EVENT = "manygym:notifications-read";
const subscribeRead = (cb: () => void) => { window.addEventListener(READ_EVENT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(READ_EVENT, cb); window.removeEventListener("storage", cb); }; };
const idOf = (a: Alert) => `${a.key}|${a.title}|${a.detail}`;

const names = (list: string[]) => (list.length <= 2 ? list.join(" and ") : `${list.slice(0, 2).join(", ")} +${list.length - 2} more`);

/** The bell: things that need attention today, worked out from the data the signed-in role can already see. */
export default function Notifications() {
  const { can, trainerOnly, user } = useAuth();
  const [members] = useResource<Member>(MEMBERS_KEY);
  const [leads] = useResource<Lead>(LEADS_KEY);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const stored = useSyncExternalStore(subscribeRead, () => { try { return localStorage.getItem(READ_KEY) ?? "[]"; } catch { return "[]"; } }, () => "[]");
  const read = useMemo<string[]>(() => { try { return JSON.parse(stored); } catch { return []; } }, [stored]);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const now = today();
    if (can("View members")) {
      const mine = trainerOnly ? members.filter((m) => m.trainerId === user?.id) : members;
      const expiring = mine.filter((m) => isExpiringSoon(m, now));
      if (expiring.length) out.push({ key: "exp", icon: LuTimer, tone: "bg-warn-bg text-warn", title: `${expiring.length} membership${expiring.length > 1 ? "s" : ""} expiring soon`, detail: names(expiring.map(fullName)), href: "/members" });
      const owing = mine.filter((m) => { const c = currentMembership(m); return c && paymentStatus(c) !== "paid"; });
      if (owing.length) out.push({ key: "owe", icon: LuBanknote, tone: "bg-bad-bg text-bad", title: `${owing.length} member${owing.length > 1 ? "s" : ""} with a balance due`, detail: names(owing.map(fullName)), href: "/members" });
    }
    if (can("View leads")) {
      const open = leads.filter((l) => l.stage !== "joined" && l.stage !== "not_joining");
      const due = open.filter((l) => { const m = nextMoveOf(l); return m && m.date <= now; });
      if (due.length) out.push({ key: "due", icon: LuCalendarClock, tone: "bg-primary-50 text-primary", title: `${due.length} lead follow-up${due.length > 1 ? "s" : ""} due`, detail: names(due.map(leadName)), href: "/leads" });
      const fresh = open.filter((l) => l.stage === "new");
      if (fresh.length) out.push({ key: "new", icon: LuPartyPopper, tone: "bg-ok-bg text-ok", title: `${fresh.length} new lead${fresh.length > 1 ? "s" : ""}`, detail: names(fresh.map(leadName)), href: "/leads" });
    }
    return out;
  }, [members, leads, can, trainerOnly, user]);

  const markRead = (a: Alert) => {
    const next = [...new Set([...read, idOf(a)])];
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); window.dispatchEvent(new Event(READ_EVENT)); } catch { /* storage unavailable */ }
  };
  const isUnread = (a: Alert) => !read.includes(idOf(a));
  const unread = alerts.filter(isUnread);
  const shown = filter === "unread" ? unread : alerts;

  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.9 }} aria-label={`Notifications${unread.length ? `, ${unread.length} new` : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-background text-foreground transition-colors hover:bg-line">
        <motion.span className="block" animate={unread.length ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.7, delay: 0.6 }}><LuBell size={22} /></motion.span>
        {unread.length > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-bad px-1 text-[10px] font-bold text-white">{unread.length}</span>}
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14 }}
              className="fixed inset-x-3 top-[64px] z-30 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[360px]">
              <p className="px-3 pb-1 pt-2 text-[22px] font-bold leading-tight">Notifications</p>
              <div className="flex gap-1.5 px-3 pb-1 pt-1" role="tablist" aria-label="Filter notifications">
                {(["all", "unread"] as const).map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                    className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold capitalize transition-colors ${filter === f ? "bg-primary-50 text-primary" : "text-foreground hover:bg-background"}`}>{f}</button>
                ))}
              </div>
              {shown.length === 0 && <p className="px-3 py-6 text-center text-muted">{filter === "unread" ? "No unread notifications." : "You\u2019re all caught up."}</p>}
              {([["New", shown.filter(isUnread)], ["Earlier", shown.filter((a) => !isUnread(a))]] as const).map(([label, list]) => list.length > 0 && (
                <div key={label}>
                  <p className="px-3 pb-1 pt-3 text-[15px] font-bold">{label}</p>
                  {list.map((a, i) => (
                    <motion.div key={a.key} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link href={a.href} onClick={() => { markRead(a); setOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background">
                        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${a.tone}`}><a.icon size={26} /></span>
                        <span className="min-w-0 flex-1"><b className="block text-[14px] font-semibold">{a.title}</b><span className="block truncate text-[13px] text-muted">{a.detail}</span></span>
                        {isUnread(a) && <span aria-label="Unread" className="h-3 w-3 shrink-0 rounded-full bg-primary" />}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
