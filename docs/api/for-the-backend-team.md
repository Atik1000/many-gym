# Three auth issues for the backend team

Everything else found while integrating this API is a contract or documentation problem the client can work
around. These three cannot be worked around from a client, and the first one is a live security hole.

Each was reproduced against `https://v0.manygym.com` on 4 November 2026 with a valid gym-owner token.

---

## 1. `POST /auth/logout/` does not revoke anything

**Severity: high.** The endpoint is documented as *"User Logout & Token Revocation"* and its description says
it registers the session in an `auth_tokens` registry. It returns `200`. The access token then continues to
work, with full privileges:

```
POST  /api/v1/auth/logout/      {"refresh": "<token>"}   → 200
GET   /api/v1/auth/me/                                   → 200   ← same access token, after logout
GET   /api/v1/members/?gym_id=…                          → 200
GET   /api/v1/dashboard/summary/?gym_id=…                → 200
PATCH /api/v1/gyms/settings/?gym_id=…                    → 200   ← a privileged WRITE succeeds
POST  /api/v1/auth/logout/      (same refresh, replayed) → 200   ← replay accepted
```

Re-checked six seconds later in case revocation were asynchronous. All still `200`.

**Why it matters.** Signing out removes the token from that browser's storage and nothing more. Anyone who
captured it beforehand — a shared computer, a browser extension, a proxy log, a support session — keeps full
read **and write** access to the gym until the token expires on its own. This is made worse by issue 2.

**Suggested fix.** A server-side denylist checked on each request (jti → revoked), or short-lived access
tokens plus a working refresh endpoint so a revoked session dies quickly.

---

## 2. There is no token refresh endpoint

`POST /auth/login/` and `POST /auth/verify-signup-otp/` both return `{access, refresh, …}`, but **nothing in
the published schema accepts a refresh token**. There is no `/token/refresh/`, `/auth/refresh/` or equivalent
among the 149 operations.

**Why it matters.** With no way to exchange a refresh token, access tokens have to be long-lived to be usable
at all — which is exactly what makes issue 1 dangerous. It also means an expired token drops the person
straight out of whatever they were doing, since the client cannot renew silently.

**Suggested fix.** Add the refresh endpoint the login response already implies, and shorten access-token
lifetime once it exists.

---

## 3. No rate limiting on login or the OTP endpoints

Twelve consecutive wrong passwords for the same account all returned `400`. No `429`, no `Retry-After`, no
lockout, no backoff:

```
POST /api/v1/auth/login/  ×12 wrong passwords
→ 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 400
```

**The OTP endpoints matter more than login here.** A signup or reset code is **six numeric digits** — a space
of one million — and `verify-signup-otp` / `verify-reset-otp` appear equally unthrottled. Someone who knows a
target's email address can work through that space inside the 15-minute validity window.

**Suggested fix.** Per-account and per-IP throttling on `auth/login/`, `auth/verify-signup-otp/` and
`auth/verify-reset-otp/`, and invalidate an OTP after a small number of wrong attempts rather than letting it
stand for the full 15 minutes.

---

## Not fixable from a client

Worth stating plainly, because it would be reasonable to assume otherwise: the admin panel in this repo calls
`POST /auth/logout/` and clears its local storage, which is everything a client can do. It cannot make a token
stop working, and a client-side login throttle is bypassed by calling the API directly — which is why one was
deliberately **not** added, rather than shipping protection that only appears to exist.

The remaining 25 findings are in [known-issues.md](./known-issues.md).
