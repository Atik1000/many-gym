"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionButton } from "@/components/ui/Motion";
import { LuChevronDown as ChevronDown, LuX } from "react-icons/lu";
import { NAV, SETTINGS, type NavItem } from "@/lib/nav";
import { useGym } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

function Item({ item, active, group }: { item: NavItem; active: boolean; group: string }) {
  const Icon = item.icon;
  const cls = `relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-medium transition-colors ${
    active ? "font-semibold text-primary" : "text-[#3b3e55] hover:bg-background"
  } ${item.ready ? "" : "cursor-not-allowed opacity-60"}`;
  const inner = (
    <>
      {active && (
        <>
          <motion.span layoutId={`nav-active-${group}`} className="absolute inset-0 rounded-[10px] bg-primary-50" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          <motion.span layoutId={`nav-bar-${group}`} className="absolute -left-3.5 top-2 h-[calc(100%-16px)] w-1 rounded-r-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
        </>
      )}
      <motion.span className="relative flex items-center gap-3" whileHover={item.ready ? { x: 2 } : undefined} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
        <Icon size={20} strokeWidth={1.8} />
        {item.label}
      </motion.span>
    </>
  );
  return item.ready ? (
    <Link href={item.href} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>
  ) : (
    <span className={cls} title="Coming soon">{inner}</span>
  );
}

function NavContent({ group, onNavigate }: { group: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { ready, can } = useAuth();
  const [gym] = useGym();
  // hide sections the role can't view (show everything until the role has loaded to avoid a flash)
  const visible = NAV.filter((n) => !ready || !n.perm || can(n.perm));
  return (
    <>
      <div className="flex items-center gap-2.5 px-2 text-[22px] font-extrabold tracking-tight">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#7a5cff] to-primary-600 text-lg text-white shadow-[0_6px_14px_-4px_rgba(91,61,245,.6)]">m</span>
        manygym
      </div>
      <button className="flex w-full items-center gap-2.5 rounded-[10px] border border-line px-2.5 py-2 font-semibold transition-colors hover:bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {gym?.overview.profileUrl ? <img src={gym.overview.profileUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-background" />}
        <span className="truncate">{gym?.overview.name ?? "Your gym"}</span>
        <ChevronDown size={16} className="ml-auto text-muted" />
      </button>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) onNavigate?.(); }}>
        {visible.map((item) => (
          <Item key={item.href} group={group} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
        ))}
        <div className="flex-1" />
        <Item group={group} item={SETTINGS} active={pathname === SETTINGS.href} />
      </nav>
    </>
  );
}

export const NAV_EVENT = "manygym:nav";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  // the top bar's menu button (phones/tablets) asks for the drawer through a window event
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener(NAV_EVENT, toggle);
    return () => window.removeEventListener(NAV_EVENT, toggle);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col gap-3.5 border-r border-line bg-surface p-3.5 pt-5 lg:flex">
        <NavContent group="desktop" />
      </aside>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside role="dialog" aria-modal aria-label="Menu" className="absolute inset-y-0 left-0 flex w-[270px] max-w-[85vw] flex-col gap-3.5 bg-surface p-3.5 pt-5 shadow-2xl"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 420, damping: 38 }}>
              <MotionButton aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-background"><LuX size={20} /></MotionButton>
              <NavContent group="mobile" onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
