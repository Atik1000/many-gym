"use client";

/**
 * Who shared a post — `GET /posts/{id}/reposts/`. The server returns only the shares this viewer is allowed
 * to see, so the list can be shorter than the post's share count (private shares, and shares to stories,
 * are counted but not listed).
 */
import { useCallback, useEffect, useState } from "react";
import { LuEyeOff, LuGlobe, LuLock, LuRepeat2, LuUsers } from "react-icons/lu";
import type { IconType } from "react-icons";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, EmptyState } from "@/components/ui/parts";
import { repostsOf } from "@/lib/api/feed";
import { ApiError } from "@/lib/api/http";
import { PRIVACY_LABEL, privacyOf, timeAgo, type Post, type PostPrivacy } from "@/lib/posts";
import { btnGhost } from "@/lib/ui";

const PRIVACY_ICON: Record<PostPrivacy, IconType> = { public: LuGlobe, followers: LuUsers, members_only: LuLock, private: LuEyeOff };

export default function RepostsModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [rows, setRows] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (next: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await repostsOf(postId, next);
      setRows((prev) => {
        if (next === 1) return res.posts;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.posts.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(res.hasMore && res.posts.length > 0);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404 ? "This post is no longer available."
          : e instanceof ApiError && e.status === 403 ? "You can\u2019t see who shared this post."
            : e instanceof ApiError ? e.message : "Couldn\u2019t load the shares.",
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void Promise.resolve().then(() => load(1));
  }, [load]);

  return (
    <Modal open title="Shared by" onClose={onClose}>
      {page === 0 && loading && <div className="h-28 animate-pulse rounded-xl bg-background" />}
      {error && (
        <p role="alert" className="text-muted">
          {error} <button className="font-semibold text-primary" onClick={() => void load(Math.max(1, page || 1))}>Try again</button>
        </p>
      )}
      {page > 0 && !error && rows.length === 0 && (
        <EmptyState icon={LuRepeat2} title="No shares to show" hint="Shares to moments and private shares are counted but not listed here." />
      )}
      {rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((r) => {
            const personal = r.ownerType === "user";
            const name = personal ? r.author?.name || "Someone" : r.gym?.name || r.author?.name || "A gym";
            const privacy = privacyOf(r);
            const Privacy = PRIVACY_ICON[privacy];
            return (
              <li key={r.id} className="flex gap-3 rounded-xl bg-background px-3 py-2.5">
                <Avatar name={name} size={40} src={(personal ? r.author?.avatarUrl : r.gym?.avatarUrl) ?? ""} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{name}</b>
                  <small className="flex flex-wrap items-center gap-x-1.5 text-muted">
                    {!personal && r.author?.name && <><span className="truncate">{r.author.name}</span> · </>}
                    {timeAgo(r.createdAt)} · <Privacy size={12} aria-hidden /> {PRIVACY_LABEL[privacy]}
                  </small>
                  {r.text && <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{r.text}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && !error && (
        <MotionButton className={`${btnGhost} w-full justify-center`} disabled={loading} onClick={() => void load(page + 1)}>
          {loading ? "Loading…" : "Load more"}
        </MotionButton>
      )}
    </Modal>
  );
}
