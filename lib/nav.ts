import { LuMessageSquare as MessageSquare, LuChartColumn as BarChart3, LuCreditCard as CreditCard, LuFileText as FileText, LuHistory as History, LuHouse as Home, LuInbox as Inbox, LuMapPin as MapPin, LuNewspaper as Newspaper, LuSearch as SearchIcon, LuBuilding2 as Building, LuShieldCheck as ShieldCheck, LuStore as Store, LuUserPlus as UserPlus, LuUsers as Users } from "react-icons/lu";
import type { IconType } from "react-icons";

/**
 * Where a signed-in person lands. `/` server-redirects here, but a client-side router.replace("/")
 * does not follow that redirect in the production build — so navigate here directly.
 */
export const HOME = "/studio";

export type NavItem = { href: string; label: string; icon: IconType; ready: boolean; perm?: string };

// `ready` = page is built; unbuilt items render but don't navigate yet.
export const NAV: NavItem[] = [
  { href: "/studio", perm: "View studio information", label: "Studio", icon: Home, ready: true },
  { href: "/reports", perm: "View reports", label: "Insights", icon: BarChart3, ready: true },
  { href: "/gym-profile", perm: "View gym profile", label: "Gym Profile", icon: Store, ready: true },
  { href: "/plans", perm: "View plans", label: "Membership Plans", icon: CreditCard, ready: true },
  { href: "/members", perm: "View members", label: "Members", icon: Users, ready: true },
  { href: "/leads", perm: "View leads", label: "Leads", icon: UserPlus, ready: true },
  { href: "/enquiries", perm: "View enquiries", label: "Enquiries", icon: Inbox, ready: true },
  { href: "/routines", perm: "View templates", label: "Routine Templates", icon: FileText, ready: true },
  { href: "/people", perm: "View people", label: "People & Roles", icon: ShieldCheck, ready: true },
  { href: "/activity", perm: "View activity log", label: "Activity Log", icon: History, ready: true },
  { href: "/gyms", label: "Find Gyms", icon: MapPin, ready: true },
  { href: "/search", label: "Search", icon: SearchIcon, ready: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, ready: true },
];

/**
 * Personal mode — a signed-in person who isn't on any gym's team (no gym of their own, or just a member of
 * someone else's). They can't open the gym-management screens, but everything social works on the personal
 * token: the feed, finding and joining gyms, following people, messaging and their own settings.
 */
export const PERSONAL_HOME = "/feed";

/** The menu a person without a gym sees. */
export const PERSONAL_NAV: NavItem[] = [
  { href: "/feed", label: "Feed", icon: Newspaper, ready: true },
  { href: "/gyms", label: "Find Gyms", icon: MapPin, ready: true },
  { href: "/search", label: "Search", icon: SearchIcon, ready: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, ready: true },
  { href: "/create-gym", label: "Create a gym", icon: Building, ready: true },
];

/** Every route that works without a gym. The single source of truth for the gate in AuthProvider. */
export const PERSONAL_PATHS = ["/feed", "/search", "/gyms", "/find-people", "/users", "/messages", "/settings", "/create-gym"];
export const isPersonalPath = (pathname: string) => PERSONAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// pages reachable without a sidebar entry still need a title for the sidebar header
export const EXTRA_TITLES: Record<string, string> = { "/trainers": "Trainers", "/settings": "Account Settings", "/users": "Profile", "/feed": "Feed", "/create-gym": "Create a gym", "/search": "Search" };
