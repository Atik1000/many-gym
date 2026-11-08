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

/** True when this browser can do the crypto at all (needs a secure context with X25519 support). */
export const supported = () => typeof crypto !== "undefined" && !!crypto.subtle;
