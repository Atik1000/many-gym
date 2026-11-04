# Gym Social & Follow

5 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/followed/`

**List Gyms Followed by User**

- **Auth:** Bearer JWT
- **operationId:** `gyms_followed_retrieve`

### Summary
Retrieves a list of all gym workspaces followed by the authenticated user.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Authenticated account holder (self).

### Error Codes
- `401 Unauthorized`: Missing or invalid authentication token.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowedGymItem | List of followed gyms. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `gym_id` | string(uuid) | Gym unique identifier. |
| `name` | string |  |
| `primary_type` | string |  |
| `profile_picture_url` | string \| null |  |
| `followed_at` | string(date-time) |  |

</details>

---

## POST `/api/v1/gyms/{gym_id}/follow/`

**Follow a Gym**

- **Auth:** Bearer JWT
- **operationId:** `gyms_follow_create`

Follows a specified gym. Blocked users or inactive/deleted gyms are rejected.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymFollowActionResponse | Already following gym. |
| `201` | GymFollowActionResponse | Successfully followed gym. |
| `400` | ErrorDetail | Gym is inactive or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | User is blocked from following this gym. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `gym_id` | string(uuid) |  |
| `gym_name` | string |  |

</details>

---

## DELETE `/api/v1/gyms/{gym_id}/follow/`

**Unfollow a Gym**

- **Auth:** Bearer JWT
- **operationId:** `gyms_follow_destroy`

Unfollows a specified gym.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymFollowActionResponse | Successfully unfollowed gym. |
| `400` | ErrorDetail | Invalid gym ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following gym or gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `gym_id` | string(uuid) |  |
| `gym_name` | string |  |

</details>

---

## GET `/api/v1/gyms/{gym_id}/followers/`

**List Gym Followers**

- **Auth:** Bearer JWT
- **operationId:** `gyms_followers_retrieve`

### Summary
Lists all users who follow the specified gym workspace.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Public (any authenticated user can inspect gym followers unless blocked).

### Error Codes
- `401 Unauthorized`: Missing or invalid authentication token.
- `404 Not Found`: Target gym workspace not found.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymFollowerItem | List of gym followers. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) | User unique identifier. |
| `email` | string(email) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string |  |
| `avatar_url` | string \| null |  |
| `followed_at` | string(date-time) |  |

</details>

---

## GET `/api/v1/gyms/{gym_id}/following/`

**List People and Pages Gym Follows**

- **Auth:** Bearer JWT
- **operationId:** `gyms_following_retrieve`

Lists all people and pages followed by the gym. Restricted by GymSetting.who_can_see_following ('everyone', 'only_members', 'private').

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | List of accounts followed by gym. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Following list is restricted by privacy settings. |
| `404` | ErrorDetail | Gym not found. |

---
