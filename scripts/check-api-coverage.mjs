/**
 * Verifies that every operation in the Many Gym OpenAPI document is accounted for by this app.
 *
 * "Accounted for" means one of:
 *   called      — a generated client function for it (lib/api/endpoints.ts) is referenced in app code
 *   handwritten — a hand-written module calls it through `request("METHOD", "/api/v1/…")`. The generator
 *                 that produced endpoints.ts is not in this repository, so every route newer than that file
 *                 is called this way. Found by static extraction (see `extractCalls`), or — where a module
 *                 builds its URLs through a helper the extractor can't follow — declared in `DECLARED` and
 *                 verified against that module's source
 *   multipart   — sent through `request()` directly because the generated wrapper can't do form data
 *   duplicate   — the API publishes the identical operation (same summary) at another path, and we call
 *                 that one
 *   superseded  — a declared variant of a route we call, listed by hand with its reason; each entry names
 *                 the operation that must be called for the declaration to hold
 *
 * Anything else fails the check, so a new endpoint can't appear without a deliberate decision about it.
 *
 * Usage: node scripts/check-api-coverage.mjs [--json | --markdown]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = join(ROOT, "postman/spec/manygym-openapi.json");
const METHODS = ["get", "post", "put", "patch", "delete"];

/**
 * Variants of a route we do call. Each entry is `[reason, operation that must be called]`; if that
 * operation stops being called the entry no longer excuses anything and the variant fails the check.
 *
 * Follow: lib/api/social.ts prefers the target-in-path routes (`/gyms/{id}/follow/`, `/users/{id}/follow/`)
 * and keeps the unified `/follows/` routes as fallbacks, so those are all *called*. What is left here is the
 * full-replace `PUT` the API publishes beside a `PATCH` on the same resource.
 */
const SUPERSEDED = {
  "PUT /api/v1/enquiries/{enquiry_id}/": [
    "full-replace form of PATCH on the same resource, which is used (the form sends only changed fields)",
    "PATCH /api/v1/enquiries/{enquiry_id}/",
  ],
  "GET /api/v1/posts/feed/": ["documented alias of GET /api/v1/posts/ (same handler, same parameters), which is used", "GET /api/v1/posts/"],
  "POST /api/v1/posts/feed/": ["documented alias of POST /api/v1/posts/ (same handler), which is used", "POST /api/v1/posts/"],
  "PUT /api/v1/users/profile/about/": [
    "full-replace form of PATCH on the same resource, which is used (each section saves on its own)",
    "PATCH /api/v1/users/profile/about/",
  ],
  "GET /api/v1/reactions/{reaction_id}/": [
    "one reaction by id — the same ReactionDetail row the target's reaction list returns, which is what the who-reacted list reads; no screen opens a single reaction",
    "GET /api/v1/posts/{post_id}/reactions/",
  ],
};

/** Operations we reach without the generated wrapper, with the reason. */
const MANUAL = {
  "PATCH /api/v1/posts/{post_id}/media/{media_id}/thumbnail/":
    "multipart: sent via request() with FormData from postActions.setVideoThumbnail — the generated wrapper takes a JSON body",
};

/**
 * Hand-written calls the extractor can't see, because the module assembles the URL in a helper (a prefix
 * list, a method passed as an argument, a path chosen by target kind). Each is `file → [[METHOD, path,
 * ...fragments]]`: the declaration only counts while **every fragment still appears in that file**, so
 * deleting or renaming the call makes the operation unaccounted again rather than silently staying green.
 */
