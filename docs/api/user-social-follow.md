# User Social & Follow

8 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/auth/{user_id}/follow/`

**Follow a User**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_create_2`

Follows a target user if the target user account is public and active.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserFollowActionResponse | Already following user. |
| `201` | UserFollowActionResponse | Successfully followed user. |
| `400` | ErrorDetail | Invalid request (e.g. self-follow). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private. |
| `404` | ErrorDetail | Target user not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) |  |

</details>

---

## DELETE `/api/v1/auth/{user_id}/follow/`

**Unfollow a User**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_destroy_2`

Unfollows a target user that was previously followed.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserFollowActionResponse | Successfully unfollowed user. |
| `400` | ErrorDetail | Invalid target user ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following user or user not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) |  |

</details>

---

## GET `/api/v1/auth/{user_id}/followers/`

**List User Followers**

- **Auth:** Bearer JWT
- **operationId:** `auth_followers_retrieve`

Lists all users who follow the specified user. Restricted if the target user is private.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowUserItem | List of user followers. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | User account is private. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) | User unique identifier. |
| `email` | string(email) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `followed_at` | string(date-time) |  |

</details>

---

## GET `/api/v1/auth/{user_id}/following/`

**List User Following**

- **Auth:** Bearer JWT
- **operationId:** `auth_following_retrieve`

### Summary
Lists all users that the specified user is following. Restricted if the target user is private.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Public for open profiles. If the target user is private, only the account owner can view.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no |  |
| `page_size` | integer | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowUserItem | List of users followed. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | User account is private. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) | User unique identifier. |
| `email` | string(email) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `followed_at` | string(date-time) |  |

</details>

---

## POST `/api/v1/users/{user_id}/follow/`

**Follow a User**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_create_2`

Follows a target user if the target user account is public and active.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserFollowActionResponse | Already following user. |
| `201` | UserFollowActionResponse | Successfully followed user. |
| `400` | ErrorDetail | Invalid request (e.g. self-follow). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private. |
| `404` | ErrorDetail | Target user not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) |  |

</details>

---

## DELETE `/api/v1/users/{user_id}/follow/`

**Unfollow a User**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_destroy_2`

Unfollows a target user that was previously followed.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserFollowActionResponse | Successfully unfollowed user. |
| `400` | ErrorDetail | Invalid target user ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following user or user not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) |  |

</details>

---

## GET `/api/v1/users/{user_id}/followers/`

**List User Followers**

- **Auth:** Bearer JWT
- **operationId:** `users_followers_retrieve`

Lists all users who follow the specified user. Restricted if the target user is private.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowUserItem | List of user followers. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | User account is private. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) | User unique identifier. |
| `email` | string(email) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `followed_at` | string(date-time) |  |

</details>

---

## GET `/api/v1/users/{user_id}/following/`

**List User Following**

- **Auth:** Bearer JWT
- **operationId:** `users_following_retrieve`

### Summary
Lists all users that the specified user is following. Restricted if the target user is private.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Public for open profiles. If the target user is private, only the account owner can view.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no |  |
| `page_size` | integer | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowUserItem | List of users followed. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | User account is private. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) | User unique identifier. |
| `email` | string(email) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `followed_at` | string(date-time) |  |

</details>

---
