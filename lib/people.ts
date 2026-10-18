// People, roles and permissions (spec: "People & Trainers").
export const PERMISSION_GROUPS: { group: string; actions: string[] }[] = [
  { group: "Studio", actions: ["View studio information", "Edit studio information", "Manage studio settings"] },
  { group: "Reports", actions: ["View reports", "Manage reports"] },
  { group: "Gym Profile", actions: ["View gym profile", "Edit gym profile", "Manage profile information"] },
  { group: "Membership Plans", actions: ["View plans", "Create plans", "Edit plans", "Delete plans", "Activate/deactivate plans"] },
  { group: "Members", actions: ["View members", "Create members", "Edit members", "Delete members", "Manage member information", "Manage Routine"] },
  { group: "Leads", actions: ["View leads", "Create leads", "Edit leads", "Delete leads", "Manage leads"] },
  { group: "Routine Templates", actions: ["View templates", "Create templates", "Edit templates", "Delete templates", "Manage templates"] },
  { group: "People & Roles", actions: ["View people", "Invite/add people", "Edit people", "Remove people", "Create roles", "Edit roles", "Delete roles", "Assign permissions"] },
];

export type Permissions = Record<string, string[]>;
export type Role = { id: string; name: string; description?: string; builtIn: boolean; permissions: Permissions };
export type Person = { id: string; name: string; email: string; roleId: string; status: "active" | "invited" };

const all = (g: string) => PERMISSION_GROUPS.find((x) => x.group === g)!.actions;

export const DEFAULT_ROLES: Role[] = [
  { id: "administrator", name: "Administrator", builtIn: true, description: "Full access", permissions: Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.group, g.actions])) },
  {
    id: "staff", name: "Staff", builtIn: true, description: "Front desk and sales",
    permissions: { Reports: all("Reports"), Members: all("Members"), Leads: all("Leads"), "Routine Templates": all("Routine Templates"), "Membership Plans": ["View plans"], "Gym Profile": ["View gym profile"] },
  },
  {
    id: "trainer", name: "Trainer", builtIn: true, description: "Assigned members only",
    permissions: { "Routine Templates": all("Routine Templates"), "Membership Plans": ["View plans"], "Gym Profile": ["View gym profile"], Members: ["View members", "Manage Routine"] },
  },
];

export const SEED_ROLES = (): Role[] => [
  ...DEFAULT_ROLES.map((r) => structuredClone(r)),
  {
    id: "membership-manager", name: "Membership Manager", builtIn: false,
    permissions: { Studio: ["View studio information"], "Gym Profile": ["View gym profile"], "Membership Plans": ["View plans", "Create plans"], Members: ["View members", "Create members", "Edit members", "Manage Routine"], Leads: ["View leads", "Create leads", "Edit leads", "Manage leads"], "Routine Templates": ["View templates"] },
  },
];

export const SEED_PEOPLE = (): Person[] => [
  { id: "p-olivia", name: "Olivia Parker", email: "olivia.parker@example.com", roleId: "administrator", status: "active" },
  { id: "p-sarah", name: "Sarah Collins", email: "sarah.collins@example.com", roleId: "staff", status: "active" },
  { id: "p-alex", name: "Alex Morgan", email: "alex.morgan@example.com", roleId: "trainer", status: "active" },
  { id: "p-priya", name: "Priya Shah", email: "priya.shah@example.com", roleId: "trainer", status: "active" },
  { id: "p-jamie", name: "Jamie Reed", email: "jamie.reed@example.com", roleId: "membership-manager", status: "invited" },
  { id: "p-emma", name: "", email: "emma@example.com", roleId: "trainer", status: "invited" },
];

export const PEOPLE_KEY = "people";
export const ROLES_KEY = "roles";
export const displayName = (p: Person) => p.name || "Invitation pending";
export const permCount = (r: Role) => Object.values(r.permissions).reduce((n, a) => n + a.length, 0);
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
