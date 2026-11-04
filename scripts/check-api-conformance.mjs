/**
 * Operation-by-operation conformance check of the generated client against the OpenAPI document.
 *
 * For each of the 149 operations it verifies, independently of the generator that produced the file:
 *   1. a client function exists for it
 *   2. the HTTP method matches
 *   3. the URL template matches, with every path parameter interpolated (and encoded)
 *   4. the query parameters offered match the spec's, and required ones are non-optional
 *   5. a request body is accepted exactly when the spec documents one
 *   6. the declared return type matches the documented 2xx schema
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = JSON.parse(readFileSync(join(ROOT, "postman/spec/manygym-openapi.json"), "utf8"));
const SRC = readFileSync(join(ROOT, "lib/api/endpoints.ts"), "utf8");
const METHODS = ["get", "post", "put", "patch", "delete"];

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
for (const [path, item] of Object.entries(SPEC.paths)) {
  for (const method of METHODS) {
    const op = item[method];
    if (!op) continue;
    const key = `${method.toUpperCase()} ${path}`;
    const problems = [];
    const got = parsed.get(key);

    if (!got) {
      rows.push({ key, ok: false, problems: ["no client function found"] });
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

const bad = rows.filter((r) => !r.ok);
console.log(`Checked ${rows.length} operations against the spec, one by one.\n`);
console.log(`  conformant : ${rows.length - bad.length}`);
console.log(`  mismatched : ${bad.length}`);
if (bad.length) {
  console.log("\n--- mismatches ---");
  for (const r of bad) {
    console.log(`\n  ${r.key}${r.fn ? `  (${r.fn})` : ""}`);
    for (const p of r.problems) console.log(`      - ${p}`);
  }
}
process.exit(bad.length ? 1 : 0);
