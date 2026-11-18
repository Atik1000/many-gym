"use client";

/**
 * Reactions on posts, comments and stories.
 *
 * One person (or gym) holds at most one reaction per target. `POST …/reactions/` with a `reaction_code`
 * creates it, changes it to a different one, or — when it is the reaction already held — toggles it off; the
 * answer says which (`created` / `updated` / `removed`) and always carries the target's fresh summary, so the
 * UI never has to guess counts. `DELETE …/reactions/` removes it outright.
 *
 * Posts, comments and stories only carry `reactions_count` inline. Which reaction the viewer holds, and the
 * breakdown, come from `GET …/reactions/summary/` — fetched lazily, and only for targets whose count is not
 * zero (nobody has reacted, so neither has the viewer).
 *
 * Every route exists twice: under its target (`/posts/{id}/reactions/`) and under `/reactions/posts/{id}/`.
 * The target-scoped one is preferred; the twin is the fallback. They go through `request()` directly rather
 * than the generated client.
 *
 * Who is reacting: the `user_id` always comes from the token. While the session is in gym context the
 * reaction is made as the gym page, and the writes say so explicitly (`owner_type: "gym"` + `gym_id`) as the
 * integration spec asks; in personal context both fields are left out, which the server reads as the person.
 */
import { firstAvailable } from "./fallback";
import { currentGymId, mediaUrl, request } from "./http";

export type ReactionTarget = { kind: "post" | "comment" | "story"; id: string };

export type ReactionItem = { id: string; code: string; emoji: string; label: string; order: number };

export type ReactionCount = { code: string; emoji: string; label: string; count: number };

export type ReactionSummary = {
  total: number;
  /** Every reaction in use on this target, most used first. */
  counts: ReactionCount[];
  /** The few most used, for the little stack of emoji next to the total. */
  top: { code: string; emoji: string; count: number }[];
  /** What the signed-in viewer has reacted with, if anything. */
  viewer: { code: string; emoji: string; label: string; id?: string } | null;
};

export type Reactor = {
  id: string;
  name: string;
  avatarUrl: string;
  /** Set when the reaction was made on behalf of a gym: the staff member behind it. */
  via: string;
  code: string;
  emoji: string;
  label: string;
};

export type ReactorPage = { rows: Reactor[]; count: number; hasMore: boolean; summary: ReactionSummary | null };

/** What to show before the catalogue has loaded, and when it can't be. */
export const DEFAULT_REACTION: ReactionItem = { id: "", code: "like", emoji: "👍", label: "Like", order: 0 };

export const EMPTY_SUMMARY: ReactionSummary = { total: 0, counts: [], top: [], viewer: null };

// ---------------------------------------------------------------- mapping

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : Array.isArray(obj(v).results) ? (obj(v).results as unknown[]) : []);

const itemOf = (raw: unknown): ReactionItem => {
  const o = obj(raw);
  return { id: str(o.id), code: str(o.code), emoji: str(o.emoji), label: str(o.label) || str(o.code), order: num(o.order) };
};

export function summaryFromApi(raw: unknown): ReactionSummary {
  const o = obj(raw);
  const counts = list(o.reaction_counts)
    .map((r) => {
      const c = obj(r);
      return { code: str(c.code), emoji: str(c.emoji), label: str(c.label) || str(c.code), count: num(c.count) };
    })
    .filter((c) => c.code && c.count > 0)
    .sort((a, b) => b.count - a.count);
  const top = list(o.top_reactions)
    .map((r) => {
      const c = obj(r);
      return { code: str(c.code), emoji: str(c.emoji), count: num(c.count) };
    })
    .filter((c) => c.code);
  const v = o.viewer_reaction ? obj(o.viewer_reaction) : null;
  return {
    total: typeof o.total_reactions === "number" ? o.total_reactions : counts.reduce((n, c) => n + c.count, 0),
    counts,
    top: top.length ? top : counts.slice(0, 3),
    viewer: v && str(v.code) ? { code: str(v.code), emoji: str(v.emoji), label: str(v.label) || str(v.code), id: str(v.id) || undefined } : null,
  };
}

const reactorOf = (raw: unknown): Reactor => {
  const o = obj(raw);
  const item = itemOf(o.reaction_item);
  const asGym = o.owner_type === "gym" && !!str(o.gym_name);
  return {
    id: str(o.id),
    name: asGym ? str(o.gym_name) : str(o.user_name) || "Unknown",
    avatarUrl: mediaUrl(asGym ? str(o.gym_avatar_url) : str(o.user_avatar_url)),
    via: asGym ? str(o.user_name) : "",
    code: item.code,
    emoji: item.emoji,
    label: item.label,
  };
};

// ---------------------------------------------------------------- routes

const SEGMENT = { post: "posts", comment: "comments", story: "stories" } as const;

