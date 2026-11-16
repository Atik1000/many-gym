"use client";

/**
 * Personal (per-user) settings — display, audience and blocking.
 *
 * `GET/PATCH /users/settings/`, `GET/POST /users/settings/blocked-users/`,
 * `GET /users/settings/blocked-users/search/`, `DELETE /users/settings/blocked-users/{user_id}/` and
 * `POST /users/followers/{user_id}/block/`.
 *
 * Hand-written on purpose: these operations are served by the live API but are newer than the committed
 * OpenAPI document that `endpoints.ts` is generated from and checked against, so they call `request()` directly.
 */
import { firstAvailable } from "./fallback";
import { request } from "./http";

export type WhoCanFollow = "everyone" | "friends_of_friends";
export type WhoCanSee = "everyone" | "followers" | "private";
export type WhoCanMessage = "everyone" | "followers" | "no_one";

export interface UserSetting {
  id: string;
  user_id: string;
  language: string;
  video_autoplay: boolean;
  dark_mode: boolean;
  is_private: boolean;
  require_follow_approval: boolean;
  who_can_follow: WhoCanFollow;
  /** Read-only mirror of `who_can_follow`. */
  who_can_follow_me: WhoCanFollow;
  who_can_message: WhoCanMessage;
  who_can_see_followers: WhoCanSee;
  who_can_see_following: WhoCanSee;
  is_deactivated: boolean;
  deactivated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserSettingPatch = Partial<
  Pick<
    UserSetting,
    | "language"
    | "video_autoplay"
    | "dark_mode"
    | "is_private"
    | "require_follow_approval"
    | "who_can_follow"
    | "who_can_message"
    | "who_can_see_followers"
    | "who_can_see_following"
  >
>;

export interface BlockedUser {
  /** Id of the block entry — not the person. Unblocking takes `user_id`. */
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  reason: string;
  created_at: string;
}

export interface UserToBlock {
  /** The person's user id. */
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

const BASE = "/api/v1/users/settings";
const enc = encodeURIComponent;

export const getUserSettings = () => request<UserSetting>("GET", `${BASE}/`);

/** Send only what changed; the response is the whole settings record. */
export const patchUserSettings = (body: UserSettingPatch) => request<UserSetting>("PATCH", `${BASE}/`, { body });

export const listBlockedUsers = () => request<BlockedUser[]>("GET", `${BASE}/blocked-users/`);

/** Matches first name, last name or email; the server already leaves out you and anyone you've blocked. */
export const searchUsersToBlock = (q: string, signal?: AbortSignal) =>
  request<UserToBlock[]>("GET", `${BASE}/blocked-users/search/`, { query: { q }, signal });

export const blockUser = (userId: string, reason?: string) =>
  request<BlockedUser>("POST", `${BASE}/blocked-users/`, { body: { user_id: userId, ...(reason ? { reason } : {}) } });

export const unblockUser = (userId: string) =>
  request<{ message: string }>("DELETE", `${BASE}/blocked-users/${enc(userId)}/`);

/**
 * Blocks one of your followers and removes them from your followers list in the same call.
 * Published at three paths; the guide names the first as canonical and the others as aliases.
 */
export const blockFollower = (userId: string, reason?: string) => {
  const body = reason ? { reason } : {};
  return firstAvailable<{ message: string }>("user:block-follower", [
    { path: "POST /users/followers/{user_id}/block/", call: () => request("POST", `/api/v1/users/followers/${enc(userId)}/block/`, { body }) },
    { path: "POST /users/settings/followers/{user_id}/block/", call: () => request("POST", `${BASE}/followers/${enc(userId)}/block/`, { body }) },
    { path: "POST /users/settings/blocked-users/followers/{user_id}/", call: () => request("POST", `${BASE}/blocked-users/followers/${enc(userId)}/`, { body }) },
  ]);
};
