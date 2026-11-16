"use client";

import { EmptyState } from "@/components/ui/parts";
import { LuNewspaper } from "react-icons/lu";

import { Reveal } from "@/components/ui/Motion";
import { MotionButton } from "@/components/ui/Motion";
import { useEffect, useRef, useState } from "react";
import { LuImage as ImageIcon, LuLoaderCircle as Loader2, LuX as X, LuPlus, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { uploadFile, useResource } from "@/lib/api";
import { uid } from "@/lib/id";
import { ACCEPT, validateFiles } from "@/lib/media";
import { PRIVACY_HINT, PRIVACY_LABEL, privacyChoices, privacyOf, type Post, type PostMedia, type PostPrivacy } from "@/lib/posts";
import { FEED_TABS, type FeedType } from "@/lib/api/feed";
import { currentGymId } from "@/lib/api/http";
import CommunityFeed from "./CommunityFeed";
import MyPostsList from "./MyPostsList";
import { posts as postsApi } from "@/lib/api/adapters";
import { ApiError } from "@/lib/api/http";
import { refreshResource } from "@/lib/api";
import { Logo, PostCard } from "./PostCard";
import { btnGhost, btnPrimary, card, errorText, hint } from "@/lib/ui";

// a media item in the composer: already-uploaded (no `file`) or newly picked (uploaded when you publish)
type DraftMedia = PostMedia & { file?: File };

// PostPages and older call sites import the card from here.
export { PostCard };

function Composer({ editing, onClose, onSave }: { editing: Post | null; onClose: () => void; onSave: (d: { text: string; media: PostMedia[]; members: boolean; privacy: PostPrivacy }) => void }) {
  // the parent remounts this (via `key`) for each open, so initial state is always fresh
  const [text, setText] = useState(editing?.text ?? "");
  const [media, setMedia] = useState<DraftMedia[]>(editing?.media ?? []);
  const [privacy, setPrivacy] = useState<PostPrivacy>(editing ? privacyOf(editing) : "public");
  // A gym may limit a post to its members; a personal profile can't (the API rejects it).
  const choices = privacyChoices(!!currentGymId());
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
  // …except a share, whose content is the original post: its commentary may be left blank.
  const canPublish = (text.trim().length > 0 || media.length > 0 || !!editing?.isRepost) && !busy;

  const publish = async () => {
    setBusy(true); setErrors([]);
    try {
      // Keep the File on each item: the post is created as multipart and the server stores the binary.
      // Previously only the local preview URL survived, so nothing was ever uploaded.
      const final: PostMedia[] = [];
      for (const m of media) {
        if (m.file) {
          const up = await uploadFile(m.file);
          final.push({ id: m.id, kind: m.kind, url: up.url, file: up.file });
        } else {
          final.push({ id: m.id, kind: m.kind, url: m.url });
        }
      }
      cleanup();
      onSave({ text: text.trim(), media: final, members: privacy === "members_only", privacy });
    } catch (e) { setErrors([(e as Error).message]); setBusy(false); }
  };

  return (
    <Modal open title={editing ? (editing.isRepost ? "Edit share" : "Edit post") : "Create post"} onClose={close}
      footer={<><MotionButton className={btnGhost} onClick={close} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} disabled={!canPublish} onClick={publish}>{busy ? <><Loader2 size={16} className="animate-spin" />{editing ? "Saving…" : "Publishing…"}</> : editing ? "Save" : "Publish"}</MotionButton></>}>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Share an update from your gym…"
        className="min-h-[110px] w-full resize-y rounded-[10px] border border-line px-3.5 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50" />
      {!editing?.isRepost && <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}
        className={`cursor-pointer rounded-xl border-[1.5px] border-dashed p-[18px] text-center text-muted ${over ? "border-primary bg-primary-50" : "border-[#c6c9dc] bg-background"}`}>
        <ImageIcon className="mx-auto mb-1" />
        <b className="text-primary">Add photos / videos</b> or drag &amp; drop
        <small className="mt-1 block">JPG, JPEG, PNG, WebP up to 10 MB · MP4, MOV up to 200 MB</small>
        <input ref={fileRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>}
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
        <select id="privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value as PostPrivacy)} className="rounded-[10px] border border-line bg-surface px-3 py-2">
          {(choices.includes(privacy) ? choices : [...choices, privacy]).map((p) => <option key={p} value={p}>{PRIVACY_LABEL[p]}</option>)}
        </select>
      </div>
      <p className={`${hint} -mt-2 text-right`}>{PRIVACY_HINT[privacy]}</p>
    </Modal>
  );
}

