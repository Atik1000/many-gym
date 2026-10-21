"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData, useGym, useResource } from "@/lib/api";
import { switchAccount } from "@/lib/auth";
import { PEOPLE_KEY, ROLES_KEY, type Person, type Role } from "@/lib/people";
import type { IconType } from "react-icons";
import { LuArrowLeft, LuCheck, LuChevronRight, LuLogOut, LuMenu, LuRefreshCw, LuRotateCcw, LuSettings, LuUserPlus, LuUsers } from "react-icons/lu";
import GlobalSearch from "@/components/shell/GlobalSearch";
import Notifications from "@/components/shell/Notifications";
import { MotionButton } from "@/components/ui/Motion";
import { NAV_EVENT } from "@/components/Sidebar";

export default function Topbar() {
  const [gym] = useGym();
  const gymName = gym?.overview.name ?? "";
  const { user, role, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "switch">("main");
  const toast = useToast();
  const router = useRouter();
  const [people] = useResource<Person>(PEOPLE_KEY);
  const [roles] = useResource<Role>(ROLES_KEY);
  // every other active account, one click to switch (like Facebook's profile list)
  const others = open ? people.filter((p) => p.id !== user?.id && p.status === "active") : [];
  const pick = (id: string) => { if (switchAccount(id)) { setOpen(false); router.replace("/"); } };
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-surface px-4 sm:gap-4 sm:px-7">
      <MotionButton aria-label="Open menu" onClick={() => window.dispatchEvent(new Event(NAV_EVENT))} className="-ml-1 rounded-lg p-2 text-foreground hover:bg-background lg:hidden"><LuMenu size={22} /></MotionButton>
      <Link href="/studio" aria-label="manygym" className="flex items-center text-[22px] font-extrabold">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#7a5cff] to-primary-600 text-lg text-white shadow-[0_6px_14px_-4px_rgba(91,61,245,.6)]">m</span>
      </Link>
      <GlobalSearch />
      <div className="flex-1" />
      {gymName && (
        <Link href="/gym-profile" title={gymName} className="hidden max-w-[220px] items-center gap-2 rounded-full py-1 pl-1 pr-3 font-semibold hover:bg-background md:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {gym?.overview.profileUrl ? <img src={gym.overview.profileUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="h-8 w-8 shrink-0 rounded-full bg-background" />}
          <span className="truncate">{gymName}</span>
        </Link>
      )}
      <Notifications />
      <div className="relative">
        <button onClick={() => { setView("main"); setOpen((v) => !v); }} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} className="rounded-full ring-2 ring-transparent transition-shadow hover:ring-line">
          <Avatar name={user?.name || "Admin"} size={40} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div role="menu" className="absolute right-0 top-12 z-30 w-[360px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-surface p-2 shadow-xl">
              {view === "main" ? (
                <>
                  <div className="rounded-xl p-1 shadow-[0_1px_6px_rgba(0,0,0,.12)]">
                    <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-background">
                      <Avatar name={user?.name || "Admin"} size={40} />
                      <span className="min-w-0"><b className="block truncate text-[15px]">{ready ? user?.name ?? "No user" : "…"}</b><span className="block truncate text-xs text-muted">{gymName}</span></span>
                    </Link>
                    <hr className="mx-2 my-1 border-line" />
                    {others.slice(0, 2).map((p) => (
                      <button key={p.id} role="menuitem" onClick={() => pick(p.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left font-semibold hover:bg-background">
                        <span className="relative">
                          <Avatar name={p.name || p.email} size={36} />
                          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-surface text-muted"><LuRefreshCw size={11} /></span>
                        </span>
                        <span className="min-w-0"><b className="block truncate">{p.name || p.email}</b><span className="block truncate text-xs font-normal text-muted">{gymName}</span></span>
                      </button>
                    ))}
                    <hr className="mx-2 my-1 border-line" />
                    <button role="menuitem" onClick={() => setView("switch")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-background px-3 py-2 font-semibold hover:bg-line">
                      <LuUsers size={18} />See all profiles
                    </button>
                  </div>
                  <Row icon={LuSettings} label="Settings & privacy" href="/settings" onGo={() => setOpen(false)} />
                  {role?.id === "administrator" && (
                    <Row icon={LuRotateCcw} label="Reset demo data" danger onClick={async () => { setOpen(false); try { await resetDemoData(); toast("Demo data reset"); } catch { toast("Couldn't reset the demo data"); } }} />
                  )}
                  <Row icon={LuLogOut} label="Log out" onClick={() => logout()} />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                    <button aria-label="Back" onClick={() => setView("main")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-background"><LuArrowLeft size={20} /></button>
                    <b className="text-[17px]">Switch account</b>
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    {[...(user ? [user] : []), ...others].map((p) => {
                      const mine = p.id === user?.id;
                      return (
                        <button key={p.id} role="menuitemradio" aria-checked={mine} onClick={() => (mine ? setOpen(false) : pick(p.id))}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-background">
                          <Avatar name={p.name || p.email} size={40} />
                          <span className="min-w-0 flex-1"><b className="block truncate">{p.name || p.email}</b><span className="block truncate text-xs font-normal text-muted">{roles.find((r) => r.id === p.roleId)?.name}{gymName ? ` · ${gymName}` : ""}</span></span>
                          <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${mine ? "border-primary bg-primary text-white" : "border-line"}`}>{mine && <LuCheck size={12} />}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-3 rounded-lg px-2 py-2 font-semibold hover:bg-background">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-background"><LuUserPlus size={18} /></span>Add another account
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/** One Facebook-style menu row: round icon badge, label, chevron. */
function Row({ icon: Icon, label, href, onGo, onClick, danger }: { icon: IconType; label: string; href?: string; onGo?: () => void; onClick?: () => void; danger?: boolean }) {
  const cls = `mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left font-semibold hover:bg-background ${danger ? "text-bad" : ""}`;
  const inner = <><span className={`grid h-10 w-10 place-items-center rounded-full ${danger ? "bg-bad-bg" : "bg-background"}`}><Icon size={20} /></span><span className="flex-1">{label}</span><LuChevronRight size={18} className="text-muted" /></>;
  return href ? <Link href={href} role="menuitem" onClick={onGo} className={cls}>{inner}</Link> : <button role="menuitem" onClick={onClick} className={cls}>{inner}</button>;
}