const sec = (m, tail, frag) => [
  [m, `/api/v1/users/settings/security/${tail}`, "request<X>(method, `/api/v1/users/${suffix}`", frag],
  [m, `/api/v1/auth/settings/security/${tail}`, "request<X>(method, `/api/v1/auth/${suffix}`", frag],
];
const logs = (m, tail, frag) => [
  [m, `/api/v1/gyms/admin-logs/${tail}`, '"/api/v1/gyms/admin-logs/"', frag],
  [m, `/api/v1/gyms/logs/admin/${tail}`, '"/api/v1/gyms/logs/admin/"', frag],
];
const react = (seg, idName) => {
  const scoped = `/api/v1/${seg}/{${idName}}/reactions/`;
  const unified = `/api/v1/reactions/${seg}/{${idName}}/`;
  const builder = ["`/api/v1/${seg}/${id}/reactions/${tail}`", "`/api/v1/reactions/${seg}/${id}/${tail}`", `"${seg}"`];
  return [scoped, unified].flatMap((base) => [
    ["GET", base, ...builder, 'either<unknown>("list", t, "", (p) =>'],
    ["POST", base, ...builder, 'either<unknown>("set", t, "", (p) => request("POST", p'],
    ["DELETE", base, ...builder, 'either<unknown>("remove", t, "", (p) => request("DELETE", p'],
    ["GET", `${base}summary/`, ...builder, 'either<unknown>("summary", t, "summary/", (p) => request("GET", p'],
  ]);
};
const DECLARED = {
  "lib/api/security.ts": [
    ...sec("GET", "", 'both<SecurityOverview>("overview", "GET", SECURITY)'),
    ...sec("GET", "contact-info/", '"GET", `${SECURITY}contact-info/`'),
    ...sec("PATCH", "contact-info/", '"PATCH", `${SECURITY}contact-info/`'),
    ...sec("GET", "2fa/", '"GET", `${SECURITY}2fa/`'),
    ...sec("PATCH", "2fa/", '"PATCH", `${SECURITY}2fa/`'),
    ...sec("GET", "devices/", '"GET", `${SECURITY}devices/`'),
    ...sec("DELETE", "devices/{device_id}/", '"DELETE", `${SECURITY}devices/${encodeURIComponent(deviceId)}/`'),
    ["POST", "/api/v1/users/settings/access-control/", "request<X>(method, `/api/v1/users/${suffix}`", '"POST", "settings/access-control/"'],
  ],
  "lib/api/admin-logs.ts": [
    ...logs("GET", "", 'viaEither<unknown>("list", "", (path) => request("GET", path'),
    ...logs("POST", "", 'viaEither<unknown>("record", "", (path) => request("POST", path'),
    ...logs("GET", "metrics/", 'viaEither<unknown>("metrics", "metrics/", (path) => request("GET", path'),
    ...logs("GET", "actions/", 'viaEither<unknown>("actions", "actions/", (path) => request("GET", path'),
    ...logs("GET", "{log_id}/", 'viaEither<unknown>("detail", tail, (path) => request("GET", path'),
    ...logs("GET", "export/", "fetch(buildUrl(`${prefix}export/`, query)"),
  ],
  "lib/api/reactions.ts": [...react("posts", "post_id"), ...react("comments", "comment_id"), ...react("stories", "story_id")],
  "lib/api/social.ts": ["accept", "reject"].flatMap((verb) => [
    ["POST", `/api/v1/users/follow-requests/{request_id}/${verb}/`, "`/api/v1/users/follow-requests/${id}/${verb}/`", `answer("${verb}", requestId)`],
    ["POST", `/api/v1/auth/follow-requests/{request_id}/${verb}/`, "`/api/v1/auth/follow-requests/${id}/${verb}/`", `answer("${verb}", requestId)`],
  ]),
  "lib/api/http.ts": ["/api/v1/auth/refresh/", "/api/v1/auth/token/refresh/", "/api/v1/token/refresh/"].map((path) => [
    "POST", path, `"${path}"`, "REFRESH_PATHS[i]",
  ]),
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
const appFiles = walk(join(ROOT, "lib")).concat(walk(join(ROOT, "components")), walk(join(ROOT, "app")));
const sources = new Map(appFiles.map((f) => [f.slice(ROOT.length + 1), readFileSync(f, "utf8")]));
const appSrc = [...sources.values()].join("\n");
const isCalled = (fn) => new RegExp(`\\b${fn}\\b`).test(appSrc);

/**
 * Finds `request("METHOD", <path>)` calls and returns them as "METHOD /api/v1/…/{}/…" with every
 * interpolation reduced to `{}`. Follows the two indirections the modules actually use: a same-file string
 * constant (`const BASE = "/api/v1/stories/"`) and a same-file one-line helper returning a template
 * (`const one = (id) => \`${BASE}${encodeURIComponent(id)}/\``). A method held in a variable, or a path built
 * by anything else, is not guessed at — those calls are declared in `DECLARED` instead.
 */
function extractCalls(src) {
  const consts = new Map();
  for (const m of src.matchAll(/const (\w+)\s*=\s*(?:\([^)]*\)\s*=>\s*)?(["`])((?:(?!\2)[^\\\n]|\\.)*)\2/g)) consts.set(m[1], m[3]);
  const resolve = (text, depth = 0) =>
    text.replace(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_, expr) => {
      const id = expr.trim().match(/^(\w+)(?:\(.*\))?$/s);
      return id && consts.has(id[1]) && depth < 4 ? resolve(consts.get(id[1]), depth + 1) : "{}";
    });
  const out = [];
  for (const m of src.matchAll(/\brequest\s*[<(]/g)) {
    let at = m.index + m[0].length - 1;
    if (src[at] === "<") {
      // skip the type argument, which may itself contain `<`, `>` (in `=>`), `;` and `(`
      let depth = 0;
      for (; at < src.length; at += 1) {
        if (src[at] === "<") depth += 1;
        else if (src[at] === ">" && src[at - 1] !== "=") { depth -= 1; if (depth === 0) break; }
      }
      at += 1;
      if (src[at] !== "(") continue;
    }
    const head = src.slice(at + 1).match(/^\s*"(GET|POST|PUT|PATCH|DELETE)"\s*,\s*/);
    if (!head) continue;
    const rest = src.slice(at + 1 + head[0].length);
    let path = null;
    if (rest[0] === '"' || rest[0] === "`") {
      const quote = rest[0];
      let i = 1;
      for (let depth = 0; i < rest.length; i += 1) {
        if (quote === "`" && rest[i] === "$" && rest[i + 1] === "{") { depth += 1; i += 1; continue; }
        if (depth && rest[i] === "{") { depth += 1; continue; }
        if (depth && rest[i] === "}") { depth -= 1; continue; }
        if (!depth && rest[i] === quote) break;
      }
      path = rest.slice(1, i);
    } else {
      const id = rest.match(/^(\w+)(?:\([^()]*\))?\s*[,)]/);
      if (id && consts.has(id[1])) path = consts.get(id[1]);
    }
    if (path === null) continue;
    const resolved = resolve(path).split("?")[0];
    if (resolved.startsWith("/api/v1/")) out.push(`${head[1]} ${resolved}`);
  }
  return out;
}

// "METHOD normalised-path" -> where it is called from
const handwritten = new Map();
for (const [file, src] of sources) {
  for (const call of extractCalls(src)) if (!handwritten.has(call)) handwritten.set(call, file);
}
const normalise = (path) => path.replace(/\{\w+\}/g, "{}");

// Declarations only count while the code they describe is still there.
const declared = new Map();
const staleDeclarations = [];
for (const [file, entries] of Object.entries(DECLARED)) {
  const src = sources.get(file);
  for (const [method, path, ...fragments] of entries) {
    const missing = src === undefined ? ["(file not found)"] : fragments.filter((f) => !src.includes(f));
    if (missing.length) staleDeclarations.push({ key: `${method} ${path}`, file, missing });
    else declared.set(`${method} ${path}`, file);
  }
}

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

const handOf = (r) => handwritten.get(`${r.method} ${normalise(r.path)}`) ?? declared.get(r.key);
const reached = (r) => (r.fn && isCalled(r.fn)) || !!handOf(r) || !!MANUAL[r.key];

// which summaries we actually exercise — a duplicate is only acceptable if its twin is called.
// An operation with no summary can't be matched to a twin this way and is never a duplicate.
const calledSummaries = new Set(rows.filter((r) => reached(r) && r.summary).map((r) => r.summary));
const byKey = new Map(rows.map((r) => [r.key, r]));

const verdicts = rows.map((r) => {
  // "called" wins: a declared fallback that the app actually invokes is used, not superseded.
  if (r.fn && isCalled(r.fn)) return { ...r, status: "called", note: `${r.fn}()` };
  const hand = handOf(r);
  if (hand) return { ...r, status: "handwritten", note: `request() in ${hand}` };
  if (MANUAL[r.key]) return { ...r, status: "multipart", note: MANUAL[r.key] };
  if (SUPERSEDED[r.key]) {
    const [reason, needs] = SUPERSEDED[r.key];
    const twin = byKey.get(needs);
    if (twin && reached(twin)) return { ...r, status: "superseded", note: reason };
    return { ...r, status: "UNACCOUNTED", note: `declared a variant of ${needs}, but that is not called` };
  }
  if (r.summary && calledSummaries.has(r.summary)) {
    const twin = rows.find((o) => o.summary === r.summary && reached(o));
    return { ...r, status: "duplicate", note: `same operation as ${twin?.key ?? "another path"}, which is used` };
  }
  return { ...r, status: "UNACCOUNTED", note: "no call site and no used twin" };
});

const tally = verdicts.reduce((a, v) => ({ ...a, [v.status]: (a[v.status] ?? 0) + 1 }), {});
const bad = verdicts.filter((v) => v.status === "UNACCOUNTED");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ tally, verdicts, staleDeclarations }, null, 2));
} else if (process.argv.includes("--markdown")) {
  // docs/api/coverage.md is this output: `node scripts/check-api-coverage.mjs --markdown > docs/api/coverage.md`
  const MEANING = {
    called: "a generated client function for it is invoked in app code",
    handwritten: "called through `request()` in a hand-written module (routes newer than the generated client)",
    multipart: "sent through `request()` with `FormData`, because the generated wrapper only sends JSON",
    duplicate: "the identical operation is published at another path, and that one is called",
    superseded: "a declared variant of an operation that is called (listed with its reason)",
    UNACCOUNTED: "**nothing calls it** — the check fails until it is used or declared",
  };
  const lines = [
    "# API coverage",
    "",
    "Every operation in the OpenAPI document must be accounted for by this app. Verified by `npm run check:api`",
    "([scripts/check-api-coverage.mjs](../../scripts/check-api-coverage.mjs)), which exits non-zero if any",
    "operation is left unaccounted for — so a new endpoint cannot appear in the spec without a deliberate decision.",
    "",
    "This page is generated: `node scripts/check-api-coverage.mjs --markdown > docs/api/coverage.md`.",
    "",
    "[← All domains](./README.md)",
    "",
    "| Disposition | Count | Meaning |",
    "|---|---|---|",
    ...Object.keys(MEANING).filter((k) => tally[k]).map((k) => `| \`${k}\` | ${tally[k]} | ${MEANING[k]} |`),
    `| **total** | **${verdicts.length}** | |`,
    "",
    "## Aliased routes",
    "",
    "The API publishes many features at more than one path and names no canonical one: follow, identity and",
    "password under both `/auth/*` and `/users/*`, the security settings under both, admin logs at",
    "`/gyms/admin-logs/` and `/gyms/logs/admin/`, comments at `/posts/{id}/comments/` and `/comments/`, reactions",
    "at `/{target}/{id}/reactions/` and `/reactions/{target}/{id}/`, and token refresh at three paths. Rather",
    "than guess, the client treats each group as a **fallback chain** —",
    "[`lib/api/fallback.ts`](../../lib/api/fallback.ts) tries them in preference order and settles on whichever",
    "the deployment actually serves, remembering the winner for the session.",
    "",
    "A chain advances only when a route looks *absent* (a 404/405 with no `{code,message,details}` envelope). A real",
    "rejection — validation, permissions, not-found from the API itself — is returned immediately, so one bad",
    "request never becomes six.",
    "",
    "## Every operation",
    "",
    "| Method | Path | Disposition | How |",
    "|---|---|---|---|",
    ...verdicts.map((v) => `| \`${v.method}\` | \`${v.path}\` | ${v.status === "UNACCOUNTED" ? "**UNACCOUNTED**" : v.status} | ${v.note.replace(/\|/g, "\\|")} |`),
  ];
  console.log(lines.join("\n"));
} else {
  console.log(`Many Gym API coverage — ${verdicts.length} operations\n`);
  for (const [k, v] of Object.entries(tally)) console.log(`  ${String(v).padStart(3)}  ${k}`);
  if (staleDeclarations.length) {
    console.log(`\nDeclarations that no longer match the code (${staleDeclarations.length}) — fix DECLARED in this script:`);
    for (const d of staleDeclarations) console.log(`  ${d.key}  —  ${d.file} no longer contains: ${d.missing.join(" · ")}`);
  }
  if (bad.length) {
    console.log(`\nUnaccounted for (${bad.length}):`);
    for (const v of bad) console.log(`  ${v.method} ${v.path}  —  ${v.summary || "(no summary)"}  [${v.note}]`);
  } else {
    console.log("\nEvery operation is accounted for.");
  }
}

process.exit(bad.length || staleDeclarations.length ? 1 : 0);
