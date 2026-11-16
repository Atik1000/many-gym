"use client";

/**
 * The story tray at the top of the Studio feed — `GET /stories/tray/`.
 *
 * One ring per owner (a gym or a person), in the order the server returns them: owners with something unviewed
 * first, then most recent. Opening a ring plays that owner's stories and carries on into the next owner's.
 *
 * Who may add a story: the API gates gym stories on `stories:manage` / `posts:manage`, neither of which is in
 * the scope vocabulary this app's tokens carry, so the tray uses the same gate as the post composer
 * ("Edit studio information" → `studio:manage`). That mapping is an assumption; the server has the final say.
 */
import { useCallback, useEffect, useState } from "react";
import { LuArchive, LuArchiveRestore, LuEye, LuGalleryVerticalEnd, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, ConfirmModal, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError, currentGymId } from "@/lib/api/http";
import { PRIVACY_LABEL, deleteStory, myStories, storyTray, timeLeft, updateStory, type Story, type StoryBucket } from "@/lib/api/stories";
import { btnGhost, card, errorText } from "@/lib/ui";
import StoryComposer from "./StoryComposer";
import { StoryEditModal, StoryViewersModal } from "./StoryManage";
import StoryViewer from "./StoryViewer";

/** Applies a change to every story in the tray; returning null drops the story, and an emptied owner goes too. */
const mapStories = (list: StoryBucket[] | null, fn: (s: Story) => Story | null): StoryBucket[] =>
  (list ?? [])
    .map((b) => {
      const stories = b.stories.map(fn).filter((s): s is Story => !!s);
      return { ...b, stories, hasUnviewed: stories.some((s) => !s.viewed) };
    })
    .filter((b) => b.stories.length > 0);

