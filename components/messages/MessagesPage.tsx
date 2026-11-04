"use client";

/**
 * Messaging — the full `/messaging/*` surface:
 * `GET/POST /conversations/`, `GET /conversations/{id}/`, `GET/POST /conversations/{id}/messages/`,
 * `POST /conversations/{id}/read/`, `POST /keys/register/`, `POST /keys/gym/register/`,
 * `GET /keys/user/{id}/` and `GET /keys/gym/{id}/`.
 *
 * Messages are end-to-end encrypted, so the server stores ciphertext only. See `lib/api/e2ee.ts` for what this
 * client can and cannot read — the API doesn't publish its handshake, so anything written by a different client
 * shows as locked rather than being guessed at.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { LuLock, LuRefreshCw, LuSend, LuShieldCheck } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { asArray } from "@/lib/api/adapters";
import { useResource } from "@/lib/api";
import { MEMBERS_KEY, fullName, type Member } from "@/lib/members";
import * as api from "@/lib/api/endpoints";
import { ApiError, currentGymId } from "@/lib/api/http";
import { deviceKeys, open as openMessage, seal, supported } from "@/lib/api/e2ee";
import { btnGhost, btnPrimary, card, hint, input } from "@/lib/ui";

type Conversation = { id: string; title: string; sub: string; unread: number; targetUserId?: string; targetGymId?: string };
type Message = { id: string; mine: boolean; at: string; text: string | null; locked: boolean };

const str = (v: unknown) => (v == null ? "" : String(v));

function toConversation(raw: unknown, meId: string): Conversation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const parts = asArray<Record<string, unknown>>(o.participants);
  const other = parts.find((p) => str(p.user_id ?? p.id) !== meId) ?? parts[0] ?? {};
  return {
    id: str(o.id ?? o.conversation_id),
    title: str(o.title ?? o.name ?? other.display_name ?? other.name ?? other.gym_name ?? other.email) || "Conversation",
    sub: str(o.conversation_type ?? other.participant_type ?? "").replace(/_/g, " "),
    unread: Number(o.unread_count ?? 0) || 0,
    targetUserId: str(other.user_id) || undefined,
    targetGymId: str(other.gym_id) || undefined,
  };
}

export default function MessagesPage() {
  const toast = useToast();
  const { me } = useAuth();
  const gymId = currentGymId();

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
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.messagingConversationsList({ gym_id: gymId ?? undefined });
      setList(asArray<unknown>(rows).map((r) => toConversation(r, me?.userId ?? "")));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't load conversations");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [gymId, me?.userId, toast]);

  useEffect(() => {
    void Promise.resolve().then(loadList);
  }, [loadList]);

  /** Publishes this browser's public key so other people can start a conversation with it. */
  const registerDevice = async () => {
    if (!supported()) return toast("This browser can't do end-to-end encryption");
    setBusy(true);
    try {
      const keys = await deviceKeys();
      await api.messagingKeysRegisterCreate({
        device_id: keys.deviceId,
        device_name: "Admin panel",
        identity_key: keys.publicKey,
        signed_prekey: keys.publicKey,
        one_time_prekeys: [],
      });
      if (gymId) {
        await api.messagingKeysGymRegisterCreate({
          gym_id: gymId,
          device_id: keys.deviceId,
          device_name: "Admin panel",
          identity_key: keys.publicKey,
          signed_prekey: keys.publicKey,
          one_time_prekeys: [],
        }).catch(() => null); // only a gym owner may register the gym bundle
      }
      setRegistered(true);
      toast("This device can now receive encrypted messages");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't register this device");
    } finally {
      setBusy(false);
    }
  };

  /**
   * `POST /messaging/conversations/` creates or returns the conversation with a target. The gym messaging a
   * member is `user_to_gym` from the gym's side, so the gym id travels as `source_gym_id`.
   */
  const startWith = async (targetUserId: string) => {
    setStarting(true);
    try {
      const conv = await api.messagingConversationsCreate({
        conversation_type: gymId ? "user_to_gym" : "user_to_user",
        target_user_id: targetUserId,
        source_gym_id: gymId ?? undefined,
      });
      const row = toConversation(conv, me?.userId ?? "");
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
    setMessages([]);
    setPeerKey(null);
    setBusy(true);
    try {
      // The counterpart's public bundle is what this client needs to read or write anything.
      const bundle = c.targetGymId
        ? await api.messagingKeysGymList(c.targetGymId).catch(() => null)
        : c.targetUserId
          ? await api.messagingKeysUserList(c.targetUserId).catch(() => null)
          : null;
      const key = str((bundle as Record<string, unknown> | null)?.identity_key) || null;
      setPeerKey(key);

      // The detail call carries the participant list and title the list view may have abbreviated.
      const detail = await api.messagingConversationsRetrieve(c.id).catch(() => null);
      if (detail) setActive((a) => (a && a.id === c.id ? { ...a, ...toConversation(detail, me?.userId ?? "") } : a));

      const rows = asArray<Record<string, unknown>>(await api.messagingConversationsMessagesList(c.id));
      const decoded = await Promise.all(
        rows.map(async (r): Promise<Message> => {
          const cipher = str(r.ciphertext);
          const nonce = str(r.nonce);
          const text = key && cipher && nonce ? await openMessage(cipher, nonce, key) : null;
          return {
            id: str(r.id),
            mine: str(r.sender_user_id ?? r.sender_id) === (me?.userId ?? ""),
            at: str(r.created_at ?? r.sent_at),
            text,
            locked: text === null,
          };
        }),
      );
      setMessages(decoded);
      await api.messagingConversationsReadCreate(c.id, {}).catch(() => null);
      setList((l) => l.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't open that conversation");
    } finally {
      setBusy(false);
      queueMicrotask(() => endRef.current?.scrollIntoView({ block: "end" }));
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    if (!peerKey) return toast("This person hasn't published an encryption key yet, so nothing can be sent to them");
    setBusy(true);
    try {
      const keys = await deviceKeys();
      const { ciphertext, nonce } = await seal(text, peerKey);
      await api.messagingConversationsMessagesCreate(active.id, {
        ciphertext,
        nonce,
        sender_type: gymId ? "gym" : "user",
        sender_gym_id: gymId ?? undefined,
        sender_device_id: keys.deviceId,
      });
      setMessages((m) => [...m, { id: crypto.randomUUID(), mine: true, at: new Date().toISOString(), text, locked: false }]);
      setDraft("");
      queueMicrotask(() => endRef.current?.scrollIntoView({ block: "end" }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send that message");
    } finally {
      setBusy(false);
    }
  };

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
                  <span className="block truncate text-muted">{peerKey ? "Encryption key available" : "No published key for this participant"}</span>
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
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <input
                  aria-label="Message"
                  className={`${input} flex-1`}
                  placeholder={peerKey ? "Write a message…" : "Can't send — no encryption key published"}
                  disabled={!peerKey || busy}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                />
                <MotionButton className={btnPrimary} disabled={!peerKey || busy || !draft.trim()} onClick={send}>
                  <LuSend size={16} />Send
                </MotionButton>
              </div>
              <p className={hint}>Encrypted in this browser before it leaves. The gym can&apos;t read it on the server.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
