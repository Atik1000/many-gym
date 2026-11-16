"use client";

/**
 * Full-screen story playback.
 *
 * Plays one owner's stories oldest → newest, then moves on to the next owner. Pictures hold for five seconds;
 * videos run to their end. Tap the left or right side (or ← / →) to move, hold to pause, Esc to close.
 * Each story is reported as viewed once per session (`POST /stories/{id}/view/`) when it is actually shown.
 */
import { useEffect, useRef, useState } from "react";
import { LuEye, LuGlobe, LuLock, LuNewspaper, LuPencil, LuTrash2, LuUsers, LuX } from "react-icons/lu";
import { Avatar, ConfirmModal } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { PRIVACY_LABEL, deleteStory, recordStoryView, timeLeft, type Story, type StoryBucket } from "@/lib/api/stories";
import { timeAgo } from "@/lib/posts";
import Reactions from "./Reactions";
import { StoryEditModal, StoryViewersModal } from "./StoryManage";

const IMAGE_MS = 5000;
/** A press shorter than this is a tap (navigate); longer is a hold (pause only). */
const TAP_MS = 250;

/** Stories already reported as viewed in this session, so moving back and forth doesn't re-post. */
const reported = new Set<string>();

const firstUnviewed = (b: StoryBucket | undefined) => Math.max(0, b ? b.stories.findIndex((s) => !s.viewed) : 0);

