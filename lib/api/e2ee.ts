"use client";

/**
 * End-to-end encryption for the messaging endpoints, built to the ManyGym E2EE spec.
 *
 * The server is a transport for opaque payloads: it stores `ciphertext`, `nonce` and routing metadata and
 * never sees plaintext. It hosts public key bundles in the Signal-style shape
 * (`identity_key`, `signed_prekey`, `signed_prekey_signature`, `one_time_prekeys`) and labels every stored key
 * `x25519` — so for a client to interoperate with the mobile apps, the keys must genuinely be on Curve25519.
 *
 * Cryptographic parameters (from the spec):
 *   - Key exchange: X25519 (Curve25519 ECDH)
 *   - Signatures:   Ed25519 (signs the signed pre-key)
 *   - KDF:          HKDF-SHA256, salt "ManyGym-E2EE-v1", info "ManyGym-DirectMessaging", 32-byte output
 *   - Cipher:       AES-256-GCM with a random 12-byte nonce  (the spec permits AES-256-GCM in place of
 *                   ChaCha20-Poly1305, which WebCrypto does not provide)
 *   - Fingerprint:  first 16 hex chars of SHA-256(raw public key bytes)
 *
 * **Session-key agreement.** The spec's receiver derives the session key with
 * `ECDH(recipient_private, ephemeral_public_key)`. We key the session on the two parties' *identity* keys and
 * set `ephemeral_public_key` to the sender's own identity public key, so the receiver's computation
 * `ECDH(recipient_identity_priv, sender_identity_pub)` yields exactly the same secret as the sender's
 * `ECDH(sender_identity_priv, recipient_identity_pub)`. This is deterministic rather than forward-secret: the
 * trade-off is that each side can also decrypt its own sent history (there is no per-message ephemeral private
 * key to lose), which the chat UI relies on. It stays wire-compatible with the spec's documented receiver flow.
 *
 * Private keys are generated on first use and kept in this browser's localStorage as JWK; only public halves
 * ever leave. Anything this client cannot decrypt (a different scheme, a corrupt payload) is surfaced as locked
 * rather than guessed at.
 *
 * **v2 — history on every device (current).** The v1 scheme above ties every message to one browser's identity
 * key, so a new browser can never read old messages. v2 is envelope encryption:
 *
 *   - Each message gets a fresh random 256-bit content key; the text is AES-256-GCM under it.
 *   - The content key is wrapped once per reader into `encrypted_keys`: one entry per device id (theirs and this
 *     one) and one `backup:<user_id>` entry per person who has a backup key. A wrap is
 *     `AES-GCM(HKDF(ECDH(ephemeral, reader_public), info = "ManyGym-KeyWrap|<entry id>"), content_key)`, stored as
 *     `{ciphertext, nonce, ephemeral_public_key}` — the shape the API documents.
 *   - The backup ("master") key pair is made in the browser. Its private half is stored on the server only inside
 *     a bundle encrypted with a key derived from the person's 5-digit recovery code (PBKDF2-SHA256, 310k), and
 *     the server releases that bundle only for a matching `auth_proof` (derived from the same code), with a
 *     lockout after repeated misses. A new device restores the master key and reads history via `backup:` entries.
 *
 * A message with an empty `encrypted_keys` is v1 and is opened the old way, so nothing already sent is lost on
 * the device that could read it before.
 */

const DEVICE_KEY = "manygym.e2ee.device.v2";
const OTPK_COUNT = 20;

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const enc = new TextEncoder();
const dec = new TextDecoder();

const X = { name: "X25519" } as const;
const ED = { name: "Ed25519" } as const;
const HKDF_PARAMS = {
  name: "HKDF",
  hash: "SHA-256",
  salt: enc.encode("ManyGym-E2EE-v1"),
  info: enc.encode("ManyGym-DirectMessaging"),
} as const;

