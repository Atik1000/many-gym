"use client";

/**
 * A post's comment thread: comments on the post, replies to comments (and to replies, up to ten levels),
 * each with text and/or one photo, video or GIF.
 *
 * Mounted only while a post's comment section is open, so it loads on mount. The API embeds a short preview
 * of replies in each comment; "View more replies" swaps that preview for the real, paged list.
 *
 * Authorship follows the token (lib/api/comments.ts): under a gym-context token a comment made here is
 * posted as the gym.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuCornerDownRight, LuLoaderCircle, LuPaperclip, LuPencil, LuReply, LuSend, LuTrash2, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, ConfirmModal } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api/comments";
import type { Comment, CommentInput, CommentMediaKind, CommentSort } from "@/lib/api/comments";
import { ApiError } from "@/lib/api/http";
import { timeAgo } from "@/lib/posts";
import Reactions from "./Reactions";
import { btnGhost, btnPrimary, errorText } from "@/lib/ui";

const PAGE_SIZE = 10;
/** Replies indent up to this depth; deeper ones stay at this level so a ten-deep thread fits a phone. */
const INDENT_CAP = 3;
const MB = 1024 * 1024;

const SORTS: [CommentSort, string][] = [["newest", "Newest"], ["oldest", "Oldest"], ["most_replied", "Most replied"]];

// ---------------------------------------------------------------- tree helpers

/**
 * Rebuilds the tree around one comment. `onTarget` returns its replacement (or null to remove it);
 * `onAncestor` is applied to every comment above it, nearest first.
 */
function walk(
  list: Comment[],
  id: string,
  onTarget: (c: Comment) => Comment | null,
  onAncestor: (c: Comment) => Comment = (c) => c,
): { list: Comment[]; hit: boolean } {
  let hit = false;
  const out: Comment[] = [];
  for (const c of list) {
    if (c.id === id) {
      hit = true;
      const next = onTarget(c);
      if (next) out.push(next);
      continue;
    }
    if (c.replies.length) {
      const sub = walk(c.replies, id, onTarget, onAncestor);
      if (sub.hit) {
        hit = true;
        out.push(onAncestor({ ...c, replies: sub.list }));
        continue;
      }
    }
    out.push(c);
  }
  return { list: out, hit };
}

const dedupe = (list: Comment[]) => {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
};

// ---------------------------------------------------------------- attachments

type Attachment = { file: File; kind: CommentMediaKind; url: string; duration?: number };

function kindOf(f: File): CommentMediaKind | null {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  if (f.type === "image/gif" || ext === "gif") return "gif";
  if (["jpg", "jpeg", "png", "webp"].includes(ext) || ["image/jpeg", "image/png", "image/webp"].includes(f.type)) return "photo";
  if (["mp4", "mov"].includes(ext) || ["video/mp4", "video/quicktime"].includes(f.type)) return "video";
  return null;
}

const LIMIT: Record<CommentMediaKind, number> = { photo: 10 * MB, gif: 10 * MB, video: 200 * MB };
const KIND_LABEL: Record<CommentMediaKind, string> = { photo: "Photo", gif: "GIF", video: "Video" };

/** Why the server refused, in words a person can act on. */
function problemOf(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  if (e.status === 403) return "You can’t comment on this post.";
  const fields = Object.values(e.fieldErrors());
  if (fields.length) return fields[0];
  return e.message || fallback;
}

// ---------------------------------------------------------------- composer

