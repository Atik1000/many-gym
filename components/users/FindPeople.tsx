"use client";

/**
 * Find People — look someone up, follow them, open their profile or start a chat.
 *
 * **There is no people-search endpoint in the API.** The only way to look a user up by name or email is
 * `GET /users/settings/blocked-users/search/?q=` ("Search Users to Block"), so that is what this page uses as
 * the directory. It behaves like one — matches first name, last name or email, leaves out yourself — with one
 * quirk inherited from its real purpose: people you have blocked never appear. A proper `/users/search/`
 * (with `is_following` on each row) is requested in docs/api/known-issues.md.
 *
 * A search row doesn't say whether you already follow the person, so that is worked out here: "Requested"
 * from the follow requests you have sent, "Following" from your own following list. Both are fetched once.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuMessageSquare, LuSearch, LuUsers } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, EmptyState } from "@/components/ui/parts";
import { ApiError, mediaUrl } from "@/lib/api/http";
import * as social from "@/lib/api/social";
import { searchUsersToBlock } from "@/lib/api/user-settings";
import { btnGhost, card, hint, input } from "@/lib/ui";
import FollowButton from "./FollowButton";

type PersonRow = { id: string; name: string; email: string; avatarUrl: string };

const MIN_CHARS = 2;

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Search rows carry `id`; follower/following rows carry `user_id`. Either way, one shape out. */
function toPerson(raw: unknown): PersonRow {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const inner = (o.user && typeof o.user === "object" ? o.user : o) as Record<string, unknown>;
  const name = str(inner.full_name) || `${str(inner.first_name)} ${str(inner.last_name)}`.trim() || str(inner.email) || "manygym member";
  return { id: str(o.user_id) || str(inner.user_id) || str(inner.id) || str(o.id), name, email: str(inner.email), avatarUrl: str(inner.avatar_url) };
}

const listOf = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  const o = (raw ?? {}) as { results?: unknown; followers?: unknown; following?: unknown };
  for (const v of [o.results, o.followers, o.following]) if (Array.isArray(v)) return v;
  return [];
};

const people = (raw: unknown, meId: string): PersonRow[] => {
  const seen = new Set<string>();
  return listOf(raw).map(toPerson).filter((p) => p.id && p.id !== meId && !seen.has(p.id) && !!seen.add(p.id));
};