/** Both homes of a target's reactions, preferred first. `tail` is "" or "summary/". */
const paths = (t: ReactionTarget, tail = "") => {
  const id = encodeURIComponent(t.id);
  const seg = SEGMENT[t.kind];
  return [`/api/v1/${seg}/${id}/reactions/${tail}`, `/api/v1/reactions/${seg}/${id}/${tail}`];
};

/**
 * `extra` are further routes to fall back on — the target-agnostic `/reactions/` endpoints, which name the
 * target in the body or query instead of the path.
 */
const either = <X,>(feature: string, t: ReactionTarget, tail: string, call: (path: string) => Promise<X>, extra: { path: string; call: () => Promise<X> }[] = []) =>
  firstAvailable<X>(
    `reactions:${t.kind}:${feature}`,
    [...paths(t, tail).map((path) => ({ path: path.replace(t.id, `{${t.kind}_id}`), call: () => call(path) })), ...extra],
  );

/** How the target-agnostic routes name a target: `post_id`, `comment_id` or `story_id`. */
const targetKey = (t: ReactionTarget) => ({ [`${t.kind}_id`]: t.id });

/** The acting page for a write: the gym this session is scoped to, or nothing for a person. */
const actor = (): { owner_type?: "gym"; gym_id?: string } => {
  const gymId = currentGymId();
  return gymId ? { owner_type: "gym", gym_id: gymId } : {};
};

// ---------------------------------------------------------------- catalogue

let catalogue: Promise<ReactionItem[]> | null = null;

/**
 * The reactions on offer (`GET /reactions/items/`, public). Loaded once per session; a failed load is
 * forgotten so the next picker open tries again.
 */
export function reactionItems(): Promise<ReactionItem[]> {
  catalogue ??= request<unknown>("GET", "/api/v1/reactions/items/")
    .then((raw) =>
      list(raw)
        .filter((r) => obj(r).is_active !== false)
        .map(itemOf)
        .filter((i) => i.code && i.emoji)
        .sort((a, b) => a.order - b.order),
    )
    .catch((e) => {
      catalogue = null;
      throw e;
    });
  return catalogue;
}

/** The reaction a plain click gives: "like" when the catalogue has it, otherwise its first entry. */
export const defaultReaction = (items: ReactionItem[]): ReactionItem =>
  items.find((i) => i.code === "like") ?? items[0] ?? DEFAULT_REACTION;

// ---------------------------------------------------------------- reads & writes

export const reactionSummary = async (t: ReactionTarget): Promise<ReactionSummary> =>
  summaryFromApi(await either<unknown>("summary", t, "summary/", (p) => request("GET", p)));

/**
 * React with `code`. If the viewer already holds that same reaction the server toggles it off, so trust the
 * returned summary rather than assuming the reaction is now set.
 */
export async function react(t: ReactionTarget, code: string): Promise<ReactionSummary> {
  const raw = await either<unknown>("set", t, "", (p) => request("POST", p, { body: { reaction_code: code, ...actor() } }), [
    { path: "POST /reactions/", call: () => request("POST", "/api/v1/reactions/", { body: { reaction_code: code, ...targetKey(t), ...actor() } }) },
  ]);
  return summaryFromApi(obj(raw).summary);
}

/** Take the viewer's reaction back. `reactionId` (from the summary) enables the by-id route as a fallback. */
export async function unreact(t: ReactionTarget, reactionId?: string): Promise<ReactionSummary> {
  let byId = false;
  // The body only matters for a gym page's reaction; a person's needs none.
  const as = currentGymId() ? { body: actor() } : {};
  const raw = await either<unknown>("remove", t, "", (p) => request("DELETE", p, as), reactionId ? [
    { path: "DELETE /reactions/{reaction_id}/", call: () => { byId = true; return request("DELETE", `/api/v1/reactions/${encodeURIComponent(reactionId)}/`); } },
  ] : []);
  // The by-id route doesn't say what the target looks like afterwards, so ask.
  const summary = obj(raw).summary;
  return summary || !byId ? summaryFromApi(summary) : reactionSummary(t);
}

/** Who reacted, newest first; `code` narrows to one reaction. */
export async function reactors(t: ReactionTarget, o: { code?: string; page?: number; pageSize?: number } = {}): Promise<ReactorPage> {
  const page = o.page ?? 1;
  const query = { code: o.code || undefined, page, page_size: o.pageSize ?? 20 };
  const raw = await either<unknown>("list", t, "", (p) => request("GET", p, { query }), [
    { path: "GET /reactions/", call: () => request("GET", "/api/v1/reactions/", { query: { ...query, ...targetKey(t) } }) },
  ]);
  const env = obj(raw);
  const rows = list(raw).map(reactorOf).filter((r) => r.id);
  return {
    rows,
    count: typeof env.count === "number" ? env.count : rows.length,
    hasMore: env.next != null ? !!env.next : num(env.total_pages) > (num(env.current_page) || page),
    summary: env.summary ? summaryFromApi(env.summary) : null,
  };
}
