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
 * **History on every device.** Messages are sent in the v2 envelope format (see `lib/api/e2ee.ts`): wrapped for
 * the other side's devices and backup key, and for this device and the person's own backup key. The backup key
 * is protected by a 5-digit recovery code — `keyState` says whether this browser still needs it set up
 * ("setup") or entered ("restore") before older messages can be read.
 *
 * Only one instance should be mounted at a time (each owns a socket): the chat box steps aside on `/messages`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { asArray } from "@/lib/api/adapters";
import * as api from "@/lib/api/endpoints";
import { ApiError, currentGymId } from "@/lib/api/http";
import {
  authProofFor, createMaster, deviceKeys, isEnvelope, isX25519Public, loadMaster, open as openMessage, openBackup, openEnvelope, publicBundle,
  saveMaster, sealBackup, sealFor, supported, type MasterKey, type Reader,
} from "@/lib/api/e2ee";
import { backupStatus, changeBackupCode, messageHistory, restoreBackup, saveBackup, type BackupStatus } from "@/lib/api/messaging-keys";
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

export type KeyState = "unknown" | "setup" | "restore" | "ready";

/**
 * Everyone a message to this bundle's owner must be readable by: each registered device (by device id) and,
 * for a person, their backup key as `backup:<user_id>`.
 */
function bundleReaders(bundle: unknown, userId?: string): Reader[] {
  const o = (bundle ?? {}) as { devices?: unknown; backup_key?: { backup_public_key?: unknown } | null };
  const devices = Array.isArray(bundle) ? (bundle as unknown[]) : asArray<unknown>(o.devices);
  const out: Reader[] = devices
    .map((d) => d as { device_id?: unknown; identity_key?: unknown })
    .filter((d) => str(d.device_id) && isX25519Public(d.identity_key))
    .map((d) => ({ id: str(d.device_id), publicKey: str(d.identity_key) }));
  const backup = o.backup_key?.backup_public_key;
  if (userId && !Array.isArray(bundle) && isX25519Public(backup)) out.push({ id: `backup:${userId}`, publicKey: backup });
  return out;
}