/** What is persisted in this browser: public material (base64) plus private keys as JWK. */
type StoredDevice = {
  deviceId: string;
  identityPub: string; // raw X25519 public, base64 — this is the published `identity_key`
  identityPriv: JsonWebKey; // X25519 private
  signedPrekeyPub: string; // raw X25519 public, base64
  signedPrekeyPriv: JsonWebKey; // X25519 private
  signedPrekeySig: string; // Ed25519 signature over signedPrekeyPub, base64
  edPub: string; // raw Ed25519 public, base64
  edPriv: JsonWebKey; // Ed25519 private
  oneTimePrekeys: string[]; // raw X25519 publics, base64
};

/** The public-facing view the UI and the registration call need. */
export type DeviceKeys = {
  deviceId: string;
  /** This device's X25519 identity public key, base64 — the `identity_key` in the bundle. */
  publicKey: string;
};

let cache: StoredDevice | null = null;

async function createDevice(): Promise<StoredDevice> {
  const s = crypto.subtle;
  const identity = (await s.generateKey(X, true, ["deriveBits"])) as CryptoKeyPair;
  const signedPrekey = (await s.generateKey(X, true, ["deriveBits"])) as CryptoKeyPair;
  const ed = (await s.generateKey(ED, true, ["sign", "verify"])) as CryptoKeyPair;

  const signedPrekeyPubRaw = new Uint8Array(await s.exportKey("raw", signedPrekey.publicKey));
  const sig = await s.sign(ED, ed.privateKey, signedPrekeyPubRaw);

  const otpks: string[] = [];
  for (let i = 0; i < OTPK_COUNT; i++) {
    const p = (await s.generateKey(X, true, ["deriveBits"])) as CryptoKeyPair;
    otpks.push(b64(await s.exportKey("raw", p.publicKey)));
  }

  return {
    deviceId: crypto.randomUUID(),
    identityPub: b64(await s.exportKey("raw", identity.publicKey)),
    identityPriv: await s.exportKey("jwk", identity.privateKey),
    signedPrekeyPub: b64(signedPrekeyPubRaw),
    signedPrekeyPriv: await s.exportKey("jwk", signedPrekey.privateKey),
    signedPrekeySig: b64(sig),
    edPub: b64(await s.exportKey("raw", ed.publicKey)),
    edPriv: await s.exportKey("jwk", ed.privateKey),
    oneTimePrekeys: otpks,
  };
}

/** This browser's device, generated on first use and persisted. */
async function device(): Promise<StoredDevice> {
  if (cache) return cache;
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return (cache = JSON.parse(saved) as StoredDevice);
  } catch {
    /* unreadable — fall through and make a fresh one */
  }
  const made = await createDevice();
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(made));
  } catch {
    /* private window — the device lasts for this page only */
  }
  return (cache = made);
}

/** Public identity for the UI: device id and this device's identity public key. */
export async function deviceKeys(): Promise<DeviceKeys> {
  const d = await device();
  return { deviceId: d.deviceId, publicKey: d.identityPub };
}

/** The registration body for `POST /messaging/keys/register/` (and the gym variant). */
export async function publicBundle(): Promise<{
  device_id: string;
  identity_key: string;
  signed_prekey: string;
  signed_prekey_signature: string;
  one_time_prekeys: string[];
}> {
  const d = await device();
  return {
    device_id: d.deviceId,
    identity_key: d.identityPub,
    signed_prekey: d.signedPrekeyPub,
    signed_prekey_signature: d.signedPrekeySig,
    one_time_prekeys: d.oneTimePrekeys,
  };
}

