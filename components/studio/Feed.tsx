"use client";

import { Reveal } from "@/components/ui/Motion";
import { MotionButton } from "@/components/ui/Motion";
import { useEffect, useRef, useState } from "react";
import { LuGlobe as Globe, LuImage as ImageIcon, LuLink2 as Link2, LuLoaderCircle as Loader2, LuLock as Lock, LuMessageSquare as MessageSquare, LuEllipsis as MoreHorizontal, LuPencil as Pencil, LuPin as Pin, LuThumbsUp as ThumbsUp, LuTrash2 as Trash2, LuX as X, LuPlus, LuSend, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { uploadFile, useGym, useResource } from "@/lib/api";
import { uid } from "@/lib/id";
import { ACCEPT, validateFiles } from "@/lib/media";
import { timeAgo, type Post, type PostMedia } from "@/lib/posts";
import { btnGhost, btnPrimary, card, errorText, input } from "@/lib/ui";

// a media item in the composer: already-uploaded (no `file`) or newly picked (uploaded when you publish)
type DraftMedia = PostMedia & { file?: File };

function Logo({ size = 44 }: { size?: number }) {
  const [gym] = useGym();
  const url = gym?.overview.profileUrl;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  return <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-black text-[9px] font-extrabold text-white">GYM</span>;
}

function Media({ items }: { items: PostMedia[] }) {
  if (items.length === 0) return null;
  const cols = items.length === 1 ? 1 : items.length === 2 ? 2 : 3;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((m) => (
        <div key={m.id} className={`overflow-hidden rounded-[10px] bg-black ${items.length === 1 ? "aspect-[16/7]" : "aspect-[4/3]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.kind === "image" ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <video src={m.url} controls className="h-full w-full object-cover" />}
        </div>
      ))}
    </div>
  );
}

function PostCard({ post, onChange, onEdit, onDelete }: { post: Post; onChange: (p: Post) => void; onEdit: () => void; onDelete: () => void }) {
  const { can, user } = useAuth();
  const [gym] = useGym();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const canManage = can("Edit studio information");
  const liked = !!user && post.likedBy.includes(user.id);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-background";

  const toggleLike = () => user && onChange({ ...post, likedBy: liked ? post.likedBy.filter((x) => x !== user.id) : [...post.likedBy, user.id] });
  const addComment = () => {
    if (!comment.trim() || !user) return;
    onChange({ ...post, comments: [...post.comments, { id: uid(), author: user.name, text: comment.trim(), createdAt: new Date().toISOString() }] });
    setComment("");
  };

  return (
    <article className={`${card} mt-4 px-[18px] py-4`}>
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <b className="block">{gym?.overview.name ?? "Your gym"}</b>
          <small className="flex items-center gap-1.5 text-muted">
            {timeAgo(post.createdAt)} · {post.members ? <Lock size={12} /> : <Globe size={12} />} {post.members ? "Gym members only" : "Public"}
          </small>
        </div>
        {post.pinned && <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary"><Pin size={12} />Pinned</span>}
        <div className={`relative ${post.pinned ? "" : "ml-auto"}`}>
          <button aria-label="Post options" onClick={() => setMenu((v) => !v)} className="rounded-lg p-1 text-muted hover:bg-background"><MoreHorizontal size={20} /></button>
          {menu && (<>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-8 z-20 min-w-[190px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl" onClick={() => setMenu(false)}>
              {canManage && <button className={item} onClick={() => { onChange({ ...post, pinned: !post.pinned }); toast(post.pinned ? "Post unpinned" : "Post pinned"); }}><Pin size={16} />{post.pinned ? "Unpin post" : "Pin post"}</button>}
              {canManage && <button className={item} onClick={onEdit}><Pencil size={16} />Edit post</button>}
              <button className={item} onClick={() => { void navigator.clipboard?.writeText(`${location.origin}/studio#post-${post.id}`); toast("Post link copied"); }}><Link2 size={16} />Copy post link</button>
              {canManage && <button className={`${item} text-bad`} onClick={onDelete}><Trash2 size={16} />Delete post</button>}
            </div>
          </>)}
        </div>
      </div>
      {post.text && <p id={`post-${post.id}`} className="my-3 whitespace-pre-wrap text-[15px]">{post.text}</p>}
      <Media items={post.media} />
      <div className="flex justify-between border-b border-line py-2.5 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white"><ThumbsUp size={11} fill="currentColor" /></span>{post.likes + post.likedBy.length}</span>
        <button onClick={() => setShowComments((v) => !v)} className="hover:underline">{post.comments.length} comment{post.comments.length === 1 ? "" : "s"}</button>
      </div>
      <div className="grid grid-cols-2 text-muted">
        <button onClick={toggleLike} aria-pressed={liked} className={`flex items-center justify-center gap-2 rounded-lg p-2.5 font-semibold hover:bg-background ${liked ? "text-primary" : ""}`}><ThumbsUp size={18} fill={liked ? "currentColor" : "none"} />Like</button>
        <button onClick={() => setShowComments(true)} className="flex items-center justify-center gap-2 rounded-lg p-2.5 font-semibold hover:bg-background"><MessageSquare size={18} />Comment</button>
      </div>
      {showComments && (
        <div className="mt-3 border-t border-line pt-3">
          {post.comments.map((c) => (
            <div key={c.id} className="mb-2.5 flex gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary">{c.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div className="rounded-xl bg-background px-3 py-2"><b className="text-[13px]">{c.author}</b> <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span><p>{c.text}</p></div></div>
          ))}
          <div className="flex gap-2"><input aria-label="Write a comment" className={input} placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} />
            <MotionButton className={btnPrimary} disabled={!comment.trim()} onClick={addComment}><LuSend size={17} />Post</MotionButton></div>
        </div>
      )}
    </article>
  );
}

function Composer({ editing, onClose, onSave }: { editing: Post | null; onClose: () => void; onSave: (d: { text: string; media: PostMedia[]; members: boolean }) => void }) {
  // the parent remounts this (via `key`) for each open, so initial state is always fresh
  const [text, setText] = useState(editing?.text ?? "");
  const [media, setMedia] = useState<DraftMedia[]>(editing?.media ?? []);
  const [members, setMembers] = useState(editing?.members ?? false);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cleanup = () => media.forEach((m) => m.file && URL.revokeObjectURL(m.url));
  const close = () => { cleanup(); onClose(); };
  const add = (files: File[]) => { const r = validateFiles(files); setMedia((m) => [...m, ...r.ok.map(({ id, url, kind, file }) => ({ id, url, kind, file }))]); setErrors(r.errors); };
  const drop = (to: number) => {
    const from = dragFrom.current; dragFrom.current = null;
    if (from === null || from === to) return;
    setMedia((m) => { const n = [...m]; n.splice(to, 0, n.splice(from, 1)[0]); return n; });
  };
  // A post may be text-only or media-only (like Facebook) — never empty.
  const canPublish = (text.trim().length > 0 || media.length > 0) && !busy;

  const publish = async () => {
    setBusy(true); setErrors([]);
    try {
      const final: PostMedia[] = [];
      for (const m of media) final.push(m.file ? { id: m.id, kind: m.kind, url: (await uploadFile(m.file)).url } : { id: m.id, kind: m.kind, url: m.url });
      cleanup();
      onSave({ text: text.trim(), media: final, members });
    } catch (e) { setErrors([(e as Error).message]); setBusy(false); }
  };

  return (
    <Modal open title={editing ? "Edit post" : "Create post"} onClose={close}
      footer={<><MotionButton className={btnGhost} onClick={close} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} disabled={!canPublish} onClick={publish}>{busy ? <><Loader2 size={16} className="animate-spin" />{editing ? "Saving…" : "Publishing…"}</> : editing ? "Save" : "Publish"}</MotionButton></>}>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Share an update from your gym…"
        className="min-h-[110px] w-full resize-y rounded-[10px] border border-line px-3.5 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50" />
      <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}
        className={`cursor-pointer rounded-xl border-[1.5px] border-dashed p-[18px] text-center text-muted ${over ? "border-primary bg-primary-50" : "border-[#c6c9dc] bg-background"}`}>
        <ImageIcon className="mx-auto mb-1" />
        <b className="text-primary">Add photos / videos</b> or drag &amp; drop
        <small className="mt-1 block">JPG, JPEG, PNG, WebP up to 10 MB · MP4, MOV up to 200 MB</small>
        <input ref={fileRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {errors.length > 0 && <p className={errorText}>{errors.join(" · ")}</p>}
      {media.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted">Drag to reorder — this is the order people will see. Each file gets its own link.</p>
          <div className="grid grid-cols-4 gap-2.5">
            {media.map((m, i) => (
              <div key={m.id} draggable onDragStart={() => (dragFrom.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)} className="relative aspect-square cursor-grab overflow-hidden rounded-[10px] bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.kind === "image" ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <video src={m.url} muted className="h-full w-full object-cover" />}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-[7px] py-0.5 text-[11px] font-bold text-white">{i + 1}</span>
                {m.kind === "video" && <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] text-white">Video</span>}
                <button aria-label="Remove" onClick={() => { if (m.file) URL.revokeObjectURL(m.url); setMedia((x) => x.filter((y) => y.id !== m.id)); }}
                  className="absolute right-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-black/65 text-white"><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="privacy" className="font-semibold">Who can see this?</label>
        <select id="privacy" value={members ? "members" : "public"} onChange={(e) => setMembers(e.target.value === "members")} className="rounded-[10px] border border-line bg-surface px-3 py-2">
          <option value="public">Public</option><option value="members">Gym members only</option>
        </select>
      </div>
    </Modal>
  );
}

export default function Feed() {
  const { can } = useAuth();
  const [posts, setPosts, ready] = useResource<Post>("posts");
  const [composer, setComposer] = useState<{ key: number; editing: Post | null } | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const toast = useToast();
  const canPost = can("Edit studio information");
  // pinned first, then newest first
  const sorted = [...posts].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const openComposer = (editing: Post | null = null) => setComposer({ key: Date.now(), editing });
  // infinite scroll: reveal 5 more posts whenever the sentinel below the feed scrolls into view
  const [shown, setShown] = useState(5);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = shown < sorted.length;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setShown((n) => n + 5); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown]);
  const change = (p: Post) => setPosts((l) => l.map((x) => (x.id === p.id ? p : x)));

  return (
    <section>
      {canPost && (
        <div className={`${card} grid grid-cols-[44px_minmax(0,1fr)] gap-3 p-4`}>
          <Logo />
          <div className="flex flex-col gap-2.5">
            <button onClick={() => openComposer()} className="w-full rounded-[10px] border border-line bg-background px-3.5 py-3 text-left text-muted">Share an update from your gym…</button>
            <div className="flex justify-between gap-2.5">
              <MotionButton className={btnGhost} onClick={() => openComposer()}><ImageIcon size={17} />Photo / Video</MotionButton>
              <MotionButton className={btnPrimary} onClick={() => openComposer()}><LuPlus size={17} />Create Post</MotionButton>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-1 border-b border-line px-2"><button className="border-b-2 border-primary px-3.5 py-2.5 font-semibold text-primary">Published</button></div>

      {!ready && <div className={`${card} mt-4 h-40 animate-pulse`} />}
      {ready && sorted.length === 0 && <p className={`${card} mt-4 p-10 text-center text-muted`}>No posts yet. Share your first update.</p>}
      {sorted.slice(0, shown).map((p, i) => <Reveal key={p.id} index={i % 5}><PostCard post={p} onChange={change} onEdit={() => openComposer(p)} onDelete={() => setDeleting(p)} /></Reveal>)}
      {hasMore && <div ref={sentinel} className="mt-4 h-16 animate-pulse rounded-xl border border-line bg-surface" aria-label="Loading more posts" />}
      {ready && sorted.length > 5 && !hasMore && <p className="mt-6 text-center text-sm text-muted">You&apos;re all caught up</p>}

      {composer && (
        <Composer key={composer.key} editing={composer.editing} onClose={() => setComposer(null)}
          onSave={(d) => {
            const editing = composer.editing;
            if (editing) setPosts((l) => l.map((x) => (x.id === editing.id ? { ...x, ...d } : x)));
            else setPosts((l) => [{ id: uid(), ...d, pinned: false, createdAt: new Date().toISOString(), likes: 0, likedBy: [], comments: [] }, ...l]);
            setComposer(null); toast(editing ? "Post updated" : "Post published");
          }} />
      )}

      <Modal open={!!deleting} title="Delete post?" onClose={() => setDeleting(null)}
        footer={<><MotionButton className={btnGhost} onClick={() => setDeleting(null)}><LuX size={17} />Cancel</MotionButton>
          <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white" onClick={() => { if (deleting) setPosts((l) => l.filter((x) => x.id !== deleting.id)); setDeleting(null); toast("Post deleted"); }}>Delete</button></>}>
        <p>This post, its likes and comments will be removed.</p>
      </Modal>
    </section>
  );
}
