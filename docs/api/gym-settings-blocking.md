# Gym Settings - Blocking

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/settings/blocked-users/`

**List Blocked Users**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_blocked_users_retrieve`

### Summary
Retrieves a paginated list of all users currently blocked from interacting with this gym workspace.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Gym Owner or active Gym Context Token with `gym_profile:read` scope.

### Error Codes
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: User does not possess the required `gym_profile:read` scope.
- `404 Not Found`: Target gym workspace not found.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymBlockedUser | List of blocked users. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `email` | string(email) | read-only. |
| `first_name` | string | read-only. |
| `last_name` | string | read-only. |
| `avatar_url` | string \| null | read-only. |
| `blocked_by_email` | string(email) | read-only. |
| `reason` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/gyms/settings/blocked-users/`

**Block a User**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_blocked_users_create`

### Summary
Blocks a user from interacting with this gym workspace. The gym owner cannot be blocked.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Gym Owner or active Gym Context Token with `gym_profile:edit` scope.

### Error Codes
- `400 Bad Request`: Invalid payload or attempting to block the gym owner.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: User does not possess the required `gym_profile:edit` scope.
- `404 Not Found`: Target gym workspace or user to block not found.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Request body** — `application/json` (GymBlockUserCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string(uuid) | yes | Valid UUID string of the user to block. |
| `reason` | string | no | Optional administrative rationale for blocking. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymBlockedUser | User successfully blocked. |
| `400` | ErrorDetail | Validation error. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `email` | string(email) | read-only. |
| `first_name` | string | read-only. |
| `last_name` | string | read-only. |
| `avatar_url` | string \| null | read-only. |
| `blocked_by_email` | string(email) | read-only. |
| `reason` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/gyms/settings/blocked-users/search/`

**Search Users to Block**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_blocked_users_search_retrieve`

### Summary
Searches active Manygym users by name or email to select for blocking. Automatically excludes the gym owner and users who are already blocked.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Gym Owner or active Gym Context Token with `gym_profile:read` scope.

### Error Codes
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: User does not possess the required `gym_profile:read` scope.
- `404 Not Found`: Target gym workspace not found.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |
| `q` | string | no | Search query string matching first name, last name, or email. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymUserSearchToBlock | Matching users list. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

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

## DELETE `/api/v1/gyms/settings/blocked-users/{user_id}/`

**Unblock a User**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_blocked_users_destroy`

### Summary
Removes an active block on a user for this gym workspace, allowing them to interact with the gym again.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Gym Owner or active Gym Context Token with `gym_profile:edit` scope.

### Error Codes
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: User does not possess the required `gym_profile:edit` scope.
- `404 Not Found`: Blocked user record or gym workspace not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | User unblocked successfully. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Blocked user not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
