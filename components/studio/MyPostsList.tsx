"use client";

/**
 * A filtered view of this page's own posts — `GET /posts/my/`. Unlike the default wall it is fetched page by
 * page with the filter applied server-side, and it includes followers-only and private posts and shares.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LuNewspaper } from "react-icons/lu";
import { Reveal } from "@/components/ui/Motion";
import { EmptyState } from "@/components/ui/parts";
import { myPosts } from "@/lib/api/feed";
import { ApiError } from "@/lib/api/http";
import type { Post, PostPrivacy } from "@/lib/posts";
import { card } from "@/lib/ui";
import { PostCard } from "./PostCard";

export default function MyPostsList({ kind, privacy, version, onEdit, onDelete }: {
  kind: "all" | "posts" | "shares";
  privacy: PostPrivacy | "any";
  /** Bumped by the parent after an edit or delete, to refetch. */
  version: number;
  onEdit?: (p: Post) => void;
  onDelete?: (p: Post) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const run = useRef(0);

  const load = useCallback(async (next: number, fresh: boolean) => {
    const mine = ++run.current;
    setLoading(true);
    setError("");
    try {
      const res = await myPosts({
        isRepost: kind === "all" ? undefined : kind === "shares",
        privacy: privacy === "any" ? undefined : privacy,
        page: next,
      });
      if (mine !== run.current) return;
      setPosts((prev) => {
        if (fresh) return res.posts;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.posts.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(res.hasMore && res.posts.length > 0);
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof ApiError && e.status === 403 ? "You don't have access to this page's full post list." : e instanceof ApiError ? e.message : "Couldn't load posts.");
      setHasMore(false);
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, [kind, privacy]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setPosts([]);
      setPage(0);
      setHasMore(true);
      return load(1, true);
    });
  }, [load, version]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || page === 0) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) void load(page + 1, false); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, page, load]);

  const change = (p: Post) => setPosts((l) => l.map((x) => (x.id === p.id ? p : x)));
  const first = page === 0 && loading;

  return (
    <div>
      {first && <div className={`${card} mt-4 h-40 animate-pulse`} />}
      {error && (
        <div className={`${card} mt-4 p-8 text-center text-muted`}>
          <p>{error}</p>
          <button className="mt-2 font-semibold text-primary" onClick={() => void load(posts.length ? page + 1 : 1, posts.length === 0)}>Try again</button>
        </div>
      )}
      {!first && !error && !loading && posts.length === 0 && (
        <div className={`${card} mt-4 p-10 text-center text-muted`}><EmptyState icon={LuNewspaper} title="Nothing matches these filters" hint="Try a different type or audience." /></div>
      )}
      {posts.map((p, i) => (
        <Reveal key={p.id} index={i % 5}>
          <PostCard post={p} onChange={change} onEdit={onEdit && (() => onEdit(p))} onDelete={onDelete && (() => onDelete(p))} />
        </Reveal>
      ))}
      {hasMore && page > 0 && <div ref={sentinel} className="mt-4 h-16 animate-pulse rounded-xl border border-line bg-surface" aria-label="Loading more posts" />}
    </div>
  );
}
