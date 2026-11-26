"use client";

/**
 * Owner-side moment tools: edit (`PATCH /moments/{id}/`), the viewer list (`GET /moments/{id}/viewers/`) and the
 * replies people sent (`GET /moments/{id}/replies/`, `DELETE …/replies/{reply_id}/`).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuLoaderCircle, LuMessageSquare, LuSave, LuTrash2, LuX } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import {
  LIFETIMES, PRIVACY_LABEL, deleteStoryReply, isHexColor, privacyChoices, storyReplies, storyViewers, updateStory,
  type Story, type StoryLifetime, type StoryPatch, type StoryPrivacy, type StoryReply, type StoryViewer,
} from "@/lib/api/stories";
import { timeAgo } from "@/lib/posts";
import { btnGhost, btnPrimary, errorText, hint, input, label } from "@/lib/ui";

const CAPTION_MAX = 500;

/** Mounted only while open, so the form always starts from the moment as it is now. */
export function StoryEditModal({ story, onClose, onSaved }: { story: Story; onClose: () => void; onSaved: (s: Story) => void }) {
  const toast = useToast();
  const [caption, setCaption] = useState(story.caption);
  const [useColor, setUseColor] = useState(!!story.backgroundColor);
  // <input type="color"> only speaks #rrggbb; keep an 8-digit or 3-digit value untouched unless it is changed.
  const [color, setColor] = useState(story.backgroundColor || "#111827");
  const [privacy, setPrivacy] = useState<StoryPrivacy>(story.privacy);
  const [lifetime, setLifetime] = useState<number>(story.lifetimeHours);
  const [archived, setArchived] = useState(story.archived);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (caption.length > CAPTION_MAX) return setErrors({ caption: `Keep the caption under ${CAPTION_MAX} characters` });
    if (useColor && !isHexColor(color)) return setErrors({ background_color: "Enter a hex colour such as #111827" });
    // Send only what changed — lifetime in particular moves the expiry, so it shouldn't be re-sent idly.
    const patch: StoryPatch = {};
    if (caption.trim() !== story.caption) patch.caption = caption.trim() || null;
    const nextColor = useColor ? color.trim() : "";
    if (nextColor !== story.backgroundColor) patch.backgroundColor = nextColor || null;
    if (privacy !== story.privacy) patch.privacy = privacy;
    if (lifetime !== story.lifetimeHours) patch.lifetimeHours = lifetime as StoryLifetime;
    if (archived !== story.archived) patch.archived = archived;
    if (!Object.keys(patch).length) return onClose();

    setBusy(true); setErrors({});
    try {
      const saved = await updateStory(story.id, patch);
      toast("Moment updated");
      onSaved(saved);
      onClose();
    } catch (e) {
      const fields = e instanceof ApiError ? e.fieldErrors() : {};
      if (fields.lifetime && !fields.lifetime_hours) fields.lifetime_hours = fields.lifetime;
      setErrors(Object.keys(fields).length ? fields : { form: e instanceof ApiError ? e.message : "Couldn't save that moment." });
      setBusy(false);
    }
  };

  const close = () => { if (!busy) onClose(); };
  const lifetimes = LIFETIMES.includes(lifetime as StoryLifetime) ? LIFETIMES : [...LIFETIMES, lifetime as StoryLifetime];

  return (
    <Modal open title="Edit moment" onClose={close}
      footer={<>
        <MotionButton className={btnGhost} onClick={close} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} onClick={save} disabled={busy}>{busy ? <LuLoaderCircle size={16} className="animate-spin" /> : <LuSave size={16} />}Save</MotionButton>
      </>}>
      <div>
        <label htmlFor="se-caption" className={label}>Caption</label>
        <textarea id="se-caption" rows={2} className={`${input} resize-y`} value={caption} disabled={busy} onChange={(e) => setCaption(e.target.value)} />
        <p className={caption.length > CAPTION_MAX || errors.caption ? errorText : hint}>{errors.caption || `${caption.length}/${CAPTION_MAX}`}</p>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="se-life" className={label}>Lifetime</label>
          <Select id="se-life" value={lifetime} disabled={busy} onChange={(e) => setLifetime(Number(e.target.value))}>
            {lifetimes.map((h) => <option key={h} value={h}>{h} hours</option>)}
          </Select>
          {errors.lifetime_hours ? <p className={errorText}>{errors.lifetime_hours}</p> : <p className={hint}>Counted from when it was published, so a shorter lifetime can expire it now.</p>}
        </div>
        <div>
          <label htmlFor="se-privacy" className={label}>Who can see this?</label>
          <Select id="se-privacy" value={privacy} disabled={busy} onChange={(e) => setPrivacy(e.target.value as StoryPrivacy)}>
            {privacyChoices(story.ownerType).map((p) => <option key={p} value={p}>{PRIVACY_LABEL[p]}</option>)}
          </Select>
          {errors.privacy && <p className={errorText}>{errors.privacy}</p>}
        </div>
      </div>
      <div>
        <label className="flex flex-wrap items-center gap-2.5">
          <input type="checkbox" checked={useColor} disabled={busy} onChange={(e) => setUseColor(e.target.checked)} />
          <span className="font-semibold">Background colour</span>
          {useColor && <>
            <input type="color" aria-label="Pick a background colour" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#111827"} disabled={busy} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-line bg-surface p-0.5" />
            <input aria-label="Background colour hex" className={`${input} w-[130px]`} maxLength={9} value={color} disabled={busy} onChange={(e) => setColor(e.target.value)} />
          </>}
        </label>
        {errors.background_color && <p className={errorText}>{errors.background_color}</p>}
      </div>
      <label className="flex items-center gap-2.5">
        <input type="checkbox" checked={archived} disabled={busy} onChange={(e) => setArchived(e.target.checked)} />
        <span><b className="font-semibold">Archived</b> <span className="text-muted">— hidden from everyone, and it leaves the Moments tray.</span></span>
      </label>
      {errors.is_archived && <p className={errorText}>{errors.is_archived}</p>}
      {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
    </Modal>
  );
}

