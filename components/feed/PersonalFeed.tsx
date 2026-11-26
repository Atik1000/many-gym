"use client";

/**
 * A person's home when they aren't running a gym: stories, then the community feed — everyone they follow,
 * the gyms they belong to, and public posts. The Studio shows the same tabs next to a gym's own wall; this is
 * that feed without the wall, which needs a gym.
 */
import Link from "next/link";
import { useState } from "react";
import { LuImage, LuMapPin, LuSearch } from "react-icons/lu";
import CommunityFeed from "@/components/studio/CommunityFeed";
import { Composer, type PostDraft } from "@/components/studio/Feed";
import { Avatar, ConfirmModal } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { posts as postsApi } from "@/lib/api/adapters";
import { ApiError } from "@/lib/api/http";
import type { Post } from "@/lib/posts";
import Stories from "@/components/studio/Stories";
import { useAuth } from "@/components/AuthProvider";
import { FEED_TABS, type FeedType } from "@/lib/api/feed";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

export default function PersonalFeed() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<FeedType>("all");
  // Composer: `null` closed; `editing` null for a new post.
  const [composer, setComposer] = useState<{ key: number; editing: Post | null } | null>(null);
  // What this person published (or edited) here, shown at the top of the feed right away.
  const [mine, setMine] = useState<Post[]>([]);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const open = (editing: Post | null = null) => setComposer({ key: Date.now(), editing });

  /** `POST /posts/` (or PATCH when editing) under the personal token — the server posts as this person. */
  const save = async (d: PostDraft) => {
    const editing = composer?.editing ?? null;
    const draft: Post = editing
      ? { ...editing, ...d }
      : { id: "", ...d, pinned: false, createdAt: new Date().toISOString(), likes: 0, likedBy: [], comments: [] };
    const saved = editing ? await postsApi.update(draft) : await postsApi.create(draft);
    setMine((l) => (editing ? l.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...l]));
    setComposer(null);
    toast(editing ? "Post updated" : "Post published");
  };

  const remove = async () => {
    const gone = deleting;
    setDeleting(null);
    if (!gone) return;
    try {
      await postsApi.remove(gone.id);
      setMine((l) => l.filter((p) => p.id !== gone.id));
      toast("Post deleted");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't delete that post.");
    }
  };
  return (
    <div className="mx-auto grid max-w-[720px] gap-4">
      <section className={`${card} flex flex-wrap items-center gap-3 p-4`}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Welcome"}</h2>
          <p className="text-muted">Find a gym to join and people to follow — their posts show up here.</p>
        </div>
        <Link href="/gyms" className={btnGhost}><LuMapPin size={17} />Find gyms</Link>
        <Link href="/search?tab=people" className={btnGhost}><LuSearch size={17} />Find people</Link>
      </section>

      <Stories />

      {user && (
        <section className={`${card} grid grid-cols-[44px_minmax(0,1fr)] gap-3 p-4`} aria-label="Create a post">
          <Avatar name={user.name || "You"} size={44} />
          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={() => open()} className="w-full rounded-[10px] border border-line bg-background px-3.5 py-3 text-left text-muted hover:border-primary/40">
              What&apos;s on your mind{user.name ? `, ${user.name.split(" ")[0]}` : ""}?
            </button>
            <div className="flex justify-between gap-2.5">
              <button type="button" className={btnGhost} onClick={() => open()}><LuImage size={17} />Photo / Video</button>
              <button type="button" className={btnPrimary} onClick={() => open()}>Create post</button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div role="tablist" aria-label="Feed" className={`${card} flex gap-1 overflow-x-auto p-1.5`}>
          {FEED_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold ${tab === t.key ? "bg-primary-50 text-primary" : "text-muted hover:bg-background hover:text-foreground"}`}>{t.label}</button>
          ))}
        </div>
        <CommunityFeed key={tab} feedType={tab} top={mine} onTopChange={(n) => setMine((l) => l.map((p) => (p.id === n.id ? n : p)))} onTopEdit={(p) => open(p)} onTopDelete={setDeleting} />
      </section>

      {composer && <Composer key={composer.key} editing={composer.editing} onClose={() => setComposer(null)} onSave={save} />}
      <ConfirmModal open={!!deleting} title="Delete post?" onClose={() => setDeleting(null)} onConfirm={() => void remove()}
        body={<>This post, its reactions and comments will be removed for everyone.</>} />
    </div>
  );
}
