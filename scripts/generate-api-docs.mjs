/**
 * Renders the per-domain reference pages under docs/api/ from the OpenAPI document — one page per tag, in the
 * layout the hand-kept pages already use — and the two generated tables in docs/api/README.md.
 *
 * Usage:
 *   node scripts/generate-api-docs.mjs --tags "Stories,Post Comments"   render those tags' pages
 *   node scripts/generate-api-docs.mjs --all                            render every tag's page
 *   node scripts/generate-api-docs.mjs --index                          rewrite README's Domains / Every endpoint tables
 *   node scripts/generate-api-docs.mjs --list                           print tag → file → operation count
 * Options: --spec <file> (default postman/spec/manygym-openapi.json), --out <dir> (default docs/api)
 *
 * Operations carrying a lowercase catch-all tag ("posts", "users", …) are the unnamed PUT/DELETE twins the API
 * publishes beside a documented operation; they are folded into the page of the domain that owns their path.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const SPEC = JSON.parse(readFileSync(arg("--spec") ?? join(ROOT, "postman/spec/manygym-openapi.json"), "utf8"));
const OUT = arg("--out") ?? join(ROOT, "docs/api");
const BASE_URL = "https://v0.manygym.com";
const METHODS = ["get", "post", "put", "patch", "delete"];
const schemas = SPEC.components?.schemas ?? {};

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const anchor = (method, path) => `${method.toLowerCase()}-${slug(path)}`;
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
const refName = (s) => s?.$ref?.split("/").pop();
const deref = (s) => (s?.$ref ? schemas[refName(s)] ?? {} : s ?? {});

/** A schema as the short type shown in a table cell. */
function typeOf(s) {
  if (!s) return "any";
  if (s.$ref) {
    const target = schemas[refName(s)];
    if (target?.enum) return `enum: ${target.enum.filter((v) => v !== null && v !== "").map((v) => `\`${v}\``).join(" | ")}`;
    return refName(s);
  }
  if (s.allOf?.length === 1) return typeOf(s.allOf[0]);
  if (s.oneOf || s.anyOf || s.allOf) return "any";
  if (s.enum) return `enum: ${s.enum.filter((v) => v !== null && v !== "").map((v) => `\`${v}\``).join(" | ")}`;
  if (s.type === "array") return `array of ${itemType(s.items)}`;
  if (s.type && s.type !== "integer" && s.format) return `${s.type}(${s.format})`;
  return s.type ?? "any";
}
/** Inside "array of …" an enum is listed bare and an untyped item is an object. */
function itemType(s) {
  if (!s || (!s.$ref && !s.type && !s.enum && !s.oneOf && !s.anyOf && !s.allOf)) return "object";
  return typeOf(s).replace(/^enum: /, "").replace(/^(string|number)\(.*\)$/, "$1");
}
const isEnum = (s) => !!(s?.enum || schemas[refName(s)]?.enum || (s?.allOf?.length === 1 && isEnum(s.allOf[0])));
/** drf-spectacular appends "* `value` - Label" lines to an enum's description; the type column already lists them. */
const describe = (s) => (isEnum(s) ? "" : (s?.description ?? "").split(/\n\s*\n\* `/)[0]);
const withNull = (s) => `${typeOf(s)}${s?.nullable && s.type !== "object" ? " | null" : ""}`;
const notes = (s) => `${s?.readOnly && !s.allOf && !s.$ref ? "read-only. " : ""}${describe(s)}`.trim();

function fieldTable(schema, withRequired) {
  const s = deref(schema);
  const props = Object.entries(s.properties ?? {});
  if (!props.length) return [];
  const required = new Set(s.required ?? []);
  const rows = props
    .filter(([, p]) => withRequired ? !p.readOnly : true)
    .map(([name, p]) =>
      withRequired
        ? `| \`${name}\` | ${cell(withNull(p))} | ${required.has(name) ? "yes" : "no"} | ${cell(describe(p))} |`
        : `| \`${name}\` | ${cell(withNull(p))} | ${cell(notes(p))} |`,
    );
  if (!rows.length) return [];
  return withRequired
    ? ["| Field | Type | Required | Notes |", "|---|---|---|---|", ...rows]
    : ["| Field | Type | Notes |", "|---|---|---|", ...rows];
}

const bodyLabel = (s) => {
  if (!s) return "_no schema documented_";
  if (s.$ref) return refName(s);
  if (s.type === "array") return `array of ${typeOf(s.items)}`;
  return s.type ?? "_no schema documented_";
};

