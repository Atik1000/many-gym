"use client";

/**
 * The follow feature, across every path the API publishes it at.
 *
 * Following a **gym** is always immediate. Following a **user** is immediate unless they have turned on
 * `require_follow_approval`, in which case the follow becomes a *request* (`status: "pending"`) that they
 * confirm or decline — so every write here reports one of three states, not a boolean.
 *
 * The API has published this capability at many prefixes (`/follow/`, `/follows/`, `/users/follow/`,
 * `/auth/follow/`, plus the target-in-path routes) and the set has changed between deployments, so each
 * function lists them in preference order and `firstAvailable` settles on whichever the server serves.
 *
 * Preference order: the target-in-path routes first (`/gyms/{id}/follow/`, `/users/{id}/follow/`) — they are
 * the ones the follow guide documents and the only ones that report `status` / `request_id` for approval —
 * then the unified routes as fallbacks. The bare `DELETE` routes come last: as published they accept no body
 * and no parameters, so they cannot name a target (known-issues #15).
 */
import * as api from "./endpoints";
import { firstAvailable, resolvedPath, type Attempt } from "./fallback";
import { ApiError, request } from "./http";
import { NOTIFICATION_EVENT } from "./notifications";
import type * as T from "./types";

export type Target = { id: string; kind: "user" | "gym" };

/** `none` → Follow · `pending` → Requested · `following` → Following. */
export type FollowState = "none" | "pending" | "following";

/**
 * The follow routes don't agree on a response shape — `FollowActionResponse`, `GymFollowActionResponse` and
 * `UserFollowActionResponse` all differ — and a caller only needs to know what happened, so results are
 * normalised to this.
 */
export type FollowResult = {
  message: string;
  following: boolean | null;
  state: FollowState;
  /** Set when the follow became a request awaiting the other person's approval. */
  requestId?: string;
};

const normalise = (raw: unknown, fallbackFollowing: boolean): FollowResult => {
  const o = (raw ?? {}) as Record<string, unknown>;
  const flag = [o.is_following, o.following, o.followed].find((v) => typeof v === "boolean");
  const pending = o.status === "pending";
  // A pending request is explicitly *not* following, whatever the fallback would have assumed.
  const following = typeof flag === "boolean" ? flag : pending ? false : fallbackFollowing;
  return {
    message: typeof o.message === "string" ? o.message : "",
    following,
    state: pending && !following ? "pending" : following ? "following" : "none",
    requestId: typeof o.request_id === "string" ? o.request_id : undefined,
  };
};

const body = (t: Target, action: "follow" | "unfollow"): T.FollowActionRequest => ({
  target_id: t.id,
  id: t.id,
  target_type: t.kind as never,
  action,
});

// ---------------------------------------------------------------- keeping every screen in step

/**
 * Fired on `window` after every follow, unfollow and withdrawn request, with what the server said happened.
 * The same account is shown in many places at once — a post card, a profile, a list, a count — so each of
 * them listens for this instead of trusting only its own button.
 */
export const FOLLOW_EVENT = "manygym:follow";
export type FollowChange = { target: Target; state: FollowState; requestId?: string };

const announce = (target: Target, result: FollowResult): FollowResult => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<FollowChange>(FOLLOW_EVENT, { detail: { target, state: result.state, requestId: result.requestId } }));
  }
  return result;
};

/** Hear about each follow change made in this tab, straight away. Returns the cleanup. */
export function onFollowChange(cb: (change: FollowChange) => void): () => void {
  const on = (e: Event) => cb((e as CustomEvent<FollowChange>).detail);
  window.addEventListener(FOLLOW_EVENT, on);
  return () => window.removeEventListener(FOLLOW_EVENT, on);
}

/**
 * Hear that the follower / following lists may have changed, for anything that shows those lists or their
 * counts: a follow made here, a follow request answered here, or — live — someone else following this
 * account (the server's `follow` notification, over the socket or a push). Bursts are folded into one call.
 */
export function onAudienceChange(cb: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(cb, 250);
  };
  const onAlert = (e: Event) => {
    const d = ((e as CustomEvent).detail ?? {}) as { notification_type?: unknown; data?: { notification_type?: unknown } };
    if ((d.notification_type ?? d.data?.notification_type) === "follow") soon();
  };
  window.addEventListener(FOLLOW_EVENT, soon);
  window.addEventListener(FOLLOW_REQUESTS_EVENT, soon);
  window.addEventListener(NOTIFICATION_EVENT, onAlert);
  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener(FOLLOW_EVENT, soon);
    window.removeEventListener(FOLLOW_REQUESTS_EVENT, soon);
    window.removeEventListener(NOTIFICATION_EVENT, onAlert);
  };
}

