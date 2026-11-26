"use client";

/**
 * The two halves of a chat — the list of conversations and the open thread — shared by the Messages page and
 * the floating chat box. All state lives in `useMessaging`; these only draw it.
 */
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LuArrowLeft, LuBuilding2, LuLock, LuMaximize2, LuMessageCircle, LuRefreshCw, LuSearch, LuSend, LuShieldCheck, LuSmile, LuSquarePen, LuThumbsUp, LuUser, LuX,
} from "react-icons/lu";
import { Avatar } from "@/components/ui/parts";
import { followPeople, onAudienceChange, type FollowPerson } from "@/lib/api/social";
import CompareKeys from "./CompareKeys";
import NewMessage from "./NewMessage";
import RecoveryCodeModal, { type CodeMode } from "./RecoveryCode";
import type { Conversation, Message, Messaging } from "./useMessaging";

const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40";

// ---------------------------------------------------------------- recovery code prompt

/**
 * The nudge to set up (first device) or enter (new device) the recovery code. Shown above the conversations
 * and above a thread; opening it shows the code dialog. It never blocks the chat — sending works either way.
 */
export function KeyBanner({ m, compact = false }: { m: Messaging; compact?: boolean }) {
  const [mode, setMode] = useState<CodeMode | null>(null);
  if (m.keyState !== "setup" && m.keyState !== "restore" && !mode) return null;
  const restore = m.keyState === "restore";
  return (
    <>
      {(m.keyState === "setup" || restore) && (
        <div className={`flex items-start gap-2.5 rounded-xl ${restore ? "bg-warn-bg text-warn" : "bg-primary-50 text-primary-600"} px-3 py-2.5 text-[13px] ${compact ? "mx-3 mb-2" : "mx-3 mb-2"}`}>
          <LuLock size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">
            {restore ? "Enter your recovery code to see your message history on this device." : "Set a 5-digit recovery code so you can see your messages on other devices."}{" "}
            <button onClick={() => setMode(restore ? "restore" : "setup")} className="font-semibold underline">{restore ? "Enter code" : "Set code"}</button>
          </span>
        </div>
      )}
      <RecoveryCodeModal key={mode ?? "none"} m={m} mode={mode} onClose={() => setMode(null)} />
    </>
  );
}