function renderOperation(method, path, op) {
  const out = [];
  // An empty entry in `security` means the operation answers without a token (some also personalise with one).
  const isPublic = Array.isArray(op.security) && op.security.some((x) => Object.keys(x).length === 0);
  out.push(`## ${method.toUpperCase()} \`${path}\``, "");
  if (op.summary) out.push(`**${op.summary}**`, "");
  out.push(`- **Auth:** ${isPublic ? "public — no token" : "Bearer JWT"}`, `- **operationId:** \`${op.operationId}\``, "");
  if (op.description?.trim()) out.push(op.description.trim().split("\n").map((l) => l.replace(/^ {8}/, "").replace(/\s+$/, "")).join("\n"), "");

  for (const [where, title] of [["path", "Path parameters"], ["query", "Query parameters"]]) {
    const params = (op.parameters ?? []).filter((p) => p.in === where);
    if (!params.length) continue;
    out.push(`**${title}**`, "", "| Name | Type | Required | Description |", "|---|---|---|---|");
    for (const p of params) out.push(`| \`${p.name}\` | ${cell(typeOf(p.schema))} | ${p.required ? "yes" : "no"} | ${cell(p.description)} |`);
    out.push("");
  }

  const content = op.requestBody?.content;
  if (content) {
    const type = content["application/json"] ? "application/json" : Object.keys(content)[0];
    const schema = content[type].schema;
    out.push(`**Request body** — \`${type}\`${refName(schema) ? ` (${refName(schema)})` : ""}`, "");
    const table = fieldTable(schema, true);
    if (table.length) out.push(...table, "");
  }

  out.push("**Responses**", "", "| Status | Body | Description |", "|---|---|---|");
  const codes = Object.keys(op.responses ?? {}).sort();
  for (const code of codes) {
    const r = op.responses[code];
    const schema = r.content?.["application/json"]?.schema ?? Object.values(r.content ?? {})[0]?.schema;
    out.push(`| \`${code}\` | ${cell(bodyLabel(schema))} | ${cell(r.description)} |`);
  }
  out.push("");

  const ok = codes.find((c) => c.startsWith("2"));
  const okSchema = ok ? op.responses[ok].content?.["application/json"]?.schema : null;
  const shown = okSchema?.type === "array" ? okSchema.items : okSchema;
  const fields = shown ? fieldTable(shown, false) : [];
  if (fields.length) out.push(`<details><summary>Response fields (${ok})</summary>`, "", ...fields, "", "</details>", "");
  out.push("---", "");
  return out;
}

// ---------------------------------------------------------------- group operations by tag

const all = [];
// Paths in plain code-point order (so `/x/metrics/` sorts before `/x/{id}/`), methods GET → DELETE.
for (const [path, item] of Object.entries(SPEC.paths).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  for (const method of METHODS) if (item[method]) all.push({ method, path, op: item[method], tag: item[method].tags?.[0] ?? "untagged" });
}
/** Named tags start with a capital; the generic lowercase ones are folded into a named tag sharing the path. */
const isNamed = (tag) => /^[A-Z]/.test(tag) || tag === "health";
for (const o of all) {
  if (isNamed(o.tag)) continue;
  const sibling = all.find((x) => x.path === o.path && isNamed(x.tag))
    ?? all.filter((x) => isNamed(x.tag) && o.path.startsWith(x.path.replace(/\{[^}]+\}\/$/, ""))).sort((a, b) => b.path.length - a.path.length)[0];
  if (sibling) o.tag = sibling.tag;
}
const byTag = new Map();
for (const o of all) byTag.set(o.tag, [...(byTag.get(o.tag) ?? []), o]);

const pageFor = (tag) => {
  const ops = byTag.get(tag);
  if (!ops) throw new Error(`No operations tagged "${tag}"`);
  const lines = [`# ${tag}`, "", `${ops.length} endpoint${ops.length === 1 ? "" : "s"}. Base URL \`${BASE_URL}\`.`, "", "[← All domains](./README.md)", "", "---", ""];
  for (const o of ops) lines.push(...renderOperation(o.method, o.path, o.op));
  return lines.join("\n");
};

const write = (tag) => {
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `${slug(tag)}.md`);
  writeFileSync(file, pageFor(tag));
  console.log(`wrote ${file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file}  (${byTag.get(tag).length} operations)`);
};

if (process.argv.includes("--list")) {
  for (const [tag, ops] of byTag) console.log(`${String(ops.length).padStart(3)}  ${slug(tag)}.md  ${tag}`);
}
if (process.argv.includes("--all")) for (const tag of byTag.keys()) write(tag);
else if (arg("--tags")) for (const tag of arg("--tags").split(",").map((t) => t.trim()).filter(Boolean)) write(tag);

if (process.argv.includes("--index")) {
  const file = join(OUT, "README.md");
  let readme = readFileSync(file, "utf8");
  const section = (title, body) => {
    const start = readme.indexOf(`## ${title}\n`);
    if (start === -1) throw new Error(`README has no "## ${title}" section`);
    const next = readme.indexOf("\n## ", start + 4);
    readme = `${readme.slice(0, start)}## ${title}\n\n${body}\n${next === -1 ? "" : readme.slice(next)}`;
  };
  const prefixes = (ops) => [...new Set(ops.map((o) => o.path.split("/")[3]))].sort().join(", ");
  section("Domains", ["| Domain | Endpoints | Paths |", "|---|---|---|", ...[...byTag].map(([tag, ops]) => `| [${tag}](./${slug(tag)}.md) | ${ops.length} | ${prefixes(ops)} |`)].join("\n"));
  const authOf = (op) => (Array.isArray(op.security) && op.security.some((x) => !Object.keys(x).length) ? "public" : "JWT");
  section("Every endpoint", ["| Method | Path | Auth | Summary |", "|---|---|---|---|", ...all.map((o) => `| \`${o.method.toUpperCase()}\` | [\`${o.path}\`](./${slug(o.tag)}.md#${anchor(o.method, o.path)}) | ${authOf(o.op)} | ${cell(o.op.summary)} |`)].join("\n"));
  writeFileSync(file, readme);
  console.log(`updated ${file.slice(ROOT.length + 1)}: ${byTag.size} domains, ${all.length} operations`);
}