/** First 16 hex chars of SHA-256 over the raw public key bytes. */
export async function fingerprint(publicKeyB64: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", unb64(publicKeyB64));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Derives the shared AES-GCM key between this device's identity key and the peer's identity key. */
async function sessionKey(peerIdentityKeyB64: string): Promise<CryptoKey> {
  const s = crypto.subtle;
  const d = await device();
  const priv = await s.importKey("jwk", d.identityPriv, X, false, ["deriveBits"]);
  const peer = await s.importKey("raw", unb64(peerIdentityKeyB64), X, false, []);
  const shared = await s.deriveBits({ name: "X25519", public: peer }, priv, 256);
  const base = await s.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return s.deriveKey(HKDF_PARAMS, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export type Sealed = {
  ciphertext: string;
  nonce: string;
  ephemeral_public_key: string;
  recipient_key_fingerprint: string;
};

/** Encrypts `plaintext` to the peer identified by their identity public key. */
export async function seal(plaintext: string, peerIdentityKeyB64: string): Promise<Sealed> {
  const d = await device();
  const key = await sessionKey(peerIdentityKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return {
    ciphertext: b64(sealed),
    nonce: b64(iv),
    // The receiver derives the key with ECDH(their_priv, ephemeral_public_key); our identity key makes that
    // match ECDH(our_priv, their_identity) — see the module note on deterministic session keys.
    ephemeral_public_key: d.identityPub,
    recipient_key_fingerprint: await fingerprint(peerIdentityKeyB64),
  };
}

/** Decrypts a message, or returns null when this client can't read it. `peerIdentityKeyB64` is the other party's identity key. */
export async function open(ciphertext: string, nonce: string, peerIdentityKeyB64: string): Promise<string | null> {
  try {
    const key = await sessionKey(peerIdentityKeyB64);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(nonce) }, key, unb64(ciphertext));
    return dec.decode(plain);
  } catch {
    return null; // wrong key, different scheme, or corrupt payload — indistinguishable from here
  }
}

// ================================================================ v2: envelope encryption + backup key

const WRAP_SALT = enc.encode("ManyGym-E2EE-v2");
const MASTER_STORE = "manygym.e2ee.master.v1";
export const BACKUP_ITERATIONS = 310_000;

/** A reader of a message: an `encrypted_keys` entry id (a device id or `backup:<user_id>`) and its X25519 public key. */
export type Reader = { id: string; publicKey: string };
export type Wrapped = { ciphertext: string; nonce: string; ephemeral_public_key: string };
export type Envelope = Sealed & { encrypted_keys: Record<string, Wrapped> };

/** True for a base64 string that decodes to a 32-byte X25519 public key. */
export function isX25519Public(b: unknown): b is string {
  if (typeof b !== "string" || !b) return false;
  try { return atob(b).length === 32; } catch { return false; }
}

async function wrapKeyFor(priv: CryptoKey, peerPubB64: string, entryId: string, usage: KeyUsage): Promise<CryptoKey> {
  const s = crypto.subtle;
  const peer = await s.importKey("raw", unb64(peerPubB64), X, false, []);
  const shared = await s.deriveBits({ name: "X25519", public: peer }, priv, 256);
  const base = await s.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return s.deriveKey({ name: "HKDF", hash: "SHA-256", salt: WRAP_SALT, info: enc.encode(`ManyGym-KeyWrap|${entryId}`) }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

/** Encrypts `plaintext` once and wraps its content key for every reader. Readers with a bad key are skipped. */
export async function sealFor(plaintext: string, readers: Reader[]): Promise<Envelope> {
  const s = crypto.subtle;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const content = await s.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await s.encrypt({ name: "AES-GCM", iv }, content, enc.encode(plaintext));

  const eph = (await s.generateKey(X, true, ["deriveBits"])) as CryptoKeyPair;
  const ephPub = b64(await s.exportKey("raw", eph.publicKey));
  const encrypted_keys: Record<string, Wrapped> = {};
  for (const r of readers) {
    if (!isX25519Public(r.publicKey) || encrypted_keys[r.id]) continue;
    const k = await wrapKeyFor(eph.privateKey, r.publicKey, r.id, "encrypt");
    const wiv = crypto.getRandomValues(new Uint8Array(12));
    encrypted_keys[r.id] = { ciphertext: b64(await s.encrypt({ name: "AES-GCM", iv: wiv }, k, raw)), nonce: b64(wiv), ephemeral_public_key: ephPub };
  }
  const first = readers.find((r) => !r.id.startsWith("backup:") && encrypted_keys[r.id]) ?? readers.find((r) => encrypted_keys[r.id]);
  return {
    ciphertext: b64(body),
    nonce: b64(iv),
    ephemeral_public_key: ephPub,
    recipient_key_fingerprint: first ? await fingerprint(first.publicKey) : "",
    encrypted_keys,
  };
}

const asWrapped = (v: unknown): Wrapped | null => {
  const o = v as Partial<Wrapped> | null;
  return o && typeof o === "object" && typeof o.ciphertext === "string" && typeof o.nonce === "string" && typeof o.ephemeral_public_key === "string" ? (o as Wrapped) : null;
};

/** True when a stored message uses v2 (has at least one wrapped key). */
export const isEnvelope = (encryptedKeys: unknown) =>
  !!encryptedKeys && typeof encryptedKeys === "object" && Object.values(encryptedKeys as object).some((v) => asWrapped(v));

/**
 * Opens a v2 message with whatever this browser holds: its device key (entry `<device id>`), else the
 * restored backup key (entry `backup:<user id>`). Null when neither entry is there or neither key opens it.
 */
export async function openEnvelope(ciphertext: string, nonce: string, encryptedKeys: unknown, userId: string): Promise<string | null> {
  const s = crypto.subtle;
  const map = (encryptedKeys ?? {}) as Record<string, unknown>;
  const d = await device();
  const tries: [Wrapped | null, () => Promise<CryptoKey | null>, string][] = [
    [asWrapped(map[d.deviceId]), () => s.importKey("jwk", d.identityPriv, X, false, ["deriveBits"]), d.deviceId],
    [asWrapped(map[`backup:${userId}`]), async () => { const m = loadMaster(userId); return m ? s.importKey("jwk", m.privateJwk, X, false, ["deriveBits"]) : null; }, `backup:${userId}`],
  ];
  for (const [w, getPriv, id] of tries) {
    if (!w) continue;
    try {
      const priv = await getPriv();
      if (!priv) continue;
      const k = await wrapKeyFor(priv, w.ephemeral_public_key, id, "decrypt");
      const raw = await s.decrypt({ name: "AES-GCM", iv: unb64(w.nonce) }, k, unb64(w.ciphertext));
      const content = await s.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      return dec.decode(await s.decrypt({ name: "AES-GCM", iv: unb64(nonce) }, content, unb64(ciphertext)));
    } catch {
      /* try the next entry */
    }
  }
  return null;
}

// ---------------------------------------------------------------- the backup ("master") key

export type MasterKey = { publicKey: string; privateJwk: JsonWebKey; searchKey: string };

export function loadMaster(userId: string): MasterKey | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${MASTER_STORE}:${userId}`);
    return raw ? (JSON.parse(raw) as MasterKey) : null;
  } catch {
    return null;
  }
}

export function saveMaster(userId: string, m: MasterKey) {
  try { localStorage.setItem(`${MASTER_STORE}:${userId}`, JSON.stringify(m)); } catch { /* private window: this page only */ }
}

export async function createMaster(): Promise<MasterKey> {
  const s = crypto.subtle;
  const pair = (await s.generateKey(X, true, ["deriveBits"])) as CryptoKeyPair;
  return {
    publicKey: b64(await s.exportKey("raw", pair.publicKey)),
    privateJwk: await s.exportKey("jwk", pair.privateKey),
    searchKey: b64(crypto.getRandomValues(new Uint8Array(32))),
  };
}

/** PBKDF2 over the code: the first half encrypts the bundle, the second half (hashed) is the `auth_proof`. */
async function fromCode(code: string, saltB64: string, iterations: number): Promise<{ key: CryptoKey; authProof: string }> {
  const s = crypto.subtle;
  const base = await s.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await s.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unb64(saltB64), iterations }, base, 512));
  const key = await s.importKey("raw", bits.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  const proof = await s.digest("SHA-256", new Uint8Array([...enc.encode("ManyGym-Backup-Auth|"), ...bits.slice(32)]));
  return { key, authProof: b64(proof) };
}

/** Encrypts the master key under `code` with a fresh salt — the client-bundle body for `POST /keys/backup/`. */
export async function sealBackup(m: MasterKey, code: string) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const { key, authProof } = await fromCode(code, salt, BACKUP_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({ v: 1, master_private_key: m.privateJwk.d, master_public_key: m.publicKey, search_key: m.searchKey });
  const bundle = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(payload));
  return {
    backup_public_key: m.publicKey,
    encrypted_key_bundle: b64(bundle),
    nonce: b64(iv),
    salt,
    kdf_algorithm: "pbkdf2_sha256" as const,
    kdf_iterations: BACKUP_ITERATIONS,
    cipher_algorithm: "aes_256_gcm" as const,
    secret_type: "pin" as const,
    pin_length: 5 as const,
    auth_proof: authProof,
  };
}

/** The `auth_proof` for a code, given the salt and iterations the backup status reports. */
export const authProofFor = async (code: string, saltB64: string, iterations: number) => (await fromCode(code, saltB64, iterations)).authProof;

/** Decrypts a restored bundle back into the master key. Throws when the code doesn't open it. */
export async function openBackup(bundleB64: string, nonceB64: string, saltB64: string, iterations: number, code: string): Promise<MasterKey> {
  const { key } = await fromCode(code, saltB64, iterations);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(nonceB64) }, key, unb64(bundleB64));
  const o = JSON.parse(dec.decode(plain)) as { master_private_key: string; master_public_key: string; search_key: string };
  const x = btoa(String.fromCharCode(...unb64(o.master_public_key))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const privateJwk: JsonWebKey = { kty: "OKP", crv: "X25519", d: o.master_private_key, x, ext: true, key_ops: ["deriveBits"] };
  await crypto.subtle.importKey("jwk", privateJwk, X, false, ["deriveBits"]); // proves the key is usable
  return { publicKey: o.master_public_key, privateJwk, searchKey: o.search_key };
}

// ---------------------------------------------------------------- compare keys (safety number)

/**
 * Signal-style safety number: for each person, SHA-512 over (version ‖ public key ‖ user id), re-hashed with the
 * key 5200 times; the first 30 bytes become six 5-digit groups. The two halves are ordered by user id so both
 * people see the same 60 digits. Matching numbers mean nobody has swapped a key in between.
 */
export async function safetyNumber(a: { userId: string; publicKey: string }, b: { userId: string; publicKey: string }): Promise<string[]> {
  const half = async (p: { userId: string; publicKey: string }) => {
    const key = unb64(p.publicKey);
    let h = new Uint8Array(await crypto.subtle.digest("SHA-512", new Uint8Array([0, 0, ...key, ...enc.encode(p.userId)])));
    for (let i = 0; i < 5200; i++) h = new Uint8Array(await crypto.subtle.digest("SHA-512", new Uint8Array([...h, ...key])));
    const groups: string[] = [];
    for (let i = 0; i < 30; i += 5) {
      const n = h[i] * 2 ** 32 + h[i + 1] * 2 ** 24 + h[i + 2] * 2 ** 16 + h[i + 3] * 2 ** 8 + h[i + 4];
      groups.push(String(n % 100000).padStart(5, "0"));
    }
    return groups;
  };
  const [first, second] = a.userId < b.userId ? [a, b] : [b, a];
  return [...(await half(first)), ...(await half(second))];
}

/** True when this browser can do the crypto at all (needs a secure context with X25519 support). */
export const supported = () => typeof crypto !== "undefined" && !!crypto.subtle;
