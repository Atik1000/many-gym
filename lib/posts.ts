// Studio posts (spec: "Create Posts by Gyms").
export type PostMedia = { id: string; url: string; kind: "image" | "video" };
export type PostComment = { id: string; author: string; text: string; createdAt: string };
export type Post = {
  id: string;
  text: string;
  media: PostMedia[]; // order matters — admins can re-arrange it
  members: boolean; // true = "Gym members only", false = public
  pinned: boolean;
  createdAt: string; // ISO timestamp
  likes: number; // baseline likes from members
  likedBy: string[]; // admin/staff who liked it in this app
  comments: PostComment[];
};

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
