"use client";

/**
 * Moments (formerly "stories") — `/api/v1/moments/`, with the legacy `/api/v1/stories/` kept as a fallback.
 *
 * The product calls them **Moments** now; the API serves the same handlers at both prefixes. Every call tries
 * `/moments/` first and only falls back to `/stories/` when the route is absent (see `fallback.ts`), so a
 * deployment that hasn't picked up the rename still works. Type and function names keep "story" — the API's
 * own schema does (`story_id`, `StoryReply`) — while everything a person reads says "moment".
 *
 * Hand-written rather than generated: these operations are served by the live API but are newer than the
 * committed OpenAPI document that `endpoints.ts` / `types.ts` are generated from and checked against.
 *
 * Who a story belongs to is decided by the **token**, never the payload: a gym-context token makes a gym story,
 * a personal one a user story. `owner_type`, `user_id`, `gym_id` and `media_type` are read-only, so nothing here
 * sends them. (The API also accepts an `X-Gym-Context` header as a fallback; `request()` has no way to add a
 * header, and this app's gym token already carries the gym, so it is not used.)
 */
import { firstAvailable } from "./fallback";
import { ApiError, mediaUrl, request, type RequestOptions } from "./http";

export type StoryOwnerType = "user" | "gym";
export type StoryPrivacy = "public" | "followers" | "members_only" | "private";
export type StoryLifetime = 6 | 12 | 18 | 24 | 48;
export type StoryFeedType = "all" | "followed" | "connected" | "public";

export const LIFETIMES: StoryLifetime[] = [6, 12, 18, 24, 48];
export const DEFAULT_LIFETIME: StoryLifetime = 18;

export const PRIVACY_LABEL: Record<StoryPrivacy, string> = {
  public: "Public",
  followers: "Followers",
  members_only: "Gym members only",
  private: "Only me",
};

/** `members_only` is a gym-only audience; the API rejects it on a user story. */
export const privacyChoices = (owner: StoryOwnerType): StoryPrivacy[] =>
  owner === "gym" ? ["public", "followers", "members_only", "private"] : ["public", "followers", "private"];

export type StorySourcePost = {
  id: string;
  gymId: string;
  gymName: string;
  text: string;
  privacy: string;
  publishedAt: string;
};

export type Story = {
  id: string;
  ownerType: StoryOwnerType;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  gymId: string;
  gymName: string;
  gymAvatarUrl: string;
  sourcePostId: string;
  sourcePost: StorySourcePost | null;
  /** Best URL for playback (the server already prefers optimised over original). */
  mediaUrl: string;
  thumbnailUrl: string;
  kind: "image" | "video";
  processing: string;
  durationSeconds: number | null;
  caption: string;
  backgroundColor: string;
  lifetimeHours: number;
  lifetimeLabel: string;
  privacy: StoryPrivacy;
  publishedAt: string;
  expiresAt: string;
  expired: boolean;
  archived: boolean;
  views: number;
  /** `reactions_count`; the breakdown and the viewer's own reaction load on demand. */
  reactions: number;
  /** `replies_count` — messages people sent in reply. */
  replies: number;
  viewed: boolean;
};

export type StoryBucket = {
  ownerType: StoryOwnerType;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string;
  latestStoryAt: string;
  hasUnviewed: boolean;
  /** The signed-in person's own moments — the tray pins these first (`is_self`). */
  isSelf: boolean;
  stories: Story[];
};

export type StoryReply = {
  id: string;
  storyId: string;
  userId: string;
  /** Sent on behalf of a gym (by one of its staff) rather than as the person themselves. */
  asGym: boolean;
  /** The gym's name when the reply was sent as a gym, otherwise the person's. */
  name: string;
  avatarUrl: string;
  message: string;
  mediaUrl: string;
  conversationId: string;
  createdAt: string;
};

export type StoryViewer = { id: string; userId: string; name: string; avatarUrl: string; viewedAt: string };

export type Page<X> = { rows: X[]; count: number; page: number; pages: number };

// ---------------------------------------------------------------- mapping

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : Array.isArray(obj(v).results) ? (obj(v).results as unknown[]) : []);

const PRIVACIES: StoryPrivacy[] = ["public", "followers", "members_only", "private"];

