# User Settings - Blocking

9 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/auth/settings/blocked-users/followers/{user_id}/`

**Block User From Followers**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_blocked_users_followers_create`

### Summary
Blocks an existing follower and immediately removes them from your followers list.

### Parameters
- `user_id` (path, required, UUID): UUID of the follower to block.

### Request Body
- `reason` (optional, string, max 255 chars): Rationale for blocking from followers list. Defaults to `'Blocked from followers list'`.

### Side Effects
- Immediately deletes the follow relation from both users.
- Creates a `UserBlockedUser` entry.

### Error Responses
- `400 Bad Request`: Validation failure or attempt to block self.
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Target user not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the follower to block and remove. |

**Request body** — `application/json` (UserFollowerBlockCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Optional rationale for blocking from followers list. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Follower blocked and removed. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/settings/followers/{user_id}/block/`

**Block User From Followers**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_followers_block_create`

### Summary
Blocks an existing follower and immediately removes them from your followers list.

### Parameters
- `user_id` (path, required, UUID): UUID of the follower to block.

### Request Body
- `reason` (optional, string, max 255 chars): Rationale for blocking from followers list. Defaults to `'Blocked from followers list'`.

### Side Effects
- Immediately deletes the follow relation from both users.
- Creates a `UserBlockedUser` entry.

### Error Responses
- `400 Bad Request`: Validation failure or attempt to block self.
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Target user not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the follower to block and remove. |

**Request body** — `application/json` (UserFollowerBlockCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Optional rationale for blocking from followers list. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Follower blocked and removed. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/followers/{user_id}/block/`

**Block User From Followers**

- **Auth:** Bearer JWT
- **operationId:** `users_followers_block_create`

### Summary
Blocks an existing follower and immediately removes them from your followers list.

### Parameters
- `user_id` (path, required, UUID): UUID of the follower to block.

### Request Body
- `reason` (optional, string, max 255 chars): Rationale for blocking from followers list. Defaults to `'Blocked from followers list'`.

### Side Effects
- Immediately deletes the follow relation from both users.
- Creates a `UserBlockedUser` entry.

### Error Responses
- `400 Bad Request`: Validation failure or attempt to block self.
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Target user not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the follower to block and remove. |

**Request body** — `application/json` (UserFollowerBlockCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Optional rationale for blocking from followers list. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Follower blocked and removed. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/users/settings/blocked-users/`

**List Blocked Users**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_blocked_users_retrieve`

### Summary
Retrieves a list of all users currently blocked by the authenticated user.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: Returns only the block records initiated by the authenticated user.

### Success Response
Returns array of blocked user summaries including target user id, names, email, avatar, and blocking reason.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserBlockedUser | Blocked users list retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `email` | string(email) | read-only. |
| `first_name` | string | read-only. |
| `last_name` | string | read-only. |
| `avatar_url` | string \| null | read-only. |
| `reason` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/users/settings/blocked-users/`

**Block User**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_blocked_users_create`

### Summary
Blocks another user from interacting with the authenticated user.

### Side Effects
- Automatically and immediately severs any mutual follow relationships in both directions.
- Prevents the blocked user from initiating direct messages or viewing followers/following lists.

### Request Body
- `user_id` (required, UUID): UUID of the user to block.
- `reason` (optional, string, max 255 chars): Rationale for the block.

### Error Responses
- `400 Bad Request`: Attempting to block yourself, malformed UUID, or invalid reason string.
- `401 Unauthorized`: Missing or invalid authentication token.
- `404 Not Found`: Target user does not exist.

**Request body** — `application/json` (UserBlockUserCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string(uuid) | yes | Valid UUID string of the user to block. |
| `reason` | string | no | Optional rationale for blocking. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | UserBlockedUser | User successfully blocked. |
| `400` | ErrorDetail | Validation failure or self-block attempt. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Target user not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `email` | string(email) | read-only. |
| `first_name` | string | read-only. |
| `last_name` | string | read-only. |
| `avatar_url` | string \| null | read-only. |
| `reason` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/users/settings/blocked-users/followers/{user_id}/`

**Block User From Followers**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_blocked_users_followers_create`

### Summary
Blocks an existing follower and immediately removes them from your followers list.

### Parameters
- `user_id` (path, required, UUID): UUID of the follower to block.

### Request Body
- `reason` (optional, string, max 255 chars): Rationale for blocking from followers list. Defaults to `'Blocked from followers list'`.

### Side Effects
- Immediately deletes the follow relation from both users.
- Creates a `UserBlockedUser` entry.

### Error Responses
- `400 Bad Request`: Validation failure or attempt to block self.
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Target user not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the follower to block and remove. |

**Request body** — `application/json` (UserFollowerBlockCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Optional rationale for blocking from followers list. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Follower blocked and removed. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/users/settings/blocked-users/search/`

**Search Users to Block**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_blocked_users_search_retrieve`

### Summary
Searches active Manygym users by name or email to select for blocking.

### Filtering Rules
- Automatically excludes the authenticated user themselves.
- Automatically excludes users who are already in the authenticated user's blocklist.

### Parameters
- `q` (query, optional, string): Search query matching first name, last name, or email.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `q` | string | no | Search query string matching first name, last name, or email. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserSearchToBlock | Matching users list. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `email` | string(email) | read-only. |
| `first_name` | string | read-only. |
| `last_name` | string | read-only. |
| `avatar_url` | string \| null | read-only. |

</details>

---

## DELETE `/api/v1/users/settings/blocked-users/{user_id}/`

**Unblock User**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_blocked_users_destroy`

### Summary
Removes a block on a previously restricted user.

### Parameters
- `user_id` (path, required, UUID): UUID of the blocked user to unblock.

### Error Responses
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Blocked user record not found (e.g. user was not blocked by caller).

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the blocked user to remove from blocklist. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | User successfully unblocked. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Blocked user record not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/settings/followers/{user_id}/block/`

**Block User From Followers**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_followers_block_create`

### Summary
Blocks an existing follower and immediately removes them from your followers list.

### Parameters
- `user_id` (path, required, UUID): UUID of the follower to block.

### Request Body
- `reason` (optional, string, max 255 chars): Rationale for blocking from followers list. Defaults to `'Blocked from followers list'`.

### Side Effects
- Immediately deletes the follow relation from both users.
- Creates a `UserBlockedUser` entry.

### Error Responses
- `400 Bad Request`: Validation failure or attempt to block self.
- `401 Unauthorized`: Missing or invalid credentials.
- `404 Not Found`: Target user not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string | yes | UUID of the follower to block and remove. |

**Request body** — `application/json` (UserFollowerBlockCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | no | Optional rationale for blocking from followers list. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Follower blocked and removed. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