/**
 * The server returns `{user_id|gym_id, devices:[{identity_key,…}]}`. A user can have several registered
 * devices (old browsers, other sessions); pick the most recently registered one whose identity key is a
 * valid 32-byte X25519 public key, so a stale or malformed entry doesn't break encryption. Only used to
 * read v1 messages, which were keyed to one identity.
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
  /** Who a message in the open conversation must be readable by on the other side (v2). */
  const [peerReaders, setPeerReaders] = useState<Reader[]>([]);
  /** The other person's backup key, for Compare keys. */
  const [peerBackupKey, setPeerBackupKey] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupStatus | null>(null);
  /** The open conversation has messages older than the ones loaded (history loads newest first). */
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [master, setMaster] = useState<MasterKey | null>(null);
  const [registered, setRegistered] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<SocketStatus>("closed");
  const [peerTyping, setPeerTyping] = useState(false);

  // Refs the socket callbacks read without re-subscribing.
  const socketRef = useRef<MessagingSocket | null>(null);
  const activeRef = useRef<Conversation | null>(null);
  const peerKeyRef = useRef<string | null>(null);
  const peerReadersRef = useRef<Reader[]>([]);
  /** The gym's other devices (staff browsers), so a reply sent as the gym stays readable to them. */
  const gymReadersRef = useRef<Reader[]>([]);
  const pendingRef = useRef<string[]>([]); // optimistic temp ids awaiting their ack
  const seenRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  // Mirror the latest state into refs so the socket's event callbacks read current values.
  // (The synchronous flows also set these directly where ordering matters.)
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { peerKeyRef.current = peerKey; }, [peerKey]);
  useEffect(() => { peerReadersRef.current = peerReaders; }, [peerReaders]);

  /** Opens a stored or live message: v2 with this device or the restored backup key, v1 with the peer's identity key. */
  const decode = useCallback(async (r: { ciphertext?: unknown; nonce?: unknown; encrypted_keys?: unknown }, legacyPeer: string | null) => {
    const cipher = str(r.ciphertext);
    const nonce = str(r.nonce);
    if (!cipher || !nonce) return null;
    if (isEnvelope(r.encrypted_keys)) return openEnvelope(cipher, nonce, r.encrypted_keys, meId);
    return legacyPeer ? openMessage(cipher, nonce, legacyPeer) : null;
  }, [meId]);

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
        const text = await decode(wire, peerKeyRef.current);
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
    [meId, decode],
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

  // ---- recovery code / backup key ----
  const loadBackup = useCallback(async () => {
    if (!meId || !supported()) return;
    setMaster(loadMaster(meId));
    try { setBackup(await backupStatus()); } catch { /* leave it unknown: no prompt rather than a wrong one */ }
  }, [meId]);
  useEffect(() => { void Promise.resolve().then(loadBackup); }, [loadBackup]);

  const keyState: KeyState = !backup ? "unknown"
    : !backup.has_backup ? "setup"
      : !master || master.publicKey !== backup.backup_public_key ? "restore"
        : "ready";

  /** First device: keep this browser's backup key if it has one, otherwise make it, and store it under `code`. */
  const setupCode = async (code: string, opts: { fresh?: boolean } = {}) => {
    const m = (!opts.fresh && loadMaster(meId)) || (await createMaster());
    await saveBackup(await sealBackup(m, code));
    saveMaster(meId, m);
    setMaster(m);
    await loadBackup();
  };

  /** New device: prove the code, take the backup back, and re-read the open conversation with it. */
  const restoreCode = async (code: string) => {
    const st = backup ?? (await backupStatus());
    if (!st.salt || !st.kdf_iterations) throw new Error("This backup can't be restored here.");
    const r = await restoreBackup(await authProofFor(code, st.salt, st.kdf_iterations));
    const m = await openBackup(r.encrypted_key_bundle, r.nonce, r.salt || st.salt, r.kdf_iterations || st.kdf_iterations, code);
    saveMaster(meId, m);
    setMaster(m);
    await loadBackup();
    const cur = activeRef.current;
    if (cur) await openConversation(cur);
  };

  /** Same keys, new code — old history stays readable. */
  const changeCode = async (current: string, next: string) => {
    const st = backup ?? (await backupStatus());
    const m = loadMaster(meId);
    if (!m || !st.salt || !st.kdf_iterations) throw new Error("Enter your current recovery code on this device first.");
    const sealed = await sealBackup(m, next);
    await changeBackupCode({
      current_auth_proof: await authProofFor(current, st.salt, st.kdf_iterations),
      new_auth_proof: sealed.auth_proof,
      encrypted_key_bundle: sealed.encrypted_key_bundle,
      nonce: sealed.nonce,
      salt: sealed.salt,
      kdf_algorithm: sealed.kdf_algorithm,
      kdf_iterations: sealed.kdf_iterations,
      cipher_algorithm: sealed.cipher_algorithm,
      secret_type: "pin",
    });
    await loadBackup();
  };

  // The gym's own devices, for replies sent as the gym.
  useEffect(() => {
    gymReadersRef.current = [];
    if (!scopeGym) return;
    let live = true;
    void api.messagingKeysGymList(scopeGym).then((b) => { if (live) gymReadersRef.current = bundleReaders(b); }).catch(() => null);
    return () => { live = false; };
  }, [scopeGym]);

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

  /** The other side's keys: the gym's bundle for a gym, the person's (devices + backup key) for a person. */
  const fetchPeerKeys = async (c: Conversation) => {
    const bundle = c.targetGymId
      ? await api.messagingKeysGymList(c.targetGymId).catch(() => null)
      : c.targetUserId
        ? await api.messagingKeysUserList(c.targetUserId).catch(() => null)
        : null;
    const readers = bundleReaders(bundle, c.targetGymId ? undefined : c.targetUserId);
    return { legacy: bundleIdentityKey(bundle), readers, backup: readers.find((r) => r.id.startsWith("backup:"))?.publicKey ?? null };
  };

  const openConversation = async (c: Conversation) => {
    setActive(c);
    activeRef.current = c;
    setMessages([]);
    setPeerKey(null);
    peerKeyRef.current = null;
    setPeerReaders([]);
    peerReadersRef.current = [];
    setPeerBackupKey(null);
    setHasOlder(false);
    setPeerTyping(false);
    pendingRef.current = [];
    seenRef.current = new Set();
    setBusy(true);
    // Subscribe to the live room immediately (the socket re-joins this on any reconnect).
    socketRef.current?.setActiveConversation(c.id);
    try {
      const keys = await fetchPeerKeys(c);
      const key = keys.legacy;
      setPeerKey(key);
      peerKeyRef.current = key;
      setPeerReaders(keys.readers);
      peerReadersRef.current = keys.readers;
      setPeerBackupKey(keys.backup);

      const detail = await api.messagingConversationsRetrieve(c.id).catch(() => null);
      if (detail) {
        // Keep what we already know about who is on the other side if the detail doesn't repeat it.
        const d = toConversation(detail, meId);
        setActive((a) => (a && a.id === c.id ? { ...a, ...d, targetUserId: d.targetUserId ?? a.targetUserId, targetGymId: d.targetGymId ?? a.targetGymId, title: d.title === "Conversation" ? a.title : d.title } : a));
      }

      // Newest page first, so a long conversation opens on its latest messages; older pages load on demand.
      const page = await messageHistory(c.id);
      setMessages(await toMessages(page.rows, key));
      setHasOlder(page.hasOlder);
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

  /** Stored rows → bubbles, decrypted with whatever this browser holds. */
  const toMessages = (rows: Record<string, unknown>[], legacyPeer: string | null) =>
    Promise.all(rows.map(async (r): Promise<Message> => {
      const text = await decode(r, legacyPeer);
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
    }));

  /** The next page of older messages (`before` the oldest one shown), added above the current ones. */
  const loadOlder = async () => {
    const c = activeRef.current;
    const oldest = messages.find((x) => !x.id.startsWith("tmp-"))?.id;
    if (!c || !oldest || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messageHistory(c.id, { before: oldest });
      const older = await toMessages(page.rows, peerKeyRef.current);
      if (activeRef.current?.id !== c.id) return; // switched conversation meanwhile
      setMessages((prev) => [...older.filter((o) => !prev.some((p) => p.id === o.id)), ...prev]);
      setHasOlder(page.hasOlder && older.length > 0);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't load earlier messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  const withPerson = !!active && !active.targetGymId;
  /** Something on the other side to encrypt to — a device or, for a person, their backup key. */
  const canSend = peerReaders.length > 0;
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
    setPeerReaders([]);
    peerReadersRef.current = [];
    setPeerBackupKey(null);
    setHasOlder(false);
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
    if (!canSend) return toast(noKeyNote);
    if (quick === undefined) setDraft("");
    const tmpId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Message = { id: tmpId, mine: true, at: new Date().toISOString(), text, locked: false, pending: true };
    setMessages((m) => [...m, optimistic]);
    try {
      const mine = await deviceKeys();
      const own = loadMaster(meId);
      // The other side, this browser, the person's own backup key (their other devices), and — writing as a
      // gym — the gym's other staff browsers.
      const readers: Reader[] = [
        ...peerReadersRef.current,
        { id: mine.deviceId, publicKey: mine.publicKey },
        ...(own ? [{ id: `backup:${meId}`, publicKey: own.publicKey }] : []),
        ...(scopeGym ? gymReadersRef.current : []),
      ];
      const sealed = await sealFor(text, readers);
      const base = {
        ...sealed,
        sender_type: (scopeGym ? "gym" : "user") as "gym" | "user",
        sender_device_id: mine.deviceId,
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
    if (cur && !peerReadersRef.current.length && (await fetchPeerKeys(cur)).readers.length) await openConversation(cur);
  };


  /** Opens — or starts — the personal conversation with a person, from anywhere. */
  const openWithUser = (userId: string) => {
    setChoice("personal");
    setWanted(userId);
  };

  return {
    me, meId, gymId, scope, setScope: setChoice,
    list, loading, unread: list.reduce((n, c) => n + c.unread, 0),
    active, messages, busy, hasOlder, loadingOlder, loadOlder, draft, setDraft, peerKey, canSend, peerBackupKey, peerTyping,
    registered, starting, startProblem, withPerson, noKeyNote,
    keyState, backup, master, setupCode, restoreCode, changeCode,
    openConversation, closeConversation, startWith, openWithUser, send, emitTyping, refresh, registerDevice,
  };
}

export type Messaging = ReturnType<typeof useMessaging>;
