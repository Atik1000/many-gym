// Studio posts (spec: "Create Posts by Gyms").
export type PostMedia = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  kind: "image" | "video";
  /** The picked file, held until the post is created and uploaded as multipart. Not persisted. */
  file?: File;
};
export type PostComment = { id: string; author: string; text: string; createdAt: string };

/**
 * Who can see a post, repost or story. A gym may use all four; a personal profile cannot use
 * `members_only` (the API rejects it with a 400).
 */
export type PostPrivacy = "public" | "followers" | "members_only" | "private";
export const PRIVACY_LABEL: Record<PostPrivacy, string> = {
  public: "Public",
  followers: "Followers",
  members_only: "Gym members only",
  private: "Private",
};
export const PRIVACY_HINT: Record<PostPrivacy, string> = {
  public: "Anyone on manygym",
  followers: "People who follow this page",
  members_only: "This gym's members and staff",
  private: "Only you and this gym's staff",
};
/** The choices to offer, by who is posting. */
export const privacyChoices = (asGym: boolean): PostPrivacy[] =>
  asGym ? ["public", "followers", "members_only", "private"] : ["public", "followers", "private"];
export const asPrivacy = (v: unknown): PostPrivacy =>
  v === "followers" || v === "private" ? v : v === "members_only" || v === "gym_members_only" ? "members_only" : "public";

export type Post = {
  id: string;
  text: string;
  /** Who wrote it. The feed previously credited every post to the gym. */
  author?: { name: string; avatarUrl: string; userId: string };
  /** `gym` when it was published on a gym's page, `user` on a personal profile. */
  ownerType?: "user" | "gym";
  /** The gym whose page this is on — absent for a personal post. */
  gym?: { id: string; name: string; avatarUrl: string };
  media: PostMedia[]; // order matters — admins can re-arrange it
  /** Full visibility. `members` below is kept in step with it for older call sites. */
  privacy?: PostPrivacy;
  /** A share of another post. `source` is that post, or null once it is deleted or hidden from this viewer. */
  isRepost?: boolean;
  source?: Post | null;
  sourceUnavailable?: boolean;
  repostsCount?: number;
  commentsCount?: number;
  /** Real reactions (lib/api/reactions.ts). Who reacted and the viewer's own reaction load on demand. */
  reactionsCount?: number;
  /** How the signed-in person relates to the post's owner — drives the badges and the Follow button. */
  followingGym?: boolean;
  followingAuthor?: boolean;
  connectedGym?: boolean;
  members: boolean; // true = "Gym members only", false = public
  pinned: boolean;
  createdAt: string; // ISO timestamp
  likes: number; // baseline likes from members
  likedBy: string[]; // admin/staff who liked it in this app
  comments: PostComment[];
};

/** A post's visibility, whichever field it was written with. */
export const privacyOf = (p: Pick<Post, "privacy" | "members">): PostPrivacy => p.privacy ?? (p.members ? "members_only" : "public");

/** "2 hours ago", "3 days ago", else a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"]];
  for (let i = units.length - 1; i >= 0; i--) {
    if (s >= units[i][0]) { const n = Math.floor(s / units[i][0]); if (i === 2 && n >= 30) break; return `${n} ${units[i][1]}${n === 1 ? "" : "s"} ago`; }
  }
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** URL-safe account handle derived from the gym's name — the "which account" part of every post link. */
export const accountSlug = (gymName: string) => gymName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "gym";
/** Unique link of a post: account + post. */
export const postPath = (account: string, postId: string) => `/studio/${account}/posts/${postId}`;
/** Unique link of one media file: account + post + media. */
export const mediaPath = (account: string, postId: string, mediaId: string) => `${postPath(account, postId)}/media/${mediaId}`;
