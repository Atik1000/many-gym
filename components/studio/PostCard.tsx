"use client";

/**
 * One post, wherever it is shown: this gym's own wall (where staff can pin, edit and delete it) or the
 * community feed (someone else's post — follow, comment and share only).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuClock, LuEyeOff, LuGlobe, LuLink2, LuLock, LuMessageSquare, LuEllipsis, LuPencil, LuPin, LuPlay, LuRepeat2, LuShare2, LuTrash2, LuUserMinus, LuUserPlus, LuUsers, LuCircleDashed } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { useGym } from "@/lib/api";
import { currentGymId } from "@/lib/api/http";
import * as social from "@/lib/api/social";
import { PRIVACY_LABEL, accountSlug, mediaPath, postPath, privacyOf, timeAgo, type Post, type PostMedia, type PostPrivacy } from "@/lib/posts";
import { card } from "@/lib/ui";
import Comments from "./Comments";
import { ReactionButton, ReactionSummaryChip, useReactions } from "./Reactions";
import RepostsModal from "./RepostsModal";
import ShareModal from "./ShareModal";
import StoryComposer from "./StoryComposer";

const PRIVACY_ICON: Record<PostPrivacy, IconType> = { public: LuGlobe, followers: LuUsers, members_only: LuLock, private: LuEyeOff };

export function Logo({ size = 44 }: { size?: number }) {
  const [gym] = useGym();
  const url = gym?.overview.profileUrl;
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  return <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-black text-[9px] font-extrabold text-white">GYM</span>;
}

/**
 * A post's photos and videos. On this gym's own posts each tile links to that file's own page
 * (/studio/<account>/posts/<post>/media/<media>); those pages only exist for this gym's posts, so anyone
 * else's media opens the file itself.
 */
function Media({ items, account, postId, internal }: { items: PostMedia[]; account: string; postId: string; internal: boolean }) {
  if (items.length === 0) return null;
  const cols = items.length === 1 ? 1 : items.length === 2 ? 2 : 3;
  const tile = `relative block overflow-hidden rounded-[10px] bg-black ${items.length === 1 ? "aspect-[16/7]" : "aspect-[4/3]"}`;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map((m) => {
        const inner = (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.kind === "image" ? <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <video src={m.url} poster={m.thumbnailUrl} muted preload="metadata" className="h-full w-full object-cover" />}
          {m.kind === "video" && <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white"><LuPlay size={20} fill="currentColor" /></span></span>}
        </>);
        const name = m.kind === "video" ? "Open video" : "Open photo";
        return internal
          ? <Link key={m.id} href={mediaPath(account, postId, m.id)} aria-label={name} className={tile}>{inner}</Link>
          : <a key={m.id} href={m.url} target="_blank" rel="noreferrer" aria-label={`${name} in a new tab`} className={tile}>{inner}</a>;
      })}
    </div>
  );
}

/** Whose page a post is on: the gym's, or — for a personal post — the author's. */
const ownerOf = (p: Post) =>
  p.ownerType === "user"
    ? { kind: "user" as const, id: p.author?.userId ?? "", name: p.author?.name || "Someone", avatar: p.author?.avatarUrl ?? "" }
    : { kind: "gym" as const, id: p.gym?.id ?? "", name: p.gym?.name || p.author?.name || "A gym", avatar: p.gym?.avatarUrl ?? "" };

/** The original inside a share. */
function SourcePost({ post }: { post: Post }) {
  const owner = ownerOf(post);
  const Privacy = PRIVACY_ICON[privacyOf(post)];
  return (
    <div className="mt-3 rounded-xl border border-line p-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={owner.name} size={32} src={owner.avatar} />
        <div className="min-w-0">
          <b className="block truncate text-[14px]">{owner.id ? <Link href={owner.kind === "gym" ? `/gyms/${owner.id}` : `/users/${owner.id}`} className="hover:underline">{owner.name}</Link> : owner.name}</b>
          <small className="flex items-center gap-1.5 text-muted">
            {owner.kind === "gym" && post.author?.name && <><span className="truncate">{post.author.name}</span> · </>}
            {timeAgo(post.createdAt)} · <Privacy size={12} aria-label={PRIVACY_LABEL[privacyOf(post)]} />
          </small>
        </div>
      </div>
      {post.text && <p className="my-2.5 whitespace-pre-wrap text-[15px]">{post.text}</p>}
      <div className={post.text ? "" : "mt-2.5"}><Media items={post.media} account="" postId={post.id} internal={false} /></div>
    </div>
  );
}

