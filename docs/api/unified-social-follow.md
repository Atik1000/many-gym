# Unified Social Follow

18 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/auth/follow/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_retrieve`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/auth/follow/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_create`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/auth/follow/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_destroy`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## GET `/api/v1/follow/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `follow_retrieve`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/follow/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follow_create`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/follow/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follow_destroy`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## GET `/api/v1/follow/{target_id}/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `follow_retrieve_2`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/follow/{target_id}/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follow_create_2`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/follow/{target_id}/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follow_destroy_2`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## GET `/api/v1/follows/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `follows_retrieve`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/follows/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follows_create`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/follows/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follows_destroy`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## GET `/api/v1/follows/{target_id}/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `follows_retrieve_2`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/follows/{target_id}/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follows_create_2`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/follows/{target_id}/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `follows_destroy_2`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `target_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## GET `/api/v1/users/follow/`

**Get Followers or Following List**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_retrieve`

### Summary
- If `target_id` is supplied (in URL path or query param), returns the **followers list** of the target User or Gym. Target entity type is **automatically detected**. Respects target privacy settings (returns 403 if restricted).
- If `target_id` is omitted, returns the list of entities (Users and Gyms) followed by the current authenticated user.

### Authentication & Authorization
- **Authentication**: Bearer JWT token required.
- **Authorization**: Authenticated users. Restricted if target User is private or target Gym followers visibility is restricted.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | Page number. |
| `page_size` | integer | no | Page size (max 100). |
| `target_id` | string(uuid) | no | UUID of target entity. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UnifiedTargetFollowersResponse | Followers list of target entity (or followed accounts if target_id omitted). |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target is private or restricted by settings. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `target_type` | enum: `user` \| `gym` |  |
| `target_id` | string(uuid) | UUID of target entity. |
| `followers_count` | integer | Total number of followers. |
| `is_following` | boolean | Whether authenticated user follows this target. |
| `followers` | array of object | Followers list. |

</details>

---

## POST `/api/v1/users/follow/`

**Follow or Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_create`

### Summary
Unified single endpoint to follow or unfollow any public User or Gym.

### Auto-Detection
`target_type` is **automatically detected** from the database (whether UUID is a Gym or User).

### Request
- Pass `target_id` (or `id`) in JSON body (`{"target_id": "<uuid>"}`) or directly in URL path (`/api/v1/follows/<target_id>/`).
- Optional `action`: `"follow"` (default) or `"unfollow"`.

**Request body** — `application/json` (FollowActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_id` | string(uuid) \| null | no | UUID of target User or Gym. Auto-detected whether user or gym. |
| `id` | string(uuid) \| null | no | Alias for target_id. |
| `target_type` | any \| null | no | Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. |
| `action` | enum: `follow` \| `unfollow` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target or already following. |
| `201` | FollowActionResponse | Successfully followed target. |
| `400` | ErrorDetail | Validation failure or self-follow attempt. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or user is blocked by gym. |
| `404` | ErrorDetail | Target entity not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---

## DELETE `/api/v1/users/follow/`

**Unfollow a User or Gym**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_destroy`

### Summary
Unfollows a previously followed User or Gym.

### Auto-Detection
`target_type` is **automatically detected**.

### Parameters
Parameters can be sent via:
1. URL path: `/api/v1/follows/<target_id>/`
2. JSON body: `{"target_id": "<uuid>"}`
3. Query param: `?target_id=<uuid>`

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowActionResponse | Successfully unfollowed target. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Not currently following target or target not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `is_following` | boolean |  |
| `target_type` | string |  |
| `target_id` | string(uuid) |  |
| `target_name` | string \| null |  |

</details>

---
