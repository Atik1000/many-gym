"use client";

/**
 * The gym's audience — `GET /gyms/{id}/followers/`, `GET /gyms/{id}/following/`, `GET /gyms/followed/`,
 * and follow/unfollow through lib/api/social.ts.
 *
 * Following a gym is always immediate. Following a person is immediate unless they confirm followers first,
 * in which case the button becomes "Requested" until they answer; pressing it again withdraws the request.
 *
 * "Members" is the roster the gym's audience can see (`GET /gyms/{id}/members/`, governed by the gym's
 * `who_can_see_members` setting), and a follower can be blocked outright
 * (`POST /gyms/{id}/followers/{user_id}/block/`), which also removes them from the followers.
 */
import Link from "next/link";
import { useCallback, useEffect, useState, useRef } from "react";
import { LuBan, LuCheck, LuClock, LuUserPlus, LuUsers } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, ConfirmModal, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { asArray } from "@/lib/api/adapters";
import * as social from "@/lib/api/social";
import { ApiError, currentGymId } from "@/lib/api/http";
import { useAuth } from "@/components/AuthProvider";
import { blockGymFollower, gymRoster } from "@/lib/api/member-requests";
import { fmtDate } from "@/lib/dates";
import { card, hint } from "@/lib/ui";

type Row = { id: string; name: string; sub: string; kind: "user" | "gym"; following?: boolean; avatar?: string; member?: boolean };

const TABS = ["Followers", "Following", "Gyms we follow", "Members"] as const;
const ROSTER_PAGE = 10;
type Tab = (typeof TABS)[number];

/** The follow endpoints return several row shapes (user item, gym item, wrapped); normalise them all. */
function toRow(raw: unknown, kind: Row["kind"]): Row {
  const o = (raw ?? {}) as Record<string, unknown>;
  const inner = (o.user ?? o.gym ?? o.target ?? o) as Record<string, unknown>;
  const first = String(inner.first_name ?? "");
  const last = String(inner.last_name ?? "");
  const name =
    `${first} ${last}`.trim() ||
    String(inner.full_name ?? inner.name ?? inner.gym_name ?? inner.email ?? "Unknown");
  return {
    id: String(o.user_id ?? o.gym_id ?? o.target_id ?? inner.id ?? o.id ?? ""),
    name,
    sub: String(inner.email ?? inner.primary_type ?? inner.role ?? ""),
    kind,
    following: typeof o.is_following === "boolean" ? o.is_following : undefined,
  };
}

/** A roster row. Members aren't a follow target here, so they carry no follow button. */
const rosterRow = (m: { memberId: string; userId: string; name: string; email: string; avatarUrl: string; joinedAt: string }): Row => ({
  id: m.memberId || m.userId,
  name: m.name,
  sub: [m.email, m.joinedAt && `Joined ${fmtDate(m.joinedAt.slice(0, 10))}`].filter(Boolean).join(" · "),
  kind: "user",
  avatar: m.avatarUrl,
  member: true,
});