export function PostCard({ post, onChange, onEdit, onDelete, onFollowChange }: {
  post: Post;
  onChange: (p: Post) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Told when the reader follows or unfollows the post's owner, so sibling cards can update too. */
  onFollowChange?: (target: { kind: "gym" | "user"; id: string }, following: boolean) => void;
}) {
  const { can, user } = useAuth();
  const [gym] = useGym();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [sharing, setSharing] = useState<"profile" | "story" | null>(null);
  const [showComments, setShowComments] = useState(false);
  // Counters move as people comment and share from this card; the list is not refetched for that.
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? post.comments.length);
  const [shareCount, setShareCount] = useState(post.repostsCount ?? 0);
  const [showShares, setShowShares] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [followBusy, setFollowBusy] = useState(false);

  const owner = ownerOf(post);
  // A post with no owner details is one this screen just created, before the server's copy arrives.
  const own = owner.kind === "user" ? !!user && owner.id === user.id : !owner.id || owner.id === currentGymId();
  // A person manages their own posts; a gym's need the gym permission.
  const canManage = own && (owner.kind === "user" || can("Edit studio information"));
  const account = accountSlug(gym?.overview.name ?? "");
  const link = postPath(account, post.id);
  const [reactions, watchReactions] = useReactions({ kind: "post", id: post.id }, post.reactionsCount ?? 0);
  const following = owner.kind === "gym" ? post.followingGym : post.followingAuthor;
  const privacy = privacyOf(post);
  const Privacy = PRIVACY_ICON[privacy];
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-background";
  const asGym = !!currentGymId();
  // What a story made from this post would show: the post's own media, or the original's for a share.
  const lead = post.media[0] ?? post.source?.media[0];


  // A follow made anywhere on screen (another card, a profile button, a list) shows here too.
  const sync = useRef({ post, onChange, following });
  useEffect(() => { sync.current = { post, onChange, following }; });
  useEffect(() => {
    if (!owner.id) return;
    return social.onFollowChange((c) => {
      if (c.target.kind !== owner.kind || c.target.id !== owner.id) return;
      setRequestId(c.requestId);
      setRequested(c.state === "pending");
      const now = c.state === "following";
      const s = sync.current;
      if (now !== !!s.following) s.onChange(owner.kind === "gym" ? { ...s.post, followingGym: now } : { ...s.post, followingAuthor: now });
    });
  }, [owner.id, owner.kind]);

  const setFollow = async (follow: boolean) => {
    if (!owner.id) return;
    setFollowBusy(true);
    try {
      const res = requested && !follow && owner.kind === "user"
        ? await social.cancelFollowRequest(owner.id, requestId)
        : await social.setFollowing({ id: owner.id, kind: owner.kind }, follow);
      const now = res.state === "following";
      onFollowChange?.({ kind: owner.kind, id: owner.id }, now);
      toast(res.state === "pending" ? `Follow request sent to ${owner.name}` : now ? `Following ${owner.name}` : requested ? "Follow request withdrawn" : `Unfollowed ${owner.name}`);
    } catch (e) {
      toast(social.followProblem(e));
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <article className={`${card} mt-4 px-[18px] py-4`}>
      <div className="flex items-center gap-3">
        {own && owner.kind === "gym" ? <Logo /> : <Avatar name={owner.name} size={44} src={owner.avatar} />}
        <div className="min-w-0">
          <b className="flex flex-wrap items-center gap-x-2">
            {own && owner.kind === "gym"
              ? <span className="truncate">{gym?.overview.name ?? owner.name}</span>
              : owner.id
                ? <Link href={owner.kind === "gym" ? `/gyms/${owner.id}` : `/users/${owner.id}`} className="truncate hover:underline">{owner.name}</Link>
                : <span className="truncate">{owner.name}</span>}
            {post.isRepost && <span className="inline-flex items-center gap-1 text-[13px] font-normal text-muted"><LuRepeat2 size={14} />shared a post</span>}
          </b>
          <small className="flex flex-wrap items-center gap-x-1.5 text-muted">
            {/* A gym post names the person who wrote it; a personal post's author is already the title. */}
            {owner.kind === "gym" && post.author?.name && <><span className="text-foreground">{post.author.name}</span> · </>}
            {own ? <Link href={link} className="hover:underline" title="Open post">{timeAgo(post.createdAt)}</Link> : <span>{timeAgo(post.createdAt)}</span>} · <Privacy size={12} /> {PRIVACY_LABEL[privacy]}
          </small>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {post.pinned && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary"><LuPin size={12} />Pinned</span>}
          {!own && post.connectedGym && <Pill tone="purple">My gym</Pill>}
          {!own && owner.id && (requested
            ? <button disabled={followBusy} onClick={() => void setFollow(false)} title="Waiting for them to confirm — press to withdraw" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[13px] font-semibold text-muted hover:bg-background disabled:opacity-50"><LuClock size={14} />Requested</button>
            : following
              ? <span className="text-[13px] font-semibold text-muted">Following</span>
              : <button disabled={followBusy} onClick={() => void setFollow(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1 text-[13px] font-semibold text-primary hover:bg-primary-50/70 disabled:opacity-50"><LuUserPlus size={14} />Follow</button>)}
          <div className="relative">
            <button aria-label="Post options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)} className="rounded-lg p-1 text-muted hover:bg-background"><LuEllipsis size={20} /></button>
            {menu && (<>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-8 z-20 min-w-[200px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl" onClick={() => setMenu(false)}>
                {canManage && <button role="menuitem" className={item} onClick={() => { onChange({ ...post, pinned: !post.pinned }); toast(post.pinned ? "Post unpinned" : "Post pinned"); }}><LuPin size={16} />{post.pinned ? "Unpin post" : "Pin post"}</button>}
                {canManage && onEdit && <button role="menuitem" className={item} onClick={onEdit}><LuPencil size={16} />{post.isRepost ? "Edit share" : "Edit post"}</button>}
                {own && <button role="menuitem" className={item} onClick={() => { void navigator.clipboard?.writeText(`${location.origin}${link}`); toast("Post link copied"); }}><LuLink2 size={16} />Copy post link</button>}
                {!own && following && <button role="menuitem" className={item} onClick={() => void setFollow(false)}><LuUserMinus size={16} />Unfollow {owner.name}</button>}
                {!own && !following && !requested && owner.id && <button role="menuitem" className={item} onClick={() => void setFollow(true)}><LuUserPlus size={16} />Follow {owner.name}</button>}
                {canManage && onDelete && <button role="menuitem" className={`${item} text-bad`} onClick={onDelete}><LuTrash2 size={16} />{post.isRepost ? "Delete share" : "Delete post"}</button>}
              </div>
            </>)}
          </div>
        </div>
      </div>

      {post.text && <p className="my-3 whitespace-pre-wrap text-[15px]">{post.text}</p>}
      <div className={post.text ? "" : post.media.length ? "mt-3" : ""}><Media items={post.media} account={account} postId={post.id} internal={own} /></div>
      {post.isRepost && (post.source
        ? <SourcePost post={post.source} />
        : <p className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-line bg-background px-3 py-3 text-muted"><LuCircleDashed size={16} />This post is no longer available. It may have been deleted, or its audience changed.</p>)}

      <div ref={watchReactions} className="mt-1 flex justify-between border-b border-line py-2.5 text-[13px] text-muted">
        <ReactionSummaryChip state={reactions} />
        <span className="ml-auto flex gap-3">
          <button onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} className="hover:underline">{commentCount} comment{commentCount === 1 ? "" : "s"}</button>
          {shareCount > 0 && <button onClick={() => setShowShares(true)} className="hover:underline">{shareCount} share{shareCount === 1 ? "" : "s"}</button>}
        </span>
      </div>
      <div className="grid grid-cols-3 text-muted">
        <ReactionButton state={reactions} />
        <button onClick={() => setShowComments(true)} className="flex items-center justify-center gap-2 rounded-lg p-2.5 font-semibold hover:bg-background"><LuMessageSquare size={18} />Comment</button>
        <div className="relative">
          <button onClick={() => setShareMenu((v) => !v)} aria-haspopup="menu" aria-expanded={shareMenu} className="flex w-full items-center justify-center gap-2 rounded-lg p-2.5 font-semibold hover:bg-background"><LuShare2 size={18} />Share</button>
          {shareMenu && (<>
            <div className="fixed inset-0 z-10" onClick={() => setShareMenu(false)} />
            <div role="menu" className="absolute bottom-12 right-0 z-20 min-w-[230px] rounded-[10px] border border-line bg-surface p-1.5 text-foreground shadow-xl" onClick={() => setShareMenu(false)}>
              <button role="menuitem" className={item} onClick={() => setSharing("profile")}><LuRepeat2 size={16} />{asGym ? "Share on your gym's page" : "Share on my profile"}</button>
              <button role="menuitem" className={item} onClick={() => setSharing("story")}><LuCircleDashed size={16} />Share to moment</button>
            </div>
          </>)}
        </div>
      </div>

      {showComments && <Comments postId={post.id} count={commentCount} onCountChange={setCommentCount} canModerate={canManage} autoFocus />}

      {showShares && <RepostsModal postId={post.id} onClose={() => setShowShares(false)} />}
      {sharing === "profile" && <ShareModal post={post} onClose={() => setSharing(null)} onShared={() => setShareCount((n) => n + 1)} />}
      {sharing === "story" && (
        <StoryComposer
          sourcePost={{ id: post.id, text: post.text || post.source?.text || "", previewUrl: lead?.thumbnailUrl || lead?.url, kind: lead?.kind }}
          onClose={() => setSharing(null)}
          onCreated={() => setShareCount((n) => n + 1)}
        />
      )}
    </article>
  );
}
