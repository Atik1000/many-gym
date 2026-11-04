"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuCopy, LuLink2 } from "react-icons/lu";
import { EmptyState } from "@/components/ui/parts";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import { useGym, useResource } from "@/lib/api";
import { accountSlug, mediaPath, postPath, timeAgo, type Post } from "@/lib/posts";
import { postActions } from "@/lib/api/actions";
import * as api from "@/lib/api/endpoints";
import { postFromApi } from "@/lib/api/adapters";
import { currentGymId } from "@/lib/api/http";
import { LuImagePlus } from "react-icons/lu";
import { btnGhost, card, hint, input, label } from "@/lib/ui";
import { PostCard } from "./Feed";

/** Shows a link's full URL with a copy button. */
function LinkBox({ title, path }: { title: string; path: string }) {
  const toast = useToast();
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  return (
    <div className={`${card} mt-4 p-4`}>
      <span className={label}><LuLink2 className="mr-1.5 inline" size={15} />{title}</span>
      <div className="flex gap-2">
        <input readOnly aria-label={title} className={`${input} text-[13px]`} value={url} onFocus={(e) => e.currentTarget.select()} />
        <MotionButton className={btnGhost} onClick={() => { void navigator.clipboard?.writeText(url); toast("Link copied"); }}><LuCopy size={17} />Copy</MotionButton>
      </div>
    </div>
  );
}

/** Loads the post named in the URL, but only if it belongs to the account named in the URL. */
function useRoutePost(account: string, postId: string) {
  const [posts, setPosts, ready] = useResource<Post>("posts");
  const [gym, , gymReady] = useGym();
  const [fetched, setFetched] = useState<Post | null>(null);
  const [tried, setTried] = useState(false);
  const cached = posts.find((p) => p.id === postId);

  // A post opened straight from its link may not be in the loaded feed page, so fall back to
  // `GET /posts/{id}/` rather than showing "not found" for a post that exists.
  useEffect(() => {
    const gymId = currentGymId();
    if (cached || !ready || !gymId || tried) return;
    let live = true;
    void Promise.resolve()
      .then(() => {
        if (!live) return;
        setTried(true);
        return api.postsRetrieve(postId, { gym_id: gymId });
      })
      .then((r) => live && r && setFetched(postFromApi(r)))
      .catch(() => live && setFetched(null));
    return () => { live = false; };
  }, [cached, ready, postId, tried]);

  const post = cached ?? fetched ?? undefined;
  const settled = ready && gymReady && (!!cached || tried);
  const ok = !!post && !!gym && accountSlug(gym.overview.name) === account;
  return { post, ok, ready: settled, account, gymName: gym?.overview.name ?? "", setPosts };
}

const NotFound = () => (
  <div className={`${card} p-10`}><EmptyState icon={LuLink2} title="This link doesn't match a post" hint="The post may have been deleted, or the account in the link is different." /></div>
);
const Back = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="mb-3 inline-flex items-center gap-1.5 font-semibold text-primary"><LuArrowLeft size={16} />{children}</Link>;

export function PostView({ account, postId }: { account: string; postId: string }) {
  const { post, ok, ready, setPosts } = useRoutePost(account, postId);
  if (!ready) return <div className={`${card} h-48 animate-pulse`} />;
  if (!ok || !post) return <><Back href="/studio">Back to Studio</Back><NotFound /></>;
  return (
    <div className="mx-auto max-w-[720px]">
      <Back href="/studio">Back to Studio</Back>
      <PostCard post={post} onChange={(p) => setPosts((l) => l.map((x) => (x.id === p.id ? p : x)))} />
      <LinkBox title="Post link" path={postPath(account, post.id)} />
    </div>
  );
}

export function MediaView({ account, postId, mediaId }: { account: string; postId: string; mediaId: string }) {
  const router = useRouter();
  const { post, ok, ready, gymName } = useRoutePost(account, postId);
  const media = useMemo(() => post?.media ?? [], [post]);
  const index = media.findIndex((m) => m.id === mediaId);
  const go = useCallback((d: number) => { if (post && media.length > 1) router.replace(mediaPath(account, post.id, media[(index + d + media.length) % media.length].id)); }, [account, index, media, post, router]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!ready) return <div className={`${card} h-72 animate-pulse`} />;
  if (!ok || !post || index < 0) return <><Back href="/studio/history">Back to History</Back><NotFound /></>;
  const m = media[index];
  const nav = "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/35";
  return (
    <div className="mx-auto max-w-[960px]">
      <Back href={postPath(account, post.id)}>Back to post</Back>
      <div className={`${card} overflow-hidden`}>
        <div className="relative grid min-h-[320px] place-items-center bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.kind === "image" ? <img key={m.id} src={m.url} alt={post.text} className="max-h-[70vh] w-full object-contain" /> : <video key={m.id} src={m.url} controls className="max-h-[70vh] w-full" />}
          {media.length > 1 && <>
            <button aria-label="Previous" onClick={() => go(-1)} className={`${nav} left-3`}><LuChevronLeft size={24} /></button>
            <button aria-label="Next" onClick={() => go(1)} className={`${nav} right-3`}><LuChevronRight size={24} /></button>
          </>}
        </div>
        <div className="p-5">
          <p className="font-semibold">{gymName}</p>
          <p className="text-[13px] text-muted">{timeAgo(post.createdAt)} · {m.kind === "video" ? "Video" : "Photo"} {index + 1} of {media.length}</p>
          {post.text && <p className="mt-3 whitespace-pre-wrap">{post.text}</p>}
          {m.kind === "video" && <VideoThumbnail postId={post.id} mediaId={m.id} />}
          <p className={`${hint} mt-3`}>This file&apos;s link includes the account and the post it came from.</p>
        </div>
      </div>
      <LinkBox title="Media link" path={mediaPath(account, post.id, m.id)} />
      <LinkBox title="Post link" path={postPath(account, post.id)} />
    </div>
  );
}


/**
 * A custom poster frame for a video — `PATCH /posts/{id}/media/{mediaId}/thumbnail/`.
 *
 * This is the only endpoint in the API that accepts a real file upload (multipart `thumbnail_image`, ≤10MB);
 * every other media field takes a URL that must already be hosted.
 */
function VideoThumbnail({ postId, mediaId }: { postId: string; mediaId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast("Choose an image under 10 MB");
    setBusy(true);
    const problem = await postActions.setVideoThumbnail(postId, mediaId, file);
    setBusy(false);
    toast(problem ?? "Thumbnail updated");
  };

  return (
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 font-semibold text-primary">
      <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={pick} />
      <LuImagePlus size={16} />{busy ? "Uploading…" : "Set a custom thumbnail"}
    </label>
  );
}
