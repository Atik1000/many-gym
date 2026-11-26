"use client";

/**
 * The feed beyond this gym's own wall: posts from followed gyms and people, from the gyms the signed-in
 * person belongs to, and public posts from anywhere — `GET /posts/?feed_type=…` (lib/api/feed.ts).
 *
 * Pages are fetched as the reader scrolls. Nothing here is cached in the list store: it is someone else's
 * content, read-only from this screen apart from sharing, commenting and following.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LuNewspaper, LuSearch } from "react-icons/lu";
import { Reveal } from "@/components/ui/Motion";
import { EmptyState } from "@/components/ui/parts";
import { feedPage, FEED_TABS, type FeedType } from "@/lib/api/feed";
import { ApiError } from "@/lib/api/http";
import type { Post } from "@/lib/posts";
import { card, input } from "@/lib/ui";
import { PostCard } from "./Feed";

/**
 * `top`: posts the reader just published, shown first straight away. Once the feed's own copy of one loads, the
 * feed's copy is dropped so it never appears twice.
 */
export default function CommunityFeed({ feedType, top = [], onTopChange, onTopEdit, onTopDelete }: {
  feedType: FeedType;
  top?: Post[];
  onTopChange?: (p: Post) => void;
  onTopEdit?: (p: Post) => void;
  onTopDelete?: (p: Post) => void;
}) {
  const tab = FEED_TABS.find((t) => t.key === feedType) ?? FEED_TABS[0];
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0); // last page loaded; 0 = nothing yet
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  // Guards against a slow response for a previous tab/search landing after a newer one.
  const run = useRef(0);

  // Debounce typing so each keystroke isn't a request.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (next: number, fresh: boolean) => {
    const mine = ++run.current;
    setLoading(true);
    setError("");
    try {
      const res = await feedPage({ feedType, search, page: next });
      if (mine !== run.current) return;
      // The feed can shift between requests (a new post pushes one onto the next page), so drop repeats.
      setPosts((prev) => {
        if (fresh) return res.posts;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.posts.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(res.hasMore && res.posts.length > 0);
    } catch (e) {
      if (mine !== run.current) return;
      setError(e instanceof ApiError ? e.message : "Couldn't load the feed.");
      setHasMore(false);
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, [feedType, search]);

  // A new tab or search starts over from the first page.
  useEffect(() => {
    void Promise.resolve().then(() => {
      setPosts([]);
      setPage(0);
      setHasMore(true);
      return load(1, true);
    });
  }, [load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading || page === 0) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) void load(page + 1, false); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, page, load]);

  const change = (p: Post) => setPosts((l) => l.map((x) => (x.id === p.id ? p : x)));
  /** Following a gym or person from one card applies to every card of theirs on screen. */
  const followed = (target: { kind: "gym" | "user"; id: string }, following: boolean) =>
    setPosts((l) => l.map((x) =>
      target.kind === "gym" && x.gym?.id === target.id ? { ...x, followingGym: following }
        : target.kind === "user" && x.author?.userId === target.id ? { ...x, followingAuthor: following } : x));

  const first = page === 0 && loading;
  return (
    <div>
      <label className="relative mt-4 block">
        <LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" className={`${input} pl-10`} placeholder="Search posts, gyms or people…" aria-label={`Search ${tab.label}`} maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {first && <div className={`${card} mt-4 h-40 animate-pulse`} />}
      {error && (
        <div className={`${card} mt-4 p-8 text-center text-muted`}>
          <p>{error}</p>
          <button className="mt-2 font-semibold text-primary" onClick={() => void load(Math.max(1, page + (posts.length ? 1 : 0)), posts.length === 0)}>Try again</button>
        </div>
      )}
      {top.map((p) => <PostCard key={`top-${p.id}`} post={p} onChange={(n) => onTopChange?.(n)} onEdit={onTopEdit ? () => onTopEdit(p) : undefined} onDelete={onTopDelete ? () => onTopDelete(p) : undefined} />)}
      {!first && !error && posts.length === 0 && top.length === 0 && !loading && (
        <div className={`${card} mt-4 p-10 text-center text-muted`}>
          <EmptyState icon={LuNewspaper} title={search ? "No posts match" : "Nothing to show"} hint={search ? "Try a different search." : tab.empty} />
        </div>
      )}
      {posts.filter((p) => !top.some((t) => t.id === p.id)).map((p, i) => <Reveal key={p.id} index={i % 5}><PostCard post={p} onChange={change} onFollowChange={followed} /></Reveal>)}
      {hasMore && page > 0 && <div ref={sentinel} className="mt-4 h-16 animate-pulse rounded-xl border border-line bg-surface" aria-label="Loading more posts" />}
      {!hasMore && !error && posts.length > 5 && <p className="mt-6 text-center text-sm text-muted">You&apos;re all caught up</p>}
    </div>
  );
}
