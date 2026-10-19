"use client";

import { useMemo, useState } from "react";
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

const names = (list: string[]) => (list.length <= 2 ? list.join(" and ") : `${list.slice(0, 2).join(", ")} +${list.length - 2} more`);

/** The bell: things that need attention today, worked out from the data the signed-in role can already see. */
export default function Notifications() {
  const { can, trainerOnly, user } = useAuth();
  const [members] = useResource<Member>(MEMBERS_KEY);
  const [leads] = useResource<Lead>(LEADS_KEY);
  const [open, setOpen] = useState(false);

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

  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.9 }} aria-label={`Notifications${alerts.length ? `, ${alerts.length} new` : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground">
        <motion.span className="block" animate={alerts.length ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.7, delay: 0.6 }}><LuBell size={20} /></motion.span>
        {alerts.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-surface bg-bad px-1 text-[10px] font-bold text-white">{alerts.length}</span>}
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14 }}
              className="fixed inset-x-3 top-[64px] z-30 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[340px]">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Needs attention</p>
              {alerts.length === 0 && <p className="px-3 py-6 text-center text-muted">You&apos;re all caught up.</p>}
              {alerts.map((a, i) => (
                <motion.div key={a.key} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={a.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.tone}`}><a.icon size={18} /></span>
                    <span className="min-w-0"><b className="block font-semibold">{a.title}</b><span className="block truncate text-[13px] text-muted">{a.detail}</span></span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