export function storyFromApi(raw: unknown): Story {
  const o = obj(raw);
  const sp = o.source_post ? obj(o.source_post) : null;
  // `gym_members_only` is an accepted alias of `members_only`.
  const privacy = str(o.privacy) === "gym_members_only" ? "members_only" : (str(o.privacy) as StoryPrivacy);
  const expiresAt = str(o.expires_at);
  return {
    id: str(o.id),
    ownerType: o.owner_type === "gym" ? "gym" : "user",
    userId: str(o.user_id),
    userName: str(o.user_name),
    userAvatarUrl: mediaUrl(str(o.user_avatar_url)),
    gymId: str(o.gym_id),
    gymName: str(o.gym_name),
    gymAvatarUrl: mediaUrl(str(o.gym_avatar_url)),
    sourcePostId: str(o.source_post_id),
    sourcePost: sp
      ? {
          id: str(sp.id),
          gymId: str(sp.gym_id),
          gymName: str(sp.gym_name),
          text: str(sp.content_text),
          privacy: str(sp.privacy),
          publishedAt: str(sp.published_at),
        }
      : null,
    mediaUrl: mediaUrl(str(o.media_url) || str(o.optimized_url) || str(o.original_url)),
    thumbnailUrl: mediaUrl(str(o.thumbnail_url)),
    kind: o.media_type === "video" ? "video" : "image",
    processing: str(o.processing_status),
    durationSeconds: typeof o.duration_seconds === "number" ? o.duration_seconds : null,
    caption: str(o.caption),
    backgroundColor: str(o.background_color),
    lifetimeHours: num(o.lifetime_hours) || DEFAULT_LIFETIME,
    lifetimeLabel: str(o.lifetime_label) || `${num(o.lifetime_hours) || DEFAULT_LIFETIME} hours`,
    privacy: PRIVACIES.includes(privacy) ? privacy : "public",
    publishedAt: str(o.published_at) || str(o.created_at),
    expiresAt,
    expired: typeof o.is_expired === "boolean" ? o.is_expired : !!expiresAt && new Date(expiresAt).getTime() <= Date.now(),
    archived: !!o.is_archived,
    views: num(o.views_count),
    reactions: num(o.reactions_count),
    replies: num(o.replies_count ?? o.comments_count),
    viewed: !!o.has_viewed,
  };
}

const bucketFromApi = (raw: unknown): StoryBucket => {
  const o = obj(raw);
  const stories = list(o.stories).map(storyFromApi);
  return {
    ownerType: o.owner_type === "gym" ? "gym" : "user",
    ownerId: str(o.owner_id),
    ownerName: str(o.owner_name),
    ownerAvatarUrl: mediaUrl(str(o.owner_avatar_url)),
    latestStoryAt: str(o.latest_story_at),
    hasUnviewed: typeof o.has_unviewed === "boolean" ? o.has_unviewed : stories.some((s) => !s.viewed),
    isSelf: o.is_self === true,
    stories,
  };
};

function pageOf<X>(raw: unknown, map: (r: unknown) => X): Page<X> {
  const o = obj(raw);
  const rows = list(raw).map(map);
  return {
    rows,
    count: typeof o.count === "number" ? o.count : rows.length,
    page: typeof o.current_page === "number" ? o.current_page : 1,
    pages: typeof o.total_pages === "number" ? o.total_pages : 1,
  };
}

// ---------------------------------------------------------------- reads

const MOMENTS = "/api/v1/moments/";
const LEGACY = "/api/v1/stories/";
const enc = encodeURIComponent;

/** One operation, `/moments/<tail>` first and `/stories/<tail>` only when that route isn't served. */
const at = <T>(method: string, tail: string, opts: RequestOptions = {}) =>
  firstAvailable<T>("moments", [
    { path: `${method} /moments/${tail}`, call: () => request<T>(method, `${MOMENTS}${tail}`, opts) },
    { path: `${method} /stories/${tail}`, call: () => request<T>(method, `${LEGACY}${tail}`, opts) },
  ]);

/** `GET /stories/` — active stories the caller may see, flat. */
export const listStories = async (
  query: { owner_type?: StoryOwnerType; user_id?: string; gym_id?: string; feed_type?: StoryFeedType; privacy?: StoryPrivacy; page?: number; page_size?: number } = {},
): Promise<Page<Story>> => pageOf(await at<unknown>("GET", "", { query }), storyFromApi);

