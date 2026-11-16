"use client";

/**
 * Blocking — the signed-in person's own blocklist.
 *
 * `GET/POST /users/settings/blocked-users/`, `GET /users/settings/blocked-users/search/`,
 * `DELETE /users/settings/blocked-users/{user_id}/`, and `POST /users/followers/{user_id}/block/`, which blocks
 * a follower and removes them from the followers list in one call.
 */
import { useCallback, useEffect, useState } from "react";
import { LuBan, LuSearch, LuUserMinus, LuUserX, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { MotionButton } from "@/components/ui/Motion";
import Modal from "@/components/ui/Modal";
import { Avatar, ConfirmModal } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { asArray } from "@/lib/api/adapters";
import { ApiError, mediaUrl } from "@/lib/api/http";
import { followersOf } from "@/lib/api/social";
import { blockFollower, blockUser, listBlockedUsers, searchUsersToBlock, unblockUser } from "@/lib/api/user-settings";
import { btnGhost, card, hint, input, label } from "@/lib/ui";

/** One person, whichever endpoint they came from. `id` is always their **user** id. */
type Row = { id: string; name: string; email: string; avatar: string; reason?: string };

const REASON_MAX = 255;

/** Blocked rows carry the person in `user_id` (their `id` is the block entry); search and follower rows differ. */
function toRow(raw: unknown): Row {
  const o = (raw ?? {}) as Record<string, unknown>;
  const u = (o.user ?? o) as Record<string, unknown>;
  const name = `${String(u.first_name ?? "")} ${String(u.last_name ?? "")}`.trim() || String(u.full_name ?? u.email ?? "Unknown");
  return {
    id: String(o.user_id ?? u.user_id ?? u.id ?? o.id ?? ""),
    name,
    email: String(u.email ?? ""),
    avatar: mediaUrl(typeof u.avatar_url === "string" ? u.avatar_url : ""),
    reason: typeof o.reason === "string" && o.reason ? o.reason : undefined,
  };
}

function Person({ row, children }: { row: Row; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
      <Avatar name={row.name} size={38} src={row.avatar} />
      <span className="min-w-0 flex-1">
        <b className="block truncate">{row.name}</b>
        {row.email && <span className="block truncate text-muted">{row.email}</span>}
        {row.reason && <span className="block truncate text-xs text-muted">Reason: {row.reason}</span>}
      </span>
      {children}
    </li>
  );
}

export default function BlockingSettings() {
  const toast = useToast();
  const { user } = useAuth();
  const myId = user?.id ?? "";

  const [blocked, setBlocked] = useState<Row[] | null>(null); // null = still loading
  const [blockedFailed, setBlockedFailed] = useState(false);
  const [followers, setFollowers] = useState<Row[] | null>(null);
  const [followersFailed, setFollowersFailed] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; rows: Row[] } | null>(null);
  const [unblocking, setUnblocking] = useState<Row | null>(null);
  /** The person about to be blocked, and whether they come off the followers list as part of it. */
  const [blocking, setBlocking] = useState<{ row: Row; follower: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadBlocked = useCallback(() =>
    listBlockedUsers()
      .then((rows) => { setBlocked(asArray<unknown>(rows).map(toRow)); setBlockedFailed(false); })
      .catch(() => { setBlocked([]); setBlockedFailed(true); }), []);

  const loadFollowers = useCallback(() => {
    if (!myId) return Promise.resolve();
    return followersOf({ id: myId, kind: "user" })
      .then((rows) => { setFollowers(asArray<unknown>(rows).map(toRow)); setFollowersFailed(false); })
      .catch(() => { setFollowers([]); setFollowersFailed(true); });
  }, [myId]);

  useEffect(() => { void loadBlocked(); }, [loadBlocked]);
  useEffect(() => { void loadFollowers(); }, [loadFollowers]);

  // Search as you type, after a short pause; a newer keystroke cancels the request still in flight.
  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      searchUsersToBlock(term, ctl.signal)
        .then((rows) => setFound({ q: term, rows: asArray<unknown>(rows).map(toRow) }))
        .catch((e) => { if ((e as Error)?.name !== "AbortError") setFound({ q: term, rows: [] }); });
    }, 300);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [term]);
  const results = term.length >= 2 && found?.q === term ? found.rows : null;
  const searching = term.length >= 2 && results === null;

  const openBlock = (row: Row, follower: boolean) => { setReason(""); setBlocking({ row, follower }); };

  const confirmBlock = async () => {
    if (!blocking) return;
    const { row, follower } = blocking;
    const why = reason.trim() || undefined;
    setBusy(true);
    try {
      if (follower) await blockFollower(row.id, why);
      else await blockUser(row.id, why);
      toast(follower ? `${row.name} blocked and removed from your followers` : `${row.name} blocked`);
      setBlocking(null);
      setFound((f) => (f ? { ...f, rows: f.rows.filter((r) => r.id !== row.id) } : f));
      setFollowers((f) => (f ? f.filter((r) => r.id !== row.id) : f));
      await loadBlocked();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : `Couldn't block ${row.name}`);
    } finally {
      setBusy(false);
    }
  };

  const confirmUnblock = async () => {
    const row = unblocking;
    setUnblocking(null);
    if (!row) return;
    try {
      await unblockUser(row.id);
      toast(`${row.name} unblocked`);
      await loadBlocked();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : `Couldn't unblock ${row.name}`);
    }
  };

  const blockedIds = new Set((blocked ?? []).map((r) => r.id));
  const skeleton = <div className="h-16 animate-pulse rounded-xl bg-background" />;

  return (
    <>
      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuBan size={18} />Blocked users</h2>
        <p className={hint}>People you&apos;ve blocked can&apos;t follow or message you.</p>
        <div className="mt-4">
          {blocked === null ? skeleton : blockedFailed ? (
            <p className="text-muted">Couldn&apos;t load your blocked users.</p>
          ) : blocked.length === 0 ? (
            <p className="py-3 text-muted">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul className="grid gap-2">
              {blocked.map((r) => (
                <Person key={r.id} row={r}>
                  <MotionButton className={btnGhost} onClick={() => setUnblocking(r)}>Unblock</MotionButton>
                </Person>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuUserX size={18} />Block someone</h2>
        <p className={hint}>Search manygym users by name or email.</p>
        <label className="relative mt-4 block">
          <span className="sr-only">Search users to block</span>
          <LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`${input} pl-10`} type="search" placeholder="Name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="mt-3">
          {term.length < 2 ? (
            term.length === 1 && <p className="text-muted">Keep typing — at least 2 characters.</p>
          ) : searching ? skeleton : results!.length === 0 ? (
            <p className="py-3 text-muted">No one matches &ldquo;{term}&rdquo;.</p>
          ) : (
            <ul className="grid gap-2">
              {results!.map((r) => (
                <Person key={r.id} row={r}>
                  <MotionButton className={btnGhost} onClick={() => openBlock(r, false)}><LuBan size={16} />Block</MotionButton>
                </Person>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuUserMinus size={18} />Block from followers</h2>
        <p className={hint}>Blocking a follower also removes them from your followers list.</p>
        <div className="mt-4">
          {followers === null ? skeleton : followersFailed ? (
            <p className="text-muted">Couldn&apos;t load your followers.</p>
          ) : followers.filter((r) => !blockedIds.has(r.id)).length === 0 ? (
            <p className="py-3 text-muted">You don&apos;t have any followers to block.</p>
          ) : (
            <ul className="grid gap-2">
              {followers.filter((r) => !blockedIds.has(r.id)).map((r) => (
                <Person key={r.id} row={r}>
                  <MotionButton className={btnGhost} onClick={() => openBlock(r, true)}><LuBan size={16} />Block</MotionButton>
                </Person>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal open={!!blocking} title={blocking ? `Block ${blocking.row.name}?` : ""} onClose={() => !busy && setBlocking(null)}
        footer={<>
          <MotionButton className={btnGhost} disabled={busy} onClick={() => setBlocking(null)}><LuX size={17} />Cancel</MotionButton>
          <button className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void confirmBlock()}>{busy ? "Blocking…" : "Block"}</button>
        </>}>
        <p>
          {blocking?.follower
            ? "They'll be removed from your followers and won't be able to follow or message you."
            : "They won't be able to follow or message you."}
          {" "}You can unblock them later.
        </p>
        <div>
          <label htmlFor="block-reason" className={label}>Reason <span className="font-normal text-muted">(optional)</span></label>
          <input id="block-reason" className={input} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Only you can see this" />
          <p className={hint}>{reason.length}/{REASON_MAX}</p>
        </div>
      </Modal>

      <ConfirmModal open={!!unblocking} title="Unblock this person?" confirmLabel="Unblock" danger={false} onClose={() => setUnblocking(null)}
        body={<><b>{unblocking?.name}</b> will be able to follow and message you again.</>}
        onConfirm={() => void confirmUnblock()} />
    </>
  );
}
