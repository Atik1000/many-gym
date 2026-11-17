"use client";

/**
 * The messaging engine behind both the Messages page and the floating chat box — the full `/messaging/*`
 * surface, real-time over WebSocket with a REST fallback.
 *
 * Live delivery, typing indicators and read receipts ride the socket in `lib/api/messaging-socket.ts`; message
 * history, conversation creation and key registration use the REST endpoints. Messages are end-to-end
 * encrypted (`lib/api/e2ee.ts`): the server stores ciphertext only, so anything written by a client on a
 * different scheme shows as locked rather than being guessed at.
 *
 * When the socket is down, sending falls back to `POST /conversations/{id}/messages/` and Refresh reloads
 * history — so chat keeps working, just without the live updates.
 *
 * **Two inboxes.** A person has their own conversations (`user_to_user`, and `user_to_gym` where they wrote to
 * a gym); a gym has its conversations with people. An account acting for a gym can switch between the two;
 * an account with no gym only has the personal one.
 *
 * **Keys.** Nobody can be written to until their browser has published a key, so the device is registered as
 * soon as this mounts — and because the chat box is on every page, simply being signed in is enough.
 *
 * Only one instance should be mounted at a time (each owns a socket): the chat box steps aside on `/messages`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { asArray } from "@/lib/api/adapters";
import * as api from "@/lib/api/endpoints";
import { ApiError, currentGymId } from "@/lib/api/http";
import { deviceKeys, open as openMessage, publicBundle, seal, supported } from "@/lib/api/e2ee";
import { MessagingSocket, type ServerEvent, type SocketStatus, type WireMessage } from "@/lib/api/messaging-socket";

export type Conversation = { id: string; title: string; sub: string; unread: number; targetUserId?: string; targetGymId?: string };
export type Scope = "personal" | "gym";
export type Message = { id: string; mine: boolean; at: string; text: string | null; locked: boolean; read?: boolean; pending?: boolean };

const str = (v: unknown) => (v == null ? "" : String(v));

function toConversation(raw: unknown, meId: string): Conversation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const parts = asArray<Record<string, unknown>>(o.participants);
  const other = parts.find((p) => str(p.user_id ?? p.id) !== meId) ?? parts[0] ?? {};
  const op = (o.other_party ?? {}) as Record<string, unknown>;
  const fullNameOf = (x: Record<string, unknown>) => str(x.full_name) || `${str(x.first_name)} ${str(x.last_name)}`.trim();
  return {
    id: str(o.id ?? o.conversation_id),
    title:
      str(op.name) || fullNameOf(op) || str(o.title ?? o.name) || str(other.user_full_name) || fullNameOf(other) ||
      str(other.display_name ?? other.name ?? other.gym_name ?? op.email ?? other.user_email ?? other.email) ||
      "Conversation",
    sub: str(o.conversation_type ?? other.participant_type ?? "").replace(/_/g, " "),
    unread: Number(o.unread_count ?? other.unread_count ?? 0) || 0,
    targetUserId: str(op.user_id ?? (op.type === "user" ? op.id : undefined) ?? other.user_id) || undefined,
    targetGymId: str((op.type === "gym" ? op.id : undefined) ?? other.gym_id) || undefined,
  };
}

/**
 * The server returns `{user_id|gym_id, devices:[{identity_key,…}]}`. A user can have several registered
 * devices (old browsers, other sessions); pick the most recently registered one whose identity key is a
 * valid 32-byte X25519 public key, so a stale or malformed entry doesn't break encryption.
 */