// ---------------------------------------------------------------- writes

export async function follow(t: Target): Promise<FollowResult> {
  const b = body(t, "follow");
  const attempts: Attempt<unknown>[] = [
    ...(t.kind === "gym"
      ? [{ path: "POST /gyms/{gym_id}/follow/", call: () => api.gymsFollowCreate(t.id) }]
      : [
          { path: "POST /users/{user_id}/follow/", call: () => api.usersFollowCreate2(t.id) },
          { path: "POST /auth/{user_id}/follow/", call: () => api.authFollowCreate2(t.id) },
        ]),
    { path: "POST /follows/", call: () => api.followsCreate(b) },
    { path: "POST /follows/{target_id}/", call: () => api.followsCreate2(t.id, b) },
    { path: "POST /follow/", call: () => api.followCreate(b) },
    { path: "POST /follow/{target_id}/", call: () => api.followCreate2(t.id, b) },
    { path: "POST /users/follow/", call: () => api.usersFollowCreate(b) },
    { path: "POST /auth/follow/", call: () => api.authFollowCreate(b) },
  ];
  return announce(t, normalise(await firstAvailable(`follow:${t.kind}`, attempts), true));
}

/**
 * Stops following — and, for a user whose approval is still pending, withdraws the request: the guide
 * documents `DELETE /users/{id}/follow/` for both.
 */
export async function unfollow(t: Target): Promise<FollowResult> {
  const b = body(t, "unfollow");
  const attempts: Attempt<unknown>[] = [
    ...(t.kind === "gym"
      ? [{ path: "DELETE /gyms/{gym_id}/follow/", call: () => api.gymsFollowDestroy(t.id) }]
      : [
          { path: "DELETE /users/{user_id}/follow/", call: () => api.usersFollowDestroy2(t.id) },
          { path: "DELETE /auth/{user_id}/follow/", call: () => api.authFollowDestroy2(t.id) },
        ]),
    // The unified POST carries an action, so it can always identify the target.
    { path: "POST /follows/ (action: unfollow)", call: () => api.followsCreate(b) },
    { path: "DELETE /follows/{target_id}/", call: () => api.followsDestroy2(t.id) },
    { path: "POST /follow/ (action: unfollow)", call: () => api.followCreate(b) },
    { path: "DELETE /follow/{target_id}/", call: () => api.followDestroy2(t.id) },
    // Last resort: these take no body and no parameters, so they can only act on an implied target.
    { path: "DELETE /follow/", call: () => api.followDestroy() },
    { path: "DELETE /follows/", call: () => api.followsDestroy() },
    { path: "DELETE /users/follow/", call: () => api.usersFollowDestroy() },
    { path: "DELETE /auth/follow/", call: () => api.authFollowDestroy() },
  ];
  return announce(t, normalise(await firstAvailable(`unfollow:${t.kind}`, attempts), false));
}

export const setFollowing = (t: Target, following: boolean) => (following ? follow(t) : unfollow(t));

/**
 * Withdraws a follow request that hasn't been answered yet.
 *
 * The API has dedicated cancel routes — by request id when we know it, otherwise by the other person's id —
 * each under `/users/` and `/auth/`, and each as POST or DELETE. They are tried in that order; a deployment
 * serving none of them still withdraws the request through the plain unfollow.
 */
export async function cancelFollowRequest(userId: string, requestId?: string): Promise<FollowResult> {
  const u = encodeURIComponent(userId);
  const r = requestId ? encodeURIComponent(requestId) : "";
  const attempts: Attempt<unknown>[] = [
    ...(r
      ? [
          { path: "POST /users/follow-requests/{request_id}/cancel/", call: () => request("POST", `/api/v1/users/follow-requests/${r}/cancel/`) },
          { path: "POST /auth/follow-requests/{request_id}/cancel/", call: () => request("POST", `/api/v1/auth/follow-requests/${r}/cancel/`) },
          { path: "DELETE /users/follow-requests/{request_id}/cancel/", call: () => request("DELETE", `/api/v1/users/follow-requests/${r}/cancel/`) },
          { path: "DELETE /auth/follow-requests/{request_id}/cancel/", call: () => request("DELETE", `/api/v1/auth/follow-requests/${r}/cancel/`) },
        ]
      : []),
    { path: "POST /users/{user_id}/follow/cancel/", call: () => request("POST", `/api/v1/users/${u}/follow/cancel/`) },
    { path: "POST /auth/{user_id}/follow/cancel/", call: () => request("POST", `/api/v1/auth/${u}/follow/cancel/`) },
    { path: "DELETE /users/{user_id}/follow/cancel/", call: () => request("DELETE", `/api/v1/users/${u}/follow/cancel/`) },
    { path: "DELETE /auth/{user_id}/follow/cancel/", call: () => request("DELETE", `/api/v1/auth/${u}/follow/cancel/`) },
    { path: "DELETE /users/{user_id}/follow/ (unfollow)", call: () => unfollow({ id: userId, kind: "user" }) },
  ];
  // A cancelled request answers `status: "cancelled"` with no follow flag — either way, not following.
  const raw = await firstAvailable(`follow-requests:cancel:${r ? "by-request" : "by-user"}`, attempts);
  const done = normalise(raw, false);
  return announce({ id: userId, kind: "user" }, { ...done, following: false, state: "none", requestId: undefined });
}

