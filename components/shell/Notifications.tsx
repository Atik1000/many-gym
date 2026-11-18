"use client";

/**
 * The bell. Two things live in its panel:
 *  - notifications from the server (lib/api/notifications.ts) — someone reacted, commented, followed, asked to
 *    join — with read state, delete, and live arrival over the chat socket;
 *  - reminders worked out in the browser from data the signed-in role can already see (memberships about to
 *    expire, balances due, lead follow-ups). These are not events and the server knows nothing about them.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LuBanknote, LuBell, LuCalendarClock, LuCheck, LuCheckCheck, LuHeart, LuLoaderCircle, LuMail, LuMessageSquare, LuPartyPopper, LuReply, LuTimer, LuTrash2, LuUserPlus, LuX } from "react-icons/lu";
import type { IconType } from "react-icons";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { useGym, useResource } from "@/lib/api";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/notifications";
import type { Notification, NotificationType } from "@/lib/api/notifications";
import { accountSlug, postPath, timeAgo } from "@/lib/posts";
import { PUSH_EVENT, enablePush, listenForPush, pushState, resumePush } from "@/lib/push";
import { today } from "@/lib/dates";
import { LEADS_KEY, leadName, nextMoveOf, type Lead } from "@/lib/leads";
import { FOLLOW_REQUESTS_EVENT, followRequests } from "@/lib/api/social";
import { MEMBER_REQUESTS_EVENT, pendingMemberRequestCount } from "@/lib/api/member-requests";
import { MEMBERS_KEY, currentMembership, fullName, isExpiringSoon, paymentStatus, type Member } from "@/lib/members";

type Alert = { key: string; icon: IconType; tone: string; title: string; detail: string; href: string };

const READ_KEY = "notifications-read";
const READ_EVENT = "manygym:notifications-read";
const subscribeRead = (cb: () => void) => { window.addEventListener(READ_EVENT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(READ_EVENT, cb); window.removeEventListener("storage", cb); }; };
const idOf = (a: Alert) => `${a.key}|${a.title}|${a.detail}`;

const names = (list: string[]) => (list.length <= 2 ? list.join(" and ") : `${list.slice(0, 2).join(", ")} +${list.length - 2} more`);

// ---------------------------------------------------------------- notifications from the server

type Filter = "all" | "unread";

const TYPE_ICON: Record<NotificationType, { icon: IconType; tone: string }> = {
  reaction: { icon: LuHeart, tone: "bg-bad-bg text-bad" },
  comment: { icon: LuMessageSquare, tone: "bg-primary-50 text-primary" },
  comment_reply: { icon: LuReply, tone: "bg-primary-50 text-primary" },
  member_request: { icon: LuUserPlus, tone: "bg-ok-bg text-ok" },
  member_request_accepted: { icon: LuCheck, tone: "bg-ok-bg text-ok" },
  member_request_rejected: { icon: LuX, tone: "bg-bad-bg text-bad" },
  gym_invite: { icon: LuMail, tone: "bg-primary-50 text-primary" },
  follow: { icon: LuUserPlus, tone: "bg-primary-50 text-primary" },
  system: { icon: LuBell, tone: "bg-background text-muted" },
};

const COUNT_POLL_MS = 60_000;
const problem = (e: unknown, fallback: string) => (e instanceof ApiError && e.status !== 0 ? e.message : fallback);

/**
 * The server's notifications for whoever is signed in. The unread count is kept current the whole time (on a
 * timer, on returning to the tab, and the moment the socket announces a new one); the list itself is only
 * fetched while the panel is open.
 */
