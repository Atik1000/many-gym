"use client";

/**
 * Message encryption for the messaging endpoints.
 *
 * The API is a transport for opaque payloads: `POST /messaging/conversations/{id}/messages/` takes a
 * `ciphertext` and a `nonce`, and the server never sees plaintext. It also hosts key bundles
 * (`identity_key`, `signed_prekey`, `one_time_prekeys`) in the shape the Signal protocol uses.
 *
 * **What the published schema does not specify** is the handshake: which curve the keys are on, how a session
 * key is agreed, or how `nonce` and `encrypted_keys` are meant to be derived. Without that, no client can be
 * written that is guaranteed to interoperate with another.
 *
 * So this module does real cryptography — ECDH on P-256, HKDF-SHA256, AES-256-GCM, keys generated and kept in
 * this browser — but it is **this client's own scheme**. Messages it sends can be read by another client using
 * the same scheme; they are not expected to decrypt in a client implementing a different one, and vice versa.
 * Anything it can't decrypt is shown as such rather than guessed at. Settle the protocol server-side and this is
 * the one file that needs to change.
 */

const DEVICE_KEY = "manygym.e2ee.device.v1";

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export type DeviceKeys = {
  deviceId: string;
  /** Base64 SPKI of the public half — what gets published in the key bundle. */
  publicKey: string;
  /** Base64 PKCS8 of the private half — never leaves this browser. */
  privateKey: string;
};

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

/** This browser's long-term key pair, generated on first use and kept in localStorage. */
export async function deviceKeys(): Promise<DeviceKeys> {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return JSON.parse(saved) as DeviceKeys;
  } catch {
    /* unreadable — generate a fresh pair below */
  }
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const keys: DeviceKeys = {
    deviceId: crypto.randomUUID(),
    publicKey: b64(await crypto.subtle.exportKey("spki", pair.publicKey)),
    privateKey: b64(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
  };
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(keys));
  } catch {
    /* private window — the pair lasts for this page only */
  }
  return keys;
}

async function sessionKey(theirPublicKeyB64: string): Promise<CryptoKey> {
  const mine = await deviceKeys();
  const priv = await crypto.subtle.importKey("pkcs8", unb64(mine.privateKey), ECDH, false, ["deriveBits"]);
  const pub = await crypto.subtle.importKey("spki", unb64(theirPublicKeyB64), ECDH, false, []);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, priv, 256);
  const base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode("manygym/messaging/v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts to `{ciphertext, nonce}`, both base64, ready for the send endpoint. */
export async function seal(plaintext: string, theirPublicKeyB64: string): Promise<{ ciphertext: string; nonce: string }> {
  const key = await sessionKey(theirPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: b64(sealed), nonce: b64(iv.buffer as ArrayBuffer) };
}

/** Decrypts a stored message, or returns null when this client can't read it. */
export async function open(ciphertext: string, nonce: string, theirPublicKeyB64: string): Promise<string | null> {
  try {
    const key = await sessionKey(theirPublicKeyB64);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(nonce) }, key, unb64(ciphertext));
    return new TextDecoder().decode(plain);
  } catch {
    // Wrong key, a different protocol, or a corrupt payload — all indistinguishable from here.
    return null;
  }
}

/** True when this browser can do the crypto at all (needs a secure context). */
export const supported = () => typeof crypto !== "undefined" && !!crypto.subtle;