export default function StoryViewer({ buckets, start, canManage, onClose, onViewed, onChanged, onDeleted }: {
  buckets: StoryBucket[];
  start: number;
  canManage: (s: Story) => boolean;
  onClose: () => void;
  onViewed: (id: string) => void;
  onChanged: (s: Story) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [pos, setPos] = useState(() => ({ b: start, i: firstUnviewed(buckets[start]) }));
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sub, setSub] = useState<null | "edit" | "viewers" | "delete">(null);

  const bucket = buckets[pos.b];
  const story = bucket?.stories[Math.min(pos.i, (bucket?.stories.length ?? 1) - 1)];
  const index = bucket && story ? bucket.stories.indexOf(story) : 0;
  // The reaction picker or the who-reacted list is open: hold the story, and leave the keyboard to it.
  const [reacting, setReacting] = useState(false);
  const running = !held && !hidden && !sub && !reacting;

  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const timedId = useRef("");
  const videoFailed = useRef(false);
  const pressedAt = useRef(0);

  const next = () => {
    if (!bucket) return onClose();
    if (index < bucket.stories.length - 1) setPos({ b: pos.b, i: index + 1 });
    else if (pos.b < buckets.length - 1) setPos({ b: pos.b + 1, i: firstUnviewed(buckets[pos.b + 1]) });
    else onClose();
  };
  const prev = () => {
    if (index > 0) return setPos({ b: pos.b, i: index - 1 });
    if (pos.b > 0) return setPos({ b: pos.b - 1, i: Math.max(0, buckets[pos.b - 1].stories.length - 1) });
    // Already at the very first story: start it again.
    elapsed.current = 0;
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  // The timer and key handlers outlive a render, so they call through refs to the latest closures.
  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => { nextRef.current = next; prevRef.current = prev; });

  // Nothing left to show (the last story was removed underneath us).
  useEffect(() => {
    if (!story) void Promise.resolve().then(onClose);
  }, [story, onClose]);

  // Report the view once, when the story is on screen.
  const storyId = story?.id ?? "";
  const alreadyViewed = story?.viewed ?? true;
  useEffect(() => {
    if (!storyId) return;
    if (!reported.has(storyId)) {
      reported.add(storyId);
      void recordStoryView(storyId).catch(() => { /* a missed view isn't worth interrupting playback for */ });
    }
    if (!alreadyViewed) void Promise.resolve().then(() => onViewed(storyId));
  }, [storyId, alreadyViewed, onViewed]);

  // Pause when the tab is in the background.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ← / → / Esc. While an edit/viewers/delete dialog is open, it owns the keyboard.
  useEffect(() => {
    if (sub || reacting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") nextRef.current();
      else if (e.key === "ArrowLeft") prevRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sub, reacting, onClose]);

  // Progress. Pictures run on a clock; a video's own playhead is the progress and its `ended` advances.
  const kind = story?.kind;
  useEffect(() => {
    if (!storyId) return;
    if (timedId.current !== storyId) {
      timedId.current = storyId;
      elapsed.current = 0;
      videoFailed.current = false;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const paint = (frac: number) => {
      // With reduced motion the active segment is simply shown as current rather than animated.
      if (barRef.current) barRef.current.style.width = reduced ? "100%" : `${Math.min(100, Math.max(0, frac * 100))}%`;
    };
    const v = videoRef.current;
    if (kind === "video" && v) {
      if (running) v.play().catch(() => { v.muted = true; v.play().catch(() => { videoFailed.current = true; }); });
      else v.pause();
    }
    if (!running) {
      paint(kind === "video" && v && v.duration > 0 && !videoFailed.current ? v.currentTime / v.duration : elapsed.current / IMAGE_MS);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const vid = videoRef.current;
      if (kind === "video" && !videoFailed.current) {
        // Until metadata arrives there is no duration; the bar waits at the start.
        paint(vid && Number.isFinite(vid.duration) && vid.duration > 0 ? vid.currentTime / vid.duration : 0);
      } else {
        elapsed.current += dt;
        paint(elapsed.current / IMAGE_MS);
        if (elapsed.current >= IMAGE_MS) return nextRef.current();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [storyId, kind, running]);

  if (!bucket || !story) return null;

  const manage = canManage(story);
  const press = () => { pressedAt.current = performance.now(); setHeld(true); };
  const release = (go?: () => void) => {
    const quick = performance.now() - pressedAt.current < TAP_MS;
    setHeld(false);
    if (go && quick) go();
  };
  const zone = "absolute inset-y-0 z-10 cursor-pointer select-none outline-none [-webkit-tap-highlight-color:transparent]";
  const chip = "inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur";

  const remove = async () => {
    setSub(null);
    try {
      await deleteStory(story.id);
      toast("Story deleted");
      onDeleted(story.id);
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete that story.");
    }
  };

  return (
    <>
      <div role="dialog" aria-modal aria-label={`Stories from ${bucket.ownerName}`} className="fixed inset-0 z-40 grid place-items-center bg-black/90 p-0 sm:p-5"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative h-full max-h-[100dvh] w-full overflow-hidden bg-[#111827] sm:aspect-[9/16] sm:h-[min(92vh,820px)] sm:w-auto sm:rounded-2xl" style={{ background: story.backgroundColor || "#111827" }}>
          {/* media, letterboxed over the story's background colour */}
          {story.kind === "video" ? (
            <video key={story.id} ref={videoRef} src={story.mediaUrl} poster={story.thumbnailUrl || undefined} playsInline preload="auto"
              className="h-full w-full object-contain" onEnded={() => nextRef.current()} onError={() => { videoFailed.current = true; }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={story.id} src={story.mediaUrl} alt={story.caption || `Story from ${bucket.ownerName}`} className="h-full w-full object-contain" draggable={false} />
          )}

          {/* tap zones: left third goes back, the rest goes forward; holding either pauses */}
          <button type="button" aria-label="Previous story" className={`${zone} left-0 w-1/3`} onPointerDown={press} onPointerUp={() => release(prev)} onPointerLeave={() => setHeld(false)} onPointerCancel={() => setHeld(false)} onContextMenu={(e) => e.preventDefault()} />
          <button type="button" aria-label="Next story" className={`${zone} right-0 w-2/3`} onPointerDown={press} onPointerUp={() => release(next)} onPointerLeave={() => setHeld(false)} onPointerCancel={() => setHeld(false)} onContextMenu={(e) => e.preventDefault()} />

          {/* top: progress + owner */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/65 to-transparent px-3 pb-8 pt-3 text-white">
            <div className="flex gap-1" aria-hidden>
              {bucket.stories.map((s, n) => (
                <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                  <span key={n < index ? "done" : n === index ? "now" : "todo"} ref={n === index ? barRef : undefined} className="block h-full bg-white" style={{ width: n < index ? "100%" : "0%" }} />
                </span>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <Avatar name={bucket.ownerName} size={36} src={bucket.ownerAvatarUrl} />
              <div className="min-w-0 flex-1 leading-tight">
                <b className="block truncate">{bucket.ownerName}</b>
                <small className="block truncate text-white/80">
                  {story.ownerType === "gym" && story.userName ? `${story.userName} · ` : ""}{timeAgo(story.publishedAt)}{story.expiresAt ? ` · ${timeLeft(story.expiresAt)}` : ""}
                </small>
              </div>
              <span className={chip}>{story.privacy === "public" ? <LuGlobe size={12} /> : story.privacy === "followers" ? <LuUsers size={12} /> : <LuLock size={12} />}{PRIVACY_LABEL[story.privacy]}</span>
              <button type="button" aria-label="Close stories" onClick={onClose} className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><LuX size={18} /></button>
            </div>
            <span className="sr-only" aria-live="polite">Story {index + 1} of {bucket.stories.length}{held ? ", paused" : ""}</span>
          </div>

          {/* bottom: source post, caption, reactions, owner tools */}
          {(
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-10 text-white">
              {story.sourcePost && (
                <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/85"><LuNewspaper size={12} />From a post{story.sourcePost.gymName ? ` · ${story.sourcePost.gymName}` : ""}</span>
                  {story.sourcePost.text && <p className="line-clamp-2 text-[13px]">{story.sourcePost.text}</p>}
                </div>
              )}
              {story.caption && <p className="whitespace-pre-wrap text-[15px] [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">{story.caption}</p>}
              <div className="pointer-events-auto self-start rounded-full bg-white/15 px-3 py-1.5 text-[13px] backdrop-blur">
                <Reactions key={story.id} target={{ kind: "story", id: story.id }} count={story.reactions} tone="dark" onOpenChange={setReacting} />
              </div>
              {manage && (
                <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                  <button type="button" className={chip} onClick={() => setSub("viewers")}><LuEye size={13} />{story.views} view{story.views === 1 ? "" : "s"}</button>
                  {story.archived && <span className={chip}>Archived</span>}
                  <span className="flex-1" />
                  <button type="button" className={chip} onClick={() => setSub("edit")}><LuPencil size={13} />Edit</button>
                  <button type="button" className={chip} onClick={() => setSub("delete")}><LuTrash2 size={13} />Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {sub === "edit" && <StoryEditModal story={story} onClose={() => setSub(null)} onSaved={onChanged} />}
      {sub === "viewers" && <StoryViewersModal story={story} onClose={() => setSub(null)} />}
      <ConfirmModal open={sub === "delete"} title="Delete story?" onClose={() => setSub(null)} onConfirm={() => void remove()}
        body={<>This story and its views will be removed for everyone. This can&apos;t be undone.</>} />
    </>
  );
}
