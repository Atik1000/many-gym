/**
 * Operation-by-operation conformance check of the generated client against the OpenAPI document.
 *
 * lib/api/endpoints.ts was generated when the API had 149 operations, and the generator is not in this
 * repository, so the file is maintained by hand. This check is what keeps it honest. Every function in it is
 * compared with its operation in the spec:
 *   1. (see "not generated" below)
 *   2. the HTTP method matches
 *   3. the URL template matches, with every path parameter interpolated (and encoded)
 *   4. the query parameters offered match the spec's, and required ones are non-optional
 *   5. a request body is accepted exactly when the spec documents one
 *   6. the declared return type matches the documented 2xx schema
 *
 * Two situations are reported but do not fail the check:
 *   not generated — the operation is in the spec but has no function here. Newer routes are called from
 *                   hand-written modules; whether each one is actually used is check-api-coverage.mjs's job.
 *   retired       — a function here whose operation has left the spec. Fallback chains (lib/api/fallback.ts)
 *                   still try these, so they stay; `RETIRED` records whether the server still answers.
 *                   A retired function missing from that table fails, so removals from the schema are noticed.
 *
 * So a failure here always means drift: a function that disagrees with the operation it claims to call.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = JSON.parse(readFileSync(join(ROOT, "postman/spec/manygym-openapi.json"), "utf8"));
const SRC = readFileSync(join(ROOT, "lib/api/endpoints.ts"), "utf8");
const METHODS = ["get", "post", "put", "patch", "delete"];

/**
 * Operations that were in the schema this client was generated from and are no longer documented.
 * Probed unauthenticated with an empty request on 2026-11-16: every one still answered with the API's own
 * `{code, message, details}` envelope (401 AUTHENTICATION_REQUIRED, or 400 VALIDATION_ERROR on the public
 * ones), where a route that does not exist answers a bare HTML 404. They are undocumented, not removed.
 */
const STILL_SERVED_401 = "still served (401 envelope) — undocumented alias";
const STILL_SERVED_400 = "still served (400 validation envelope) — undocumented alias";
const RETIRED = {
  "POST /api/v1/auth/{user_id}/follow/": STILL_SERVED_401,
  "DELETE /api/v1/auth/{user_id}/follow/": STILL_SERVED_401,
  "GET /api/v1/auth/{user_id}/followers/": STILL_SERVED_401,
  "GET /api/v1/auth/{user_id}/following/": STILL_SERVED_401,
  "GET /api/v1/auth/follow/": STILL_SERVED_401,
  "POST /api/v1/auth/follow/": STILL_SERVED_401,
  "DELETE /api/v1/auth/follow/": STILL_SERVED_401,
  "GET /api/v1/follow/": STILL_SERVED_401,
  "POST /api/v1/follow/": STILL_SERVED_401,
  "DELETE /api/v1/follow/": STILL_SERVED_401,
  "GET /api/v1/follow/{target_id}/": STILL_SERVED_401,
  "POST /api/v1/follow/{target_id}/": STILL_SERVED_401,
  "DELETE /api/v1/follow/{target_id}/": STILL_SERVED_401,
  "GET /api/v1/users/follow/": STILL_SERVED_401,
  "POST /api/v1/users/follow/": STILL_SERVED_401,
  "DELETE /api/v1/users/follow/": STILL_SERVED_401,
  "POST /api/v1/users/change-password/": STILL_SERVED_401,
  "POST /api/v1/users/forgot-password/": STILL_SERVED_400,
  "POST /api/v1/users/reset-password/": STILL_SERVED_400,
  "POST /api/v1/users/verify-reset-otp/": STILL_SERVED_400,
  "POST /api/v1/users/register/": STILL_SERVED_400,
  "POST /api/v1/users/resend-otp/": STILL_SERVED_400,
  "POST /api/v1/users/verify-signup-otp/": STILL_SERVED_400,
};

// Parse each generated function into something comparable with the spec. Return types contain nested
// generics (Array<T.MemberList>), so the type and the options object are scanned with balanced-bracket
// matching rather than a regex — an earlier regex version silently failed on 22 functions and reported
// them as missing.
const parsed = new Map();
const balanced = (text, from, open, close) => {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === open) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return [text.slice(from + 1, i), i];
    }
  }
  return [null, from];
};

