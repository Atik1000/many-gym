# Authentication & Sessions

8 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/auth/login/`

**User Authentication & Login**

- **Auth:** public — no token
- **operationId:** `auth_login_create`

### Summary
Authenticates user credentials and issues a contextual JWT access & refresh token pair (defaulting to Personal Profile context).

### Authentication & Authorization
- **Authentication**: None.
- **Authorization**: Public endpoint.

### Business Rules
1. Verifies that credentials match an active user.
2. Checks that `is_verified=True` (if unverified, rejects login with 400 instructions to verify OTP).
3. Checks that user status is `active`.
4. Registers session in `auth_tokens` registry.
5. Returns Personal context JWT tokens.
6. Enforces rate limiting and account lockout after 5 consecutive failed login attempts (returns 429 with `Retry-After` backoff).

**Request body** — `application/json` (LoginRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `password` | string | yes |  |
| `reactivate` | boolean | no | Set to true to reactivate a deactivated user account during login. |
| `restore` | boolean | no | Set to true to restore a deleted user account during login. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LoginResponse | Authentication successful; session tokens issued. |
| `400` | ErrorDetail | Invalid credentials or unverified account. |
| `429` | ErrorDetail | Account locked or rate limit exceeded due to consecutive failed attempts. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `user` | User |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/auth/logout/`

**User Logout & Token Revocation**

- **Auth:** Bearer JWT
- **operationId:** `auth_logout_create`

### Summary
Invalidates the current session access token and optional refresh token by adding them to the server-side denylist and removing them from the active `auth_tokens` registry.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).

**Request body** — `application/json` (LogoutRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `refresh` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Session successfully invalidated. |
| `401` | ErrorDetail | Authentication required or token revoked. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/refresh/`

**Refresh Contextual JWT Token**

- **Auth:** public — no token
- **operationId:** `auth_refresh_create`

### Summary
Exchanges an active refresh token for a fresh access and refresh token pair while preserving all tenant context claims (`context_type`, `gym_id`, and `scopes`). The provided refresh token is rotated and revoked.

### Authentication & Authorization
- **Authentication**: None (Public endpoint, refresh token provided in payload).
- **Authorization**: Public.

**Request body** — `application/json` (RefreshTokenRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `refresh` | string | yes | Valid JWT refresh token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RefreshTokenResponse | Token refreshed successfully; fresh session pair issued. |
| `400` | ErrorDetail | Invalid or missing refresh token. |
| `401` | ErrorDetail | Refresh token has expired or was revoked. |
| `429` | ErrorDetail | Too many refresh requests; rate limit throttled. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/auth/resend-2fa/`

**Resend 2FA OTP Code**

- **Auth:** public — no token
- **operationId:** `auth_resend_2fa_create`

### Summary
Dispatches a new 2FA OTP code.
Supports fallback sequence: Primary Email -> Secondary Email -> Phone SMS.
Clients may optionally request a specific channel ('primary_email', 'secondary_email', 'phone_sms', or 'auto').

**Request body** — `application/json` (Resend2FARequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `channel` | enum: `primary_email` \| `secondary_email` \| `phone_sms` \| `auto` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | 2FA OTP code resent successfully. |
| `400` | ErrorDetail | User not found or delivery failed. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/switch-context/`

**Switch Token Context (Personal vs Gym)**

- **Auth:** Bearer JWT
- **operationId:** `auth_switch_context_create`

### Summary
Dynamically switches user operational context between Personal Profile and specific Gym accounts. Issues a new JWT access & refresh token pair carrying context claims and computed permission scopes.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: User must be the Gym Owner or an active Gym Staff member for the specified `gym_id`.

### Business Rules & Token Scopes
1. If `context_type` is `"personal"`, `gym_id` is set to null and `scopes` is empty.
2. If `context_type` is `"gym"`:
   - Validates user relationship to the gym.
   - If user is Gym Owner: granted **ALL** permissions across all 9 topics.
   - If user is Staff Member: granted the permissions linked to their assigned active Role.
3. Token carries claims: `{"context_type": "gym", "gym_id": "...", "scopes": ["members:read", ...]}`.

**Request body** — `application/json` (SwitchContextRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `context_type` | enum: `personal` \| `gym` | yes |  |
| `gym_id` | string(uuid) \| null | no | Required if context_type is 'gym' |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | SwitchContextResponse | Context switched; newly scoped token issued. |
| `400` | ErrorDetail | Missing gym_id when switching to gym context. |
| `401` | ErrorDetail | User does not have access rights to the requested gym. |
| `404` | ErrorDetail | Target gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/auth/token/refresh/`

**Refresh Contextual JWT Token**

- **Auth:** public — no token
- **operationId:** `auth_token_refresh_create`

### Summary
Exchanges an active refresh token for a fresh access and refresh token pair while preserving all tenant context claims (`context_type`, `gym_id`, and `scopes`). The provided refresh token is rotated and revoked.

### Authentication & Authorization
- **Authentication**: None (Public endpoint, refresh token provided in payload).
- **Authorization**: Public.

**Request body** — `application/json` (RefreshTokenRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `refresh` | string | yes | Valid JWT refresh token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RefreshTokenResponse | Token refreshed successfully; fresh session pair issued. |
| `400` | ErrorDetail | Invalid or missing refresh token. |
| `401` | ErrorDetail | Refresh token has expired or was revoked. |
| `429` | ErrorDetail | Too many refresh requests; rate limit throttled. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/auth/verify-2fa/`

**Verify 2FA OTP Code**

- **Auth:** public — no token
- **operationId:** `auth_verify_2fa_create`

### Summary
Validates submitted 2FA OTP code. Upon successful verification:
- Registers/updates active logged-in device (enforcing max 5 devices limit).
- Issues JWT personal access and refresh tokens.

**Request body** — `application/json` (Verify2FARequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes | 6-digit numeric verification code. |
| `device_id` | string | no |  |
| `device_name` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LoginResponse | 2FA verified successfully; session tokens issued. |
| `400` | ErrorDetail | Invalid or expired verification code. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `user` | User |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/token/refresh/`

**Refresh Contextual JWT Token**

- **Auth:** public — no token
- **operationId:** `token_refresh_create`

### Summary
Exchanges an active refresh token for a fresh access and refresh token pair while preserving all tenant context claims (`context_type`, `gym_id`, and `scopes`). The provided refresh token is rotated and revoked.

### Authentication & Authorization
- **Authentication**: None (Public endpoint, refresh token provided in payload).
- **Authorization**: Public.

**Request body** — `application/json` (RefreshTokenRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `refresh` | string | yes | Valid JWT refresh token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RefreshTokenResponse | Token refreshed successfully; fresh session pair issued. |
| `400` | ErrorDetail | Invalid or missing refresh token. |
| `401` | ErrorDetail | Refresh token has expired or was revoked. |
| `429` | ErrorDetail | Too many refresh requests; rate limit throttled. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `tokens` | TokenResponse |  |

</details>

---