function useServerNotifications(userId: string | undefined, open: boolean, filter: Filter) {
  const toast = useToast();
  const [rows, setRows] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const run = useRef(0);
  const live = useRef({ open, filter });
  useEffect(() => { live.current = { open, filter }; }, [open, filter]);

  const refreshCount = useCallback(() => {
    api.unreadNotificationCount().then(setUnread).catch(() => undefined); // the badge just keeps its last value
  }, []);

  const load = useCallback(async (next: number, which: Filter) => {
    const mine = ++run.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.listNotifications({ unread: which === "unread", page: next });
      if (mine !== run.current) return;
      setRows((prev) => {
        if (next === 1) return res.rows;
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...res.rows.filter((n) => !seen.has(n.id))];
      });
      setPage(next);
      setHasMore(res.hasMore && res.rows.length > 0);
    } catch (e) {
      if (mine === run.current) setError(problem(e, "Couldn't load notifications."));
    } finally {
      if (mine === run.current) setLoading(false);
    }
  }, []);

  // The badge: now, every minute while the tab is visible, on coming back to it, and on a live alert.
  useEffect(() => {
    if (!userId) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const visible = () => document.visibilityState === "visible";
    const onReturn = () => { if (visible()) refreshCount(); };
    const onAlert = () => {
      // Several sockets can carry the same alert, and the server is the authority on what this context
      // should see — so an alert is only a nudge to ask again.
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        refreshCount();
        if (live.current.open) void load(1, live.current.filter);
      }, 400);
    };
    void Promise.resolve().then(refreshCount);
    const timer = setInterval(onReturn, COUNT_POLL_MS);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener(api.NOTIFICATION_EVENT, onAlert);
    return () => {
      if (debounce) clearTimeout(debounce);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener(api.NOTIFICATION_EVENT, onAlert);
    };
  }, [userId, refreshCount, load]);

  useEffect(() => {
    if (!userId || !open) return;
    void Promise.resolve().then(() => { refreshCount(); return load(1, filter); });
  }, [userId, open, filter, load, refreshCount]);

  const markRead = useCallback((n: Notification) => {
    if (n.read) return;
    setRows((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    api.markNotificationRead(n.id).catch(refreshCount);
  }, [refreshCount]);

  const markAll = useCallback(async () => {
    setWorking(true);
    setRows((l) => l.map((x) => ({ ...x, read: true })));
    setUnread(0);
    try {
      await api.markAllNotificationsRead();
    } catch (e) {
      toast(problem(e, "Couldn't mark notifications as read."));
      refreshCount();
      void load(1, live.current.filter);
    } finally {
      setWorking(false);
    }
  }, [toast, refreshCount, load]);

  const remove = useCallback((n: Notification) => {
    setRows((l) => l.filter((x) => x.id !== n.id));
    if (!n.read) setUnread((c) => Math.max(0, c - 1));
    api.deleteNotification(n.id).catch((e) => {
      // Already gone is the outcome that was wanted.
      if (e instanceof ApiError && e.status === 404) return;
      toast(problem(e, "Couldn't remove that notification."));
      refreshCount();
      void load(1, live.current.filter);
    });
  }, [toast, refreshCount, load]);

  const clearRead = useCallback(async () => {
    setWorking(true);
    try {
      const gone = await api.clearReadNotifications();
      setRows((l) => l.filter((x) => !x.read));
      toast(gone ? `Removed ${gone} read notification${gone === 1 ? "" : "s"}` : "No read notifications to remove");
      void load(1, live.current.filter);
    } catch (e) {
      toast(problem(e, "Couldn't clear read notifications."));
    } finally {
      setWorking(false);
    }
  }, [toast, load]);

  return { rows, unread, page, hasMore, loading, error, working, load, markRead, markAll, remove, clearRead };
}

function Row({ n, href, onOpen, onRemove }: { n: Notification; href: string | null; onOpen: () => void; onRemove: () => void }) {
  const { icon: Icon, tone } = TYPE_ICON[n.type];
  const who = n.actorGym ?? n.actor;
  const inner = (
    <>
      <span className="relative shrink-0">
        {who ? <Avatar name={who.name || "?"} size={48} src={who.avatarUrl || undefined} /> : <span className={`grid h-12 w-12 place-items-center rounded-full ${tone}`}><Icon size={22} /></span>}
        {who && <span aria-hidden className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-surface ${tone}`}><Icon size={11} /></span>}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <b className={`block text-[14px] ${n.read ? "font-medium" : "font-semibold"}`}>{n.title || "Notification"}</b>
        {n.body && <span className="line-clamp-2 block break-words text-[13px] text-muted">{n.body}</span>}
        {n.createdAt && <span className={`block text-xs ${n.read ? "text-muted" : "font-semibold text-primary"}`}>{timeAgo(n.createdAt)}</span>}
      </span>
      {!n.read && <span className="h-3 w-3 shrink-0 rounded-full bg-primary"><span className="sr-only">Unread</span></span>}
    </>
  );
  const main = "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background";
  return (
    <li className="group flex items-center gap-1">
      {href
        ? <Link href={href} onClick={onOpen} className={main}>{inner}</Link>
        : <button type="button" onClick={onOpen} className={main}>{inner}</button>}
      <button type="button" onClick={onRemove} aria-label={`Remove notification: ${n.title || n.body}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted opacity-100 transition-opacity hover:bg-background hover:text-bad focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <LuTrash2 size={15} />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------- the bell

const subscribePush = (cb: () => void) => { window.addEventListener(PUSH_EVENT, cb); return () => window.removeEventListener(PUSH_EVENT, cb); };

export default function Notifications() {
  const { can, trainerOnly, user, personal } = useAuth();
  const [gym] = useGym();
  const [members] = useResource<Member>(MEMBERS_KEY);
  const [leads] = useResource<Lead>(LEADS_KEY);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const stored = useSyncExternalStore(subscribeRead, () => { try { return localStorage.getItem(READ_KEY) ?? "[]"; } catch { return "[]"; } }, () => "[]");
  const read = useMemo<string[]>(() => { try { return JSON.parse(stored); } catch { return []; } }, [stored]);

  // People waiting to be confirmed as followers (only arrives while "require approval" is on).
  const [requests, setRequests] = useState<string[]>([]);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const load = () =>
      followRequests("received")
        .then((list) => live && setRequests(list.map((r) => r.requester.name)))
        .catch(() => live && setRequests([])); // not served by older deployments — just show nothing
    void load();
    window.addEventListener(FOLLOW_REQUESTS_EVENT, load);
    return () => { live = false; window.removeEventListener(FOLLOW_REQUESTS_EVENT, load); };
  }, [userId]);

  // People asking to join the gym, for whoever can answer them.
  const canAnswerJoins = can("Create members") || can("Edit members");
  const [joinRequests, setJoinRequests] = useState(0);
  useEffect(() => {
    if (!userId || !canAnswerJoins) return;
    let live = true;
    const load = () => pendingMemberRequestCount().then((n) => live && setJoinRequests(n)).catch(() => undefined);
    void load();
    window.addEventListener(MEMBER_REQUESTS_EVENT, load);
    return () => { live = false; window.removeEventListener(MEMBER_REQUESTS_EVENT, load); };
  }, [userId, canAnswerJoins]);

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const now = today();
    if (canAnswerJoins && joinRequests > 0) out.push({ key: "join", icon: LuUserPlus, tone: "bg-ok-bg text-ok", title: `${joinRequests} request${joinRequests > 1 ? "s" : ""} to join the gym`, detail: "Review and accept or decline", href: "/members?view=requests" });
    if (requests.length) out.push({ key: "follow", icon: LuUserPlus, tone: "bg-primary-50 text-primary", title: `${requests.length} follow request${requests.length > 1 ? "s" : ""}`, detail: names(requests), href: "/settings?tab=audience" });
    if (can("View members")) {
      const mine = trainerOnly ? members.filter((m) => m.trainerId === user?.id) : members;
      const expiring = mine.filter((m) => isExpiringSoon(m, now));
      if (expiring.length) out.push({ key: "exp", icon: LuTimer, tone: "bg-warn-bg text-warn", title: `${expiring.length} membership${expiring.length > 1 ? "s" : ""} expiring soon`, detail: names(expiring.map(fullName)), href: "/members" });
      const owing = mine.filter((m) => { const c = currentMembership(m); return c && paymentStatus(c) !== "paid"; });
      if (owing.length) out.push({ key: "owe", icon: LuBanknote, tone: "bg-bad-bg text-bad", title: `${owing.length} member${owing.length > 1 ? "s" : ""} with a balance due`, detail: names(owing.map(fullName)), href: "/members" });
    }
    if (can("View leads")) {
      const open = leads.filter((l) => l.stage !== "joined" && l.stage !== "not_joining");
      const due = open.filter((l) => { const m = nextMoveOf(l); return m && m.date <= now; });
      if (due.length) out.push({ key: "due", icon: LuCalendarClock, tone: "bg-primary-50 text-primary", title: `${due.length} lead follow-up${due.length > 1 ? "s" : ""} due`, detail: names(due.map(leadName)), href: "/leads" });
      const fresh = open.filter((l) => l.stage === "new");
      if (fresh.length) out.push({ key: "new", icon: LuPartyPopper, tone: "bg-ok-bg text-ok", title: `${fresh.length} new lead${fresh.length > 1 ? "s" : ""}`, detail: names(fresh.map(leadName)), href: "/leads" });
    }
    return out;
  }, [members, leads, can, trainerOnly, user, requests, joinRequests, canAnswerJoins]);

  const markRead = (a: Alert) => {
    const next = [...new Set([...read, idOf(a)])];
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); window.dispatchEvent(new Event(READ_EVENT)); } catch { /* storage unavailable */ }
  };
  const isUnread = (a: Alert) => !read.includes(idOf(a));
  const unreadAlerts = alerts.filter(isUnread);
  const shown = filter === "unread" ? unreadAlerts : alerts;

  const server = useServerNotifications(userId, open, filter);
  const gymName = !personal ? gym?.overview.name : undefined;
  const hrefOf = (n: Notification) => api.notificationHref(n, {
    userId,
    // Only a gym's own posts have a page of their own; a person's are on their profile.
    postHref: gymName ? (postId) => postPath(accountSlug(gymName), postId) : undefined,
  });
  const badge = server.unread + unreadAlerts.length;

  // Web push: keep this browser's token registered, and follow a click on a system notification.
  const router = useRouter();
  const toast = useToast();
  const push = useSyncExternalStore(subscribePush, pushState, () => "unavailable" as const);
  const [pushBusy, setPushBusy] = useState(false);
  const hrefRef = useRef(hrefOf);
  useEffect(() => { hrefRef.current = hrefOf; });
  useEffect(() => {
    if (!userId) return;
    void resumePush();
    return listenForPush((data) => {
      if (data.type === "chat_message") { router.push("/messages"); return; }
      const href = hrefRef.current(api.notificationFromApi({ ...data, data }));
      if (href) router.push(href);
      else setOpen(true);
    });
  }, [userId, router]);
  const turnOnPush = async () => {
    setPushBusy(true);
    try {
      const state = await enablePush();
      if (state === "on") toast("Push notifications are on for this browser");
      else if (state === "blocked") toast("Notifications are blocked for this site in your browser settings");
    } catch (e) {
      toast(problem(e, "Couldn't turn on push notifications."));
    } finally {
      setPushBusy(false);
    }
  };
  const fresh = server.rows.filter((n) => !n.read);
  const earlier = server.rows.filter((n) => n.read);
  const firstLoad = server.loading && server.page === 0;
  const nothing = shown.length === 0 && server.rows.length === 0 && !firstLoad && !server.error;
  const tool = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary-50 disabled:opacity-50";

  return (
    <div className="relative">
      <motion.button whileTap={{ scale: 0.9 }} aria-label={`Notifications${badge ? `, ${badge} new` : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-background text-foreground transition-colors hover:bg-line">
        <motion.span className="block" animate={badge ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.7, delay: 0.6 }}><LuBell size={22} /></motion.span>
        {badge > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-bad px-1 text-[10px] font-bold text-white">{badge > 99 ? "99+" : badge}</span>}
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14 }}
              className="fixed inset-x-3 top-[64px] z-30 origin-top-right rounded-xl border border-line bg-surface p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[400px]">
              <p className="px-3 pb-1 pt-2 text-[22px] font-bold leading-tight">Notifications</p>
              <div className="flex gap-1.5 px-3 pb-1 pt-1" role="tablist" aria-label="Filter notifications">
                {(["all", "unread"] as const).map((f) => (
                  <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                    className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold capitalize transition-colors ${filter === f ? "bg-primary-50 text-primary" : "text-foreground hover:bg-background"}`}>{f}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-1 px-1.5 pb-1">
                <button type="button" className={tool} disabled={server.working || server.unread === 0} onClick={() => void server.markAll()}><LuCheckCheck size={15} />Mark all as read</button>
                <button type="button" className={tool} disabled={server.working || (earlier.length === 0 && filter === "all" && !server.hasMore)} onClick={() => void server.clearRead()}><LuTrash2 size={14} />Clear read</button>
              </div>

              {push === "off" && (
                <div className="mx-1.5 mb-1 flex items-center gap-3 rounded-lg bg-background px-3 py-2.5">
                  <span className="min-w-0 flex-1 text-[13px]"><b className="block font-semibold">Get notified on this device</b><span className="text-muted">Even when manygym isn&apos;t open.</span></span>
                  <button type="button" disabled={pushBusy} onClick={() => void turnOnPush()} className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60">{pushBusy ? "Turning on…" : "Turn on"}</button>
                </div>
              )}

              <div className="max-h-[min(64vh,560px)] overflow-y-auto overscroll-contain">
                {nothing && <p className="px-3 py-6 text-center text-muted">{filter === "unread" ? "No unread notifications." : "You\u2019re all caught up."}</p>}

                {shown.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 pt-3 text-[15px] font-bold">Needs attention</p>
                    {shown.map((a, i) => (
                      <motion.div key={a.key} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <Link href={a.href} onClick={() => { markRead(a); setOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background">
                          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${a.tone}`}><a.icon size={22} /></span>
                          <span className="min-w-0 flex-1"><b className="block text-[14px] font-semibold">{a.title}</b><span className="block truncate text-[13px] text-muted">{a.detail}</span></span>
                          {isUnread(a) && <span className="h-3 w-3 shrink-0 rounded-full bg-primary"><span className="sr-only">Unread</span></span>}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}

                {firstLoad && <div className="mx-3 my-3 h-24 animate-pulse rounded-xl bg-background" />}
                {server.error && (
                  <p className="px-3 py-5 text-center text-muted">{server.error} <button type="button" className="font-semibold text-primary" onClick={() => void server.load(Math.max(1, server.page), filter)}>Try again</button></p>
                )}
                {([["New", fresh], ["Earlier", earlier]] as const).map(([label, list]) => list.length > 0 && (
                  <div key={label}>
                    <p className="px-3 pb-1 pt-3 text-[15px] font-bold">{label}</p>
                    <ul>
                      {list.map((n) => (
                        <Row key={n.id} n={n} href={hrefOf(n)} onOpen={() => { server.markRead(n); setOpen(false); }} onRemove={() => server.remove(n)} />
                      ))}
                    </ul>
                  </div>
                ))}
                {server.hasMore && !server.error && (
                  <button type="button" disabled={server.loading} onClick={() => void server.load(server.page + 1, filter)} className="mx-auto my-2 flex items-center gap-1.5 font-semibold text-primary disabled:opacity-60">
                    {server.loading ? <><LuLoaderCircle size={14} className="motion-safe:animate-spin" />Loading…</> : "Show more"}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
