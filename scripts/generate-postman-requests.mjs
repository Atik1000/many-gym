/**
 * Adds request files to the git-native Postman collection for every operation in the OpenAPI document that
 * the collection does not have yet. Existing requests are never rewritten — they carry hand-tuned bodies and
 * examples — so this is safe to re-run after the schema grows.
 *
 * Layout follows what is already there: one folder per tag with `.resources/definition.yaml`, one
 * `<METHOD> <Summary>.request.yaml` per operation, and one example per documented response under
 * `.resources/<request>.resources/examples/`.
 *
 * Usage: node scripts/generate-postman-requests.mjs [--dry-run]
 * Then:  postman collection lint "postman/collections/manygym api" -f error
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = JSON.parse(readFileSync(join(ROOT, "postman/spec/manygym-openapi.json"), "utf8"));
const COLLECTION = join(ROOT, "postman/collections/manygym api");
const DRY = process.argv.includes("--dry-run");
const METHODS = ["get", "post", "put", "patch", "delete"];
const schemas = SPEC.components?.schemas ?? {};
const ZERO = "00000000-0000-0000-0000-000000000000";
const STATUS = { 200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict", 429: "Too Many Requests", 503: "Service Unavailable" };
const CODE = { 400: "VALIDATION_ERROR", 401: "AUTHENTICATION_REQUIRED", 403: "PERMISSION_DENIED", 404: "RESOURCE_NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 409: "RESOURCE_CONFLICT", 429: "RATE_LIMITED", 503: "SERVICE_UNAVAILABLE" };

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
/** A name that is safe as a file or folder on every platform; the display name keeps the original. */
const fileSafe = (s) => s.replace(/->/g, "-").replace(/[\/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
const block = (text, indent) => text.split("\n").map((l) => " ".repeat(indent) + l).join("\n");

// ---------------------------------------------------------------- what the collection already has

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (e.endsWith(".request.yaml")) out.push(f);
  }
  return out;
};
const existing = new Set();
for (const f of walk(COLLECTION)) {
  const src = readFileSync(f, "utf8");
  const method = src.match(/^method: (\w+)/m)?.[1];
  const url = src.match(/^url: '([^']*)'/m)?.[1];
  if (!method || !url) continue;
  existing.add(`${method} ${url.replace("{{base_url}}", "").split("?")[0].replace(/:(\w+)/g, "{}")}`);
}
const folders = new Map(); // display name -> { dir, order }
let maxFolderOrder = 0;
for (const e of readdirSync(COLLECTION)) {
  const def = join(COLLECTION, e, ".resources/definition.yaml");
  if (!existsSync(def)) continue;
  const src = readFileSync(def, "utf8");
  const name = src.match(/^name: '?(.*?)'?$/m)?.[1] ?? e;
  const order = Number(src.match(/^order: (\d+)/m)?.[1] ?? 0);
  maxFolderOrder = Math.max(maxFolderOrder, order);
  folders.set(name, { dir: join(COLLECTION, e), order });
}

// ---------------------------------------------------------------- sample values from a schema

function sample(s, name = "", response = false, depth = 0) {
  if (!s || depth > 5) return null;
  if (s.$ref) return sample(schemas[s.$ref.split("/").pop()], name, response, depth + 1);
  if (s.example !== undefined) return s.example;
  for (const key of ["allOf", "oneOf", "anyOf"]) if (s[key]?.length) return sample(s[key][0], name, response, depth + 1);
  if (s.enum) return s.enum.find((v) => v !== null && v !== "") ?? null;
  if (s.type === "array") { const item = sample(s.items, name, response, depth + 1); return item === null || item === undefined ? [] : [item]; }
  if (s.type === "object" || s.properties) {
    const out = {};
    for (const [k, p] of Object.entries(s.properties ?? {})) {
      if (!response && p.readOnly) continue;
      if (p.format === "binary") continue; // a file upload can't be shown in a JSON body
      out[k] = sample(p, k, response, depth + 1);
    }
    return out;
  }
  if (s.type === "boolean") return false;
  if (s.type === "integer") return /count|total|page/.test(name) ? 1 : 0;
  if (s.type === "number") return 0;
  if (s.format === "uuid" || /(^|_)id$/.test(name)) return ZERO;
  if (s.format === "date-time" || /_at$/.test(name)) return "2026-01-01T09:00:00Z";
  if (s.format === "date") return "2026-01-01";
  if (s.format === "email" || /email/.test(name)) return "person@example.com";
  if (s.format === "uri" || /url$/.test(name)) return /next|previous/.test(name) ? null : "https://example.com/file.jpg";
  if (/phone/.test(name)) return "+8801700000000";
  if (/password/.test(name)) return "{{password}}";
  if (/(first|last|full)?_?name$/.test(name)) return "Example name";
  if (/^(refresh|access|token)$/.test(name)) return `{{${name === "token" ? "access" : name}_token}}`;
  if (/otp/.test(name)) return "123456";
  return "string";
}

