"use client";

/**
 * The follow feature, across every path the API publishes it at.
 *
 * The schema exposes 23 operations for what is one capability: `/follow/`, `/follows/`, `/users/follow/` and
 * `/auth/follow/` (each with and without `{target_id}`), plus `/users/{id}/follow/`, `/auth/{id}/follow/` and
 * `/gyms/{id}/follow/`. Nothing says which is canonical, so each function here lists them in preference order
 * and `firstAvailable` settles on whichever the deployment actually serves.
 *
 * Preference order is deliberate: the unified `POST /follow/` first, because it is the only write route that
 * takes both a target id and an `action`, then the target-in-path variants, then the prefix aliases. The bare
 * `DELETE` routes come last — as published they accept no body and no parameters, so they cannot name a target
 * (known-issues #15) and are only reachable as a last resort.
 */
import * as api from "./endpoints";
import { firstAvailable, resolvedPath, type Attempt } from "./fallback";
import type * as T from "./types";

export type Target = { id: string; kind: "user" | "gym" };

/**
 * The follow routes don't agree on a response shape — `FollowActionResponse`, `GymFollowActionResponse` and
 * `UserFollowActionResponse` all differ — and a caller only needs to know what happened, so results are
 * normalised to this.
 */
export type FollowResult = { message: string; following: boolean | null };

const normalise = (raw: unknown, fallbackFollowing: boolean): FollowResult => {
  const o = (raw ?? {}) as Record<string, unknown>;
  const flag = [o.is_following, o.following, o.followed].find((v) => typeof v === "boolean");
  return {
    message: typeof o.message === "string" ? o.message : "",
    following: typeof flag === "boolean" ? flag : fallbackFollowing,
  };
};

const body = (t: Target, action: "follow" | "unfollow"): T.FollowActionRequest => ({
  target_id: t.id,
  id: t.id,
  target_type: t.kind as never,
  action,
});

// ---------------------------------------------------------------- writes

export async function follow(t: Target): Promise<FollowResult> {
  const b = body(t, "follow");
  const attempts: Attempt<unknown>[] = [
    { path: "POST /follow/", call: () => api.followCreate(b) },
    { path: "POST /follow/{target_id}/", call: () => api.followCreate2(t.id, b) },
    { path: "POST /follows/", call: () => api.followsCreate(b) },
    { path: "POST /follows/{target_id}/", call: () => api.followsCreate2(t.id, b) },
    { path: "POST /users/follow/", call: () => api.usersFollowCreate(b) },
    { path: "POST /auth/follow/", call: () => api.authFollowCreate(b) },
    ...(t.kind === "gym"
      ? [{ path: "POST /gyms/{gym_id}/follow/", call: () => api.gymsFollowCreate(t.id) }]
      : [
          { path: "POST /users/{user_id}/follow/", call: () => api.usersFollowCreate2(t.id) },
          { path: "POST /auth/{user_id}/follow/", call: () => api.authFollowCreate2(t.id) },
        ]),
  ];
  return normalise(await firstAvailable(`follow:${t.kind}`, attempts), true);
}

export async function unfollow(t: Target): Promise<FollowResult> {
  const b = body(t, "unfollow");
  const attempts: Attempt<unknown>[] = [
    // The unified POST carries an action, so it can always identify the target.
    { path: "POST /follow/ (action: unfollow)", call: () => api.followCreate(b) },
    { path: "DELETE /follow/{target_id}/", call: () => api.followDestroy2(t.id) },
    { path: "DELETE /follows/{target_id}/", call: () => api.followsDestroy2(t.id) },
    ...(t.kind === "gym"
      ? [{ path: "DELETE /gyms/{gym_id}/follow/", call: () => api.gymsFollowDestroy(t.id) }]
      : [
          { path: "DELETE /users/{user_id}/follow/", call: () => api.usersFollowDestroy2(t.id) },
          { path: "DELETE /auth/{user_id}/follow/", call: () => api.authFollowDestroy2(t.id) },
        ]),
    // Last resort: these take no body and no parameters, so they can only act on an implied target.
    { path: "DELETE /follow/", call: () => api.followDestroy() },
    { path: "DELETE /follows/", call: () => api.followsDestroy() },
    { path: "DELETE /users/follow/", call: () => api.usersFollowDestroy() },
    { path: "DELETE /auth/follow/", call: () => api.authFollowDestroy() },
  ];
  return normalise(await firstAvailable(`unfollow:${t.kind}`, attempts), false);
}

export const setFollowing = (t: Target, following: boolean) => (following ? follow(t) : unfollow(t));

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
