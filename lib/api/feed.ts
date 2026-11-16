"use client";

/**
 * The community feed and reposts.
 *
 * `GET /posts/` without a `gym_id` is the signed-in person's feed across every gym and profile, narrowed by
 * `feed_type`; with a `gym_id` it is that one gym's wall (lib/api/adapters.ts `posts.list`, used by the
 * Studio's own tab). `POST /posts/{id}/repost/` shares a post onto the actor's own page.
 *
 * These parameters and routes postdate the committed OpenAPI document, so they go through `request()`
 * directly rather than the generated client.
 */
import { postFromApi } from "./adapters";
import { request } from "./http";
import type { Post, PostPrivacy } from "../posts";
import type * as T from "./types";

export const FEED_TABS = [
  { key: "all", label: "For you", empty: "Nothing here yet. Follow gyms and people to fill your feed." },
  { key: "followed", label: "Following", empty: "No posts from the gyms and people you follow yet." },
  { key: "connected", label: "My gyms", empty: "No posts from the gyms you belong to yet." },
  { key: "public", label: "Explore", empty: "No public posts to show." },
] as const;
export type FeedType = (typeof FEED_TABS)[number]["key"];

export type FeedPage = { posts: Post[]; total: number; hasMore: boolean };

type Envelope = { count?: number; next?: string | null; total_pages?: number; current_page?: number; results?: unknown[] };

/** One page of the feed. `search` matches post text, the author and the gym name. */
export async function feedPage(opts: { feedType: FeedType; search?: string; page?: number; pageSize?: number; signal?: AbortSignal }): Promise<FeedPage> {
  const page = opts.page ?? 1;
  const raw = await request<Envelope | unknown[]>("GET", "/api/v1/posts/", {
    query: { feed_type: opts.feedType, search: opts.search?.trim().slice(0, 200) || undefined, page, page_size: opts.pageSize ?? 10 },
    signal: opts.signal,
  });
  return toPage(raw, page);
}

function toPage(raw: Envelope | unknown[] | null, page: number): FeedPage {
  // Older deployments answered with a bare array; current ones paginate.
  const env: Envelope = Array.isArray(raw) ? { results: raw, count: raw.length } : (raw ?? {});
  const posts = (env.results ?? []).map((r) => postFromApi(r as T.GymPostList));
  const hasMore = env.next != null ? !!env.next : (env.total_pages ?? 1) > (env.current_page ?? page);
  return { posts, total: env.count ?? posts.length, hasMore };
}

/**
 * Everything on the actor's own page — `GET /posts/my/`. In gym context that is the gym's posts *and* shares at
 * every privacy level, including followers-only and private ones (staff/owner only; 403 otherwise); in
 * personal context it is the signed-in person's own.
 */
export async function myPosts(opts: { privacy?: PostPrivacy; isRepost?: boolean; search?: string; page?: number; pageSize?: number; signal?: AbortSignal } = {}): Promise<FeedPage> {
  const page = opts.page ?? 1;
  const raw = await request<Envelope | unknown[]>("GET", "/api/v1/posts/my/", {
    query: { privacy: opts.privacy, is_repost: opts.isRepost, search: opts.search?.trim().slice(0, 200) || undefined, page, page_size: opts.pageSize ?? 10 },
    signal: opts.signal,
  });
  return toPage(raw, page);
}

/** Who shared a post onto their page — `GET /posts/{id}/reposts/`. Only the shares this viewer may see. */
export async function repostsOf(postId: string, page = 1, pageSize = 10): Promise<FeedPage> {
  const raw = await request<Envelope | unknown[]>("GET", `/api/v1/posts/${encodeURIComponent(postId)}/reposts/`, {
    query: { page, page_size: pageSize },
  });
  return toPage(raw, page);
}

/**
 * "Share on my profile": a repost on the actor's own page — the gym's while the token is in gym context,
 * the person's otherwise. `text` is optional commentary shown above the original.
 */
export async function repostToProfile(postId: string, opts: { privacy: PostPrivacy; text?: string }): Promise<Post> {
  const raw = await request<T.GymPostDetail>("POST", `/api/v1/posts/${encodeURIComponent(postId)}/repost/`, {
    body: { target: "profile", privacy: opts.privacy, content_text: opts.text?.trim() || undefined },
  });
  return postFromApi(raw);
}