/** `onSubmit` resolves to an error message to show (the draft is kept), or null when the comment was posted. */
function Composer({ placeholder, label, autoFocus, onSubmit, onCancel }: {
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  onSubmit: (input: CommentInput) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");
  const [att, setAtt] = useState<Attachment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveUrl = useRef<string | null>(null);

  // Release the preview's object URL if the composer goes away with a file still attached.
  useEffect(() => () => { if (liveUrl.current) URL.revokeObjectURL(liveUrl.current); }, []);

  const drop = () => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = null;
    setAtt(null);
  };

  const pick = (files: File[]) => {
    if (!files.length) return;
    if (att || files.length > 1) return setError("A comment can have one attachment. Remove the current one to choose another.");
    const file = files[0];
    const kind = kindOf(file);
    if (!kind) return setError("That file type isn’t supported. Use JPG, PNG, WebP, GIF, MP4 or MOV.");
    if (file.size > LIMIT[kind]) return setError(`${KIND_LABEL[kind]}s can be up to ${LIMIT[kind] / MB} MB.`);
    const url = URL.createObjectURL(file);
    liveUrl.current = url;
    setError("");
    setAtt({ file, kind, url });
    if (kind === "video") {
      // The API takes the clip's length; read it from the file's own metadata.
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        const d = probe.duration;
        if (Number.isFinite(d)) setAtt((a) => (a && a.url === url ? { ...a, duration: d } : a));
      };
      probe.src = url;
    }
  };

  const tooLong = text.length > api.MAX_COMMENT_LENGTH;
  const canSend = (text.trim().length > 0 || !!att) && !tooLong && !busy;

  const submit = async () => {
    if (!canSend) return;
    setBusy(true);
    setError("");
    const problem = await onSubmit({ text: text.trim(), file: att?.file ?? null, kind: att?.kind, durationSeconds: att?.duration });
    setBusy(false);
    if (problem) return setError(problem); // keep the draft
    setText("");
    drop();
  };

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-[14px] border border-line bg-background px-3 py-2 focus-within:border-primary">
          <textarea
            aria-label={label}
            autoFocus={autoFocus}
            rows={1}
            value={text}
            placeholder={placeholder}
            onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
              if (e.key === "Escape" && onCancel && !text && !att) onCancel();
            }}
            className="block max-h-40 min-h-[24px] w-full resize-y bg-transparent outline-none placeholder:text-muted"
          />
          {att && (
            <div className="relative mt-2 inline-block overflow-hidden rounded-lg bg-black">
              {att.kind === "video"
                ? <video src={att.url} muted preload="metadata" className="block max-h-36 max-w-[220px]" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={att.url} alt="" className="block max-h-36 max-w-[220px] object-contain" />}
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">{KIND_LABEL[att.kind]}</span>
              <button type="button" aria-label="Remove attachment" onClick={drop} disabled={busy} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/65 text-white"><LuX size={13} /></button>
            </div>
          )}
        </div>
        <button type="button" aria-label="Attach a photo, video or GIF" title="Attach a photo, video or GIF" disabled={busy} onClick={() => fileRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-background hover:text-primary disabled:opacity-50"><LuPaperclip size={18} /></button>
        <MotionButton type="button" aria-label={busy ? "Posting" : "Post comment"} className={`${btnPrimary} shrink-0`} disabled={!canSend} onClick={() => void submit()}>
          {busy ? <LuLoaderCircle size={17} className="motion-safe:animate-spin" /> : <LuSend size={17} />}<span className="hidden sm:inline">Post</span>
        </MotionButton>
        <input ref={fileRef} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
          onChange={(e) => { pick([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
        {error && <p role="alert" className={errorText}>{error}</p>}
        {text.length >= api.MAX_COMMENT_LENGTH - 200 && (
          <span className={`ml-auto ${tooLong ? "font-semibold text-bad" : "text-muted"}`}>{text.length} / {api.MAX_COMMENT_LENGTH}</span>
        )}
        {onCancel && <button type="button" className="font-semibold text-muted hover:text-foreground" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- one comment

function MediaView({ c }: { c: Comment }) {
  const m = c.media;
  if (!m) return null;
  const working = m.status === "pending" || m.status === "processing";
  // While it is still being optimised — or if that failed — the upload itself is the playable copy.
  const src = m.status === "completed" ? m.url : m.originalUrl || m.url;
  return (
    <div className="mt-1.5">
      {m.kind === "video" ? (
        <video src={src} controls preload="metadata" poster={m.thumbnailUrl || undefined} className="max-h-72 max-w-full rounded-xl bg-black" />
      ) : (
        <a href={src} target="_blank" rel="noreferrer" aria-label={m.kind === "gif" ? "Open GIF full size" : "Open photo full size"} className="inline-block">
          {/* A GIF's thumbnail is a still frame, so the animation itself is shown. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy" className="max-h-72 max-w-full rounded-xl bg-background object-contain" />
        </a>
      )}
      {working && <p className="mt-1 text-xs text-muted">Processing…</p>}
    </div>
  );
}

type Ctx = {
  myId: string;
  canModerate: boolean;
  replyingTo: string | null;
  editing: string | null;
  loadingReplies: string | null;
  /** Reply paging per comment, once its preview has been replaced by the real list. */
  paging: Record<string, { page: number; more: boolean }>;
  setReplyingTo: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  reply: (parent: Comment, input: CommentInput) => Promise<string | null>;
  saveEdit: (c: Comment, text: string, removeMedia: boolean) => Promise<string | null>;
  askDelete: (c: Comment) => void;
  moreReplies: (c: Comment) => void;
};

function EditForm({ c, ctx }: { c: Comment; ctx: Ctx }) {
  const [text, setText] = useState(c.text);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const keepsMedia = !!c.media && !removeMedia;
  const tooLong = text.length > api.MAX_COMMENT_LENGTH;
  const unchanged = text.trim() === c.text.trim() && !removeMedia;
  const canSave = (text.trim().length > 0 || keepsMedia) && !tooLong && !unchanged && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const problem = await ctx.saveEdit(c, text, removeMedia);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className="mt-1">
      <textarea aria-label="Edit comment" autoFocus rows={2} value={text} onChange={(e) => { setText(e.target.value); setError(""); }}
        onKeyDown={(e) => { if (e.key === "Escape") ctx.setEditing(null); }}
        className="block w-full resize-y rounded-[10px] border border-line bg-surface px-3 py-2 outline-none focus:border-primary" />
      {c.media && (
        <label className="mt-1.5 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={removeMedia} onChange={(e) => setRemoveMedia(e.target.checked)} />
          Remove attachment
        </label>
      )}
      {!text.trim() && !keepsMedia && <p className="mt-1 text-xs text-muted">A comment needs text or an attachment.</p>}
      {tooLong && <p className={errorText}>{text.length} / {api.MAX_COMMENT_LENGTH}</p>}
      {error && <p role="alert" className={errorText}>{error}</p>}
      <div className="mt-2 flex gap-2">
        <MotionButton type="button" className={btnPrimary} disabled={!canSave} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</MotionButton>
        <MotionButton type="button" className={btnGhost} disabled={busy} onClick={() => ctx.setEditing(null)}>Cancel</MotionButton>
      </div>
    </div>
  );
}

function Item({ c, ctx }: { c: Comment; ctx: Ctx }) {
  const asGym = c.ownerType === "gym" && !!c.gymName;
  const name = asGym ? c.gymName : c.authorName;
  const avatar = asGym ? c.gymAvatarUrl : c.authorAvatarUrl;
  const mine = !!ctx.myId && c.userId === ctx.myId;
  const canReply = c.depth < api.MAX_COMMENT_DEPTH;
  const page = ctx.paging[c.id];
  const unseen = Math.max(0, c.repliesCount - c.replies.length);
  const hasMore = page ? page.more : c.hasMoreReplies || unseen > 0;
  const loading = ctx.loadingReplies === c.id;
  const action = "inline-flex items-center gap-1 font-semibold text-muted hover:text-primary";

  return (
    <li>
      <div className="flex gap-2.5">
        <Avatar name={name} size={c.depth === 0 ? 34 : 28} src={avatar || ""} />
        <div className="min-w-0 flex-1">
          {ctx.editing === c.id ? <EditForm c={c} ctx={ctx} /> : (
            <>
              <div className="inline-block max-w-full rounded-[14px] bg-background px-3 py-2">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <b className="break-words">{asGym ? name : c.userId ? <Link href={`/users/${c.userId}`} className="hover:underline">{name}</Link> : name}</b>
                  {asGym && c.authorName && c.authorName !== "Unknown" && <span className="text-muted">{c.authorName}</span>}
                </p>
                {/* Past the indent cap the nesting no longer shows who is being answered, so say it. */}
                {c.depth > INDENT_CAP && c.replyToName && (
                  <p className="flex items-center gap-1 text-xs text-muted"><LuCornerDownRight size={12} />Replying to {c.replyToName}</p>
                )}
                {c.text && <p className="whitespace-pre-wrap break-words">{c.text}</p>}
                <MediaView c={c} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-muted">
                <span>{c.createdAt ? timeAgo(c.createdAt) : ""}</span>
                {c.edited && <span>Edited</span>}
                <Reactions target={{ kind: "comment", id: c.id }} count={c.reactionsCount} />
                {canReply && <button type="button" className={action} aria-expanded={ctx.replyingTo === c.id} onClick={() => ctx.setReplyingTo(ctx.replyingTo === c.id ? null : c.id)}><LuReply size={13} />Reply</button>}
                {mine && <button type="button" className={action} onClick={() => ctx.setEditing(c.id)}><LuPencil size={12} />Edit</button>}
                {(mine || ctx.canModerate) && <button type="button" className={`${action} hover:text-bad`} aria-label={`Delete comment by ${name}`} onClick={() => ctx.askDelete(c)}><LuTrash2 size={12} />Delete</button>}
              </div>
            </>
          )}
          {ctx.replyingTo === c.id && (
            <div className="mt-2">
              <Composer autoFocus label={`Reply to ${name}`} placeholder={`Reply to ${name}…`} onSubmit={(input) => ctx.reply(c, input)} onCancel={() => ctx.setReplyingTo(null)} />
            </div>
          )}
        </div>
      </div>

      {(c.replies.length > 0 || hasMore) && (
        <div className={c.depth < INDENT_CAP ? "ml-4 mt-2.5 border-l border-line pl-3 sm:ml-[17px] sm:pl-4" : "mt-2.5"}>
          {c.replies.length > 0 && <ul className="grid gap-2.5">{c.replies.map((r) => <Item key={r.id} c={r} ctx={ctx} />)}</ul>}
          {hasMore && (
            <button type="button" disabled={loading} onClick={() => ctx.moreReplies(c)} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary disabled:opacity-60">
              {loading
                ? <><LuLoaderCircle size={14} className="motion-safe:animate-spin" />Loading replies…</>
                : <><LuCornerDownRight size={14} />{unseen > 0 ? `View ${unseen} more ${unseen === 1 ? "reply" : "replies"}` : "View more replies"}</>}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- the thread

export default function Comments({ postId, count, onCountChange, canModerate = false, autoFocus = false }: {
  postId: string;
  /** The post's `comments_count` as last known — comments and every nested reply. */
  count: number;
  onCountChange?: (count: number) => void;
  /** Staff of the gym that owns the post may delete anyone's comment under it. */
  canModerate?: boolean;
  autoFocus?: boolean;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [sort, setSort] = useState<CommentSort>("newest");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(count);
  const [paging, setPaging] = useState<Ctx["paging"]>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Comment | null>(null);
  /** Guards against an older response (a previous sort, a superseded refresh) landing last. */
  const ticket = useRef(0);

  const load = useCallback(async (which: CommentSort) => {
    const mine = ++ticket.current;
    try {
      const r = await api.listComments(postId, { sort: which, page: 1, pageSize: PAGE_SIZE });
      if (mine !== ticket.current) return;
      setItems(r.items);
      setPage(1);
      setHasNext(r.hasNext);
      setPaging({});
      setStatus("ready");
    } catch (e) {
      if (mine !== ticket.current) return;
      setStatus(e instanceof ApiError && e.status === 403 ? "forbidden" : "error");
    }
  }, [postId]);

  useEffect(() => {
    void Promise.resolve().then(() => load(sort));
  }, [load, sort]);

  const changeTotal = (delta: number) => {
    const next = Math.max(0, total + delta);
    setTotal(next);
    onCountChange?.(next);
  };

  const changeSort = (s: CommentSort) => {
    if (s === sort) return;
    setStatus("loading");
    setSort(s);
  };

  const more = async () => {
    setLoadingMore(true);
    const mine = ticket.current;
    try {
      const r = await api.listComments(postId, { sort, page: page + 1, pageSize: PAGE_SIZE });
      if (mine !== ticket.current) return;
      // A comment posted since page 1 shifts the pages, so the same row can come back twice.
      setItems((list) => dedupe([...list, ...r.items]));
      setPage(page + 1);
      setHasNext(r.hasNext);
    } catch (e) {
      toast(problemOf(e, "Couldn’t load more comments."));
    } finally {
      setLoadingMore(false);
    }
  };

  const moreReplies = async (c: Comment) => {
    const next = (paging[c.id]?.page ?? 0) + 1;
    setLoadingReplies(c.id);
    try {
      const r = await api.listReplies(postId, c.id, { page: next, pageSize: PAGE_SIZE });
      // The first page replaces the embedded preview; later pages extend it.
      setItems((list) => walk(list, c.id, (x) => ({ ...x, replies: next === 1 ? r.items : dedupe([...x.replies, ...r.items]), hasMoreReplies: r.hasNext, repliesCount: Math.max(x.repliesCount, r.count) })).list);
      setPaging((p) => ({ ...p, [c.id]: { page: next, more: r.hasNext } }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast("That comment is no longer available.");
        void load(sort);
      } else {
        toast(problemOf(e, "Couldn’t load those replies."));
      }
    } finally {
      setLoadingReplies(null);
    }
  };

  const post = async (input: CommentInput): Promise<string | null> => {
    try {
      const made = await api.createComment(postId, input);
      setItems((list) => (sort === "oldest" ? (hasNext ? list : [...list, made]) : [made, ...list]));
      changeTotal(1);
      if (sort === "oldest" && hasNext) toast("Comment posted");
      return null;
    } catch (e) {
      return problemOf(e, "Couldn’t post that comment.");
    }
  };

  const reply = async (parent: Comment, input: CommentInput): Promise<string | null> => {
    try {
      const made = await api.replyToComment(postId, parent.id, input);
      setItems((list) => walk(
        list,
        parent.id,
        (x) => ({ ...x, replies: [...x.replies, made], repliesCount: x.repliesCount + 1, totalReplies: x.totalReplies + 1 }),
        (x) => ({ ...x, totalReplies: x.totalReplies + 1 }),
      ).list);
      // Other people may have answered meanwhile: take the parent's real counts from the server, keeping
      // the replies already on screen. A failure here just leaves the local +1.
      void api.getComment(postId, parent.id, { repliesLimit: 0, replyDepth: 0 })
        .then((fresh) => setItems((list) => walk(list, parent.id, (x) => ({
          ...x,
          repliesCount: Math.max(fresh.repliesCount, x.replies.length),
          totalReplies: Math.max(fresh.totalReplies, x.totalReplies),
          hasMoreReplies: fresh.repliesCount > x.replies.length,
        })).list))
        .catch(() => undefined);
      setReplyingTo(null);
      changeTotal(1);
      return null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // The comment being answered was deleted meanwhile — show the thread as it is now.
        setReplyingTo(null);
        toast("That comment is no longer available.");
        void load(sort);
        return "That comment is no longer available.";
      }
      return problemOf(e, "Couldn’t post that reply.");
    }
  };

  const saveEdit = async (c: Comment, text: string, removeMedia: boolean): Promise<string | null> => {
    try {
      const saved = await api.updateComment(postId, c.id, { text, removeMedia });
      // The PATCH response doesn't carry the loaded replies, so keep the ones on screen.
      setItems((list) => walk(list, c.id, (x) => ({ ...saved, replies: x.replies, repliesCount: x.repliesCount, totalReplies: x.totalReplies, hasMoreReplies: x.hasMoreReplies })).list);
      setEditing(null);
      return null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setEditing(null);
        toast("That comment is no longer available.");
        void load(sort);
        return "That comment is no longer available.";
      }
      return e instanceof ApiError && e.status === 403 ? "You can’t edit this comment." : problemOf(e, "Couldn’t save that edit.");
    }
  };

  const confirmDelete = async () => {
    const c = deleting;
    setDeleting(null);
    if (!c) return;
    try {
      const { deletedCount } = await api.deleteComment(postId, c.id);
      setItems((list) => walk(
        list,
        c.id,
        () => null,
        (x) => ({ ...x, totalReplies: Math.max(0, x.totalReplies - deletedCount), repliesCount: x.id === c.parentId ? Math.max(0, x.repliesCount - 1) : x.repliesCount }),
      ).list);
      changeTotal(-deletedCount);
      toast(deletedCount > 1 ? `Comment and ${deletedCount - 1} ${deletedCount === 2 ? "reply" : "replies"} deleted` : "Comment deleted");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast("That comment was already deleted.");
        void load(sort);
      } else {
        toast(e instanceof ApiError && e.status === 403 ? "You can’t delete this comment." : problemOf(e, "Couldn’t delete that comment."));
      }
    }
  };

  const ctx: Ctx = {
    myId: user?.id ?? "",
    canModerate,
    replyingTo,
    editing,
    loadingReplies,
    paging,
    setReplyingTo: (id) => { setReplyingTo(id); if (id) setEditing(null); },
    setEditing: (id) => { setEditing(id); if (id) setReplyingTo(null); },
    reply,
    saveEdit,
    askDelete: setDeleting,
    moreReplies: (c) => void moreReplies(c),
  };

  return (
    <section aria-label="Comments" className="mt-3 border-t border-line pt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold">{total} comment{total === 1 ? "" : "s"}</h4>
        {status === "ready" && items.length > 1 && (
          <div role="group" aria-label="Sort comments" className="flex gap-1 text-[13px]">
            {SORTS.map(([value, text]) => (
              <button key={value} type="button" aria-pressed={sort === value} onClick={() => changeSort(value)}
                className={`rounded-full px-2.5 py-1 font-semibold ${sort === value ? "bg-primary-50 text-primary" : "text-muted hover:bg-background"}`}>{text}</button>
            ))}
          </div>
        )}
      </div>

      {status !== "forbidden" && status !== "error" && (
        <Composer autoFocus={autoFocus} label="Write a comment" placeholder="Write a comment…" onSubmit={post} />
      )}

      <div className="mt-3">
        {status === "loading" && (
          <div aria-busy="true" aria-label="Loading comments" className="grid gap-3">
            {Array.from({ length: Math.min(3, Math.max(1, count)) }, (_, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-background motion-safe:animate-pulse" />
                <span className="h-12 flex-1 rounded-[14px] bg-background motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        )}
        {status === "error" && (
          <p className="py-3 text-muted">Couldn&apos;t load the comments. <button type="button" className="font-semibold text-primary" onClick={() => { setStatus("loading"); void load(sort); }}>Try again</button></p>
        )}
        {status === "forbidden" && <p className="py-3 text-muted">You can&apos;t comment on this post.</p>}
        {status === "ready" && items.length === 0 && <p className="py-3 text-center text-muted">No comments yet. Be the first to say something.</p>}
        {status === "ready" && items.length > 0 && (
          <>
            <ul className="grid gap-3.5">{items.map((c) => <Item key={c.id} c={c} ctx={ctx} />)}</ul>
            {hasNext && (
              <button type="button" disabled={loadingMore} onClick={() => void more()} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-primary disabled:opacity-60">
                {loadingMore && <LuLoaderCircle size={15} className="motion-safe:animate-spin" />}{loadingMore ? "Loading…" : "View more comments"}
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmModal open={!!deleting} title="Delete comment?" onClose={() => setDeleting(null)} onConfirm={() => void confirmDelete()}
        body={deleting && deleting.totalReplies > 0
          ? <>This comment and its <b>{deleting.totalReplies} {deleting.totalReplies === 1 ? "reply" : "replies"}</b> will be removed permanently.</>
          : <>This comment will be removed permanently.</>} />
    </section>
  );
}
