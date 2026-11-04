/**
 * Verifies that every operation in the Many Gym OpenAPI document is accounted for by this app.
 *
 * "Accounted for" means one of:
 *   called     — a generated client function for it is referenced somewhere in app code
 *   multipart  — sent through `request()` directly because the generated wrapper can't do form data
 *   duplicate  — the API publishes the identical operation at another path, and we call that one
 *   superseded — a declared variant of a route we call (the follow feature's six prefixes), or unusable as
 *                published; each one is listed by hand with its reason
 *
 * Anything else fails the check, so a new endpoint can't appear without a deliberate decision about it.
 *
 * Usage: node scripts/check-api-coverage.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = join(ROOT, "postman/spec/manygym-openapi.json");
const METHODS = ["get", "post", "put", "patch", "delete"];

/**
 * The follow feature is published at six prefixes with inconsistent summaries, so string matching can't tell
 * which are the same capability. These are declared by hand: each is a variant of something we do call.
 *
 * We use `POST /follow/` with `action: "follow" | "unfollow"` for every write (it is the only route that
 * reliably identifies a target — see docs/api/known-issues.md #15) and the target-specific list endpoints
 * `GET /gyms/{id}/followers|following/` and `GET /users/{id}/followers|following/` for every read.
 */
const FOLLOW_WRITE = "variant of POST /api/v1/follow/ (action: follow|unfollow), which is used";
const FOLLOW_LIST = "variant of GET /api/v1/gyms/{gym_id}/followers|following/ and /users/{user_id}/…, which are used";
const NO_TARGET = "unusable as published: no body and no parameters, so it cannot name a target (known-issues #15)";

const SUPERSEDED = {
  "POST /api/v1/auth/{user_id}/follow/": FOLLOW_WRITE,
  "DELETE /api/v1/auth/{user_id}/follow/": FOLLOW_WRITE,
  "POST /api/v1/users/{user_id}/follow/": FOLLOW_WRITE,
  "DELETE /api/v1/users/{user_id}/follow/": FOLLOW_WRITE,
  "POST /api/v1/gyms/{gym_id}/follow/": FOLLOW_WRITE,
  "DELETE /api/v1/gyms/{gym_id}/follow/": FOLLOW_WRITE,
  "GET /api/v1/auth/follow/": FOLLOW_LIST,
  "GET /api/v1/follow/": FOLLOW_LIST,
  "GET /api/v1/follows/": FOLLOW_LIST,
  "GET /api/v1/users/follow/": FOLLOW_LIST,
  "GET /api/v1/follow/{target_id}/": FOLLOW_LIST,
  "GET /api/v1/follows/{target_id}/": FOLLOW_LIST,
  "DELETE /api/v1/auth/follow/": NO_TARGET,
  "DELETE /api/v1/follow/": NO_TARGET,
  "DELETE /api/v1/follows/": NO_TARGET,
  "DELETE /api/v1/users/follow/": NO_TARGET,
  "DELETE /api/v1/follow/{target_id}/": FOLLOW_WRITE,
  "DELETE /api/v1/follows/{target_id}/": FOLLOW_WRITE,
};

/** Operations we reach without the generated wrapper, with the reason. */
const MANUAL = {
  "PATCH /api/v1/posts/{post_id}/media/{media_id}/thumbnail/":
    "multipart: sent via request() with FormData from postActions.setVideoThumbnail — the generated wrapper takes a JSON body",
};

const spec = JSON.parse(readFileSync(SPEC, "utf8"));
const endpointsSrc = readFileSync(join(ROOT, "lib/api/endpoints.ts"), "utf8");

// method+path -> generated function name, and its summary (used to detect duplicates)
const fnFor = new Map();
const summaryOf = new Map();
for (const m of endpointsSrc.matchAll(/\/\*\* (\w+) (\S+) — ([^*]*)\*\/\nexport const (\w+) =/g)) {
  const [, method, path, summary, fn] = m;
  fnFor.set(`${method} ${path}`, fn);
  summaryOf.set(`${method} ${path}`, summary.trim());
}

// every identifier referenced by app code (excluding endpoints.ts itself)
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !full.endsWith("lib/api/endpoints.ts")) out.push(full);
  }
  return out;
};
const appSrc = walk(join(ROOT, "lib"))
  .concat(walk(join(ROOT, "components")), walk(join(ROOT, "app")))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const isCalled = (fn) => new RegExp(`\\b${fn}\\b`).test(appSrc);

const rows = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of METHODS) {
    if (!item[method]) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const fn = fnFor.get(key);
    const summary = summaryOf.get(key) ?? item[method].summary ?? "";
    rows.push({ key, method: method.toUpperCase(), path, fn, summary });
  }
}

// which summaries we actually exercise — a duplicate is only acceptable if its twin is called
const calledSummaries = new Set(rows.filter((r) => r.fn && isCalled(r.fn)).map((r) => r.summary));
for (const k of Object.keys(MANUAL)) {
  const row = rows.find((r) => r.key === k);
  if (row) calledSummaries.add(row.summary);
}

const verdicts = rows.map((r) => {
  // "called" wins: a declared fallback that the app actually invokes is used, not superseded.
  if (r.fn && isCalled(r.fn)) {
    const extra = SUPERSEDED[r.key] ? " — alias tried via lib/api/social.ts fallback chain" : "";
    return { ...r, status: "called", note: `${r.fn}()${extra}` };
  }
  if (MANUAL[r.key]) return { ...r, status: "multipart", note: MANUAL[r.key] };
  if (SUPERSEDED[r.key]) return { ...r, status: "superseded", note: SUPERSEDED[r.key] };
  if (calledSummaries.has(r.summary)) {
    const twin = rows.find((o) => o.summary === r.summary && o.fn && isCalled(o.fn));
    return { ...r, status: "duplicate", note: `same operation as ${twin?.key ?? "another path"}, which is used` };
  }
  return { ...r, status: "UNACCOUNTED", note: "no call site and no used twin" };
});

const tally = verdicts.reduce((a, v) => ({ ...a, [v.status]: (a[v.status] ?? 0) + 1 }), {});
const bad = verdicts.filter((v) => v.status === "UNACCOUNTED");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ tally, verdicts }, null, 2));
} else {
  console.log(`Many Gym API coverage — ${verdicts.length} operations\n`);
  for (const [k, v] of Object.entries(tally)) console.log(`  ${String(v).padStart(3)}  ${k}`);
  if (bad.length) {
    console.log(`\nUnaccounted for (${bad.length}):`);
    for (const v of bad) console.log(`  ${v.method} ${v.path}  —  ${v.summary}`);
  } else {
    console.log("\nEvery operation is accounted for.");
  }
}

process.exit(bad.length ? 1 : 0);