function bundleIdentityKey(bundle: unknown): string | null {
  // The schema documents a bare array of device bundles; the server has been seen answering
  // `{user_id|gym_id, devices: [...]}`. Read whichever arrives.
  const devices = Array.isArray(bundle)
    ? (bundle as Array<{ identity_key?: string }>)
    : asArray<{ identity_key?: string }>((bundle as { devices?: unknown } | null | undefined)?.devices);
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

/** Which account + gym this browser's key was last published for, so each page load doesn't publish it again. */
let publishedFor = "";

/** `readQuery`: honour `?user=<id>` in the address bar (the Messages page does; the chat box doesn't). */
export function useMessaging({ readQuery = false }: { readQuery?: boolean } = {}) {
  const toast = useToast();
  const { me } = useAuth();
  const gymId = currentGymId();
  const meId = me?.userId ?? "";
  // Which inbox is showing. An account with no gym only has the personal one.
  const [choice, setChoice] = useState<Scope | null>(null);
  const scope: Scope = !gymId ? "personal" : choice ?? "gym";
  /** The gym this inbox belongs to — null for the personal inbox, even while the session acts for a gym. */
  const scopeGym = scope === "gym" ? gymId : null;
  const scopeGymRef = useRef<string | null>(scopeGym);
  useEffect(() => { scopeGymRef.current = scopeGym; }, [scopeGym]);
  /** `?user=<id>` — someone to open a personal conversation with, once the personal inbox has loaded. */
  const [wanted, setWanted] = useState<string | null>(null);
  const [startProblem, setStartProblem] = useState("");
  const lastListReload = useRef(0);

  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [listScope, setListScope] = useState<Scope | null>(null); // which inbox `list` currently holds
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [peerTyping, setPeerTyping] = useState(false);

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

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.messagingConversationsList({ gym_id: scopeGym ?? undefined });
      const mapped = asArray<unknown>(rows).map((r) => toConversation(r, meId));
      // The personal inbox must not show a gym's conversations with its members (and vice versa), even if a
      // deployment answers from the token's gym context regardless of `gym_id`.
      const kindOf = (r: unknown) => str((r as { conversation_type?: unknown })?.conversation_type);
      const raw = asArray<unknown>(rows);
      setList(mapped.filter((c, i) => {
        if (scopeGym) return true;
        const ownGymSide = kindOf(raw[i]) !== "user_to_user" && !c.targetGymId && !!gymId;
        return !ownGymSide;
      }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't load conversations");
      setList([]);
    } finally {
      setLoading(false);
      setListScope(scopeGym ? "gym" : "personal");
    }
  }, [scopeGym, gymId, meId, toast]);

  useEffect(() => {
    void Promise.resolve().then(loadList);
  }, [loadList]);
  const reloadRef = useRef<() => Promise<void>>(async () => undefined);
  useEffect(() => { reloadRef.current = loadList; }, [loadList]);

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
        // We're looking at it — tell the server it's read.
        if (!mine) socketRef.current?.markRead(cid);
      } else if (bump && !mine) {
        // Not the open conversation: raise its unread badge so the list reflects the new message.
        let known = false;
        setList((l) => {
          known = l.some((c) => c.id === cid);
          return l.map((c) => (c.id === cid ? { ...c, unread: c.unread + 1 } : c));
        });
        // A first message from someone new: the conversation isn't in the list yet. Reload this inbox — the
        // server only returns conversations that belong to it, so nothing from the other inbox leaks in.
        queueMicrotask(() => {
          if (known || Date.now() - lastListReload.current < 3000) return;
          lastListReload.current = Date.now();
          void reloadRef.current();
        });
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
    // One connection per inbox: the personal one connects without `gym_id`, so it receives what is sent to
    // the person rather than to the gym they manage. Switching inbox reconnects.
    const sock = new MessagingSocket({ onStatus: setStatus, onEvent }, { gymId: () => scopeGymRef.current });
    scopeGymRef.current = scopeGym;
    socketRef.current = sock;
    sock.connect();
    return () => {
      sock.close();
      socketRef.current = null;
    };
    // onEvent is stable except for meId/toast which don't change within a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeGym]);

  // Switching inbox leaves whatever conversation was open behind.
  useEffect(() => {
    void Promise.resolve().then(() => {
      setActive(null);
      activeRef.current = null;
      setMessages([]);
      setPeerKey(null);
      peerKeyRef.current = null;
      setStartProblem("");
    });
  }, [scope]);

  // Keep the socket's event handler current (it captured meId/peerKey) without tearing down the connection.
  useEffect(() => {
    socketRef.current?.setHandlers({ onEvent, onStatus: setStatus });
  }, [onEvent]);

  /**
   * Publishes this browser's public key bundle so other people can message it. The person's own key is always
   * registered — with or without a gym — and the gym's as well when the session acts for one.
   */
  const registerDevice = useCallback(async (quiet = false) => {
    if (!supported()) {
      if (!quiet) toast("This browser can't do end-to-end encryption");
      return;
    }
    const who = `${meId}:${gymId ?? ""}`;
    if (quiet && publishedFor === who) { setRegistered(true); return; }
    if (!quiet) setBusy(true);
    try {
      const b = await publicBundle();
      await api.messagingKeysRegisterCreate({ ...b, device_name: "Admin panel" });
      if (gymId) {
        await api
          .messagingKeysGymRegisterCreate({ ...b, device_name: "Admin panel", gym_id: gymId })
          .catch(() => null); // only a gym owner may register the gym bundle
      }
      setRegistered(true);
      publishedFor = who;
      if (!quiet) toast("This device can now receive encrypted messages");
    } catch (e) {
      // Left unregistered, the button stays available to try again.
      if (!quiet) toast(e instanceof ApiError ? e.message : "Couldn't register this device");
    } finally {
      if (!quiet) setBusy(false);
    }
  }, [gymId, meId, toast]);

  // Opening Messages is what makes someone reachable: without a published key nobody can encrypt to them,
  // and "press Register first" is a step two people starting a chat would both have to know about.
  useEffect(() => {
    if (!meId) return;
    void Promise.resolve().then(() => registerDevice(true));
  }, [meId, registerDevice]);

  // `/messages?user=<id>`: remember who was asked for and show the personal inbox.
  useEffect(() => {
    if (!readQuery) return;
    const id = new URLSearchParams(window.location.search).get("user");
    if (!id) return;
    void Promise.resolve().then(() => {
      setWanted(id);
      setChoice("personal");
    });
  }, [readQuery]);

  /**
   * Opens the conversation with a person, creating it if there isn't one. From the gym inbox it is the gym
   * writing to them (`user_to_gym`); from the personal inbox it is one person writing to another.
   */
  const startWith = async (targetUserId: string) => {
    setStartProblem("");
    if (targetUserId === meId) {
      setStartProblem("That's your own account — pick someone else to message.");
      return;
    }
    setStarting(true);
    try {
      const conv = await api.messagingConversationsCreate({
        conversation_type: scopeGym ? "user_to_gym" : "user_to_user",
        target_user_id: targetUserId,
        source_gym_id: scopeGym ?? undefined,
      });
      const row = toConversation(conv, meId);
      // The other side of a person-to-person chat is that person, whatever the response happens to embed.
      const fixed = scopeGym ? row : { ...row, targetUserId: row.targetUserId ?? targetUserId, targetGymId: undefined };
      setList((l) => (l.some((x) => x.id === fixed.id) ? l : [fixed, ...l]));
      await openConversation(fixed);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const said = e instanceof ApiError ? e.message : "";
      setStartProblem(
        status === 403
          ? `${said || "They aren't accepting messages from you."} People accept messages from their followers by default — follow them, then try again.`
          : status === 404
            ? "That account wasn't found. It may have been deleted or deactivated."
            : said || "Couldn't start that conversation.",
      );
    } finally {
      setStarting(false);
    }
  };

  /** Fetches the key to encrypt to: the gym's bundle for a gym, the person's for a person. */
  const fetchPeerKey = async (c: Conversation): Promise<string | null> => {
    const bundle = c.targetGymId
      ? await api.messagingKeysGymList(c.targetGymId).catch(() => null)
      : c.targetUserId
        ? await api.messagingKeysUserList(c.targetUserId).catch(() => null)
        : null;
    return bundleIdentityKey(bundle);
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
      const key = await fetchPeerKey(c);
      setPeerKey(key);
      peerKeyRef.current = key;

      const detail = await api.messagingConversationsRetrieve(c.id).catch(() => null);
      if (detail) {
        // Keep what we already know about who is on the other side if the detail doesn't repeat it.
        const d = toConversation(detail, meId);
        setActive((a) => (a && a.id === c.id ? { ...a, ...d, targetUserId: d.targetUserId ?? a.targetUserId, targetGymId: d.targetGymId ?? a.targetGymId, title: d.title === "Conversation" ? a.title : d.title } : a));
      }

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
    }
  };

  const withPerson = !!active && !active.targetGymId;
  const noKeyNote = withPerson
    ? "They haven't signed in on this version yet, so there is no key to encrypt to. Once they sign in, press Refresh."
    : "This gym hasn't published an encryption key yet. Once its owner signs in, press Refresh.";

  /** Leaves the open conversation: nothing is marked read while no thread is on screen. */
  const closeConversation = () => {
    setActive(null);
    activeRef.current = null;
    setMessages([]);
    setPeerKey(null);
    peerKeyRef.current = null;
    setPeerTyping(false);
    socketRef.current?.setActiveConversation(null);
  };

  const emitTyping = () => {
    const cur = activeRef.current;
    if (!cur || status !== "open") return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return; // throttle
    lastTypingSentRef.current = now;
    socketRef.current?.typing(cur.id, true);
  };

  /** Sends the draft — or `quick`, a ready-made message such as a thumbs-up, leaving the draft alone. */
  const send = async (quick?: string) => {
    const text = (quick ?? draft).trim();
    if (!text || !active) return;
    if (!peerKey) return toast(noKeyNote);
    if (quick === undefined) setDraft("");
    const tmpId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Message = { id: tmpId, mine: true, at: new Date().toISOString(), text, locked: false, pending: true };
    setMessages((m) => [...m, optimistic]);
    try {
      const keys = await deviceKeys();
      const sealed = await seal(text, peerKey);
      const base = {
        ...sealed,
        sender_type: (scopeGym ? "gym" : "user") as "gym" | "user",
        sender_device_id: keys.deviceId,
        encrypted_keys: {} as Record<string, string>,
      };

      // Prefer the socket (live + ack); fall back to REST when it's not connected.
      const viaSocket = socketRef.current?.sendMessage({ conversation_id: active.id, ...base }) ?? false;
      if (viaSocket) {
        pendingRef.current.push(tmpId); // reconciled by message_sent_ack / our own new_message echo
      } else {
        const saved = await api.messagingConversationsMessagesCreate(active.id, { ...base, sender_gym_id: scopeGym ?? undefined });
        const realId = str((saved as { id?: string })?.id);
        if (realId) seenRef.current.add(realId);
        setMessages((prev) => prev.map((m) => (m.id === tmpId ? { ...m, id: realId || tmpId, pending: false } : m)));
      }
    } catch (e) {
      // Roll the optimistic bubble back so the person knows it didn't go.
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      if (quick === undefined) setDraft(text);
      toast(e instanceof ApiError ? e.message : "Couldn't send that message");
    }
  };

  // Once the personal inbox has loaded, open the conversation `?user=` asked for — the existing one if there
  // is one — and drop the parameter so a refresh doesn't ask again.
  useEffect(() => {
    if (!wanted || !meId || scope !== "personal" || listScope !== "personal" || loading || starting) return;
    const id = wanted;
    void Promise.resolve().then(async () => {
      setWanted(null);
      if (readQuery) window.history.replaceState(null, "", window.location.pathname);
      const existing = list.find((c) => c.targetUserId === id && !c.targetGymId);
      if (existing) await openConversation(existing);
      else await startWith(id);
    });
    // openConversation/startWith are recreated every render; the guards above make this run once per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, meId, scope, listScope, loading, starting, list]);

  /** Reloads the inbox and, when the open conversation is waiting on the other person's key, looks again. */
  const refresh = async () => {
    await loadList();
    const cur = activeRef.current;
    if (cur && !peerKeyRef.current && (await fetchPeerKey(cur))) await openConversation(cur);
  };

  const online = status === "open";
  const statusLabel = useMemo(
    () => (status === "open" ? "Live" : status === "connecting" ? "Connecting…" : status === "auth-error" ? "Offline" : "Offline"),
    [status],
  );

  /** Opens — or starts — the personal conversation with a person, from anywhere. */
  const openWithUser = (userId: string) => {
    setChoice("personal");
    setWanted(userId);
  };

  return {
    me, meId, gymId, scope, setScope: setChoice,
    list, loading, unread: list.reduce((n, c) => n + c.unread, 0),
    active, messages, busy, draft, setDraft, peerKey, peerTyping,
    registered, starting, startProblem, status, statusLabel, online, withPerson, noKeyNote,
    openConversation, closeConversation, startWith, openWithUser, send, emitTyping, refresh, registerDevice,
  };
}

export type Messaging = ReturnType<typeof useMessaging>;