/** Our gym's own wall first, then the wider feed: everyone followed, the gyms we belong to, and public posts. */
type Tab = "wall" | FeedType;
const TABS: { key: Tab; label: string }[] = [{ key: "wall", label: "Our gym" }, ...FEED_TABS.map(({ key, label }) => ({ key, label }))];

export default function Feed() {
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>("wall");
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

  // Filters on our own wall. The default (everything, any audience) is the cached wall above; anything else
  // is asked of `GET /posts/my/`, which filters server-side and also returns followers-only and private posts.
  const [kind, setKind] = useState<"all" | "posts" | "shares">("all");
  const [audience, setAudience] = useState<PostPrivacy | "any">("any");
  const [version, setVersion] = useState(0);
  const filtered = kind !== "all" || audience !== "any";
  /** A filtered row may not be in the cached wall at all, so its edit/delete go straight to the API. */
  const direct = async (work: () => Promise<unknown>, done: string, failed: string) => {
    try {
      await work();
      toast(done);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : failed);
    }
    setVersion((v) => v + 1);
    void refreshResource("posts");
  };

  return (
    <section>
      <div role="tablist" aria-label="Feed" className={`${card} mb-4 flex gap-1 overflow-x-auto p-1.5`}>
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold ${tab === t.key ? "bg-primary-50 text-primary" : "text-muted hover:bg-background hover:text-foreground"}`}>{t.label}</button>
        ))}
      </div>

      {tab !== "wall" ? <CommunityFeed key={tab} feedType={tab} /> : (<>
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
          {([["all", "All"], ["posts", "Posts"], ["shares", "Shares"]] as const).map(([k, text]) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${kind === k ? "bg-primary text-white" : "bg-surface text-muted ring-1 ring-line hover:text-foreground"}`}>{text}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[14px] text-muted">
          <span>Audience</span>
          <select aria-label="Filter by audience" value={audience} onChange={(e) => setAudience(e.target.value as PostPrivacy | "any")} className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-foreground">
            <option value="any">Any</option>
            {privacyChoices(!!currentGymId()).map((v) => <option key={v} value={v}>{PRIVACY_LABEL[v]}</option>)}
          </select>
        </label>
      </div>

      {filtered ? (
        <MyPostsList kind={kind} privacy={audience} version={version}
          onEdit={canPost ? (p) => openComposer(p) : undefined} onDelete={canPost ? (p) => setDeleting(p) : undefined} />
      ) : (<>
      {!ready && <div className={`${card} mt-4 h-40 animate-pulse`} />}
      {ready && sorted.length === 0 && <div className={`${card} mt-4 p-10 text-center text-muted`}><EmptyState icon={LuNewspaper} title="No posts yet" hint="Share your first update." /></div>}
      {sorted.slice(0, shown).map((p, i) => <Reveal key={p.id} index={i % 5}><PostCard post={p} onChange={change} onEdit={() => openComposer(p)} onDelete={() => setDeleting(p)} /></Reveal>)}
      {hasMore && <div ref={sentinel} className="mt-4 h-16 animate-pulse rounded-xl border border-line bg-surface" aria-label="Loading more posts" />}
      {ready && sorted.length > 5 && !hasMore && <p className="mt-6 text-center text-sm text-muted">You&apos;re all caught up</p>}
      </>)}
      </>)}

      {composer && (
        <Composer key={composer.key} editing={composer.editing} onClose={() => setComposer(null)}
          onSave={(d) => {
            const editing = composer.editing;
            if (editing && filtered) void direct(() => postsApi.update({ ...editing, ...d }), "Post updated", "Couldn't save that post.");
            else if (editing) setPosts((l) => l.map((x) => (x.id === editing.id ? { ...x, ...d } : x)));
            else setPosts((l) => [{ id: uid(), ...d, pinned: false, createdAt: new Date().toISOString(), likes: 0, likedBy: [], comments: [] }, ...l]);
            setComposer(null);
            if (!(editing && filtered)) toast(editing ? "Post updated" : "Post published");
            if (!editing && filtered) setVersion((v) => v + 1);
          }} />
      )}

      <Modal open={!!deleting} title="Delete post?" onClose={() => setDeleting(null)}
        footer={<><MotionButton className={btnGhost} onClick={() => setDeleting(null)}><LuX size={17} />Cancel</MotionButton>
          <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white" onClick={() => {
            const gone = deleting;
            setDeleting(null);
            if (!gone) return;
            if (filtered) return void direct(() => postsApi.remove(gone.id), "Post deleted", "Couldn't delete that post.");
            setPosts((l) => l.filter((x) => x.id !== gone.id)); toast("Post deleted");
          }}>Delete</button></>}>
        <p>This post, its likes and comments will be removed.</p>
      </Modal>
    </section>
  );
}
