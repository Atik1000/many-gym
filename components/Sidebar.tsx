"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionButton } from "@/components/ui/Motion";
import { LuPanelLeftClose, LuPanelLeftOpen, LuX } from "react-icons/lu";
import { NAV, EXTRA_TITLES, type NavItem } from "@/lib/nav";
import { useGym } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// collapsed state is remembered per browser; a tiny external store keeps SSR markup stable
const COLLAPSE_KEY = "manygym.sidebar.collapsed";
const COLLAPSE_EVENT = "manygym:collapse";
const subscribeCollapsed = (cb: () => void) => { window.addEventListener(COLLAPSE_EVENT, cb); return () => window.removeEventListener(COLLAPSE_EVENT, cb); };
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; } };
const setCollapsed = (v: boolean) => { try { localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch {} window.dispatchEvent(new Event(COLLAPSE_EVENT)); };

function Item({ item, active, group, collapsed }: { item: NavItem; active: boolean; group: string; collapsed?: boolean }) {
  const Icon = item.icon;
  const cls = `relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 font-medium ${collapsed ? "justify-center" : ""} transition-colors ${
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
        <Icon size={20} strokeWidth={1.8} className="shrink-0" />
        {!collapsed && item.label}
      </motion.span>
    </>
  );
  return item.ready ? (
    <Link href={item.href} title={collapsed ? item.label : undefined} aria-label={item.label} className={cls} aria-current={active ? "page" : undefined}>{inner}</Link>
  ) : (
    <span className={cls} title="Coming soon">{inner}</span>
  );
}

function NavContent({ group, onNavigate, collapsed, onToggle }: { group: string; onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const { ready, can } = useAuth();
  const [gym] = useGym();
  // hide sections the role can't view (show everything until the role has loaded to avoid a flash)
  const visible = NAV.filter((n) => !ready || !n.perm || can(n.perm));
  const title = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? EXTRA_TITLES[Object.keys(EXTRA_TITLES).find((k) => pathname.startsWith(k)) ?? ""] ?? "";
  const Toggle = collapsed ? LuPanelLeftOpen : LuPanelLeftClose;
  return (
    <>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-2 px-2"}`}>
        {!collapsed && <h2 className="truncate text-[22px] font-extrabold">{title}</h2>}
        {onToggle && (
          <MotionButton aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-foreground hover:bg-line"><Toggle size={19} /></MotionButton>
        )}
      </div>
      <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "px-2"}`} title={collapsed ? gym?.overview.name : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {gym?.overview.profileUrl ? <img src={gym.overview.profileUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="h-9 w-9 shrink-0 rounded-full bg-background" />}
        {!collapsed && <span className="truncate font-semibold">{gym?.overview.name ?? "Your gym"}</span>}
      </div>
      <div className="border-t border-line" />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) onNavigate?.(); }}>
        {visible.map((item) => (
          <Item key={item.href} group={group} collapsed={collapsed} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />
        ))}
      </nav>
    </>
  );
}

export const NAV_EVENT = "manygym:nav";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
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
      <motion.aside initial={false} animate={{ width: collapsed ? 76 : 250 }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 flex-col gap-3.5 overflow-hidden border-r border-line bg-surface p-3.5 pt-4 lg:flex">
        <NavContent group="desktop" collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </motion.aside>
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
