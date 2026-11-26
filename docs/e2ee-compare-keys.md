# Messaging encryption: history on new devices, and "Compare keys"

Status: web client implemented (Nov 2026). Mobile apps need the same scheme to read web messages and vice versa.

## 1. What changed and why

**Before (v1).** A message was encrypted with a key derived from the two browsers' identity keys
(`ECDH(my_identity, their_identity)`). `encrypted_keys` was sent empty. A new browser has a new identity key, so
it could never open anything sent before it existed. That is why history was missing on new devices.

**Now (v2): envelope encryption**, the model behind the API's `encrypted_keys` map and `backup:<user_id>` entries:

| Step | What happens |
|---|---|
| Content | A fresh random 256-bit key per message. The text is AES-256-GCM under it → `ciphertext`, `nonce`. |
| Wrapping | That key is wrapped once per reader into `encrypted_keys[<entry id>] = {ciphertext, nonce, ephemeral_public_key}`. Wrap key = `HKDF-SHA256(ECDH(ephemeral, reader_pub), salt "ManyGym-E2EE-v2", info "ManyGym-KeyWrap|<entry id>")`. |
| Readers | Every device of the other side (entry = their `device_id`), the other person's backup key (`backup:<their id>`), this device, and the sender's own backup key (`backup:<my id>`). A reply sent *as a gym* also goes to the gym's other registered devices. |
| Reading | A device opens its own `device_id` entry with its identity key, or the `backup:<my id>` entry with the restored backup key. |
| Old messages | A message with an empty `encrypted_keys` is v1 and is still opened the old way, on the device that could read it before. |

Code: `lib/api/e2ee.ts` (`sealFor`, `openEnvelope`), used from `components/messages/useMessaging.ts`.

## 2. The 5-digit recovery code

The backup ("master") key pair is generated **in the browser**. Its private half goes to the server only inside a bundle
encrypted with a key derived from the code:

- `PBKDF2-SHA256(code, 16-byte random salt, 310 000 iterations)` → 64 bytes.
  The first 32 bytes are the AES-256-GCM key for the bundle. `auth_proof = SHA-256("ManyGym-Backup-Auth|" ‖ last 32 bytes)`.
- Sent with `POST /messaging/keys/backup/` in the API's **client-bundle mode** (`backup_public_key`,
  `encrypted_key_bundle`, `nonce`, `salt`, `auth_proof`, `cipher_algorithm: "aes_256_gcm"`).
- New device: `GET …/backup/status/` (salt, iterations) → derive `auth_proof` → `POST …/backup/restore/` →
  decrypt the bundle locally. Wrong codes count towards the server's lockout (`max_attempts`, 30-minute lock).
- Change code: `POST …/backup/change-code/` with the same keys re-encrypted under the new code, so history stays readable.
- Forgot the code: "Start over" makes a new backup key. Old messages stay readable only on devices that can already read them.

**We deliberately do not use the API's `{"recovery_code": "12345"}` mode.** In that mode the server generates the
master private key and returns it in `restored_keys`, so the server (and anyone with database access) can read
every message. With the server holding the key, "Compare keys" (below) would prove nothing.

**The honest limit of a 5-digit code.** There are only 100 000 codes. The lockout stops an attacker guessing through
the API. It does not stop someone who holds the server's data (the salt, the bundle and the stored `auth_proof`
verifier), who could try every code offline. At 310k PBKDF2 rounds that takes minutes to hours on a GPU. Messenger and
WhatsApp close this gap by keeping the PIN check inside hardware security modules, which delete the key after N misses.
**Recommendation for the backend:** keep the `auth_proof` verifier and attempt counter in an HSM or cloud KMS so it
can't be brute-forced from a database dump, and/or offer a long passphrase or a 64-character recovery key as an alternative to the PIN.

## 3. "Compare keys": what others do

| App | What users compare | Notes |
|---|---|---|
| Signal | **Safety number**: 60 digits (12 × 5) or a QR code, per conversation | From both identity keys plus phone/ACI. Changes on reinstall, with a "safety number changed" notice in the chat. |
| WhatsApp | **Security code**: 60 digits / QR | Same construction as Signal. Change notifications are opt-in. Multi-device: each linked device has its own key under the primary. |
| Messenger | **Logged device keys**: a fingerprint per device | No single number. You check each of the other person's devices. Backups use a PIN check backed by an HSM. |
| iMessage | **Contact Key Verification**: verification code + Key Transparency | An automatic alert if an unknown device is added, checked against a public append-only log. |

The common pattern is a short number both people read aloud or scan, plus a **visible warning when it changes**.

## 4. What we built

- Thread header → shield icon → **Compare keys** (`components/messages/CompareKeys.tsx`).
- The number is Signal's construction (`safetyNumber` in `lib/api/e2ee.ts`): for each person,
  `SHA-512(0x0000 ‖ public key ‖ user id)` re-hashed with the key 5 200 times. The first 30 bytes become six 5-digit
  groups, and the halves are ordered by user id so both people see the same 60 digits.
- It uses the **backup public keys**, not a device key. With history on every device, every message is
  readable by the backup key, so that's the key that must be genuine. It's also stable across that person's devices,
  so you compare once rather than once per device.

## 5. Gaps, in priority order

1. **Key-change warning.** Remember each contact's backup-key fingerprint and show "Their security code changed"
   in the thread when it changes (like Signal). Without this, almost nobody re-checks. Small and client-only.
2. **Rogue device injection.** Messages are also wrapped to every device the server lists for the other person. A
   malicious server could list an extra device, and comparing backup keys wouldn't notice. Fix: give the master key a signing
   half and have each device's key signed by it, then only wrap to signed devices. Needs a backend field for the signature.
3. **Mobile parity.** The apps must implement §1–§4 byte-for-byte (HKDF info strings, the bundle JSON
   `{v, master_private_key, master_public_key, search_key}`, the safety-number algorithm), or the two sides
   won't read each other's messages or show matching numbers.
4. **Gym inboxes.** Gyms have no backup key in the API (`/keys/gym/{id}/` has none), so a staff member on a new
   device can't read older gym conversations. Their own sent replies are readable, via their personal backup entry.
   This needs a gym-level backup key, shared between staff devices.
5. **QR code** for Compare keys when two phones are side by side.
6. **No forward secrecy.** Static keys mean a leaked backup key exposes all past messages. That's the accepted cost
   of history on every device, the same trade WhatsApp's encrypted backups make.