export default function Audience() {
  const toast = useToast();
  const gymId = currentGymId();
  const [tab, setTab] = useState<Tab>("Followers");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // People whose approval we are waiting on. A follower row can't say this (it only knows is_following),
  // so it is seeded from the sent-requests list and kept up to date as buttons are pressed.
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const requestIds = useRef(new Map<string, string>());
  const { user, can } = useAuth();
  // The roster is paged by the server; the follow lists arrive whole.
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterMore, setRosterMore] = useState(false);
  const [rosterNote, setRosterNote] = useState("");
  const [blocking, setBlocking] = useState<Row | null>(null);
  const canBlock = can("Edit gym profile"); // the API asks for gym_profile:edit
  // How many are in each follow list, for the tabs; null until known.
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});
  // Everyone this gym follows (people and gyms). A follower row doesn't reliably say whether we follow
  // them back, so "Follow back" / "Following" is decided from this. Null until the lists have loaded.
  const [followingIds, setFollowingIds] = useState<Set<string> | null>(null);
  const tabRef = useRef<Tab>(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const refreshAudience = useCallback(async () => {
    if (!gymId) return;
    const target = { id: gymId, kind: "gym" as const };
    const [a, b, c] = await Promise.allSettled([social.followersOf(target), social.followingOf(target), social.followedGyms()]);
    const idsOf = (r: PromiseSettledResult<unknown>, kind: Row["kind"]) =>
      r.status === "fulfilled" ? asArray<unknown>(r.value).map((x) => toRow(x, kind).id).filter(Boolean) : null;
    const followers = idsOf(a, "user");
    const following = idsOf(b, "user");
    const gyms = idsOf(c, "gym");
    setCounts((prev) => ({
      ...prev,
      ...(followers && { Followers: followers.length }),
      ...(following && { Following: following.length }),
      ...(gyms && { "Gyms we follow": gyms.length }),
    }));
    if (following || gyms) setFollowingIds(new Set([...(following ?? []), ...(gyms ?? [])]));
  }, [gymId]);

  const load = useCallback(
    async (which: Tab, quiet = false) => {
      if (!gymId) return;
      if (!quiet) setLoading(true);
      try {
        const target = { id: gymId, kind: "gym" as const };
        setRosterNote("");
        if (which === "Members") {
          const res = await gymRoster(gymId, { page: 1, pageSize: ROSTER_PAGE });
          setRows(res.rows.map(rosterRow));
          setRosterPage(1);
          setRosterMore(res.hasMore);
        } else if (which === "Followers") {
          setRows(asArray<unknown>(await social.followersOf(target)).map((r) => toRow(r, "user")));
        } else if (which === "Following") {
          setRows(asArray<unknown>(await social.followingOf(target)).map((r) => toRow(r, "user")));
        } else {
          setRows(asArray<unknown>(await social.followedGyms()).map((r) => toRow(r, "gym")));
        }
      } catch (e) {
        // A private roster is an answer, not a failure: say so in place rather than as an error toast.
        if (which === "Members" && e instanceof ApiError && e.status === 403) setRosterNote("The member list is private.");
        else toast(e instanceof ApiError ? e.message : "Couldn't load that list");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [gymId, toast],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load(tab));
  }, [tab, load]);

  useEffect(() => {
    void Promise.resolve().then(refreshAudience);
  }, [refreshAudience]);

  // A follow made anywhere in the app shows on these buttons at once …
  useEffect(() => social.onFollowChange((c) => {
    setFollowingIds((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (c.state === "following") next.add(c.target.id);
      else next.delete(c.target.id);
      return next;
    });
    if (c.target.kind !== "user") return;
    if (c.requestId) requestIds.current.set(c.target.id, c.requestId);
    else requestIds.current.delete(c.target.id);
    setRequested((prev) => {
      const next = new Set(prev);
      if (c.state === "pending") next.add(c.target.id);
      else next.delete(c.target.id);
      return next;
    });
  }), []);

  // … and the lists and their counts are re-read after it, and when someone new follows the gym.
  useEffect(() => social.onAudienceChange(() => {
    void refreshAudience();
    if (tabRef.current !== "Members") void load(tabRef.current, true);
  }), [refreshAudience, load]);

  useEffect(() => {
    let live = true;
    social.followRequests("sent")
      // If a deployment ignores `type`, received requests come back instead; their target is this account,
      // which is never a row here, so dropping it keeps the set honest.
      .then((list) => {
        if (!live) return;
        for (const r of list) if (r.target.id) requestIds.current.set(r.target.id, r.id);
        setRequested(new Set(list.map((r) => r.target.id).filter((id) => id && id !== user?.id)));
      })
      .catch(() => undefined); // older deployments don't have requests; every follow is immediate there
    return () => { live = false; };
  }, [user?.id]);

  const setFollow = async (row: Row, follow: boolean) => {
    setBusy(row.id);
    try {
      // The follow feature is published at six prefixes with no canonical choice, so this tries them in
      // order and settles on whichever this deployment serves (lib/api/social.ts).
      const wasRequested = requested.has(row.id);
      const result = wasRequested && !follow && row.kind === "user"
        ? await social.cancelFollowRequest(row.id, requestIds.current.get(row.id))
        : await social.setFollowing({ id: row.id, kind: row.kind }, follow);
      // The buttons, lists and counts update from the follow event (above), not from here.
      toast(
        result.state === "pending" ? `Follow request sent to ${row.name}`
          : follow ? `Following ${row.name}`
            : wasRequested ? `Request to ${row.name} withdrawn` : `Unfollowed ${row.name}`,
      );
    } catch (e) {
      toast(e instanceof ApiError && e.status === 404 ? "That account is no longer available." : social.followProblem(e));
    } finally {
      setBusy(null);
    }
  };

  const moreMembers = async () => {
    if (!gymId) return;
    setBusy("more");
    try {
      const res = await gymRoster(gymId, { page: rosterPage + 1, pageSize: ROSTER_PAGE });
      setRows((prev) => { const seen = new Set(prev.map((r) => r.id)); return [...prev, ...res.rows.map(rosterRow).filter((r) => !seen.has(r.id))]; });
      setRosterPage((p) => p + 1);
      setRosterMore(res.hasMore);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't load more members");
    } finally {
      setBusy(null);
    }
  };

  const block = async (row: Row) => {
    if (!gymId) return;
    setBusy(row.id);
    try {
      await blockGymFollower(gymId, row.id);
      toast(`${row.name} blocked and removed from followers`);
      await Promise.all([load(tab, true), refreshAudience()]);
    } catch (e) {
      toast(e instanceof ApiError ? (e.status === 404 ? "That person is no longer a follower." : e.message) : "Couldn't block that person");
    } finally {
      setBusy(null);
    }
  };

  if (!gymId) return null;

  /** Do we follow this row's account? From our own following list once it has loaded. */
  const follows = (r: Row) => (followingIds ? followingIds.has(r.id) : tab !== "Followers" || !!r.following);

  return (
    <section className={`${card} p-6`}>
      <h3 className="flex items-center gap-2 text-xl font-bold"><LuUsers size={19} />Audience</h3>
      <p className={hint}>Who follows this gym, who it follows back, and its members.</p>

      <div role="tablist" className="mt-4 flex flex-wrap gap-1 rounded-xl border border-line bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 font-semibold ${tab === t ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            {t}
            {counts[t] !== undefined && <span className="ml-1.5 text-[13px] font-semibold tabular-nums text-muted">{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-background" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-muted">
            {tab === "Members" ? rosterNote || "No members to show yet."
              : tab === "Followers" ? "No followers yet." : tab === "Following" ? "This gym doesn't follow anyone yet." : "You don't follow any gyms yet."}
          </p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                <Avatar name={r.name} size={38} src={r.avatar || undefined} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{r.id && r.kind === "user" && tab !== "Members" ? <Link href={`/users/${r.id}`} className="hover:underline">{r.name}</Link> : r.id && r.kind === "gym" ? <Link href={`/gyms/${r.id}`} className="hover:underline">{r.name}</Link> : r.name}</b>
                  {r.sub && <span className="block truncate text-muted">{r.sub}</span>}
                </span>
                {r.kind === "gym" && <Pill tone="purple">Gym</Pill>}
                {tab === "Followers" && canBlock && r.id !== user?.id && (
                  <button aria-label={`Block ${r.name}`} title="Block and remove from followers" disabled={busy === r.id} onClick={() => setBlocking(r)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bad-bg text-bad transition-colors hover:bg-bad hover:text-white disabled:opacity-50"><LuBan size={15} /></button>
                )}
                {!r.member && <MotionButton
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                    requested.has(r.id) ? "bg-warn-bg text-warn"
                      : !follows(r) ? "bg-primary text-white shadow-[0_4px_10px_-4px_rgba(91,61,245,.6)] hover:bg-primary-600"
                        : "border border-line bg-surface text-muted hover:border-bad/40 hover:bg-bad-bg hover:text-bad"}`}
                  disabled={busy === r.id}
                  aria-label={requested.has(r.id) ? `Withdraw follow request to ${r.name}` : undefined}
                  title={requested.has(r.id) ? "Waiting for them to confirm — press to withdraw" : follows(r) ? "Press to unfollow" : undefined}
                  onClick={() => void setFollow(r, !(requested.has(r.id) || follows(r)))}
                >
                  {requested.has(r.id) ? <><LuClock size={16} /> Requested</>
                    : follows(r) ? <><LuCheck size={16} /> Following</>
                      : <><LuUserPlus size={16} /> {tab === "Followers" ? "Follow back" : "Follow"}</>}
                </MotionButton>}
              </li>
            ))}
          </ul>
        )}
        {tab === "Members" && rosterMore && !loading && (
          <button className="mt-3 w-full rounded-lg py-2 font-semibold text-primary hover:bg-background disabled:opacity-50" disabled={busy === "more"} onClick={() => void moreMembers()}>
            {busy === "more" ? "Loading…" : "Show more members"}
          </button>
        )}
      </div>

      <ConfirmModal open={!!blocking} title={`Block ${blocking?.name ?? "this person"}?`} confirmLabel="Block" onClose={() => setBlocking(null)}
        body={<>They stop following this gym straight away and can&apos;t message it or see its page. You can undo this under Settings → Gym → Blocked people.</>}
        onConfirm={() => { const row = blocking; setBlocking(null); if (row) void block(row); }} />
    </section>
  );
}
