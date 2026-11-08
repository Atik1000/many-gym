"use client";

/**
 * Real-time messaging transport — the WebSocket half of the ManyGym messaging spec.
 *
 * Connects to `wss://<host>/ws/chat/?token=<access>&gym_id=<gym>`. On connect the server sends
 * `connection_established`; from then on the socket carries live `new_message`, `incoming_notification`,
 * `typing_indicator`, `read_receipt`, `message_sent_ack`, `joined_conversation`, `left_conversation`, `pong`
 * and `error` events, and accepts the `join_conversation`, `leave_conversation`, `send_message`, `typing`,
 * `mark_read` and `ping` actions.
 *
 * It owns one connection, reconnects with capped exponential backoff, keeps a heartbeat, and re-joins the
 * active conversation room after a reconnect. A socket that is refused before the handshake completes
 * (missing/expired token — nginx rejects it, so the browser only sees a 1006 abnormal close, never the spec's
 * 4001/4003) is retried a few times and then reported as `auth-error` so the UI can fall back to REST rather
 * than hammer a door that won't open.
 */

import { API_BASE, currentGymId, getTokens } from "./http";

export type SocketStatus = "connecting" | "open" | "closed" | "auth-error";

/** A message record as it arrives on `new_message` / `incoming_notification`. */
export type WireMessage = {
  id: string;
  conversation_id: string;
  sender_type: "user" | "gym";
  sender_user_id: string | null;
  sender_gym_id: string | null;
  sender_gym_name: string | null;
  sender_device_id?: string;
  ciphertext: string;
  nonce: string;
  ephemeral_public_key?: string;
  recipient_key_fingerprint?: string;
  encrypted_keys?: Record<string, unknown>;
  delivery_status?: string;
  sent_at?: string;
};

export type ServerEvent =
  | { type: "connection_established"; user_id: string; email: string; gym_id: string | null }
  | { type: "pong" }
  | { type: "joined_conversation"; conversation_id: string }
  | { type: "left_conversation"; conversation_id: string }
  | { type: "message_sent_ack"; message_id: string; conversation_id: string; sent_at: string }
  | { type: "new_message"; message: WireMessage }
  | { type: "incoming_notification"; message: WireMessage }
  | { type: "typing_indicator"; data: { conversation_id: string; user_id: string; sender_name?: string; gym_id: string | null; is_typing: boolean } }
  | { type: "read_receipt"; data: { conversation_id: string; read_by_user_id: string | null; read_by_gym_id: string | null; timestamp: string; read_count: number } }
  | { type: "error"; message: string }
  | { type: string; [k: string]: unknown };

/** Payload for `send_message`, as produced by `e2ee.seal` plus routing fields. */
export type SendPayload = {
  conversation_id: string;
  ciphertext: string;
  nonce: string;
  ephemeral_public_key?: string;
  recipient_key_fingerprint?: string;
  sender_device_id?: string;
  encrypted_keys?: Record<string, string>;
  sender_type?: "user" | "gym";
};

type Handlers = {
  onStatus?: (s: SocketStatus) => void;
  onEvent?: (e: ServerEvent) => void;
};

const MAX_BACKOFF = 30_000;
const BASE_BACKOFF = 1_000;
const HEARTBEAT_MS = 25_000;
const PRE_ESTABLISH_FAIL_LIMIT = 4;

/** Turns the REST base (http/https) into its ws/wss equivalent. */
export function wsBase(): string {
  return API_BASE.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
}

export class MessagingSocket {
  private ws: WebSocket | null = null;
  private handlers: Handlers;
  private status: SocketStatus = "closed";
  private closedByUser = false;
  private establishedOnce = false;
  private preEstablishFails = 0;
  private attempts = 0;
  private activeConversation: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(handlers: Handlers) {
    this.handlers = handlers;
  }

  /** Swap in fresh callbacks (e.g. a React closure that captured newer state) without reconnecting. */
  setHandlers(handlers: Handlers) {
    this.handlers = handlers;
  }

  get state(): SocketStatus {
    return this.status;
  }

  private setStatus(s: SocketStatus) {
    if (this.status === s) return;
    this.status = s;
    this.handlers.onStatus?.(s);
  }

  connect() {
    if (typeof window === "undefined") return;
    const token = getTokens()?.access;
    if (!token) {
      this.setStatus("auth-error");
      return;
    }
    this.closedByUser = false;
    this.clearReconnect();
    this.setStatus("connecting");

    const gym = currentGymId();
    const params = new URLSearchParams({ token });
    if (gym) params.set("gym_id", gym);
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsBase()}/ws/chat/?${params.toString()}`);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      // The HTTP upgrade succeeded; the server still has to send connection_established.
      this.attempts = 0;
    };

    ws.onmessage = (ev) => {
      let msg: ServerEvent;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (msg.type === "connection_established") {
        this.establishedOnce = true;
        this.preEstablishFails = 0;
        this.setStatus("open");
        this.startHeartbeat();
        // Re-join the room we were looking at before a reconnect.
        if (this.activeConversation) this.raw({ action: "join_conversation", conversation_id: this.activeConversation });
      }
      this.handlers.onEvent?.(msg);
    };

    ws.onerror = () => {
      /* the close handler does the recovery; errors here are informational only */
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      if (this.closedByUser) {
        this.setStatus("closed");
        return;
      }
      // Closed before the server ever confirmed us: most likely an auth/handshake refusal (seen as 1006).
      if (!this.establishedOnce) {
        this.preEstablishFails += 1;
        if (this.preEstablishFails >= PRE_ESTABLISH_FAIL_LIMIT) {
          this.setStatus("auth-error");
          return;
        }
      }
      this.scheduleReconnect();
    };
  }

  /** Point the socket at a conversation: leaves the previous room, joins the new one, remembers it for reconnects. */
  setActiveConversation(conversationId: string | null) {
    if (this.activeConversation === conversationId) return;
    const prev = this.activeConversation;
    this.activeConversation = conversationId;
    if (this.status !== "open") return;
    if (prev) this.raw({ action: "leave_conversation", conversation_id: prev });
    if (conversationId) this.raw({ action: "join_conversation", conversation_id: conversationId });
  }

  /** Sends an encrypted message over the socket. Returns false when the socket isn't open (caller should use REST). */
  sendMessage(payload: SendPayload): boolean {
    return this.raw({ action: "send_message", ...payload });
  }

  typing(conversationId: string, isTyping: boolean): boolean {
    return this.raw({ action: "typing", conversation_id: conversationId, is_typing: isTyping });
  }

  markRead(conversationId: string): boolean {
    return this.raw({ action: "mark_read", conversation_id: conversationId });
  }

  private raw(obj: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.raw({ action: "ping" }), HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect() {
    this.setStatus("connecting");
    this.clearReconnect();
    const delay = Math.min(MAX_BACKOFF, BASE_BACKOFF * 2 ** this.attempts) * (0.75 + Math.random() * 0.5);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  /** Manually retry after an auth-error once a fresh token is in place. */
  retry() {
    this.establishedOnce = false;
    this.preEstablishFails = 0;
    this.attempts = 0;
    this.connect();
  }

  close() {
    this.closedByUser = true;
    this.clearReconnect();
    this.stopHeartbeat();
    try {
      this.ws?.close();
    } catch {
      /* already gone */
    }
    this.ws = null;
    this.setStatus("closed");
  }
}
