/**
 * Verifies the permission table in lib/permissions.ts against the API's real scope vocabulary.
 *
 * The vocabulary below was read from `GET /api/v1/access-control/permissions/` with a live gym-owner token
 * (19 scopes across 9 topics). It is pinned here because that endpoint documents no response schema, so this
 * is the only written record of it — see docs/api/known-issues.md #23.
 *
 * Three ways this can go wrong, all silent at runtime because a gym owner bypasses every check:
 *   1. a table entry points at a scope the server never issues  → that permission can never be granted
 *   2. a label the UI checks has no table entry                 → staff are denied something they hold
 *   3. a real scope nothing maps to                             → a capability the UI can't expose
 *
 * Usage: node scripts/check-permissions.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Verified live. Update only from a real `GET /access-control/permissions/` response. */
const REAL_SCOPES = new Set([
  "gym_profile:read", "gym_profile:edit",
  "leads:read", "leads:manage",
  "members:read", "members:edit", "members:delete",
  "people_roles:read", "people_roles:manage",
  "reports:read",
  "routines:read", "routines:manage", "routines:assign",
  "studio:read", "studio:manage",
  "plans:read", "plans:manage",
  "trainers:read", "trainers:manage",
]);

const src = readFileSync(join(ROOT, "lib/permissions.ts"), "utf8");
const block = src.slice(src.indexOf("export const PERMISSION_SCOPES"), src.indexOf("const topicOf"));
const table = {};
for (const m of block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) table[m[1]] = m[2];

// every permission label the UI actually gates on
const files = [];
const crawl = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = join(d, e.name);
    if (e.isDirectory()) crawl(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
};
for (const d of ["app", "components", "lib"]) crawl(join(ROOT, d));

const uiLabels = new Set();
for (const f of files) {
  for (const m of readFileSync(f, "utf8").matchAll(/(?:perm=|can\()"([^"]+)"/g)) uiLabels.add(m[1]);
}

const badScope = Object.entries(table).filter(([, s]) => !REAL_SCOPES.has(s));
const unmapped = [...uiLabels].filter((l) => !table[l]);
const unreachable = [...REAL_SCOPES].filter((s) => !Object.values(table).includes(s));

console.log(`Permission table: ${Object.keys(table).length} entries, ${uiLabels.size} UI labels, ${REAL_SCOPES.size} real scopes\n`);
const report = (label, rows, fatal) => {
  console.log(`  ${rows.length === 0 ? "ok  " : fatal ? "FAIL" : "warn"}  ${label}: ${rows.length}`);
  for (const r of rows) console.log(`          ${Array.isArray(r) ? `"${r[0]}" -> ${r[1]}` : r}`);
};
report("table entries pointing at a scope the API does not issue", badScope, true);
report("UI labels with no mapping (staff would be wrongly denied)", unmapped, true);
report("real scopes the UI never maps to", unreachable, false);

const failed = badScope.length + unmapped.length;
console.log(failed ? "\nPermission mapping is wrong." : "\nPermission mapping matches the API.");
process.exit(failed ? 1 : 0);
