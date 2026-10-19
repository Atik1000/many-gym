import { LuChartColumn as BarChart3, LuCreditCard as CreditCard, LuFileText as FileText, LuHouse as Home, LuShieldCheck as ShieldCheck, LuStore as Store, LuUserPlus as UserPlus, LuUsers as Users } from "react-icons/lu";
import type { IconType } from "react-icons";

export type NavItem = { href: string; label: string; icon: IconType; ready: boolean; perm?: string };

// `ready` = page is built; unbuilt items render but don't navigate yet.
export const NAV: NavItem[] = [
  { href: "/studio", perm: "View studio information", label: "Studio", icon: Home, ready: true },
  { href: "/reports", perm: "View reports", label: "Insights", icon: BarChart3, ready: true },
  { href: "/gym-profile", perm: "View gym profile", label: "Gym Profile", icon: Store, ready: true },
  { href: "/plans", perm: "View plans", label: "Membership Plans", icon: CreditCard, ready: true },
  { href: "/members", perm: "View members", label: "Members", icon: Users, ready: true },
  { href: "/leads", perm: "View leads", label: "Leads", icon: UserPlus, ready: true },
  { href: "/routines", perm: "View templates", label: "Routine Templates", icon: FileText, ready: true },
  { href: "/people", perm: "View people", label: "People & Roles", icon: ShieldCheck, ready: true },
];

// pages reachable without a sidebar entry still need a title for the sidebar header
export const EXTRA_TITLES: Record<string, string> = { "/trainers": "Trainers", "/settings": "Account Settings" };