/** "New message" — opens the follows + followers people search. Personal inbox only (the endpoint is the person's). */
export function NewMessageButton({ m, className }: { m: Messaging; className: string }) {
  const [open, setOpen] = useState(false);
  if (m.scope !== "personal") return null;
  return (
    <>
      <button aria-label="New message" title="New message" onClick={() => setOpen(true)} className={className}><LuSquarePen size={17} /></button>
      <NewMessage m={m} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------- conversation list

type View = "chats" | "followers" | "following";
const VIEWS: [View, string][] = [["chats", "Chats"], ["followers", "Followers"], ["following", "Following"]];

/**
 * Chats, plus the two lists of people a chat can be started with: who follows this inbox's owner (the gym, or
 * the person) and who they follow. Picking someone opens the conversation with them, creating it if needed.
 */
export function ConversationList({ m, compact = false, onPick }: { m: Messaging; compact?: boolean; onPick?: (c: Conversation) => void }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("chats");
  const [people, setPeople] = useState<{ key: string; rows: FollowPerson[]; failed: boolean } | null>(null);
  const [composing, setComposing] = useState(false);
  const q = query.trim().toLowerCase();
  const rows = q ? m.list.filter((c) => c.title.toLowerCase().includes(q)) : m.list;
  const size = compact ? 40 : 48;

  // Whose followers: the gym's in the gym inbox, the person's own in the personal one.
  const ownerId = m.scope === "gym" ? m.gymId : m.meId;
  const ownerKind = m.scope === "gym" ? "gym" : "user";
  const key = view === "chats" || !ownerId ? "" : `${ownerKind}:${ownerId}:${view}`;
  // Re-read the open list when a follow changes it — one made here, or someone following this account.
  const [tick, setTick] = useState(0);
  useEffect(() => onAudienceChange(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    if (!key || !ownerId || view === "chats") return;
    let live = true;
    followPeople({ id: ownerId, kind: ownerKind }, view)
      .then((list) => live && setPeople({ key, rows: list, failed: false }))
      .catch(() => live && setPeople({ key, rows: [], failed: true }));
    return () => { live = false; };
  }, [key, ownerId, ownerKind, view, tick]);
  const loaded = people?.key === key ? people : null;
  const shown = (loaded?.rows ?? []).filter((p) => p.id !== m.meId && (!q || p.name.toLowerCase().includes(q)));

  const message = async (p: FollowPerson) => {
    const existing = m.list.find((c) => c.targetUserId === p.id && (m.scope === "gym" || !c.targetGymId));
    if (existing) await m.openConversation(existing);
    else await m.startWith(p.id);
    setView("chats");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <KeyBanner m={m} compact={compact} />
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 rounded-full bg-background px-3.5 py-2 text-muted focus-within:ring-2 focus-within:ring-primary/30">
          <LuSearch size={16} className="shrink-0" />
          <input aria-label={view === "chats" ? "Search conversations" : "Search people"} placeholder={view === "chats" ? "Search conversations" : "Search people"} value={query} onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted" />
        </label>
        {m.gymId && (
          <div role="group" aria-label="Inbox" className="mt-2 flex gap-1.5">
            {([["gym", m.me?.gymName || "Gym", LuBuilding2], ["personal", "Personal", LuUser]] as const).map(([k, text, Icon]) => (
              <button key={k} aria-pressed={m.scope === k} onClick={() => m.setScope(k)}
                title={k === "gym" ? "Conversations between the gym and people — replies are sent as the gym" : "Your own conversations — replies are sent as you"}
                className={`flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${m.scope === k ? "bg-primary text-white" : "bg-background text-muted hover:text-foreground"}`}>
                <Icon size={14} className="shrink-0" /><span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        )}
        <div role="tablist" aria-label="Show" className="mt-2 flex border-b border-line">
          {VIEWS.map(([v, text]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`-mb-px flex-1 border-b-2 px-1 py-2 text-[13px] font-semibold ${view === v ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
              {text}{v === "chats" && m.unread > 0 && <span className="ml-1.5 rounded-full bg-bad px-1.5 py-0.5 text-[10px] font-bold text-white">{m.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {view !== "chats" ? (
          !loaded ? (
            <Skeleton size={size} />
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted">
              {loaded.failed ? "Couldn't load that list." : q ? "Nobody matches that." : view === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {shown.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-background">
                  <Avatar name={p.name} size={size} />
                  <Link href={`/users/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-[13px] text-muted">{view === "followers" ? "Follows you" : "Following"}</span>
                  </Link>
                  <button aria-label={`Message ${p.name}`} title={`Message ${p.name}`} disabled={m.starting} onClick={() => void message(p)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_4px_10px_-4px_rgba(91,61,245,.6)] outline-none transition-colors hover:bg-primary-600 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50">
                    <LuMessageCircle size={17} />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : m.loading ? (
          <Skeleton size={size} />
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted">
            <p>{q ? "No conversation matches that." : "No conversations yet."}</p>
            {!q && (
              <button onClick={() => setView("followers")} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary"><LuMessageCircle size={16} />Message a follower</button>
            )}
            {!q && m.scope === "personal" && (
              <button onClick={() => setComposing(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 font-semibold text-primary"><LuSquarePen size={16} />New message</button>
            )}
          </div>
        ) : (
          <ul className="grid gap-0.5">
            {rows.map((c) => {
              const on = m.active?.id === c.id;
              return (
                <li key={c.id}>
                  <button onClick={() => { void m.openConversation(c); onPick?.(c); }} aria-current={on}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${on ? "bg-primary-50" : "hover:bg-background"}`}>
                    <Avatar name={c.title} size={size} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.title}</span>
                      <span className={`block truncate text-[13px] ${c.unread ? "font-semibold text-foreground" : "text-muted"}`}>
                        {c.unread ? `${c.unread} new message${c.unread === 1 ? "" : "s"}` : c.sub || "Conversation"}
                      </span>
                    </span>
                    {c.unread > 0 && <span aria-hidden className="h-3 w-3 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <NewMessage m={m} open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}

function Skeleton({ size }: { size: number }) {
  return (
    <ul aria-hidden className="grid gap-1">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 px-2 py-2">
          <span style={{ width: size, height: size }} className="shrink-0 animate-pulse rounded-full bg-background" />
          <span className="grid flex-1 gap-1.5"><span className="h-3 w-1/2 animate-pulse rounded bg-background" /><span className="h-2.5 w-1/3 animate-pulse rounded bg-background" /></span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- thread

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

/** "3:42 PM" today, "Mon 3:42 PM" this week, otherwise "Nov 16, 3:42 PM". */
function stamp(t: number, now = Date.now()): string {
  const d = new Date(t);
  const clock = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (new Date(now).toDateString() === d.toDateString()) return clock;
  if (now - t < 6 * 86_400_000) return `${d.toLocaleDateString([], { weekday: "short" })} ${clock}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${clock}`;
}

const GROUP_GAP = 2 * 60_000; // messages closer than this from the same side read as one run
const STAMP_GAP = 15 * 60_000; // a quiet spell longer than this gets a time line

const EMOJI = ["😀", "😂", "😍", "🥰", "😎", "🤔", "😢", "👍", "🙏", "💪", "🔥", "🎉", "❤️", "💯", "👏", "🏋️"];

function Bubbles({ messages, title, lockedNote }: { messages: Message[]; title: string; lockedNote: string }) {
  let lastMine = -1;
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].mine) { lastMine = i; break; }

  return (
    <>
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const at = time(msg.at);
        const quiet = !prev || (at && time(prev.at) && at - time(prev.at) > STAMP_GAP);
        const joinsPrev = !!prev && !quiet && prev.mine === msg.mine && at - time(prev.at) < GROUP_GAP;
        const nextQuiet = !!next && time(next.at) - at > STAMP_GAP;
        const joinsNext = !!next && !nextQuiet && next.mine === msg.mine && time(next.at) - at < GROUP_GAP;
        // A run of bubbles shares one squared-off edge on the sender's side, like a single block.
        const shape = msg.mine
          ? `${joinsPrev ? "rounded-tr-md" : ""} ${joinsNext ? "rounded-br-md" : ""}`
          : `${joinsPrev ? "rounded-tl-md" : ""} ${joinsNext ? "rounded-bl-md" : ""}`;
        const note = msg.mine && (msg.pending ? "Sending…" : i === lastMine ? (msg.read ? "Seen" : "Sent") : "");
        return (
          <div key={msg.id}>
            {quiet && at > 0 && <p className="py-3 text-center text-xs font-medium text-muted">{stamp(at)}</p>}
            <div className={`flex items-end gap-2 ${joinsPrev ? "mt-0.5" : "mt-2.5"} ${msg.mine ? "justify-end" : ""}`}>
              {!msg.mine && (joinsNext ? <span className="w-7 shrink-0" /> : <Avatar name={title} size={28} />)}
              <div title={at ? stamp(at) : undefined}
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 leading-snug ${shape} ${msg.mine ? "bg-primary text-white" : "bg-background text-foreground"} ${msg.pending ? "opacity-70" : ""}`}>
                {msg.locked ? (
                  <span className={`flex items-center gap-1.5 ${msg.mine ? "text-white/80" : "text-muted"}`}><LuLock size={14} className="shrink-0" />{lockedNote}</span>
                ) : msg.text}
              </div>
            </div>
            {note && <p className="mt-0.5 pr-1 text-right text-[11px] text-muted">{note}</p>}
          </div>
        );
      })}
    </>
  );
}

/**
 * The open conversation: header, bubbles, composer. `onBack` shows a back arrow (always in the chat box, and
 * on small screens on the page, where the list and the thread take turns); `onClose` and `fullHref` are the
 * chat box's close and open-in-full controls.
 */
export function Thread({ m, compact = false, onBack, onClose, fullHref }: { m: Messaging; compact?: boolean; onBack?: () => void; onClose?: () => void; fullHref?: string }) {
  const c = m.active;
  const box = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [picking, setPicking] = useState(false);
  const [comparing, setComparing] = useState(false);
  // Keep the newest message in view: on opening a thread, on every new message, and when "typing" appears.
  // Older messages loading in above don't count — those keep the reader where they were.
  const lastId = m.messages[m.messages.length - 1]?.id;
  const firstId = m.messages[0]?.id;
  const typing = m.peerTyping;
  const openId = c?.id;
  const heightBefore = useRef(0);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, typing, openId]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (heightBefore.current && el.scrollHeight > heightBefore.current) el.scrollTop += el.scrollHeight - heightBefore.current;
    heightBefore.current = 0;
  }, [firstId]);
  const loadOlder = () => {
    heightBefore.current = scroller.current?.scrollHeight ?? 0;
    void m.loadOlder();
  };
  if (!c) return null;

  const fit = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };
  const submit = () => {
    void m.send();
    setPicking(false);
    if (box.current) box.current.style.height = "auto";
    box.current?.focus();
  };
  const add = (emoji: string) => {
    m.setDraft(`${m.draft}${emoji}`);
    box.current?.focus();
  };
  const ready = m.canSend;
  const anyLocked = m.messages.some((x) => x.locked);
  const lockedNote = m.keyState === "restore" ? "Enter your recovery code to read this" : "Can't be read on this device";
  const typed = m.draft.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className={`flex items-center gap-2 border-b border-line ${compact ? "px-2 py-2" : "px-3 py-2.5 sm:px-4"}`}>
        {onBack && <button aria-label="Back to conversations" onClick={onBack} className={`${iconBtn} ${compact ? "" : "lg:hidden"}`}><LuArrowLeft size={18} /></button>}
        <Avatar name={c.title} size={compact ? 34 : 40} />
        <span className="min-w-0 flex-1">
          <b className={`block truncate ${compact ? "" : "text-[17px]"}`}>{c.title}</b>
          <span className="flex items-center gap-1 truncate text-xs text-muted">
            {m.peerTyping ? "Typing…" : ready ? <><LuLock size={11} className="shrink-0" />End-to-end encrypted</> : m.busy ? "Opening…" : "Waiting for their key"}
          </span>
        </span>
        {m.withPerson && c.targetUserId && <button aria-label="Compare keys" title="Compare keys" onClick={() => setComparing(true)} className={iconBtn}><LuShieldCheck size={18} /></button>}
        {m.withPerson && c.targetUserId && <Link href={`/users/${c.targetUserId}`} aria-label="View profile" title="View profile" className={iconBtn}><LuUser size={18} /></Link>}
        {fullHref && <Link href={fullHref} aria-label="Open in Messages" title="Open in Messages" className={iconBtn}><LuMaximize2 size={16} /></Link>}
        {onClose && <button aria-label="Close chat" onClick={onClose} className={iconBtn}><LuX size={18} /></button>}
      </header>

      {/* On the wide page the list beside the thread already shows this; the chat box and phones need it here. */}
      {anyLocked && m.keyState === "restore" && <div className={`pt-2 ${compact ? "" : "lg:hidden"}`}><KeyBanner m={m} compact={compact} /></div>}
      {!ready && !m.busy && (
        <div className="flex items-start gap-2 bg-warn-bg px-4 py-2.5 text-[13px] text-warn">
          <span className="flex-1">{m.noKeyNote}</span>
          <button onClick={() => void m.refresh()} className="inline-flex shrink-0 items-center gap-1 font-semibold underline"><LuRefreshCw size={13} />Refresh</button>
        </div>
      )}

      <div ref={scroller} role="log" aria-label={`Messages with ${c.title}`} className={`min-h-0 flex-1 overflow-y-auto ${compact ? "px-2.5" : "px-3 sm:px-5"} pb-3`}
        onScroll={(e) => { if (m.hasOlder && !m.loadingOlder && e.currentTarget.scrollTop < 40) loadOlder(); }}>
        {m.hasOlder && (
          <div className="flex justify-center pt-3">
            <button onClick={loadOlder} disabled={m.loadingOlder} className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-60">
              {m.loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}
        {m.messages.length === 0 ? (
          m.busy ? (
            <div aria-hidden className="grid gap-2 py-6">
              {[40, 55, 30].map((w, i) => <span key={w} style={{ width: `${w}%` }} className={`h-9 animate-pulse rounded-[18px] bg-background ${i === 1 ? "ml-auto" : ""}`} />)}
            </div>
          ) : (
            <div className="grid place-items-center gap-2 py-12 text-center">
              <Avatar name={c.title} size={64} />
              <b className="text-lg">{c.title}</b>
              <p className="text-muted">Say hello — this is the start of your conversation.</p>
            </div>
          )
        ) : <Bubbles messages={m.messages} title={c.title} lockedNote={lockedNote} />}
        {m.peerTyping && (
          <div className="mt-2.5 flex items-end gap-2" aria-label={`${c.title} is typing`}>
            <Avatar name={c.title} size={28} />
            <span className="flex gap-1 rounded-[18px] bg-background px-3.5 py-3">
              {[0, 150, 300].map((d) => <span key={d} style={{ animationDelay: `${d}ms` }} className="h-2 w-2 animate-bounce rounded-full bg-muted motion-reduce:animate-none" />)}
            </span>
          </div>
        )}
      </div>

      <div className={`relative border-t border-line ${compact ? "p-2" : "p-2.5 sm:px-4"}`}>
        {picking && (
          <div role="group" aria-label="Emoji" className="absolute bottom-full left-2 mb-1 grid grid-cols-8 gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
            {EMOJI.map((e) => <button key={e} onClick={() => add(e)} className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-background">{e}</button>)}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button aria-label="Emoji" aria-expanded={picking} disabled={!ready} onClick={() => setPicking((v) => !v)} className={`${iconBtn} text-primary hover:text-primary`}><LuSmile size={20} /></button>
          <textarea ref={box} rows={1} aria-label="Message" disabled={!ready} value={m.draft}
            placeholder={ready ? "Aa" : "Can't send yet"}
            onChange={(e) => { m.setDraft(e.target.value); m.emitTyping(); fit(e.target); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            className="max-h-[120px] min-w-0 flex-1 resize-none rounded-[20px] bg-background px-4 py-2 leading-snug outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
          {typed ? (
            <button aria-label="Send" disabled={!ready} onClick={submit} className={`${iconBtn} text-primary hover:text-primary`}><LuSend size={20} /></button>
          ) : (
            <button aria-label="Send a thumbs up" disabled={!ready} onClick={() => void m.send("👍")} className={`${iconBtn} text-primary hover:text-primary`}><LuThumbsUp size={20} /></button>
          )}
        </div>
      </div>
      {m.withPerson && <CompareKeys m={m} open={comparing} onClose={() => setComparing(false)} />}
    </div>
  );
}
