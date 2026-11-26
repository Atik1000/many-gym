"use client";

/**
 * The Moments tray at the top of the Studio feed — `GET /moments/tray/`.
 *
 * One ring per owner (a gym or a person), in the order the server returns them. The server pins the signed-in
 * owner's own active moments first (`is_self`), so there is no separate "My Moments" list: your ring is the
 * first one, with a + to add another. Opening a ring plays that owner's moments and carries on into the next
 * owner's. Editing, viewers, replies and deleting all live in the viewer on your own ring.
 *
 * Who may add a moment: the API gates gym moments on `stories:manage` / `posts:manage`, neither of which is in
 * the scope vocabulary this app's tokens carry, so the tray uses the same gate as the post composer
 * ("Edit studio information" → `studio:manage`). That mapping is an assumption; the server has the final say.
 */
import { useCallback, useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { storyTray, type Story, type StoryBucket } from "@/lib/api/stories";
import { card } from "@/lib/ui";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

/** Applies a change to every moment in the tray; returning null drops it, and an emptied owner goes too. */
const mapStories = (list: StoryBucket[] | null, fn: (s: Story) => Story | null): StoryBucket[] =>
  (list ?? [])
    .map((b) => {
      const stories = b.stories.map(fn).filter((s): s is Story => !!s);
      return { ...b, stories, hasUnviewed: stories.some((s) => !s.viewed) };
    })
    .filter((b) => b.stories.length > 0);

export default function Stories() {
  const { can, user, me } = useAuth();
  // Read context from AuthProvider rather than directly from the token store: this rerenders and reloads the
  // tray immediately when the account menu swaps between the personal profile and a gym.
  const gymId = me?.gymId ?? null;
  const canPost = gymId ? can("Edit studio information") : !!user;
  const [buckets, setBuckets] = useState<StoryBucket[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setBuckets(await storyTray());
      setFailed(false);
    } catch {
      // The tray is an extra on this page — fail quietly with a retry rather than a toast on every visit.
      setBuckets((b) => b ?? []);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [gymId, load]);

  /** A gym's moments are managed by its staff; a person's by that person. */
  const canManage = useCallback(
    (s: Story) => (s.ownerType === "gym" ? !!gymId && s.gymId === gymId && can("Edit studio information") : !!user && s.userId === user.id),
    [gymId, can, user],
  );

  const onViewed = useCallback((id: string) => setBuckets((l) => mapStories(l, (s) => (s.id === id ? { ...s, viewed: true } : s))), []);
  // An archived or expired moment leaves the tray; anything else is updated in place.
  const onChanged = useCallback((next: Story) => setBuckets((l) => mapStories(l, (s) => (s.id === next.id ? (next.archived || next.expired ? null : next) : s))), []);
  const onDeleted = useCallback((id: string) => setBuckets((l) => mapStories(l, (s) => (s.id === id ? null : s))), []);
  const closeViewer = useCallback(() => setPlaying(null), []);

  if (buckets === null) {
    return (
      <div className={`${card} flex gap-4 overflow-hidden p-4`} aria-label="Loading moments">
        {[0, 1, 2, 3].map((n) => <span key={n} className="h-[64px] w-[64px] shrink-0 animate-pulse rounded-full bg-background" />)}
      </div>
    );
  }
  if (!canPost && buckets.length === 0 && !failed) return null;

  const tile = "flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-4 focus-visible:ring-primary/25";
  const ownIndex = buckets.findIndex((b) => b.isSelf);
  // Sits on the lower-right of the 64px ring (the tile is 76px wide with 4px padding).
  const plus = "absolute left-[50px] top-[46px] grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-primary text-white shadow";

  return (
    <section className={`${card} p-4`} aria-label="Moments">
      <h3 className="mb-2 text-base font-bold">Moments</h3>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {/* No moment of your own yet: an "Add moment" tile in its place. */}
        {canPost && ownIndex < 0 && (
          <button type="button" className={tile} onClick={() => setComposing(true)}>
            <span className="relative grid h-[64px] w-[64px] place-items-center rounded-full border-2 border-dashed border-primary/50 bg-primary-50 text-primary"><LuPlus size={24} /></span>
            <span className="w-full truncate text-xs font-semibold">Add</span>
          </button>
        )}
        {buckets.map((b, n) => {
          const own = n === ownIndex;
          return (
            <div key={`${b.ownerType}-${b.ownerId}`} className="relative shrink-0">
              <button type="button" className={tile} onClick={() => setPlaying(n)}
                aria-label={`${own ? "Your moments" : b.ownerName}: ${b.stories.length} moment${b.stories.length === 1 ? "" : "s"}${b.hasUnviewed && !own ? ", new" : ""}`}>
                <span className={`grid h-[64px] w-[64px] place-items-center rounded-full p-[3px] ${b.hasUnviewed && !own ? "bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-primary" : "bg-line"}`}>
                  <span className="grid h-full w-full place-items-center rounded-full bg-surface p-[2px]"><Avatar name={b.ownerName} size={52} src={b.ownerAvatarUrl} /></span>
                </span>
                <span className={`w-full truncate text-xs ${own || b.hasUnviewed ? "font-semibold" : "text-muted"}`}>{own ? "You" : b.ownerName}</span>
              </button>
              {/* Your ring plays your moments; its + adds another. */}
              {own && canPost && (
                <button type="button" aria-label="Add a moment" title="Add a moment" onClick={() => setComposing(true)}
                  className={`${plus} outline-none focus-visible:ring-4 focus-visible:ring-primary/30`}>
                  <LuPlus size={14} />
                </button>
              )}
            </div>
          );
        })}
        {failed && <p className="self-center px-2 text-[13px] text-muted">Couldn&apos;t load moments. <button type="button" className="font-semibold text-primary" onClick={() => void load()}>Retry</button></p>}
      </div>

      {composing && <StoryComposer onClose={() => setComposing(false)} onCreated={() => void load()} />}
      {playing !== null && buckets[playing] && (
        <StoryViewer buckets={buckets} start={playing} canManage={canManage} onClose={closeViewer} onViewed={onViewed} onChanged={onChanged} onDeleted={onDeleted} />
      )}
    </section>
  );
}