/** `GET /moments/tray/` — the caller's own moments first (`is_self`), then  owners with something unviewed, then most recent; each bucket oldest → newest. */
export const storyTray = async (query: { owner_type?: StoryOwnerType; feed_type?: StoryFeedType } = {}): Promise<StoryBucket[]> =>
  list(await at<unknown>("GET", "tray/", { query }))
    .map(bucketFromApi)
    .filter((b) => b.stories.length > 0);

/** `GET /stories/my/` — the active gym's stories under a gym token, the user's own under a personal one. */
export const myStories = async (
  query: { include_expired?: boolean; include_archived?: boolean; page?: number; page_size?: number } = {},
): Promise<Page<Story>> => pageOf(await at<unknown>("GET", "my/", { query }), storyFromApi);

/** `GET /stories/{id}/` — `markViewed` also records a view. */
export const getStory = async (id: string, markViewed = false): Promise<Story> =>
  storyFromApi(await at<unknown>("GET", `${enc(id)}/`, { query: { mark_viewed: markViewed || undefined } }));

/** `GET /stories/{id}/viewers/` — owner / managing staff only (403 otherwise). */
export const storyViewers = async (id: string, page = 1, pageSize = 20): Promise<Page<StoryViewer>> =>
  pageOf(await at<unknown>("GET", `${enc(id)}/viewers/`, { query: { page, page_size: pageSize } }), (r) => {
    const o = obj(r);
    return {
      id: str(o.id),
      userId: str(o.viewer_user_id),
      name: str(o.viewer_name) || "Someone",
      avatarUrl: mediaUrl(str(o.viewer_avatar_url)),
      viewedAt: str(o.viewed_at),
    };
  });

// ---------------------------------------------------------------- writes

export type StoryDraft = {
  /** Exactly one picture or video. The API rejects more than one. */
  file?: File;
  /** An already-hosted asset, instead of `file`. Never send both. */
  mediaUrl?: string;
  thumbnailUrl?: string;
  /** A post to share. With no `file`/`mediaUrl`, the server inherits the post's first attachment. */
  sourcePostId?: string;
  durationSeconds?: number;
  lifetimeHours?: StoryLifetime;
  privacy?: StoryPrivacy;
  caption?: string;
  backgroundColor?: string;
};

/**
 * `POST /stories/` — multipart when there is a file, JSON otherwise.
 * Only `lifetime_hours` is sent; `lifetime` is an alias and the API rejects the two disagreeing.
 */
export async function createStory(d: StoryDraft): Promise<Story> {
  const caption = d.caption?.trim();
  const fields: Record<string, string | number | undefined> = {
    source_post_id: d.sourcePostId || undefined,
    lifetime_hours: d.lifetimeHours ?? DEFAULT_LIFETIME,
    privacy: d.privacy ?? "public",
    caption: caption || undefined,
    background_color: d.backgroundColor || undefined,
    duration_seconds: d.durationSeconds !== undefined && Number.isFinite(d.durationSeconds) ? Math.max(0, Math.round(d.durationSeconds * 10) / 10) : undefined,
  };

  if (d.file) {
    const form = new FormData();
    form.append("file", d.file);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, String(v));
    return storyFromApi(await at<unknown>("POST", "", { form }));
  }
  return storyFromApi(
    await at<unknown>("POST", "", {
      body: { ...fields, media_url: d.mediaUrl || undefined, thumbnail_url: d.thumbnailUrl || undefined },
    }),
  );
}

/**
 * `POST /posts/{post_id}/repost/` with `target: "moment"` — sharing a post to a moment.
 *
 * This goes through the repost endpoint rather than `POST /stories/` so the source post's `reposts_count` is
 * incremented. JSON when the post has media (the server inherits its first attachment); multipart with a single
 * `file` when the caller attaches one because the post is text-only. The 201 body is a Story (plus `target`).
 */