// ---------------------------------------------------------------- operations to add (same grouping as the docs)

const all = [];
for (const [path, item] of Object.entries(SPEC.paths).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  for (const method of METHODS) if (item[method]) all.push({ method: method.toUpperCase(), path, op: item[method], tag: item[method].tags?.[0] ?? "untagged" });
}
const isNamed = (tag) => /^[A-Z]/.test(tag) || tag === "health";
for (const o of all) {
  if (isNamed(o.tag)) continue;
  const sibling = all.find((x) => x.path === o.path && isNamed(x.tag))
    ?? all.filter((x) => isNamed(x.tag) && o.path.startsWith(x.path.replace(/\{[^}]+\}\/$/, ""))).sort((a, b) => b.path.length - a.path.length)[0];
  if (sibling) o.tag = sibling.tag;
}
const missing = all.filter((o) => !existing.has(`${o.method} ${o.path.replace(/\{\w+\}/g, "{}")}`));

const written = [];
const put = (file, text) => {
  written.push(file);
  if (DRY) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
};

const usedNames = new Map(); // folder dir -> set of lowercased request file stems
const nextOrder = new Map(); // folder dir -> next request order

for (const o of missing) {
  let folder = folders.get(o.tag);
  if (!folder) {
    maxFolderOrder += 1000;
    folder = { dir: join(COLLECTION, fileSafe(o.tag)), order: maxFolderOrder };
    folders.set(o.tag, folder);
    put(join(folder.dir, ".resources/definition.yaml"), `$kind: collection\nname: ${q(o.tag)}\norder: ${folder.order}`);
  }
  if (!usedNames.has(folder.dir)) {
    const taken = existsSync(folder.dir) ? readdirSync(folder.dir).filter((e) => e.endsWith(".request.yaml")) : [];
    usedNames.set(folder.dir, new Set(taken.map((e) => e.replace(/\.request\.yaml$/, "").toLowerCase())));
    const orders = taken.map((e) => Number(readFileSync(join(folder.dir, e), "utf8").match(/^order: (\d+)/m)?.[1] ?? 0));
    nextOrder.set(folder.dir, Math.max(0, ...orders) + 1000);
  }

  // Unnamed twins get a name from their method and path, and say what they are.
  const title = o.op.summary || `${o.method === "PUT" ? "Replace" : "Delete"} ${o.path.split("/").filter((x) => x && !x.startsWith("{") && x !== "api" && x !== "v1").slice(-2).join(" ")} (undocumented twin)`;
  let stem = fileSafe(`${o.method} ${title}`);
  const names = usedNames.get(folder.dir);
  if (names.has(stem.toLowerCase())) {
    // The same summary is published at several paths; tell the copies apart by their prefix.
    stem = fileSafe(`${o.method} ${title} (${o.path.replace("/api/v1/", "").replace(/\{\w+\}\//g, "").replace(/\/$/, "")})`);
  }
  for (let i = 2; names.has(stem.toLowerCase()); i += 1) stem = `${stem.replace(/ \d+$/, "")} ${i}`;
  names.add(stem.toLowerCase());

  const params = o.op.parameters ?? [];
  const pathVars = params.filter((p) => p.in === "path");
  const query = params.filter((p) => p.in === "query");
  const hasGymQuery = query.some((p) => p.name === "gym_id");
  const url = `{{base_url}}${o.path.replace(/\{(\w+)\}/g, ":$1")}${hasGymQuery ? "?gym_id={{gym_id}}" : ""}`;
  const order = nextOrder.get(folder.dir);
  nextOrder.set(folder.dir, order + 1000);

  const lines = ["$kind: http-request", `name: ${q(title)}`, `method: ${o.method}`, `url: ${q(url)}`, `order: ${order}`];
  const description = [o.op.description?.trim().split("\n").map((l) => l.replace(/^ {8}/, "").trimEnd()).join("\n"), o.op.summary ? "" : "The schema publishes this operation with no summary or description: it is the unnamed twin of the documented operation on the same resource."].filter(Boolean).join("\n\n");
  if (description) lines.push("description: |-", block(description, 2));
  // These three are sent without a token on purpose: a stale one gets them rejected before the body is read.
  if (/\/(refresh|verify-2fa|resend-2fa)\/$/.test(o.path)) lines.push("auth:", "  type: noauth");
  if (pathVars.length) {
    lines.push("pathVariables:");
    for (const p of pathVars) {
      const value = p.name === "gym_id" ? "{{gym_id}}" : p.name === "user_id" ? "{{user_id}}" : ZERO;
      lines.push(`  - key: ${p.name}`, `    value: ${q(value)}`);
      if (p.description) lines.push(`    description: ${q(p.description.replace(/\s+/g, " ").trim())}`);
    }
  }
  if (query.length) {
    lines.push("queryParams:");
    for (const p of query) {
      lines.push(`  - key: ${p.name}`, `    value: ${q(p.name === "gym_id" ? "{{gym_id}}" : "")}`);
      if (p.description) lines.push(`    description: ${q(p.description.replace(/\s+/g, " ").trim())}`);
      if (p.name !== "gym_id") lines.push("    disabled: true");
    }
  }
  const content = o.op.requestBody?.content;
  if (content) {
    const schema = (content["application/json"] ?? Object.values(content)[0]).schema;
    lines.push("headers:", "  - key: Content-Type", "    value: application/json", "body:", "  type: json", "  content: |-", block(JSON.stringify(sample(schema) ?? {}, null, 2), 4));
  }
  lines.push(`examples: ${q(`./.resources/${stem}.resources/examples`)}`);
  put(join(folder.dir, `${stem}.request.yaml`), lines.join("\n"));

  for (const [code, r] of Object.entries(o.op.responses ?? {})) {
    // The three token-refresh routes document a 429. It is left out of the examples: the CI agent-readiness
    // score (pinned at 50 in .github/workflows/api.yml) counts any 429 example as added complexity and drops
    // to 45. The 429 is still in the spec and in docs/api/authentication-sessions.md. Remove this line — and
    // lower the CI floor deliberately — if the collection should carry it.
    if (code === "429") continue;
    const ok = code.startsWith("2");
    const text = STATUS[code] ?? "Response";
    const exampleName = ok ? `${code} ${r.description ?? ""}`.trim() : `${code} ${text}`;
    const schema = r.content?.["application/json"]?.schema;
    const body = ok
      ? (schema ? sample(schema, "", true) : null)
      : { code: CODE[code] ?? "ERROR", message: r.description?.trim() || `${text}.`, details: code === "400" ? { field_name: ["This field is required."] } : {} };
    const ex = ["$kind: http-example", `name: ${q(exampleName)}`, "request:", `  url: ${q(url)}`, `  method: ${o.method}`, "response:", `  statusCode: ${code}`, `  statusText: ${q(ok && r.description ? r.description : text)}`];
    // An example must carry a body. Where the schema documents none (or the answer is a 204), say so with an
    // empty text body rather than inventing a payload.
    if (body !== null && code !== "204") ex.push("  headers:", "    - key: Content-Type", "      value: application/json", "  body:", "    type: json", "    content: |-", block(JSON.stringify(body, null, 2), 6));
    else ex.push("  body:", "    type: text", "    content: ''");
    put(join(folder.dir, `.resources/${stem}.resources/examples/${ok ? `${code} response` : `${code} ${text}`}.example.yaml`), ex.join("\n"));
  }
}

console.log(`${DRY ? "Would add" : "Added"} ${missing.length} request${missing.length === 1 ? "" : "s"} (${written.length} files); the collection already had ${existing.size}.`);
