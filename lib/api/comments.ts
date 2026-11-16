"use client";

/**
 * Comments and replies on a post — `…/posts/{post_id}/comments/` and its `{comment_id}/` and `replies/` routes.
 *
 * These routes postdate the committed OpenAPI document, so they go through `request()` directly rather than
 * the generated client.
 *
 * **Who the author is comes from the token, never from the request.** `owner_type`, `user_id` and `gym_id`
 * are server-derived and are deliberately not sent. This app normally holds a gym-context token, so a comment
 * made here is authored *as the gym* (`owner_type: "gym"`, with the signed-in person as `user_id`); with a
 * personal-context token the same call is authored as the person.
 *
 * A comment carries text and/or exactly one attachment — photo, video or GIF. Text-only goes as JSON; a file
 * goes as multipart under the field that names its kind.
 */
import { mediaUrl, request } from "./http";

export type CommentMediaKind = "photo" | "video" | "gif";
export type CommentSort = "newest" | "oldest" | "most_replied";

export type CommentMedia = {
  kind: CommentMediaKind;
  /** Best URL to show: the optimised rendition once it exists. */
  url: string;
  /** What was uploaded — still usable while processing, and when optimisation failed. */
  originalUrl: string;
  thumbnailUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  durationSeconds?: number;
};

/** The API's 34-field comment, reduced to what the thread renders. Replies use the same shape recursively. */
export type Comment = {
  id: string;
  userId: string;
  ownerType: "user" | "gym";
  authorName: string;
  authorAvatarUrl: string;
  gymName: string;
  gymAvatarUrl: string;
  postId: string;
  parentId: string | null;
  /** 0 for a comment on the post, 1–10 for replies. The server refuses a reply to depth 10. */
  depth: number;
  replyToName: string;
  text: string;
  media: CommentMedia | null;
  /** Direct replies. */
  repliesCount: number;
  /** Every descendant — what a delete takes with it. */
  totalReplies: number;
  hasMoreReplies: boolean;
  replies: Comment[];
  /** `reactions_count`; the breakdown and the viewer's own reaction load on demand. */
  reactionsCount: number;
  edited: boolean;
  createdAt: string;
};

export type CommentPage = { items: Comment[]; count: number; page: number; hasNext: boolean };

export type CommentInput = {
  text?: string;
  file?: File | null;
  kind?: CommentMediaKind;
  /** Videos only. */
  durationSeconds?: number;
};

export const MAX_COMMENT_DEPTH = 10;
export const MAX_COMMENT_LENGTH = 5000;

// ---------------------------------------------------------------- mapping

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function commentFromApi(raw: unknown): Comment {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = (["photo", "video", "gif"] as const).find((k) => k === o.media_type) ?? null;
  const original = kind ? str(o[`comment_${kind}`]) : "";
  const best = str(o.media_url) || original;
  const status = (["pending", "processing", "completed", "failed"] as const).find((s) => s === o.processing_status) ?? "completed";
  return {
    id: str(o.id),
    userId: str(o.user_id),
    ownerType: o.owner_type === "gym" ? "gym" : "user",
    authorName: str(o.author_name) || "Unknown",
    authorAvatarUrl: mediaUrl(str(o.author_avatar_url)),
    gymName: str(o.gym_name),
    gymAvatarUrl: mediaUrl(str(o.gym_avatar_url)),
    postId: str(o.source_post_id),
    parentId: str(o.source_comment_id) || null,
    depth: num(o.depth),
    replyToName: str(o.reply_to_user_name),
    text: str(o.comment_text),
    media:
      kind && best
        ? {
            kind,
            url: mediaUrl(best),
            originalUrl: mediaUrl(original || best),
            thumbnailUrl: mediaUrl(str(o.thumbnail_url)),
            status,
            durationSeconds: typeof o.duration_seconds === "number" ? o.duration_seconds : undefined,
          }
        : null,
    repliesCount: num(o.replies_count),
    totalReplies: num(o.total_replies_count),
    hasMoreReplies: o.has_more_replies === true,
    replies: Array.isArray(o.replies) ? o.replies.map(commentFromApi).filter((c) => c.id) : [],
    reactionsCount: num(o.reactions_count),
    edited: o.is_edited === true,
    createdAt: str(o.created_at),
  };
}

/** The list routes are documented as the paginated envelope; a bare array is tolerated. */
function pageFromApi(raw: unknown, asked: number): CommentPage {
  if (Array.isArray(raw)) {
    const items = raw.map(commentFromApi).filter((c) => c.id);
    return { items, count: items.length, page: asked, hasNext: false };
  }
  const o = (raw ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(o.results) ? o.results : []).map(commentFromApi).filter((c) => c.id);
  const page = num(o.current_page) || asked;
  const totalPages = num(o.total_pages);
  return {
    items,
    count: typeof o.count === "number" ? o.count : items.length,
    page,
    hasNext: totalPages ? page < totalPages : !!o.next,
  };
}