export default function FindPeople() {
  const { user } = useAuth();
  const meId = user?.id ?? "";

  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonRow[] | null>(null);
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [following, setFollowing] = useState<PersonRow[]>([]);
  const [followers, setFollowers] = useState<PersonRow[]>([]);
  /** user id → request id, for requests still waiting on the other person. */
  const [requested, setRequested] = useState<Map<string, string>>(new Map());
  const [seeded, setSeeded] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Who I follow, who follows me, and which requests are still pending — once.
  useEffect(() => {
    if (!meId) return;
    let live = true;
    const me = { id: meId, kind: "user" as const };
    void Promise.allSettled([social.followingOf(me), social.followersOf(me), social.followRequests("sent")]).then(([a, b, c]) => {
      if (!live) return;
      if (a.status === "fulfilled") setFollowing(people(a.value, meId));
      if (b.status === "fulfilled") setFollowers(people(b.value, meId));
      if (c.status === "fulfilled") setRequested(new Map(c.value.filter((r) => r.target.id && r.target.id !== meId).map((r) => [r.target.id, r.id])));
      setSeeded(true);
    });
    return () => { live = false; };
  }, [meId]);

  // Debounced search; a newer keystroke cancels the request an older one started.
  const term = q.trim();
  useEffect(() => {
    abort.current?.abort();
    if (term.length < MIN_CHARS) {
      const t = setTimeout(() => { setResults(null); setError(""); setLoading(false); }, 0);
      return () => clearTimeout(t);
    }
    const ctl = new AbortController();
    abort.current = ctl;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      searchUsersToBlock(term, ctl.signal)
        .then((rows) => {
          if (ctl.signal.aborted) return;
          setResults(people(rows, meId));
          setSearched(term);
        })
        .catch((e) => {
          if (ctl.signal.aborted || (e as Error)?.name === "AbortError") return;
          setResults(null);
          setError(e instanceof ApiError ? e.message : "Couldn't search right now.");
        })
        .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term, meId, attempt]);

  const followingIds = new Set(following.map((p) => p.id));
  const stateOf = (id: string): social.FollowState => (followingIds.has(id) ? "following" : requested.has(id) ? "pending" : "none");

  /** Keep the lists in step when a button changes something, so the same person reads the same everywhere. */
  const onState = useCallback((p: PersonRow, s: social.FollowState) => {
    setFollowing((list) => (s === "following" ? (list.some((x) => x.id === p.id) ? list : [p, ...list]) : list.filter((x) => x.id !== p.id)));
    setRequested((m) => {
      const next = new Map(m);
      if (s === "pending") next.set(p.id, m.get(p.id) ?? "");
      else next.delete(p.id);
      return next;
    });
  }, []);

  const row = (p: PersonRow) => (
    <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-background px-3 py-2.5">
      <Link href={`/users/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${p.name}'s profile`}>
        <Avatar name={p.name} size={42} src={mediaUrl(p.avatarUrl)} />
        <span className="min-w-0">
          <b className="block truncate hover:underline">{p.name}</b>
          {p.email && <span className="block truncate text-[13px] text-muted">{p.email}</span>}
        </span>
      </Link>
      <span className="flex flex-wrap items-center gap-2">
        <Link href={`/messages?user=${encodeURIComponent(p.id)}`} className={btnGhost}><LuMessageSquare size={17} />Message</Link>
        {/* Keyed by the seeded state: the button starts from what we know once the lists have loaded. */}
        <FollowButton key={`${p.id}:${seeded}:${stateOf(p.id)}`} userId={p.id} name={p.name} initial={stateOf(p.id)} requestId={requested.get(p.id) || undefined} onState={(s) => onState(p, s)} />
      </span>
    </li>
  );

  const searching = term.length >= MIN_CHARS;

  return (
    <div className="mx-auto grid max-w-[820px] gap-5">
      <section className={`${card} p-5`}>
        <label htmlFor="people-q" className="mb-1.5 block text-[13px] font-semibold">Find someone on manygym</label>
        <div className="relative">
          <LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id="people-q" type="search" autoComplete="off" className={`${input} pl-10`} placeholder="Name or email…" maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className={hint}>Type at least {MIN_CHARS} letters of their name, or their email. Then follow them, open their profile or send a message.</p>
      </section>

      {searching && (
        <section className={`${card} p-5`} aria-live="polite" aria-busy={loading}>
          <h2 className="mb-3 text-lg font-bold">Results</h2>
          {error ? (
            <p className="py-4 text-center text-muted">{error} <button className="font-semibold text-primary" onClick={() => setAttempt((n) => n + 1)}>Try again</button></p>
          ) : results === null || (loading && searched !== term && results.length === 0) ? (
            <div className="grid gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-background" />)}</div>
          ) : results.length === 0 ? (
            <EmptyState icon={LuUsers} title={`No one found for “${searched}”`} hint="Search by their full name or their email address." />
          ) : (
            <ul className={`grid gap-2 ${loading ? "opacity-60" : ""}`}>{results.map(row)}</ul>
          )}
        </section>
      )}

      {!searching && following.length > 0 && (
        <section className={`${card} p-5`}>
          <h2 className="mb-3 text-lg font-bold">People you follow</h2>
          <ul className="grid gap-2">{following.slice(0, 8).map(row)}</ul>
        </section>
      )}
      {!searching && followers.length > 0 && (
        <section className={`${card} p-5`}>
          <h2 className="mb-3 text-lg font-bold">Your followers</h2>
          <ul className="grid gap-2">{followers.slice(0, 8).map(row)}</ul>
        </section>
      )}
      {!searching && seeded && following.length === 0 && followers.length === 0 && (
        <section className={`${card} p-10`}>
          <EmptyState icon={LuUsers} title="Find your people" hint="Search for a friend above to follow them or start a chat." />
        </section>
      )}
    </div>
  );
}
