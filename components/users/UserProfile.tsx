"use client";

/**
 * A person's public profile — `GET /users/{user_id}/profile/about/` plus the posts on their own profile
 * (`GET /posts/?user_id=…&owner_type=user`).
 *
 * The server decides what a visitor gets: a private profile answers 403 unless the viewer follows them, a
 * blocked viewer gets 403 too, a deactivated account 400 and a deleted one 404. Sections arrive empty when
 * there is nothing to show, so each is rendered only when it has content.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LuArrowLeft, LuCake, LuExternalLink, LuGraduationCap, LuHouse, LuLock, LuMail, LuMapPin, LuMessageSquare, LuPencil, LuPhone, LuQuote, LuUser, LuUserX } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuth } from "@/components/AuthProvider";
import { PostCard } from "@/components/studio/PostCard";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, EmptyState, Pill } from "@/components/ui/parts";
import { ApiError, mediaUrl } from "@/lib/api/http";
import * as profile from "@/lib/api/profile";
import * as social from "@/lib/api/social";
import { fmtDate } from "@/lib/dates";
import type { Post } from "@/lib/posts";
import { btnGhost, card } from "@/lib/ui";
import FollowButton from "./FollowButton";

type Problem = { icon: IconType; title: string; hint: string };

const problemOf = (e: unknown): Problem => {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 403) return { icon: LuLock, title: "This profile is private", hint: "Only people they've accepted as followers can see it." };
  if (status === 404) return { icon: LuUserX, title: "Profile not found", hint: "This account doesn't exist or has been deleted." };
  if (status === 400) return { icon: LuUserX, title: "This profile isn't available", hint: e instanceof ApiError && !e.message.startsWith("Request failed") ? e.message : "The account may have been deactivated." };
  return { icon: LuUser, title: "Couldn't load this profile", hint: e instanceof ApiError ? e.message : "Check your connection and try again." };
};

const Row = ({ icon: Icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <Icon size={17} className="mt-0.5 shrink-0 text-muted" />
    <div className="min-w-0"><dt className="text-[13px] text-muted">{label}</dt><dd className="break-words font-semibold">{children}</dd></div>
  </div>
);

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [about, setAbout] = useState<profile.About | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followState, setFollowState] = useState<social.FollowState>("none");
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const mine = !!user && user.id === id;
  const meId = user?.id ?? "";

  const load = useCallback(async () => {
    setProblem(null);
    try {
      setAbout(await profile.userAbout(id));
    } catch (e) {
      setAbout(null);
      setProblem(problemOf(e));
      return;
    }
    // The posts are a separate request; a profile is still worth showing if they don't load.
    try {
      const first = await profile.userPosts(id);
      setPosts(first.posts);
      setHasMore(first.hasMore);
      setPage(1);
      // The About payload doesn't say whether the viewer follows this person; their posts do.
      if (first.posts.some((p) => p.followingAuthor)) setFollowState("following");
    } catch {
      setPosts([]);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // The About payload has no `is_following`, and someone with no visible posts gives no hint either — so
  // check my own following list, and the requests I've sent that are still waiting for an answer.
  useEffect(() => {
    if (mine || !meId) return;
    let live = true;
    social.followingOf({ id: meId, kind: "user" })
      .then((raw) => {
        const rows = Array.isArray(raw) ? raw : ((raw as { results?: unknown[] } | null)?.results ?? []);
        const follows = rows.some((r) => { const o = (r ?? {}) as Record<string, unknown>; return o.user_id === id || o.id === id; });
        if (live && follows) setFollowState("following");
      })
      .catch(() => undefined);
    social.followRequests("sent")
      .then((list) => {
        const mineToThem = list.find((r) => r.target.id === id);
        if (!live || !mineToThem) return;
        setRequestId(mineToThem.id);
        setFollowState((s) => (s === "none" ? "pending" : s));
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [id, mine, meId]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const next = await profile.userPosts(id, page + 1);
      setPosts((prev) => {
        const seen = new Set((prev ?? []).map((p) => p.id));
        return [...(prev ?? []), ...next.posts.filter((p) => !seen.has(p.id))];
      });
      setPage(page + 1);
      setHasMore(next.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  if (problem) {
    return (
      <div className="mx-auto max-w-[760px]">
        <div className={`${card} p-10 text-center`}>
          <EmptyState icon={problem.icon} title={problem.title} hint={problem.hint} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {problem.icon === LuLock && !mine && <FollowButton userId={id} name="this account" initial={followState} onState={(s) => { setFollowState(s); if (s === "following") void load(); }} />}
            {problem.icon === LuUser && <MotionButton className={btnGhost} onClick={() => void load()}>Try again</MotionButton>}
            <Link href="/find-people" className={btnGhost}><LuArrowLeft size={17} />Find people</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!about) return <div className={`${card} mx-auto h-[400px] max-w-[760px] animate-pulse`} />;

  const name = `${about.first_name} ${about.last_name}`.trim() || "manygym member";
  const p = about.personal_details;
  const d = about.details_about_you;
  const c = about.contact_info;
  const hasPersonal = !!(p.current_address || p.home_town || p.date_of_birth || p.gender);
  const hasContact = !!(c.email || c.phone_number);
  const links = c.social_links.map((l) => ({ ...l, href: profile.safeLink(l.link) })).filter((l) => l.href);
  const education = [...about.education_list].sort((a, b) => b.from_year.localeCompare(a.from_year));
  const gender = profile.GENDERS.find(([v]) => v === p.gender)?.[1];
  const nothing = !hasPersonal && !hasContact && !d.about_you && !d.favourite_quote && !about.hobbies.length && !education.length && !links.length;

  return (
    <div className="mx-auto grid max-w-[760px] gap-5">
      <section className={`${card} flex flex-wrap items-center gap-4 p-6`}>
        <Avatar name={name} size={84} src={mediaUrl(about.avatar_url)} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold"><span className="truncate">{name}</span>{about.is_private && <Pill tone="gray"><LuLock size={12} className="mr-1 inline" />Private</Pill>}</h1>
          {d.about_you && <p className="mt-1 whitespace-pre-wrap text-muted">{d.about_you}</p>}
        </div>
        {mine
          ? <Link href="/settings?tab=profile" className={btnGhost}><LuPencil size={17} />Edit profile</Link>
          : (
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/messages?user=${encodeURIComponent(about.user_id || id)}`} className={btnGhost}><LuMessageSquare size={17} />Message</Link>
              <FollowButton key={followState} userId={about.user_id || id} name={name} initial={followState} requestId={requestId} onState={setFollowState} />
            </span>
          )}
      </section>

      {d.favourite_quote && (
        <section className={`${card} flex gap-3 p-6`}>
          <LuQuote size={20} className="shrink-0 text-primary" />
          <blockquote className="whitespace-pre-wrap text-[17px] italic">{d.favourite_quote}</blockquote>
        </section>
      )}

      {(hasPersonal || hasContact) && (
        <section className={`${card} p-6`}>
          <h2 className="text-lg font-bold">About</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {p.current_address && <Row icon={LuMapPin} label="Lives at">{p.current_address}</Row>}
            {p.home_town && <Row icon={LuHouse} label="Home town">{p.home_town}</Row>}
            {p.date_of_birth && <Row icon={LuCake} label="Date of birth">{fmtDate(p.date_of_birth)}</Row>}
            {gender && <Row icon={LuUser} label="Gender">{gender}</Row>}
            {c.email && <Row icon={LuMail} label="Email"><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></Row>}
            {c.phone_number && <Row icon={LuPhone} label="Phone"><a href={`tel:${c.phone_number.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">{c.phone_number}</a></Row>}
          </dl>
        </section>
      )}

      {about.hobbies.length > 0 && (
        <section className={`${card} p-6`}>
          <h2 className="text-lg font-bold">Hobbies</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{about.hobbies.map((h) => <li key={h} className="rounded-full bg-background px-3 py-1 text-[14px]">{h}</li>)}</ul>
        </section>
      )}

      {education.length > 0 && (
        <section className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 text-lg font-bold"><LuGraduationCap size={19} />Education</h2>
          <ul className="mt-3 grid gap-3">
            {education.map((ed) => (
              <li key={ed.id} className="rounded-xl bg-background px-4 py-3">
                <b className="block">{ed.university_name}</b>
                <span className="block text-muted">{ed.subject}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  {fmtDate(ed.from_year)} – {ed.till_year ? fmtDate(ed.till_year) : "Present"}{ed.graduated && <Pill tone="green">Graduated</Pill>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {links.length > 0 && (
        <section className={`${card} p-6`}>
          <h2 className="text-lg font-bold">Links</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.href!} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-semibold hover:border-primary hover:text-primary">
                  {profile.platformLabel(l.platform)}<LuExternalLink size={14} /><span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothing && <section className={`${card} p-8 text-center text-muted`}>{mine ? "Your profile is empty. Add some details so people know who you are." : `${name} hasn't added any details yet.`}</section>}

      <section>
        <h2 className="px-1 text-lg font-bold">Posts</h2>
        {posts === null && <div className={`${card} mt-4 h-40 animate-pulse`} />}
        {posts?.length === 0 && <div className={`${card} mt-4 p-8 text-center text-muted`}>No posts to show.</div>}
        {posts?.map((post) => <PostCard key={post.id} post={post} onChange={(next) => setPosts((list) => (list ?? []).map((x) => (x.id === next.id ? next : x)))} />)}
        {hasMore && <div className="mt-4 text-center"><MotionButton className={btnGhost} disabled={loadingMore} onClick={() => void more()}>{loadingMore ? "Loading…" : "Show more posts"}</MotionButton></div>}
      </section>
    </div>
  );
}
