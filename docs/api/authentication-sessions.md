# Authentication & Sessions

3 endpoints. Base URL `https://v0.manygym.com`.

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

**Request body** — `application/json` (LoginRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `password` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LoginResponse | Authentication successful; session tokens issued. |
| `400` | ErrorDetail | Invalid credentials or unverified account. |

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
Invalidates the current session access token by removing it from the active `auth_tokens` registry.

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
| `401` | ErrorDetail | Authentication required. |

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
