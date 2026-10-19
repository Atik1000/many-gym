"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData, useGym } from "@/lib/api";
import { LuCheck, LuChevronDown as ChevronDown, LuMenu } from "react-icons/lu";
import GlobalSearch from "@/components/shell/GlobalSearch";
import Notifications from "@/components/shell/Notifications";
import { MotionButton } from "@/components/ui/Motion";
import { NAV_EVENT } from "@/components/Sidebar";

export default function Topbar() {
  const [gym] = useGym();
  const [gymOpen, setGymOpen] = useState(false);
  const { user, role, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 sm:gap-4 sm:px-7">
      <MotionButton aria-label="Open menu" onClick={() => window.dispatchEvent(new Event(NAV_EVENT))} className="-ml-1 rounded-lg p-2 text-foreground hover:bg-background lg:hidden"><LuMenu size={22} /></MotionButton>
      <Link href="/studio" className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-tight">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#7a5cff] to-primary-600 text-lg text-white shadow-[0_6px_14px_-4px_rgba(91,61,245,.6)]">m</span>
        <span className="hidden sm:inline">manygym</span>
      </Link>
      <div className="flex-1" />
      <GlobalSearch />
      <div className="relative">
        <button onClick={() => setGymOpen((v) => !v)} aria-haspopup="menu" aria-expanded={gymOpen} className="flex items-center gap-2 rounded-[10px] border border-line px-2.5 py-1.5 font-semibold transition-colors hover:bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {gym?.overview.profileUrl ? <img src={gym.overview.profileUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-background" />}
          <span className="hidden max-w-[140px] truncate md:block">{gym?.overview.name ?? "Your gym"}</span>
          <ChevronDown size={16} className="text-muted" />
        </button>
        {gymOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setGymOpen(false)} />
            <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Switch account</p>
              <button onClick={() => setGymOpen(false)} className="flex w-full items-center gap-2.5 rounded-lg bg-primary-50 px-3 py-2 text-left text-sm font-semibold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {gym?.overview.profileUrl ? <img src={gym.overview.profileUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="h-7 w-7 rounded-full bg-background" />}
                <span className="min-w-0 flex-1 truncate">{gym?.overview.name ?? "Your gym"}</span>
                <LuCheck size={16} className="text-primary" />
              </button>
            </div>
          </>
        )}
      </div>
      <Notifications />
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 font-semibold">
          <Avatar name={user?.name || "Admin"} size={34} />
          <span className="hidden text-left leading-tight sm:block">{ready ? user?.name ?? "No user" : "…"}<span className="block text-xs font-normal text-muted">{role?.name}</span></span>
          <ChevronDown size={16} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-line bg-surface p-2 shadow-xl">
              <div className="px-3 pb-2 pt-2"><b className="block truncate">{user?.name}</b><span className="block truncate text-xs text-muted">{user?.email}</span></div>
              <Link href="/settings" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-background">Account settings</Link>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-background" onClick={() => logout()}>Sign out</button>
              <div className="mt-1 border-t border-line pt-1">
                {role?.id === "administrator" && <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-bad hover:bg-background"
                  onClick={async () => { setOpen(false); try { await resetDemoData(); toast("Demo data reset"); } catch { toast("Couldn't reset the demo data"); } }}>Reset demo data</button>}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