/** Mounted only while open. */
export function StoryViewersModal({ story, onClose }: { story: Story; onClose: () => void }) {
  const [rows, setRows] = useState<StoryViewer[]>([]);
  const [count, setCount] = useState(story.views);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true); setError("");
    try {
      const r = await storyViewers(story.id, p);
      setRows((prev) => (p === 1 ? r.rows : [...prev, ...r.rows]));
      setCount(r.count); setPage(r.page || p); setPages(r.pages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load who viewed this moment.");
    } finally {
      setLoading(false);
    }
  }, [story.id]);

  useEffect(() => {
    void Promise.resolve().then(() => load(1));
  }, [load]);

  return (
    <Modal open title={`Viewed by ${count}`} onClose={onClose}>
      {rows.length === 0 && !loading && !error && <p className="py-4 text-center text-muted">Nobody has viewed this moment yet.</p>}
      {rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
              <Avatar name={v.name} size={36} src={v.avatarUrl} />
              <b className="min-w-0 flex-1 truncate">{v.name}</b>
              <span className="text-[13px] text-muted">{v.viewedAt ? timeAgo(v.viewedAt) : ""}</span>
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="h-16 animate-pulse rounded-xl bg-background" />}
      {error && <p role="alert" className={errorText}>{error} <button className="font-semibold text-primary" onClick={() => void load(Math.max(1, page || 1))}>Retry</button></p>}
      {!loading && !error && page < pages && <MotionButton className={`${btnGhost} mx-auto`} onClick={() => void load(page + 1)}>Show more</MotionButton>}
    </Modal>
  );
}

/** Mounted only while open. The owner sees every reply; each can be answered in Messages or deleted. */
export function StoryRepliesModal({ story, onClose, onCount }: { story: Story; onClose: () => void; onCount: (n: number) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<StoryReply[]>([]);
  const [count, setCount] = useState(story.replies);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError("");
    try {
      const r = await storyReplies(story.id, p);
      setRows((prev) => (p === 1 ? r.rows : [...prev, ...r.rows]));
      setCount(r.count); setPage(r.page || p); setPages(r.pages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load the replies.");
    } finally {
      setLoading(false);
    }
  }, [story.id]);

  useEffect(() => {
    void Promise.resolve().then(() => load(1));
  }, [load]);

  const remove = async (r: StoryReply) => {
    setBusy(r.id);
    try {
      await deleteStoryReply(story.id, r.id);
      setRows((l) => l.filter((x) => x.id !== r.id));
      const n = Math.max(0, count - 1);
      setCount(n);
      onCount(n);
      toast("Reply deleted");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete that reply.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open title={`Replies · ${count}`} onClose={onClose}>
      {rows.length === 0 && !loading && !error && <p className="py-4 text-center text-muted">No replies yet. When someone sends a message on this moment, it shows up here.</p>}
      {rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-xl bg-background px-3 py-2.5">
              <Avatar name={r.name} size={36} src={r.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2"><b className="truncate">{r.name}</b><span className="shrink-0 text-xs text-muted">{r.createdAt ? timeAgo(r.createdAt) : ""}</span></p>
                <p className="whitespace-pre-wrap break-words">{r.message}</p>
                {r.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.mediaUrl} alt="" loading="lazy" className="mt-1.5 max-h-40 rounded-lg object-cover" />
                )}
              </div>
              <span className="flex shrink-0 gap-1">
                {/* Sent as a gym: a personal chat with whichever staff member typed it would be the wrong inbox. */}
                {r.userId && !r.asGym && (
                  <Link href={`/messages?user=${encodeURIComponent(r.userId)}`} aria-label={`Reply to ${r.name} in Messages`} title="Reply in Messages"
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-primary"><LuMessageSquare size={16} /></Link>
                )}
                <button aria-label={`Delete ${r.name}'s reply`} title="Delete reply" disabled={busy === r.id} onClick={() => void remove(r)}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-bad disabled:opacity-45"><LuTrash2 size={16} /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="h-16 animate-pulse rounded-xl bg-background" />}
      {error && <p role="alert" className={errorText}>{error} <button className="font-semibold text-primary" onClick={() => void load(Math.max(1, page || 1))}>Retry</button></p>}
      {!loading && !error && page < pages && <MotionButton className={`${btnGhost} mx-auto`} onClick={() => void load(page + 1)}>Show more</MotionButton>}
    </Modal>
  );
}