export default function Stories() {
  const { can, user } = useAuth();
  const gymId = currentGymId();
  const canPost = gymId ? can("Edit studio information") : !!user;
  const [buckets, setBuckets] = useState<StoryBucket[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [mine, setMine] = useState(false);
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
  }, [load]);

  /** A gym's stories are managed by its staff; a person's by that person. */
  const canManage = useCallback(
    (s: Story) => (s.ownerType === "gym" ? !!gymId && s.gymId === gymId && can("Edit studio information") : !!user && s.userId === user.id),
    [gymId, can, user],
  );

  const onViewed = useCallback((id: string) => setBuckets((l) => mapStories(l, (s) => (s.id === id ? { ...s, viewed: true } : s))), []);
  // An archived or expired story leaves the tray; anything else is updated in place.
  const onChanged = useCallback((next: Story) => setBuckets((l) => mapStories(l, (s) => (s.id === next.id ? (next.archived || next.expired ? null : next) : s))), []);
  const onDeleted = useCallback((id: string) => setBuckets((l) => mapStories(l, (s) => (s.id === id ? null : s))), []);
  const closeViewer = useCallback(() => setPlaying(null), []);

  if (buckets === null) {
    return (
      <div className={`${card} flex gap-4 overflow-hidden p-4`} aria-label="Loading stories">
        {[0, 1, 2, 3].map((n) => <span key={n} className="h-[64px] w-[64px] shrink-0 animate-pulse rounded-full bg-background" />)}
      </div>
    );
  }
  if (!canPost && buckets.length === 0 && !failed) return null;

  const tile = "flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-4 focus-visible:ring-primary/25";

  return (
    <section className={`${card} p-4`} aria-label="Stories">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">Stories</h3>
        {canPost && <button type="button" onClick={() => setMine(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"><LuGalleryVerticalEnd size={14} />My stories</button>}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {canPost && (
          <button type="button" className={tile} onClick={() => setComposing(true)}>
            <span className="grid h-[64px] w-[64px] place-items-center rounded-full border-2 border-dashed border-primary/50 bg-primary-50 text-primary"><LuPlus size={24} /></span>
            <span className="w-full truncate text-xs font-semibold">Add story</span>
          </button>
        )}
        {buckets.map((b, n) => (
          <button key={`${b.ownerType}-${b.ownerId}`} type="button" className={tile} onClick={() => setPlaying(n)}
            aria-label={`${b.ownerName}: ${b.stories.length} stor${b.stories.length === 1 ? "y" : "ies"}${b.hasUnviewed ? ", new" : ""}`}>
            <span className={`grid h-[64px] w-[64px] place-items-center rounded-full p-[3px] ${b.hasUnviewed ? "bg-gradient-to-tr from-[#f59e0b] via-[#ec4899] to-primary" : "bg-line"}`}>
              <span className="grid h-full w-full place-items-center rounded-full bg-surface p-[2px]"><Avatar name={b.ownerName} size={52} src={b.ownerAvatarUrl} /></span>
            </span>
            <span className={`w-full truncate text-xs ${b.hasUnviewed ? "font-semibold" : "text-muted"}`}>{b.ownerName}</span>
          </button>
        ))}
        {failed && <p className="self-center px-2 text-[13px] text-muted">Couldn&apos;t load stories. <button type="button" className="font-semibold text-primary" onClick={() => void load()}>Retry</button></p>}
      </div>

      {composing && <StoryComposer onClose={() => setComposing(false)} onCreated={() => void load()} />}
      {mine && <MyStories onClose={() => setMine(false)} onChanged={() => void load()} />}
      {playing !== null && buckets[playing] && (
        <StoryViewer buckets={buckets} start={playing} canManage={canManage} onClose={closeViewer} onViewed={onViewed} onChanged={onChanged} onDeleted={onDeleted} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- my stories

const PAGE = 10;

/** `GET /stories/my/` — the active gym's stories under a gym token, the user's own under a personal one. */
function MyStories({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<Story[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Story | null>(null);
  const [viewers, setViewers] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState<Story | null>(null);

  const load = useCallback(async (p: number, expired: boolean) => {
    setLoading(true); setError("");
    try {
      const r = await myStories({ include_expired: expired, include_archived: true, page: p, page_size: PAGE });
      setRows(r.rows); setCount(r.count); setPages(Math.max(1, r.pages)); setPage(r.page || p);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your stories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(1, includeExpired));
  }, [load, includeExpired]);

  const reload = () => { void load(page, includeExpired); onChanged(); };

  const toggleArchive = async (s: Story) => {
    setBusy(s.id);
    try {
      await updateStory(s.id, { archived: !s.archived });
      toast(s.archived ? "Story restored" : "Story archived");
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change that story.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const s = deleting;
    setDeleting(null);
    if (!s) return;
    setBusy(s.id);
    try {
      await deleteStory(s.id);
      toast("Story deleted");
      // Deleting the only row on a later page would otherwise leave an empty page.
      void load(rows.length === 1 && page > 1 ? page - 1 : page, includeExpired);
      onChanged();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete that story.");
    } finally {
      setBusy(null);
    }
  };

  const act = "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold hover:bg-surface disabled:opacity-45";
  // While a nested dialog is open it owns Esc; otherwise this one would close along with it.
  const nested = !!editing || !!viewers || !!deleting;

  return (
    <>
      <Modal open title="My stories" onClose={() => { if (!nested) onClose(); }}>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={includeExpired} onChange={(e) => setIncludeExpired(e.target.checked)} />
          <span>Include expired stories</span>
        </label>

        {error && <p role="alert" className={errorText}>{error} <button type="button" className="font-semibold text-primary" onClick={() => void load(page, includeExpired)}>Retry</button></p>}
        {loading && rows.length === 0 && <div className="h-28 animate-pulse rounded-xl bg-background" />}
        {!loading && !error && rows.length === 0 && <p className="py-6 text-center text-muted">{includeExpired ? "You haven't shared any stories." : "No active stories. Expired ones are hidden."}</p>}

        <ul className={`grid gap-2.5 ${loading ? "opacity-60" : ""}`}>
          {rows.map((s) => (
            <li key={s.id} className="flex gap-3 rounded-xl bg-background p-2.5">
              <span className="relative block h-[96px] w-[54px] shrink-0 overflow-hidden rounded-lg" style={{ background: s.backgroundColor || "#111827" }}>
                {s.kind === "video" && !s.thumbnailUrl
                  ? <video src={s.mediaUrl} muted preload="metadata" className="h-full w-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={s.thumbnailUrl || s.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                {s.kind === "video" && <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[10px] text-white">Video</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`line-clamp-2 ${s.caption ? "" : "text-muted"}`}>{s.caption || "No caption"}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Pill tone="gray">{s.lifetimeLabel}</Pill>
                  <Pill tone={s.expired ? "red" : "green"}>{s.expired ? "Expired" : timeLeft(s.expiresAt) || "Active"}</Pill>
                  {s.archived && <Pill tone="amber">Archived</Pill>}
                  <Pill tone="purple">{PRIVACY_LABEL[s.privacy]}</Pill>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-0.5 text-muted">
                  <button type="button" className={act} onClick={() => setViewers(s)}><LuEye size={14} />{s.views} view{s.views === 1 ? "" : "s"}</button>
                  <button type="button" className={`${act} text-foreground`} disabled={busy === s.id} onClick={() => setEditing(s)}><LuPencil size={14} />Edit</button>
                  <button type="button" className={`${act} text-foreground`} disabled={busy === s.id} onClick={() => void toggleArchive(s)}>{s.archived ? <><LuArchiveRestore size={14} />Restore</> : <><LuArchive size={14} />Archive</>}</button>
                  <button type="button" className={`${act} text-bad`} disabled={busy === s.id} onClick={() => setDeleting(s)}><LuTrash2 size={14} />Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <span>Page {page} of {pages} · {count} stor{count === 1 ? "y" : "ies"}</span>
            <span className="flex gap-2">
              <MotionButton className={btnGhost} disabled={loading || page <= 1} onClick={() => void load(page - 1, includeExpired)}>Previous</MotionButton>
              <MotionButton className={btnGhost} disabled={loading || page >= pages} onClick={() => void load(page + 1, includeExpired)}>Next</MotionButton>
            </span>
          </div>
        )}
      </Modal>

      {editing && <StoryEditModal story={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {viewers && <StoryViewersModal story={viewers} onClose={() => setViewers(null)} />}
      <ConfirmModal open={!!deleting} title="Delete story?" onClose={() => setDeleting(null)} onConfirm={() => void remove()}
        body={<>This story and its views will be removed for everyone. This can&apos;t be undone.</>} />
    </>
  );
}