/**
 * What to tell someone when a follow is refused. The server's own message is usually right; these cover the
 * cases the follow guide names where a bare status is all there is.
 */
export function followProblem(e: unknown): string {
  if (!(e instanceof ApiError)) return "Couldn't change that. Try again.";
  if (e.message && !e.message.startsWith("Request failed")) return e.message;
  if (e.status === 400) return "You can't follow yourself.";
  if (e.status === 403) return "Unable to follow this account.";
  if (e.status === 404) return "That account is no longer available.";
  return e.message;
}

// ---------------------------------------------------------------- follow requests (approval)

/**
 * Follow requests, for accounts that confirm followers first. These routes postdate the committed OpenAPI
 * document, so they go through `request()` directly rather than the generated client. Each exists under both
 * `/users/` and `/auth/`.
 */
export type FollowRequestPerson = { id: string; name: string; email: string; avatarUrl: string };
export type FollowRequest = {
  id: string;
  status: string;
  createdAt: string;
  requester: FollowRequestPerson;
  target: FollowRequestPerson;
};

const personOf = (raw: unknown): FollowRequestPerson => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: str(o.user_id) || str(o.id),
    name: str(o.full_name) || `${str(o.first_name)} ${str(o.last_name)}`.trim() || str(o.email) || "Unknown",
    email: str(o.email),
    avatarUrl: str(o.avatar_url),
  };
};

const requestOf = (raw: unknown): FollowRequest => {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    status: String(o.status ?? "pending"),
    createdAt: String(o.created_at ?? ""),
    requester: personOf(o.requester),
    target: personOf(o.target_user),
  };
};

const rows = (raw: unknown): unknown[] =>
  Array.isArray(raw) ? raw : Array.isArray((raw as { results?: unknown[] } | null)?.results) ? (raw as { results: unknown[] }).results : [];

/** `received` = people asking to follow me; `sent` = requests I am waiting on. */
export async function followRequests(type: "received" | "sent", status = "pending"): Promise<FollowRequest[]> {
  const query = { type, status, page_size: 100 };
  const raw = await firstAvailable<unknown>("follow-requests:list", [
    { path: "GET /users/follow-requests/", call: () => request("GET", "/api/v1/users/follow-requests/", { query }) },
    { path: "GET /auth/follow-requests/", call: () => request("GET", "/api/v1/auth/follow-requests/", { query }) },
  ]);
  return rows(raw).map(requestOf).filter((r) => r.id);
}

const answer = (verb: "accept" | "reject", requestId: string) => {
  const id = encodeURIComponent(requestId);
  return firstAvailable<unknown>(`follow-requests:${verb}`, [
    { path: `POST /users/follow-requests/{id}/${verb}/`, call: () => request("POST", `/api/v1/users/follow-requests/${id}/${verb}/`) },
    { path: `POST /auth/follow-requests/{id}/${verb}/`, call: () => request("POST", `/api/v1/auth/follow-requests/${id}/${verb}/`) },
  ]);
};

export const acceptFollowRequest = (requestId: string) => answer("accept", requestId);
export const rejectFollowRequest = (requestId: string) => answer("reject", requestId);

/** Lets other parts of the screen (the bell, the inbox) refresh when a request is answered. */
export const FOLLOW_REQUESTS_EVENT = "manygym:follow-requests";
export const followRequestsChanged = () =>
  typeof window !== "undefined" && window.dispatchEvent(new Event(FOLLOW_REQUESTS_EVENT));

// ---------------------------------------------------------------- reads