for (const m of SRC.matchAll(/\/\*\* (\w+) (\S+) — [^*]*\*\/\nexport const (\w+) = \(/g)) {
  const [, docMethod, docPath, fn] = m;
  const parenAt = m.index + m[0].length - 1;
  const [args, parenEnd] = balanced(SRC, parenAt, "(", ")");
  if (args === null) continue;

  const rest = SRC.slice(parenEnd);
  const reqAt = rest.indexOf("request<");
  if (reqAt === -1) continue;
  const [ret] = balanced(rest, reqAt + "request".length, "<", ">");

  const callStart = rest.indexOf("(", reqAt);
  const [call] = balanced(rest, callStart, "(", ")");
  if (call === null) continue;
  const callMethod = (call.match(/^\s*"(\w+)"/) ?? [])[1];
  // The template literal contains ${encodeURIComponent(...)}, so the options object has to be looked for
  // after the template's closing backtick — searching from the start finds the interpolation brace instead.
  const firstTick = call.indexOf("`");
  const lastTick = call.indexOf("`", firstTick + 1);
  const template = firstTick === -1 ? "" : call.slice(firstTick + 1, lastTick);
  const afterTemplate = lastTick === -1 ? call : call.slice(lastTick + 1);
  const braceAt = afterTemplate.indexOf("{");
  const opts = braceAt === -1 ? "" : (balanced(afterTemplate, braceAt, "{", "}")[0] ?? "");

  parsed.set(`${docMethod} ${docPath}`, { fn, args, ret: (ret ?? "").trim(), callMethod, template, opts });
}

const camel = (s) => {
  const p = s.split(/[_\-/]+/);
  return p[0] + p.slice(1).map((x) => x[0].toUpperCase() + x.slice(1)).join("");
};

const rows = [];
const notGenerated = [];
const inSpec = new Set();
for (const [path, item] of Object.entries(SPEC.paths)) {
  for (const method of METHODS) {
    const op = item[method];
    if (!op) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const problems = [];
    const got = parsed.get(key);
    inSpec.add(key);

    if (!got) {
      notGenerated.push(key);
      continue;
    }

    // 2. method
    if (got.callMethod !== method.toUpperCase()) problems.push(`calls ${got.callMethod}, spec says ${method.toUpperCase()}`);

    // 3. url template: every {param} becomes an encoded interpolation, literals preserved
    const expected = path.replace(/\{(\w+)\}/g, (_, p) => "${encodeURIComponent(" + camel(p) + ")}");
    if (got.template !== expected) problems.push(`url template\n        spec: ${expected}\n        code: ${got.template}`);

    // path params must appear as leading string args, in order
    const pathParams = [...path.matchAll(/\{(\w+)\}/g)].map((x) => camel(x[1]));
    const argNames = got.args.split(",").map((a) => a.trim().split(/[?:]/)[0].trim()).filter(Boolean);
    for (const [i, p] of pathParams.entries()) {
      if (argNames[i] !== p) problems.push(`path arg ${i} is "${argNames[i] ?? "—"}", expected "${p}"`);
    }

    // 4. query params
    const specQuery = (op.parameters ?? []).filter((p) => p.in === "query");
    const hasQueryArg = /\bquery\??:/.test(got.args);
    if (specQuery.length && !hasQueryArg) problems.push(`spec has ${specQuery.length} query params, client takes none`);
    if (!specQuery.length && hasQueryArg) problems.push("client takes a query arg but spec documents none");
    if (specQuery.length && hasQueryArg) {
      const block = got.args.slice(got.args.indexOf("query"));
      for (const q of specQuery) {
        if (!new RegExp(`\\b${q.name}\\??:`).test(block)) problems.push(`query param "${q.name}" missing from client`);
        else if (q.required && new RegExp(`\\b${q.name}\\?:`).test(block)) problems.push(`query param "${q.name}" is required in spec but optional in client`);
      }
      const anyRequired = specQuery.some((q) => q.required);
      if (anyRequired && /\bquery\?:/.test(got.args)) problems.push("query object is optional but contains a required param");
      if (!got.opts.includes("query")) problems.push("query arg declared but never passed to request()");
    }

    // 5. request body
    const specBody = !!op.requestBody?.content;
    const hasBodyArg = /\bbody:/.test(got.args);
    if (specBody !== hasBodyArg) problems.push(specBody ? "spec documents a request body, client takes none" : "client takes a body, spec documents none");
    if (hasBodyArg && !got.opts.includes("body")) problems.push("body arg declared but never passed to request()");

    // 6. return type vs documented 2xx schema
    const okCode = Object.keys(op.responses ?? {}).sort().find((c) => c.startsWith("2"));
    const okSchema = okCode ? op.responses[okCode]?.content?.["application/json"]?.schema : null;
    if (okSchema) {
      const ref = okSchema.$ref?.split("/").pop();
      const itemRef = okSchema.type === "array" ? okSchema.items?.$ref?.split("/").pop() : null;
      const want = itemRef ? `Array<T.${itemRef}>` : ref ? `T.${ref}` : null;
      if (want && got.ret !== want) problems.push(`return type is ${got.ret}, expected ${want}`);
    } else if (okCode && got.ret !== "unknown") {
      problems.push(`spec documents ${okCode} with no schema; client claims ${got.ret}`);
    }

    rows.push({ key, ok: problems.length === 0, problems, fn: got.fn });
  }
}

// Functions whose operation is no longer in the spec.
const retired = [...parsed.entries()].filter(([key]) => !inSpec.has(key)).map(([key, got]) => ({ key, fn: got.fn, note: RETIRED[key] }));
const unexplained = retired.filter((r) => !r.note);
const staleRetired = Object.keys(RETIRED).filter((key) => inSpec.has(key) || !parsed.has(key));

const bad = rows.filter((r) => !r.ok);
console.log(`Checked ${rows.length} generated functions against the spec, one by one.\n`);
console.log(`  conformant    : ${rows.length - bad.length}`);
console.log(`  mismatched    : ${bad.length}`);
console.log(`  not generated : ${notGenerated.length}  (in the spec, called from hand-written modules — see check-api-coverage.mjs)`);
console.log(`  retired       : ${retired.length}  (function kept for fallback chains; operation no longer in the spec)`);
if (bad.length) {
  console.log("\n--- mismatches ---");
  for (const r of bad) {
    console.log(`\n  ${r.key}${r.fn ? `  (${r.fn})` : ""}`);
    for (const p of r.problems) console.log(`      - ${p}`);
  }
}
if (retired.length && process.argv.includes("--retired")) {
  console.log("\n--- retired ---");
  for (const r of retired) console.log(`  ${r.key}  (${r.fn})  —  ${r.note ?? "NOT RECORDED"}`);
}
if (unexplained.length) {
  console.log("\n--- left the spec without a record (probe it, then add it to RETIRED or delete the function) ---");
  for (const r of unexplained) console.log(`  ${r.key}  (${r.fn})`);
}
if (staleRetired.length) {
  console.log("\n--- RETIRED entries that no longer apply (back in the spec, or the function is gone) ---");
  for (const key of staleRetired) console.log(`  ${key}`);
}
process.exit(bad.length || unexplained.length || staleRetired.length ? 1 : 0);
