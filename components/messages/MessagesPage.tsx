"use client";

/**
 * Messaging — the full `/messaging/*` surface, real-time over WebSocket with a REST fallback.
 *
 * Live delivery, typing indicators and read receipts ride the socket in `lib/api/messaging-socket.ts`; message
 * history, conversation creation and key registration use the REST endpoints. Messages are end-to-end
 * encrypted (`lib/api/e2ee.ts`): the server stores ciphertext only, so anything written by a client on a
 * different scheme shows as locked rather than being guessed at.
 *
 * When the socket is down, sending falls back to `POST /conversations/{id}/messages/` and the Refresh button
 * reloads history — so the screen keeps working, just without the live updates.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuLock, LuRefreshCw, LuSend, LuShieldCheck, LuWifi, LuWifiOff } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { asArray } from "@/lib/api/adapters";
import { useResource } from "@/lib/api";
import { MEMBERS_KEY, fullName, type Member } from "@/lib/members";
import * as api from "@/lib/api/endpoints";
import { ApiError, currentGymId } from "@/lib/api/http";
import { deviceKeys, open as openMessage, publicBundle, seal, supported } from "@/lib/api/e2ee";
import { MessagingSocket, type ServerEvent, type SocketStatus, type WireMessage } from "@/lib/api/messaging-socket";
import { btnGhost, btnPrimary, card, hint, input } from "@/lib/ui";

type Conversation = { id: string; title: string; sub: string; unread: number; targetUserId?: string; targetGymId?: string };
type Message = { id: string; mine: boolean; at: string; text: string | null; locked: boolean; read?: boolean; pending?: boolean };

const str = (v: unknown) => (v == null ? "" : String(v));

function toConversation(raw: unknown, meId: string): Conversation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const parts = asArray<Record<string, unknown>>(o.participants);
  const other = parts.find((p) => str(p.user_id ?? p.id) !== meId) ?? parts[0] ?? {};
  const op = (o.other_party ?? {}) as Record<string, unknown>;
  return {
    id: str(o.id ?? o.conversation_id),
    title:
      str(op.name ?? o.title ?? o.name ?? other.user_full_name ?? other.display_name ?? other.name ?? other.gym_name ?? other.user_email ?? other.email) ||
      "Conversation",
    sub: str(o.conversation_type ?? other.participant_type ?? "").replace(/_/g, " "),
    unread: Number(o.unread_count ?? other.unread_count ?? 0) || 0,
    targetUserId: str(op.user_id ?? other.user_id) || undefined,
    targetGymId: str((op.type === "gym" ? op.id : undefined) ?? other.gym_id) || undefined,
  };
}

/**
 * The server returns `{user_id|gym_id, devices:[{identity_key,…}]}`. A user can have several registered
 * devices (old browsers, other sessions); pick the most recently registered one whose identity key is a
 * valid 32-byte X25519 public key, so a stale or malformed entry doesn't break encryption.
 */
function bundleIdentityKey(bundle: { devices?: Array<{ identity_key?: string }> } | null | undefined): string | null {
  const devices = asArray<{ identity_key?: string }>(bundle?.devices);
  for (let i = devices.length - 1; i >= 0; i--) {
    const key = str(devices[i]?.identity_key);
    if (!key) continue;
    try {
      if (atob(key).length === 32) return key; // raw X25519 public key is 32 bytes
    } catch {
      /* not valid base64 — skip */
    }
  }
  return null;
}

