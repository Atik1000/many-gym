"use client";

/**
 * Messaging routes newer than the committed OpenAPI document, so hand-written:
 *
 *   GET    /messaging/people/search/            — people to message, from the caller's follows + followers only
 *   GET    /messaging/keys/backup/status/       — is there a recovery-code backup, and its KDF parameters
 *   POST   /messaging/keys/backup/              — store the (client-encrypted) key backup
 *   POST   /messaging/keys/backup/restore/      — prove the code, get the encrypted backup back
 *   POST   /messaging/keys/backup/change-code/  — re-encrypt the same keys under a new code
 *
 * The backup is always sent in the API's *zero-knowledge client bundle* mode: the browser derives the
 * encryption key and the `auth_proof` from the 5-digit code itself, so neither the code nor the private key
 * ever reaches the server. The API's other mode (`{"recovery_code": "12345"}`) has the server generate and
 * hold the private key, which would let the server read every message — see docs/e2ee-compare-keys.md.
 */
import { ApiError, request } from "./http";

// ---------------------------------------------------------------- people search

export type MessagePerson = {
  user_id: string;
  profile_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  is_private: boolean;
  is_following: boolean;
  is_follower: boolean;
  relationship: "mutual" | "following" | "follower";
  /** False when their "who can message me" setting rules the caller out. */
  can_message: boolean;
  /** The existing person-to-person conversation, if there is one. */
  conversation_id: string | null;
  /** False until they have a device key or a backup key to encrypt to. */
  has_e2ee_keys: boolean;
};

export async function searchPeopleToMessage(q: string, limit = 20, signal?: AbortSignal): Promise<MessagePerson[]> {
  const r = await request<{ count: number; results: MessagePerson[] } | MessagePerson[]>("GET", "/api/v1/messaging/people/search/", {
    query: { q: q.trim() || undefined, limit },
    signal,
  });
  return Array.isArray(r) ? r : r.results ?? [];
}

// ---------------------------------------------------------------- key backup

export type BackupStatus = {
  has_backup: boolean;
  secret_type: "pin" | "passphrase" | null;
  pin_length: number;
  kdf_algorithm: "pbkdf2_sha256" | "argon2id" | null;
  kdf_iterations: number | null;
  cipher_algorithm: "chacha20_poly1305" | "aes_256_gcm" | null;
  salt: string | null;
  backup_public_key: string | null;
  backup_key_fingerprint: string | null;
  key_version: number;
  failed_attempts: number;
  max_attempts: number;
  remaining_attempts: number;
  is_locked: boolean;
  locked_until: string | null;
  requires_auth_proof: boolean;
  has_recovery_bundle: boolean;
  last_restored_at: string | null;
};

/** What the browser computes from the code; matches the client-bundle fields of `POST /keys/backup/`. */
export type BackupBundle = {
  backup_public_key: string;
  encrypted_key_bundle: string;
  nonce: string;
  salt: string;
  kdf_algorithm: "pbkdf2_sha256";
  kdf_iterations: number;
  cipher_algorithm: "aes_256_gcm";
  secret_type: "pin";
  pin_length: 5;
  auth_proof: string;
};

export type RestoreResponse = {
  message: string;
  mode: "secret" | "recovery";
  encrypted_key_bundle: string;
  nonce: string;
  salt: string;
  kdf_iterations: number;
  cipher_algorithm: string;
  backup_public_key: string;
  key_version: number;
};

export const backupStatus = () => request<BackupStatus>("GET", "/api/v1/messaging/keys/backup/status/");

export const saveBackup = (b: BackupBundle) => request<{ backup_public_key: string; key_version: number }>("POST", "/api/v1/messaging/keys/backup/", { body: b });

export const restoreBackup = (authProof: string) =>
  request<RestoreResponse>("POST", "/api/v1/messaging/keys/backup/restore/", { body: { auth_proof: authProof } });

export const changeBackupCode = (body: {
  current_auth_proof: string;
  new_auth_proof: string;
  encrypted_key_bundle: string;
  nonce: string;
  salt: string;
  kdf_algorithm: "pbkdf2_sha256";
  kdf_iterations: number;
  cipher_algorithm: "aes_256_gcm";
  secret_type: "pin";
}) => request<{ key_version: number }>("POST", "/api/v1/messaging/keys/backup/change-code/", { body });

/** The lockout details a wrong code comes back with (403). */
export function codeProblem(e: unknown): { message: string; remaining: number | null; lockedUntil: string | null } {
  if (!(e instanceof ApiError)) return { message: "Couldn't check that code. Try again.", remaining: null, lockedUntil: null };
  const d = e.details as { remaining_attempts?: number; is_locked?: boolean; locked_until?: string | null };
  const remaining = typeof d.remaining_attempts === "number" ? d.remaining_attempts : null;
  const lockedUntil = d.is_locked ? d.locked_until ?? null : null;
  if (e.status === 403) {
    if (lockedUntil) return { message: `Too many wrong codes. Try again after ${new Date(lockedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, remaining: 0, lockedUntil };
    return { message: remaining !== null ? `That code isn't right. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "That code isn't right.", remaining, lockedUntil };
  }
  return { message: e.message, remaining, lockedUntil };
}

// ---------------------------------------------------------------- message history (newest first, cursor paging)

export const HISTORY_PAGE = 50;

/**
 * One page of a conversation's stored messages, newest first (`order=desc`), optionally strictly older than
 * `before` (a message id). Returned oldest → newest so it can be drawn as-is. The generated client can't send
 * `order`/`before`, hence this call. `hasOlder` is a guess from a full page: one extra empty request at the
 * very start of a long conversation is the price of not needing a count.
 */
export async function messageHistory(conversationId: string, opts: { before?: string; limit?: number; gymId?: string | null } = {}) {
  const limit = opts.limit ?? HISTORY_PAGE;
  const rows = await request<unknown[]>("GET", `/api/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages/`, {
    query: { order: "desc", limit, before: opts.before, gym_id: opts.gymId ?? undefined },
  });
  const list = Array.isArray(rows) ? rows : [];
  return { rows: list.slice().reverse() as Record<string, unknown>[], hasOlder: list.length >= limit };
}