export async function sharePostToStory(postId: string, d: Omit<StoryDraft, "sourcePostId" | "mediaUrl" | "thumbnailUrl">): Promise<Story> {
  const caption = d.caption?.trim();
  const fields: Record<string, string | number | undefined> = {
    target: "moment",
    lifetime_hours: d.lifetimeHours ?? DEFAULT_LIFETIME,
    privacy: d.privacy ?? "public",
    caption: caption || undefined,
    background_color: d.backgroundColor || undefined,
    duration_seconds: d.file && d.durationSeconds !== undefined && Number.isFinite(d.durationSeconds) ? Math.max(0, Math.round(d.durationSeconds * 10) / 10) : undefined,
  };
  const path = `/api/v1/posts/${encodeURIComponent(postId)}/repost/`;
  const send = (target: string) => {
    const f = { ...fields, target };
    if (!d.file) return request<unknown>("POST", path, { body: f });
    const form = new FormData();
    form.append("file", d.file);
    for (const [k, v] of Object.entries(f)) if (v !== undefined) form.append(k, String(v));
    return request<unknown>("POST", path, { form });
  };
  try {
    return storyFromApi(await send("moment"));
  } catch (e) {
    // A server that predates the rename knows only "story"; retry once if it rejected the target itself.
    if (e instanceof ApiError && e.status === 400 && e.fieldErrors().target) return storyFromApi(await send("story"));
    throw e;
  }
}

export type StoryPatch = {
  /** `null` or `""` clears it. */
  caption?: string | null;
  backgroundColor?: string | null;
  privacy?: StoryPrivacy;
  /** Recalculates `expires_at = published_at + lifetime_hours` server-side. */
  lifetimeHours?: StoryLifetime;
  archived?: boolean;
};

/** `PATCH /stories/{id}/` */
export async function updateStory(id: string, p: StoryPatch): Promise<Story> {
  const body: Record<string, unknown> = {};
  if (p.caption !== undefined) body.caption = p.caption?.trim() || null;
  if (p.backgroundColor !== undefined) body.background_color = p.backgroundColor || null;
  if (p.privacy !== undefined) body.privacy = p.privacy;
  if (p.lifetimeHours !== undefined) body.lifetime_hours = p.lifetimeHours;
  if (p.archived !== undefined) body.is_archived = p.archived;
  return storyFromApi(await at<unknown>("PATCH", `${enc(id)}/`, { body }));
}

/** `DELETE /moments/{id}/` */
export const deleteStory = (id: string) => at<{ message?: string }>("DELETE", `${enc(id)}/`);

/** `POST /moments/{id}/view/` — idempotent per viewer; self/staff views don't count. */
export const recordStoryView = (id: string) =>
  at<{ message?: string; views_count?: number; newly_viewed?: boolean }>("POST", `${enc(id)}/view/`, { body: {} });

// ---------------------------------------------------------------- replies ("send message" on a moment)

const replyFromApi = (raw: unknown): StoryReply => {
  const o = obj(raw);
  const asGym = o.owner_type === "gym";
  return {
    id: str(o.id),
    storyId: str(o.story_id),
    userId: str(o.user_id),
    asGym,
    name: (asGym && str(o.gym_name)) || str(o.user_name) || "Someone",
    avatarUrl: mediaUrl(str(asGym ? o.gym_avatar_url : o.user_avatar_url) || str(o.user_avatar_url)),
    message: str(o.message),
    mediaUrl: mediaUrl(str(o.media_url)),
    conversationId: str(o.conversation_id),
    createdAt: str(o.created_at),
  };
};

/**
 * `POST /moments/{id}/reply/` — a message to the moment's owner. The server also links it to the 1-on-1
 * conversation and notifies the owner. Only active (unexpired) moments take replies.
 */
export const replyToStory = async (id: string, message: string): Promise<StoryReply> =>
  replyFromApi(await at<unknown>("POST", `${enc(id)}/reply/`, { body: { message: message.trim().slice(0, 1000) } }));

/** `GET /moments/{id}/replies/` — the owner sees every reply; anyone else only their own. */
export const storyReplies = async (id: string, page = 1, pageSize = 20): Promise<Page<StoryReply>> =>
  pageOf(await at<unknown>("GET", `${enc(id)}/replies/`, { query: { page, page_size: pageSize } }), replyFromApi);

/** `DELETE /moments/{id}/replies/{reply_id}/` — the reply's author, the moment's owner, or managing gym staff. */
export const deleteStoryReply = (id: string, replyId: string) => at<{ message?: string }>("DELETE", `${enc(id)}/replies/${enc(replyId)}/`);

export const REPLY_MAX = 1000;

// ---------------------------------------------------------------- helpers

/** `#RGB`, `#RRGGBB` or `#RRGGBBAA` — what the API accepts for `background_color`. */
export const isHexColor = (v: string) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());

/** "3h left", "12m left", "Expired". */
export function timeLeft(expiresAt: string, now = Date.now()): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Expired";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${mins % 60 && hours < 6 ? ` ${mins % 60}m` : ""} left`;
}
