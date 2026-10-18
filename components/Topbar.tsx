"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData } from "@/lib/api";
import { LuBell as Bell, LuChevronDown as ChevronDown, LuSearch as Search } from "react-icons/lu";
import { NAV } from "@/lib/nav";

export default function Topbar() {
  const pathname = usePathname();
  const { user, role, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const title = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ?? "";
  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b border-line bg-surface px-7">
      <h1 className="text-lg font-bold">{title}</h1>
      <label className="ml-auto hidden w-[340px] items-center gap-2 rounded-[10px] border border-line bg-background px-3 py-2 text-muted md:flex">
        <Search size={18} />
        <input className="w-full bg-transparent text-foreground outline-none" placeholder="Search members, leads, or anything…" />
      </label>
      <button aria-label="Notifications" className="relative rounded-lg p-1.5 text-muted">
        <Bell size={20} />
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
      </button>
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
