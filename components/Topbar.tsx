"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData, useGym, useResource } from "@/lib/api";
import { knownAccountIds, switchAccount } from "@/lib/auth";
import { PEOPLE_KEY, ROLES_KEY, type Person, type Role } from "@/lib/people";
import { LuChevronDown as ChevronDown, LuLogOut, LuMenu, LuRefreshCw, LuRotateCcw, LuSettings, LuUserPlus } from "react-icons/lu";
import GlobalSearch from "@/components/shell/GlobalSearch";
import Notifications from "@/components/shell/Notifications";
import { MotionButton } from "@/components/ui/Motion";
import { NAV_EVENT } from "@/components/Sidebar";

export default function Topbar() {
  const [gym] = useGym();
  const { user, role, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [roles] = useResource<Role>(ROLES_KEY);
  // other accounts already signed in on this device, ready to switch to
  const others = open ? people.filter((p) => p.id !== user?.id && p.status === "active" && knownAccountIds().includes(p.id)) : [];
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 sm:gap-4 sm:px-7">
      <MotionButton aria-label="Open menu" onClick={() => window.dispatchEvent(new Event(NAV_EVENT))} className="-ml-1 rounded-lg p-2 text-foreground hover:bg-background lg:hidden"><LuMenu size={22} /></MotionButton>
      <Link href="/studio" aria-label="manygym" className="flex items-center text-[22px] font-extrabold">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#7a5cff] to-primary-600 text-lg text-white shadow-[0_6px_14px_-4px_rgba(91,61,245,.6)]">m</span>
      </Link>
      <GlobalSearch />
      <div className="flex-1" />
      <Notifications />
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} className="relative rounded-full">
          <Avatar name={user?.name || "Admin"} size={36} />
          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-line bg-surface text-foreground"><ChevronDown size={11} /></span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div role="menu" className="absolute right-0 top-12 z-30 w-[340px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-surface p-2 shadow-xl">
              <div className="rounded-xl p-1 shadow-[0_1px_6px_rgba(0,0,0,.12)]">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <Avatar name={user?.name || "Admin"} size={36} />
                  <span className="min-w-0"><b className="block truncate">{ready ? user?.name ?? "No user" : "…"}</b><span className="block truncate text-xs text-muted">{role?.name}{gym ? ` · ${gym.overview.name}` : ""}</span></span>
                </div>
                {others.length > 0 && <hr className="mx-2 my-1 border-line" />}
                {others.map((p) => (
                  <button key={p.id} role="menuitem" onClick={() => { if (switchAccount(p.id)) { setOpen(false); router.replace("/"); } }} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left font-semibold hover:bg-background">
                    <span className="relative">
                      <Avatar name={p.name || p.email} size={36} />
                      <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface text-muted"><LuRefreshCw size={11} /></span>
                    </span>
                    <span className="min-w-0"><b className="block truncate">{p.name || p.email}</b><span className="block truncate text-xs font-normal text-muted">{roles.find((r) => r.id === p.roleId)?.name}</span></span>
                  </button>
                ))}
                <hr className="mx-2 my-1 border-line" />
                <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className="mb-1 flex items-center justify-center gap-2 rounded-lg bg-background px-3 py-2 font-semibold hover:bg-line">
                  <LuUserPlus size={16} />Add another account
                </Link>
              </div>
              <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-3 rounded-lg px-2 py-2 font-semibold hover:bg-background">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-background"><LuSettings size={18} /></span>Account settings
              </Link>
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left font-semibold hover:bg-background" onClick={() => logout()}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-background"><LuLogOut size={18} /></span>Sign out
              </button>
              {role?.id === "administrator" && (
                <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left font-semibold text-bad hover:bg-background"
                  onClick={async () => { setOpen(false); try { await resetDemoData(); toast("Demo data reset"); } catch { toast("Couldn't reset the demo data"); } }}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-bad-bg"><LuRotateCcw size={18} /></span>Reset demo data
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