/** Followers of a user or gym. Target-specific routes first; the unified list routes are the fallback. */
export function followersOf(t: Target): Promise<unknown> {
  const attempts: Attempt<unknown>[] = t.kind === "gym"
    ? [
        { path: "GET /gyms/{gym_id}/followers/", call: () => api.gymsFollowersRetrieve(t.id) },
        { path: "GET /follow/{target_id}/", call: () => api.followRetrieve2(t.id, { target_id: t.id }) },
        { path: "GET /follows/{target_id}/", call: () => api.followsRetrieve2(t.id, { target_id: t.id }) },
        { path: "GET /follow/", call: () => api.followRetrieve({ target_id: t.id }) },
        { path: "GET /follows/", call: () => api.followsRetrieve({ target_id: t.id }) },
      ]
    : [
        { path: "GET /users/{user_id}/followers/", call: () => api.usersFollowersRetrieve(t.id) },
        { path: "GET /auth/{user_id}/followers/", call: () => api.authFollowersRetrieve(t.id) },
        { path: "GET /users/follow/", call: () => api.usersFollowRetrieve({ target_id: t.id }) },
        { path: "GET /auth/follow/", call: () => api.authFollowRetrieve({ target_id: t.id }) },
      ];
  return firstAvailable(`followers:${t.kind}`, attempts);
}

/** Who a user or gym follows. */
export function followingOf(t: Target): Promise<unknown> {
  const attempts: Attempt<unknown>[] = t.kind === "gym"
    ? [
        { path: "GET /gyms/{gym_id}/following/", call: () => api.gymsFollowingRetrieve(t.id) },
        { path: "GET /follows/{target_id}/", call: () => api.followsRetrieve2(t.id, { target_id: t.id }) },
      ]
    : [
        { path: "GET /users/{user_id}/following/", call: () => api.usersFollowingRetrieve(t.id) },
        { path: "GET /auth/{user_id}/following/", call: () => api.authFollowingRetrieve(t.id) },
      ];
  return firstAvailable(`following:${t.kind}`, attempts);
}

/** Gyms the signed-in user follows. */
export const followedGyms = () => api.gymsFollowedRetrieve();

/** Which path each follow feature resolved to — surfaced in the UI as a diagnostic. */
export const followRoutes = () => ({
  follow: resolvedPath("follow:gym", []) ?? resolvedPath("follow:user", []),
  unfollow: resolvedPath("unfollow:gym", []) ?? resolvedPath("unfollow:user", []),
});

// ---------------------------------------------------------------- people lists

/** How many rows a follow list holds, whichever of its shapes came back; null when it can't be told. */
function listSize(raw: unknown, key: "followers" | "following"): number | null {
  if (Array.isArray(raw)) return raw.length;
  const o = (raw ?? {}) as Record<string, unknown>;
  if (typeof o.count === "number") return o.count;
  for (const v of [o.results, o[key]]) if (Array.isArray(v)) return v.length;
  return null;
}

/**
 * How many followers an account has and how many accounts it follows. No endpoint reports the two numbers,
 * so they are read off the lists; either is null when its list can't be read (a private account, say).
 */
export async function followCounts(t: Target): Promise<{ followers: number | null; following: number | null }> {
  const [a, b] = await Promise.allSettled([followersOf(t), followingOf(t)]);
  return {
    followers: a.status === "fulfilled" ? listSize(a.value, "followers") : null,
    following: b.status === "fulfilled" ? listSize(b.value, "following") : null,
  };
}

export type FollowPerson = { id: string; name: string; sub: string };

/**
 * Followers of / people followed by a user or gym, as plain rows. The follow endpoints return several shapes
 * (user item, wrapped `{user}`, `{results}`); they are all read here. Gyms in a following list are left out —
 * these rows are people.
 */
export async function followPeople(t: Target, which: "followers" | "following"): Promise<FollowPerson[]> {
  const raw = await (which === "followers" ? followersOf(t) : followingOf(t));
  const o = (raw ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(raw) ? raw : Array.isArray(o.results) ? o.results : Array.isArray(o[which]) ? (o[which] as unknown[]) : [];
  const seen = new Set<string>();
  return rows.flatMap((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    if (row.gym || row.gym_id || row.target_type === "gym") return [];
    const inner = (row.user ?? row.target ?? row) as Record<string, unknown>;
    const id = String(row.user_id ?? row.target_id ?? inner.id ?? row.id ?? "");
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const name = `${String(inner.first_name ?? "")} ${String(inner.last_name ?? "")}`.trim() || String(inner.full_name ?? inner.name ?? inner.email ?? "Unknown");
    return [{ id, name, sub: String(inner.email ?? "") }];
  });
}
