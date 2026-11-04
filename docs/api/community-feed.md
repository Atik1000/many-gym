# Community Feed

6 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/posts/`

**List Gym Community Feed**

- **Auth:** public — no token
- **operationId:** `posts_list`

Retrieves community posts for a gym. Unauthenticated guests and non-members see only public posts; verified members and staff see both public and members_only posts.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | yes |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `privacy` | string | no |  |
| `search` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymPostList |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments exist |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/posts/`

**Create Community Post**

- **Auth:** Bearer JWT
- **operationId:** `posts_create`

Creates a new community post with optional text and media attachments (pictures or videos). Requires 'posts:manage' scope.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (GymPostCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `content_text` | string \| null | no |  |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` | no |  |
| `media_items` | array of MediaItemInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments exist |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/`

**Get Post Detail**

- **Auth:** public — no token
- **operationId:** `posts_retrieve`

Retrieves a single community post dossier with all attached media.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments exist |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/posts/{post_id}/`

**Update Community Post**

- **Auth:** Bearer JWT
- **operationId:** `posts_partial_update`

Updates post text, privacy level, or reorders media attachments. Requires 'posts:manage' scope.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PatchedGymPostUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `content_text` | string \| null | no |  |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` | no |  |
| `media_order` | array of MediaOrderItemRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments exist |
| `privacy` | enum: `public` \| `members_only` \| `gym_members_only` \| `private` |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/posts/{post_id}/`

**Delete Community Post**

- **Auth:** Bearer JWT
- **operationId:** `posts_destroy`

Permanently deletes a gym community post and its associated media assets. Requires 'posts:manage' scope.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ErrorDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable explanation of the error |
| `details` | object | Field-specific validation errors or context dictionary |

</details>

---

## PATCH `/api/v1/posts/{post_id}/media/{media_id}/thumbnail/`

**Upload Custom Video Thumbnail**

- **Auth:** Bearer JWT
- **operationId:** `posts_media_thumbnail_partial_update`

Allows gym staff to replace the auto-generated poster frame of a video post with a custom image. Requires 'posts:manage' scope.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `media_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymPostMedia |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `post_id` | string(uuid) | read-only. |
| `media_url` | string | read-only. |
| `original_url` | string \| null |  |
| `media_type` | enum: `picture` \| `video` |  |
| `thumbnail_url` | string | read-only. |
| `file_size_bytes` | integer(int64) | Size in bytes: <=10MB image, <=200MB video |
| `order_index` | integer |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `created_at` | string(date-time) | read-only. |

</details>

---
