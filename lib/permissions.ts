/**
 * Maps the permission labels the screens check (`can("View members")`) onto the scope strings a gym-context
 * JWT carries (`members:read`).
 *
 * The spec documents the shape — "Token carries claims: {scopes: ["members:read", …]}" across 9 topics — and
 * says a gym **owner** is granted every permission while staff get the scopes of their assigned role. The exact
 * scope vocabulary is served by `GET /api/v1/access-control/permissions/`, so `matchScope` also accepts a
 * `topic:manage`/`topic:*` scope for the topic, and `syncVocabulary` can correct the table at runtime from that
 * endpoint rather than hard-coding guesses forever.
 */

export type ScopeMap = Record<string, string>;

/**
 * label → scope. **Verified against a live gym-owner token**, whose 19 scopes across 9 topics are the whole
 * vocabulary the API issues:
 *
 *   gym_profile:read|edit · leads:read|manage · members:read|edit|delete · people_roles:read|manage
 *   reports:read · routines:read|manage|assign · studio:read|manage · plans:read|manage · trainers:read|manage
 *
 * Two things that an earlier guessed table got wrong: the verb is `edit`, not `update`, and most topics have
 * no separate create/delete scope — a single `:manage` covers every write. So several distinct UI labels
 * correctly map onto the same scope.
 */
export const PERMISSION_SCOPES: ScopeMap = {
  // Members — the only topic with a separate delete scope.
  "View members": "members:read",
  "Create members": "members:edit",
  "Edit members": "members:edit",
  "Manage member information": "members:edit",
  "Delete members": "members:delete",
  // Assigning a routine to a member is its own scope, separate from authoring templates.
  "Manage Routine": "routines:assign",

  // Subscription plans
  "View plans": "plans:read",
  "Create plans": "plans:manage",
  "Edit plans": "plans:manage",
  "Delete plans": "plans:manage",
  "Activate/deactivate plans": "plans:manage",

  // Leads
  "View leads": "leads:read",
  "Create leads": "leads:manage",
  "Edit leads": "leads:manage",
  "Delete leads": "leads:manage",
  "Manage leads": "leads:manage",

  // Routine templates
  "View templates": "routines:read",
  "Create templates": "routines:manage",
  "Edit templates": "routines:manage",
  "Delete templates": "routines:manage",
  "Manage templates": "routines:manage",

  // Gym profile
  "View gym profile": "gym_profile:read",
  "Edit gym profile": "gym_profile:edit",
  "Manage profile information": "gym_profile:edit",

  // Studio (the community feed)
  "View studio information": "studio:read",
  "Edit studio information": "studio:manage",
  "Manage studio settings": "studio:manage",

  // Reports — read is the only scope the API issues; there is no reports:manage.
  "View reports": "reports:read",
  "Manage reports": "reports:read",

  // People & roles
  "View people": "people_roles:read",
  "Invite/add people": "people_roles:manage",
  "Edit people": "people_roles:manage",
  "Remove people": "people_roles:manage",
  "Create roles": "people_roles:manage",
  "Edit roles": "people_roles:manage",
  "Delete roles": "people_roles:manage",
  "Assign permissions": "people_roles:manage",

  // Trainers
  "View trainers": "trainers:read",
  "Manage trainers": "trainers:manage",
};

const topicOf = (scope: string) => scope.split(":")[0];

/** True when `scopes` satisfies `label`. A `topic:manage` or `topic:*` scope covers that whole topic. */
export function matchScope(label: string, scopes: readonly string[]): boolean {
  const want = PERMISSION_SCOPES[label];
  if (!want) return false;
  if (scopes.includes(want)) return true;
  const topic = topicOf(want);
  return scopes.includes(`${topic}:manage`) || scopes.includes(`${topic}:*`) || scopes.includes(topic);
}

/**
 * Corrects the table from `GET /access-control/permissions/`: any permission whose human `name` equals a label
 * the UI checks takes that permission's real `topic`/`scope_code`. Safe to call once after sign-in.
 */
export function syncVocabulary(payload: unknown): number {
  let fixed = 0;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : null;
    const topic = typeof o.topic === "string" ? o.topic : null;
    const code = typeof o.scope_code === "string" ? o.scope_code : null;
    if (name && code) {
      const scope = code.includes(":") ? code : `${topic ?? "general"}:${code}`;
      // The server names a permission "Edit Gym Profile" where the UI label is "Edit gym profile", so an
      // exact-key check would never match. Compare case-insensitively and write to the UI's own key.
      const uiKey = Object.keys(PERMISSION_SCOPES).find((k) => k.toLowerCase() === name.toLowerCase());
      if (uiKey && PERMISSION_SCOPES[uiKey] !== scope) {
        PERMISSION_SCOPES[uiKey] = scope;
        fixed += 1;
      }
    }
    Object.values(o).forEach(visit);
  };
  visit(payload);
  return fixed;
}

// ---------------------------------------------------------------- permission ids

type PermissionRecord = { id: string; topic: string; name: string; scope?: string };
let catalogue: PermissionRecord[] | null = null;

/** Flattens whatever shape `GET /access-control/permissions/` returns into a flat list. */
export function readPermissionCatalogue(payload: unknown): PermissionRecord[] {
  const out: PermissionRecord[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.name === "string") {
      out.push({
        id: o.id,
        name: o.name,
        topic: typeof o.topic === "string" ? o.topic : "",
        scope: typeof o.scope_code === "string" ? o.scope_code : undefined,
      });
    }
    Object.values(o).forEach(visit);
  };
  visit(payload);
  return out;
}

export const cachePermissionCatalogue = (payload: unknown) => {
  catalogue = readPermissionCatalogue(payload);
  return catalogue;
};
export const cachedPermissionCatalogue = () => catalogue;

/**
 * Turns the permission *labels* the role editor works in into the `permission_ids` the API expects.
 *
 * Matching is by the server's own `name` first; failing that, by the `topic:action` scope this app maps the
 * label to. A label that matches nothing is dropped rather than guessed at, and reported by `unmatched`.
 */
export function permissionIdsForLabels(labels: string[]): { ids: string[]; unmatched: string[] } {
  if (!catalogue) return { ids: [], unmatched: labels };
  const byName = new Map(catalogue.map((p) => [p.name.toLowerCase(), p.id]));
  const byScope = new Map(
    catalogue.map((p) => [(p.scope?.includes(":") ? p.scope : `${p.topic}:${p.scope ?? ""}`).toLowerCase(), p.id]),
  );
  const ids: string[] = [];
  const unmatched: string[] = [];
  for (const label of labels) {
    const direct = byName.get(label.toLowerCase());
    const viaScope = direct ? undefined : byScope.get((PERMISSION_SCOPES[label] ?? "").toLowerCase());
    const id = direct ?? viaScope;
    if (id) ids.push(id);
    else unmatched.push(label);
  }
  return { ids: [...new Set(ids)], unmatched };
}