// ---------------------------------------------------------------- routes

const base = (postId: string) => `/api/v1/posts/${encodeURIComponent(postId)}/comments/`;
const one = (postId: string, commentId: string) => `${base(postId)}${encodeURIComponent(commentId)}/`;

const FILE_FIELD: Record<CommentMediaKind, string> = {
  photo: "comment_photo",
  video: "comment_video",
  gif: "comment_gif",
};

/** JSON for text-only; multipart, with the one file under its kind's field, when there is an attachment. */
function payload(input: CommentInput): { body?: unknown; form?: FormData } {
  const text = input.text?.trim() ?? "";
  if (!input.file) return { body: { comment_text: text } };
  const form = new FormData();
  if (text) form.append("comment_text", text);
  form.append(FILE_FIELD[input.kind ?? "photo"], input.file);
  if (input.kind === "video" && input.durationSeconds !== undefined && Number.isFinite(input.durationSeconds)) {
    form.append("duration_seconds", String(Math.max(0, Math.round(input.durationSeconds * 10) / 10)));
  }
  return { form };
}

export type ListOptions = {
  sort?: CommentSort;
  replySort?: CommentSort;
  /** Embedded reply previews per comment (0–10) and how many levels deep (0–5). */
  repliesLimit?: number;
  replyDepth?: number;
  page?: number;
  pageSize?: number;
};

const listQuery = (o: ListOptions) => ({
  sort: o.sort,
  reply_sort: o.replySort ?? "oldest",
  include_replies: true,
  replies_limit: o.repliesLimit ?? 2,
  reply_depth: o.replyDepth ?? 2,
  page: o.page ?? 1,
  page_size: o.pageSize ?? 10,
});

/**
 * `GET /posts/{post_id}/comments/{comment_id}/` — one comment with a fresh preview of its replies and its
 * current counts.
 */
export const getComment = async (postId: string, commentId: string, o: ListOptions = {}): Promise<Comment> => {
  const { include_replies, replies_limit, reply_depth, reply_sort } = listQuery(o);
  return commentFromApi(await request<unknown>("GET", one(postId, commentId), { query: { include_replies, replies_limit, reply_depth, reply_sort } }));
};

/** `GET /posts/{post_id}/comments/` — top-level comments, each with a preview of its replies. */
export const listComments = async (postId: string, o: ListOptions = {}): Promise<CommentPage> =>
  pageFromApi(await request<unknown>("GET", base(postId), { query: listQuery(o) }), o.page ?? 1);

/** `GET /posts/{post_id}/comments/{comment_id}/replies/` — the direct replies to one comment, oldest first. */
export const listReplies = async (postId: string, commentId: string, o: ListOptions = {}): Promise<CommentPage> =>
  pageFromApi(
    await request<unknown>("GET", `${one(postId, commentId)}replies/`, { query: listQuery({ sort: "oldest", ...o }) }),
    o.page ?? 1,
  );

/** `POST /posts/{post_id}/comments/` — a comment on the post. */
export const createComment = async (postId: string, input: CommentInput): Promise<Comment> =>
  commentFromApi(await request<unknown>("POST", base(postId), payload(input)));

/** `POST /posts/{post_id}/comments/{comment_id}/replies/` — a reply to a comment (or to another reply). */
export const replyToComment = async (postId: string, commentId: string, input: CommentInput): Promise<Comment> =>
  commentFromApi(await request<unknown>("POST", `${one(postId, commentId)}replies/`, payload(input)));

/**
 * `PATCH /posts/{post_id}/comments/{comment_id}/` — edit the text and/or drop the attachment. Omitted fields
 * are left alone; the server refuses an edit that would leave neither text nor media.
 */
export const updateComment = async (
  postId: string,
  commentId: string,
  patch: { text?: string | null; removeMedia?: boolean },
): Promise<Comment> => {
  const body: Record<string, unknown> = {};
  if (patch.text !== undefined) body.comment_text = patch.text?.trim() || null;
  if (patch.removeMedia) body.remove_media = true;
  return commentFromApi(await request<unknown>("PATCH", one(postId, commentId), { body }));
};

/** `DELETE /posts/{post_id}/comments/{comment_id}/` — removes the comment and every reply under it. */
export const deleteComment = async (postId: string, commentId: string): Promise<{ deletedCount: number }> => {
  const r = (await request<unknown>("DELETE", one(postId, commentId))) as { deleted_count?: unknown } | null;
  return { deletedCount: typeof r?.deleted_count === "number" && r.deleted_count > 0 ? r.deleted_count : 1 };
};