export default function MessagesPage() {
  const toast = useToast();
  const { me } = useAuth();
  const gymId = currentGymId();
  const meId = me?.userId ?? "";

  const [memberRows] = useResource<Member>(MEMBERS_KEY);
  // Only members linked to a user account can be messaged; the directory row carries that id.
  const members = memberRows.map((m) => ({ id: m.id, name: fullName(m), userId: m.userId }));
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [peerTyping, setPeerTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Refs the socket callbacks read without re-subscribing.
  const socketRef = useRef<MessagingSocket | null>(null);
  const activeRef = useRef<Conversation | null>(null);
  const peerKeyRef = useRef<string | null>(null);
  const pendingRef = useRef<string[]>([]); // optimistic temp ids awaiting their ack
  const seenRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  // Mirror the latest state into refs so the socket's event callbacks read current values.
  // (The synchronous flows also set these directly where ordering matters.)
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { peerKeyRef.current = peerKey; }, [peerKey]);

  const scrollToEnd = () => queueMicrotask(() => endRef.current?.scrollIntoView({ block: "end" }));

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.messagingConversationsList({ gym_id: gymId ?? undefined });
      setList(asArray<unknown>(rows).map((r) => toConversation(r, meId)));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't load conversations");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [gymId, meId, toast]);

  useEffect(() => {
    void Promise.resolve().then(loadList);
  }, [loadList]);

  // ---- live incoming message: decrypt and place it ----
  const placeIncoming = useCallback(
    async (wire: WireMessage, bump: boolean) => {
      const cid = str(wire.conversation_id);
      const id = str(wire.id);
      if (id && seenRef.current.has(id)) return;
      const cur = activeRef.current;
      const mine = str(wire.sender_user_id) === meId && str(wire.sender_user_id) !== "";

      if (cur && cid === cur.id) {
        // Decrypt against the other party's identity key (for our own echo, that's the peer too).
        const key = peerKeyRef.current;
        const text = key && wire.ciphertext && wire.nonce ? await openMessage(wire.ciphertext, wire.nonce, key) : null;
        if (id) seenRef.current.add(id);
        setMessages((prev) => {
          // Reconcile our own optimistic copy if its ack hasn't landed yet.
          if (mine && pendingRef.current.length) {
            const tmp = pendingRef.current.shift()!;
            const i = prev.findIndex((m) => m.id === tmp);
            if (i >= 0) {
              const next = prev.slice();
              next[i] = { ...next[i], id: id || tmp, pending: false };
              return next;
            }
          }
          if (prev.some((m) => m.id === id)) return prev;
          return [...prev, { id: id || crypto.randomUUID(), mine, at: str(wire.sent_at), text, locked: text === null }];
        });
        scrollToEnd();
        // We're looking at it — tell the server it's read.
        if (!mine) socketRef.current?.markRead(cid);
      } else if (bump && !mine) {
        // Not the open conversation: raise its unread badge so the list reflects the new message.
        setList((l) => l.map((c) => (c.id === cid ? { ...c, unread: c.unread + 1 } : c)));
      }
    },
    [meId],
  );

  const onEvent = useCallback(
    (e: ServerEvent) => {
      switch (e.type) {
        case "new_message":
          void placeIncoming((e as Extract<ServerEvent, { type: "new_message" }>).message, true);
          break;
        case "incoming_notification":
          void placeIncoming((e as Extract<ServerEvent, { type: "incoming_notification" }>).message, true);
          break;
        case "message_sent_ack": {
          const ack = e as Extract<ServerEvent, { type: "message_sent_ack" }>;
          const tmp = pendingRef.current.shift();
          if (tmp) {
            if (ack.message_id) seenRef.current.add(ack.message_id);
            setMessages((prev) => prev.map((m) => (m.id === tmp ? { ...m, id: ack.message_id || tmp, at: ack.sent_at || m.at, pending: false } : m)));
          }
          break;
        }
        case "typing_indicator": {
          const d = (e as Extract<ServerEvent, { type: "typing_indicator" }>).data;
          const cur = activeRef.current;
          if (!cur || d.conversation_id !== cur.id || d.user_id === meId) break;
          setPeerTyping(d.is_typing);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          if (d.is_typing) typingTimerRef.current = setTimeout(() => setPeerTyping(false), 4000);
          break;
        }
        case "read_receipt": {
          const d = (e as Extract<ServerEvent, { type: "read_receipt" }>).data;
          const cur = activeRef.current;
          if (!cur || d.conversation_id !== cur.id || d.read_by_user_id === meId) break;
          setMessages((prev) => prev.map((m) => (m.mine ? { ...m, read: true } : m)));
          break;
        }
        case "error":
          // Room-join races produce benign "Unauthorized conversation access." noise; surface real ones only.
          if (!/unauthorized conversation access/i.test(str((e as { message?: string }).message))) {
            toast(str((e as { message?: string }).message) || "Messaging error");
          }
          break;
      }
    },
    [meId, placeIncoming, toast],
  );

  // ---- socket lifecycle ----
  useEffect(() => {
    if (!supported()) return;
    const sock = new MessagingSocket({ onStatus: setStatus, onEvent });
    socketRef.current = sock;
    sock.connect();
    return () => {
      sock.close();
      socketRef.current = null;
    };
    // onEvent is stable except for meId/toast which don't change within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the socket's event handler current (it captured meId/peerKey) without tearing down the connection.
  useEffect(() => {
    socketRef.current?.setHandlers({ onEvent, onStatus: setStatus });
  }, [onEvent]);

  /** Publishes this browser's public key bundle so other people can message it. */
  const registerDevice = async () => {
    if (!supported()) return toast("This browser can't do end-to-end encryption");
    setBusy(true);
    try {
      const b = await publicBundle();
      await api.messagingKeysRegisterCreate({ ...b, device_name: "Admin panel" });
      if (gymId) {
        await api
          .messagingKeysGymRegisterCreate({ ...b, device_name: "Admin panel", gym_id: gymId })
          .catch(() => null); // only a gym owner may register the gym bundle
      }
      setRegistered(true);
      toast("This device can now receive encrypted messages");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't register this device");
    } finally {
      setBusy(false);
    }
  };

  const startWith = async (targetUserId: string) => {
    setStarting(true);
    try {
      const conv = await api.messagingConversationsCreate({
        conversation_type: gymId ? "user_to_gym" : "user_to_user",
        target_user_id: targetUserId,
        source_gym_id: gymId ?? undefined,
      });
      const row = toConversation(conv, meId);
      setList((l) => (l.some((x) => x.id === row.id) ? l : [row, ...l]));
      await openConversation(row);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't start that conversation");
    } finally {
      setStarting(false);
    }
  };

  const openConversation = async (c: Conversation) => {
    setActive(c);
    activeRef.current = c;
    setMessages([]);
    setPeerKey(null);
    peerKeyRef.current = null;
    setPeerTyping(false);
    pendingRef.current = [];
    seenRef.current = new Set();
    setBusy(true);
    // Subscribe to the live room immediately (the socket re-joins this on any reconnect).
    socketRef.current?.setActiveConversation(c.id);
    try {
      const bundle = c.targetGymId
        ? await api.messagingKeysGymList(c.targetGymId).catch(() => null)
        : c.targetUserId
          ? await api.messagingKeysUserList(c.targetUserId).catch(() => null)
          : null;
      const key = bundleIdentityKey(bundle);
      setPeerKey(key);
      peerKeyRef.current = key;

      const detail = await api.messagingConversationsRetrieve(c.id).catch(() => null);
      if (detail) setActive((a) => (a && a.id === c.id ? { ...a, ...toConversation(detail, meId) } : a));

      const rows = asArray<Record<string, unknown>>(await api.messagingConversationsMessagesList(c.id));
      const decoded = await Promise.all(
        rows.map(async (r): Promise<Message> => {
          const cipher = str(r.ciphertext);
          const nonce = str(r.nonce);
          const text = key && cipher && nonce ? await openMessage(cipher, nonce, key) : null;
          const id = str(r.id);
          if (id) seenRef.current.add(id);
          return {
            id: id || crypto.randomUUID(),
            mine: str(r.sender_user_id ?? r.sender_id) === meId,
            at: str(r.sent_at ?? r.created_at),
            text,
            locked: text === null,
            read: str(r.delivery_status) === "read" || !!r.read_at,
          };
        }),
      );
      setMessages(decoded);
      // Mark read over both channels: REST persists it, the socket notifies the other side live.
      await api.messagingConversationsReadCreate(c.id, {}).catch(() => null);
      socketRef.current?.markRead(c.id);
      setList((l) => l.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't open that conversation");
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  };

  const emitTyping = () => {
    const cur = activeRef.current;
    if (!cur || status !== "open") return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return; // throttle
    lastTypingSentRef.current = now;
    socketRef.current?.typing(cur.id, true);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    if (!peerKey) return toast("This person hasn't published an encryption key yet, so nothing can be sent to them");
    setDraft("");
    const tmpId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Message = { id: tmpId, mine: true, at: new Date().toISOString(), text, locked: false, pending: true };
    setMessages((m) => [...m, optimistic]);
    scrollToEnd();
    try {
      const keys = await deviceKeys();
      const sealed = await seal(text, peerKey);
      const base = {
        ...sealed,
        sender_type: (gymId ? "gym" : "user") as "gym" | "user",
        sender_device_id: keys.deviceId,
        encrypted_keys: {} as Record<string, string>,
      };

      // Prefer the socket (live + ack); fall back to REST when it's not connected.
      const viaSocket = socketRef.current?.sendMessage({ conversation_id: active.id, ...base }) ?? false;
      if (viaSocket) {
        pendingRef.current.push(tmpId); // reconciled by message_sent_ack / our own new_message echo
      } else {
        const saved = await api.messagingConversationsMessagesCreate(active.id, { ...base, sender_gym_id: gymId ?? undefined });
        const realId = str((saved as { id?: string })?.id);
        if (realId) seenRef.current.add(realId);
        setMessages((prev) => prev.map((m) => (m.id === tmpId ? { ...m, id: realId || tmpId, pending: false } : m)));
      }
    } catch (e) {
      // Roll the optimistic bubble back so the person knows it didn't go.
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      setDraft(text);
      toast(e instanceof ApiError ? e.message : "Couldn't send that message");
    }
  };

  const online = status === "open";
  const statusLabel = useMemo(
    () => (status === "open" ? "Live" : status === "connecting" ? "Connecting…" : status === "auth-error" ? "Offline" : "Offline"),
    [status],
  );

  return (
    <div className="grid gap-5">
      <section className={`${card} flex flex-wrap items-center gap-3 p-5`}>
        <LuShieldCheck size={20} className="text-primary" />
        <span className="flex-1">
          <b className="block">End-to-end encrypted</b>
          <span className="text-muted">
            The server stores ciphertext only. The API doesn&apos;t publish its handshake, so messages written by
            another client may show as locked here.
          </span>
        </span>
        <span
          title={online ? "Connected for live updates" : "Live updates unavailable — messages still send over REST"}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${online ? "bg-ok-bg text-ok" : "bg-background text-muted"}`}
        >
          {online ? <LuWifi size={14} /> : <LuWifiOff size={14} />}
          {statusLabel}
        </span>
        <MotionButton className={btnGhost} disabled={busy || registered} onClick={registerDevice}>
          <LuLock size={16} />{registered ? "Device registered" : "Register this device"}
        </MotionButton>
        <Select
          aria-label="Start a conversation with a member"
          className="max-w-[220px]"
          value=""
          disabled={starting}
          onChange={(e) => { if (e.target.value) void startWith(e.target.value); }}
        >
          <option value="">Message a member…</option>
          {members.filter((m) => m.userId).map((m) => <option key={m.id} value={m.userId!}>{m.name}</option>)}
        </Select>
        <MotionButton className={btnGhost} disabled={loading} onClick={() => void loadList()}>
          <LuRefreshCw size={16} />Refresh
        </MotionButton>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className={`${card} p-3`}>
          <h2 className="px-2 py-1.5 text-lg font-bold">Conversations</h2>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-background" />
          ) : list.length === 0 ? (
            <p className="p-6 text-center text-muted">No conversations yet.</p>
          ) : (
            <ul className="grid gap-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => void openConversation(c)}
                    aria-current={active?.id === c.id}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${active?.id === c.id ? "bg-primary-50" : "hover:bg-background"}`}
                  >
                    <Avatar name={c.title} size={38} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{c.title}</b>
                      {c.sub && <span className="block truncate text-xs text-muted">{c.sub}</span>}
                    </span>
                    {c.unread > 0 && <Pill tone="purple">{c.unread}</Pill>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} flex min-h-[420px] flex-col p-5`}>
          {!active ? (
            <p className="m-auto text-muted">Pick a conversation to read it.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3 border-b border-line pb-3">
                <Avatar name={active.title} size={40} />
                <span className="min-w-0 flex-1"><b className="block truncate text-lg">{active.title}</b>
                  <span className="block truncate text-muted">
                    {peerTyping ? "Typing…" : peerKey ? "Encryption key available" : "No published key for this participant"}
                  </span>
                </span>
              </div>

              <div className="flex-1 space-y-2 overflow-auto">
                {messages.length === 0 ? (
                  <p className="py-10 text-center text-muted">{busy ? "Loading…" : "No messages yet."}</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${m.mine ? "ml-auto bg-primary text-white" : "bg-background"}`}>
                    {m.locked ? (
                      <span className={`flex items-center gap-1.5 ${m.mine ? "text-white/80" : "text-muted"}`}>
                        <LuLock size={14} />Encrypted by another client — can&apos;t be read here
                      </span>
                    ) : m.text}
                    {m.mine && (m.pending || m.read) && (
                      <span className="mt-0.5 block text-right text-[11px] text-white/70">{m.pending ? "Sending…" : "Read"}</span>
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <input
                  aria-label="Message"
                  className={`${input} flex-1`}
                  placeholder={peerKey ? "Write a message…" : "Can't send — no encryption key published"}
                  disabled={!peerKey}
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); emitTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                />
                <MotionButton className={btnPrimary} disabled={!peerKey || !draft.trim()} onClick={send}>
                  <LuSend size={16} />Send
                </MotionButton>
              </div>
              <p className={hint}>
                Encrypted in this browser before it leaves. {online ? "Delivered live." : "Sent over REST — live updates are offline."}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
