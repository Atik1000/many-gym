import Link from "next/link";
import { Suspense } from "react";
import { LuBan, LuDumbbell, LuIdCard, LuLock, LuMonitor, LuUser, LuUsers } from "react-icons/lu";
import AccountSettings from "@/components/settings/AccountSettings";
import AudienceSettings from "@/components/settings/AudienceSettings";
import BlockingSettings from "@/components/settings/BlockingSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import GymSettings from "@/components/settings/GymSettings";
import LoginSecurity from "@/components/settings/LoginSecurity";
import ProfileAbout from "@/components/settings/ProfileAbout";
import { card } from "@/lib/ui";

export const metadata = { title: "Settings · manygym" };

// Each section is linkable: /settings?tab=audience, /settings?tab=security, …
const TABS = [
  { id: "account", label: "Account", icon: LuUser, View: AccountSettings },
  { id: "profile", label: "Profile", icon: LuIdCard, View: ProfileAbout },
  { id: "security", label: "Login & Security", icon: LuLock, View: LoginSecurity },
  { id: "display", label: "Display", icon: LuMonitor, View: DisplaySettings },
  { id: "blocking", label: "Blocking", icon: LuBan, View: BlockingSettings },
  { id: "audience", label: "Audience", icon: LuUsers, View: AudienceSettings },
  { id: "gym", label: "Gym", icon: LuDumbbell, View: GymSettings },
];

async function Sections({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* A row of tabs that scrolls sideways on small screens; a side menu from lg up. */}
      <nav aria-label="Settings sections" className={`${card} flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-5 lg:flex-col`}>
        {TABS.map((t) => (
          <Link
            key={t.id} href={`/settings?tab=${t.id}`} scroll={false}
            aria-current={t.id === active.id ? "page" : undefined}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 font-semibold ${t.id === active.id ? "bg-primary-50 text-primary" : "text-muted hover:bg-background hover:text-foreground"}`}
          >
            <t.icon size={18} />{t.label}
          </Link>
        ))}
      </nav>
      {/* key resets a section's state when switching sections */}
      <div className="grid min-w-0 max-w-[720px] gap-5" key={active.id}><active.View /></div>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/settings">) {
  return (
    <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
      <Sections searchParams={searchParams} />
    </Suspense>
  );
}
