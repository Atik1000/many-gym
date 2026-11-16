# Community Feed

16 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/posts/`

**List Community & Profile Feed**

- **Auth:** public — no token
- **operationId:** `posts_list`

Retrieves community posts and reposts. Pass `user_id` for a public user's profile feed, `gym_id` for a gym's profile feed, or omit both for the personalized global feed. Supports filtering by `owner_type`, `feed_type`, `privacy`, `is_repost`, and `search`.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `feed_type` | string | no | Feed stream filter: 'all', 'followed', 'connected', or 'public'. |
| `gym_id` | string(uuid) | no | Optional UUID of a specific gym to view its profile feed. |
| `is_repost` | boolean | no | Optional boolean filter: true for reposts only, false for original posts only. |
| `owner_type` | enum: `user` \| `gym` | no | Optional filter by post owner type ('user' or 'gym'). * `user` - Public User * `gym` - Gym |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` | no | Filter by post privacy level. * `public` - Public * `followers` - Followers * `members_only` - Gym Members Only * `gym_members_only` - Gym Members Only * `private` - Private |
| `search` | string | no | Keyword search matching post content, author name, or gym name. |
| `source` | string | no | Alias for feed_type. |
| `user_id` | string(uuid) | no | Optional UUID of a public user to view their personal profile feed. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedGymPostListList |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of GymPostList |  |

</details>

---

## POST `/api/v1/posts/`

**Create Post or Repost**

- **Auth:** Bearer JWT
- **operationId:** `posts_create`

Creates a new post (or repost when `source_post_id` is provided) as either a Public User or a Gym based on the Bearer token context (or explicit `gym_id`). Public users support privacy: `public`, `followers`, `private`. Gyms support privacy: `public`, `followers`, `members_only`, `private` (requires `posts:manage`).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (GymPostCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `content_text` | string \| null | no |  |
| `privacy` | string \| null | no | Public users: public, followers, private. Gyms: public, followers, members_only, private. |
| `source_post_id` | string(uuid) \| null | no | Optional UUID of an existing post to repost/share. |
| `target` | string \| null | no | Destination when source_post_id is provided: 'profile' (default) or 'story'. |
| `caption` | string \| null | no |  |
| `background_color` | string \| null | no |  |
| `lifetime_hours` | string \| null | no |  |
| `lifetime` | string \| null | no |  |
| `media_url` | string \| null | no |  |
| `thumbnail_url` | string \| null | no |  |
| `file_size_bytes` | integer | no |  |
| `duration_seconds` | number(double) \| null | no |  |
| `media_items` | array of MediaItemInputRequest | no |  |
| `files` | array of string | no | Direct file upload (pictures or videos) in multipart/form-data. Multiple files accepted under 'files', 'media_files', or 'file'. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/feed/`

**List Community & Profile Feed**

- **Auth:** public — no token
- **operationId:** `posts_feed_list`

Retrieves community posts and reposts. Pass `user_id` for a public user's profile feed, `gym_id` for a gym's profile feed, or omit both for the personalized global feed. Supports filtering by `owner_type`, `feed_type`, `privacy`, `is_repost`, and `search`.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `feed_type` | string | no | Feed stream filter: 'all', 'followed', 'connected', or 'public'. |
| `gym_id` | string(uuid) | no | Optional UUID of a specific gym to view its profile feed. |
| `is_repost` | boolean | no | Optional boolean filter: true for reposts only, false for original posts only. |
| `owner_type` | enum: `user` \| `gym` | no | Optional filter by post owner type ('user' or 'gym'). * `user` - Public User * `gym` - Gym |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` | no | Filter by post privacy level. * `public` - Public * `followers` - Followers * `members_only` - Gym Members Only * `gym_members_only` - Gym Members Only * `private` - Private |
| `search` | string | no | Keyword search matching post content, author name, or gym name. |
| `source` | string | no | Alias for feed_type. |
| `user_id` | string(uuid) | no | Optional UUID of a public user to view their personal profile feed. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedGymPostListList |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of GymPostList |  |

</details>

---

## POST `/api/v1/posts/feed/`

**Create Post or Repost**

- **Auth:** Bearer JWT
- **operationId:** `posts_feed_create`

Creates a new post (or repost when `source_post_id` is provided) as either a Public User or a Gym based on the Bearer token context (or explicit `gym_id`). Public users support privacy: `public`, `followers`, `private`. Gyms support privacy: `public`, `followers`, `members_only`, `private` (requires `posts:manage`).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (GymPostCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `content_text` | string \| null | no |  |
| `privacy` | string \| null | no | Public users: public, followers, private. Gyms: public, followers, members_only, private. |
| `source_post_id` | string(uuid) \| null | no | Optional UUID of an existing post to repost/share. |
| `target` | string \| null | no | Destination when source_post_id is provided: 'profile' (default) or 'story'. |
| `caption` | string \| null | no |  |
| `background_color` | string \| null | no |  |
| `lifetime_hours` | string \| null | no |  |
| `lifetime` | string \| null | no |  |
| `media_url` | string \| null | no |  |
| `thumbnail_url` | string \| null | no |  |
| `file_size_bytes` | integer | no |  |
| `duration_seconds` | number(double) \| null | no |  |
| `media_items` | array of MediaItemInputRequest | no |  |
| `files` | array of string | no | Direct file upload (pictures or videos) in multipart/form-data. Multiple files accepted under 'files', 'media_files', or 'file'. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/my/`

**List My Profile Feed (Personal or Gym)**

- **Auth:** Bearer JWT
- **operationId:** `posts_my_list`

Lists posts and reposts belonging to the authenticated Personal User or active Gym token context.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `is_repost` | boolean | no |  |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |
| `privacy` | string | no |  |
| `search` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedGymPostListList |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of GymPostList |  |

</details>

---

## POST `/api/v1/posts/repost/`

**Repost Post (Share on Profile or Share on Story)**

- **Auth:** Bearer JWT
- **operationId:** `posts_repost_create`

Reposts an existing post (another user's/gym's post or your own previous post) to `target='profile'` (showing on profile feed) or `target='story'` (sharing on Story). Owner type (`user` vs `gym`) is automatically detected from the Bearer token. Public user privacy choices: `public`, `followers`, `private`. Gym privacy choices: `public`, `followers`, `members_only`, `private`.

**Request body** — `application/json` (RepostCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | UUID of the post being reposted (optional if passed in URL path). |
| `target` | string \| null | no | Where to share: 'profile' (showing on profile feed) or 'story' (share on Story). |
| `privacy` | string \| null | no | Public users: public, followers, private. Gyms: public, followers, members_only, private. |
| `content_text` | string \| null | no | Optional commentary text added when reposting to profile feed. |
| `caption` | string \| null | no | Optional Story overlay caption (falls back to content_text if omitted). |
| `background_color` | string \| null | no |  |
| `lifetime_hours` | string \| null | no |  |
| `lifetime` | string \| null | no |  |
| `media_url` | string \| null | no |  |
| `thumbnail_url` | string \| null | no |  |
| `file_size_bytes` | integer | no |  |
| `duration_seconds` | number(double) \| null | no |  |
| `file` | string(binary) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/`

**Get Post Detail**

- **Auth:** public — no token
- **operationId:** `posts_retrieve`

Retrieves a single post or repost dossier with attached media and embedded source_post.

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
| `200` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/posts/{post_id}/`

**Update Post or Repost**

- **Auth:** Bearer JWT
- **operationId:** `posts_partial_update`

Updates post text, privacy level, or reorders media attachments.

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
| `privacy` | string | no |  |
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
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/posts/{post_id}/`

**Delete Post or Repost**

- **Auth:** Bearer JWT
- **operationId:** `posts_destroy`

Permanently deletes a post or repost and cleans up its associated media assets.

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
| `200` | MessageResponse |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

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

**Request body** — `multipart/form-data` (PatchedCustomVideoThumbnailRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `thumbnail_image` | string(binary) | no | Custom video poster image (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation and converts directly to WebP. |

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
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `thumbnail_url` | string | read-only. |
| `file_size_bytes` | integer | Size in bytes: <=10MB image, <=200MB video |
| `order_index` | integer |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/reactions/`

**List reactions for a post**

- **Auth:** public — no token
- **operationId:** `posts_reactions_list`

Returns paginated list of users/gyms who reacted to the post, along with breakdown summary.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | string | no | Filter by reaction code (e.g. smile, laugh, fire) |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |
| `reaction_item_id` | string(uuid) | no | Filter by reaction item UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedReactionDetailList |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of ReactionDetail |  |

</details>

---

## POST `/api/v1/posts/{post_id}/reactions/`

**React or toggle reaction on a post**

- **Auth:** Bearer JWT
- **operationId:** `posts_reactions_create`

Creates, updates, or toggles off a reaction on a community post/repost.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Request body** — `application/json` (ReactionInputRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reaction_item_id` | string(uuid) \| null | no | UUID of the ReactionItem from the /api/v1/reactions/items/ catalog. |
| `reaction_code` | string \| null | no | Programmatic reaction code (e.g. 'smile', 'laugh', 'fire', 'like'). |
| `owner_type` | enum: `user` \| `gym` | no |  |
| `gym_id` | string(uuid) \| null | no | Required when owner_type='gym'. |
| `post_id` | string(uuid) \| null | no | Target post UUID if reacting to a community post/repost. |
| `story_id` | string(uuid) \| null | no | Target story UUID if reacting to a story. |
| `comment_id` | string(uuid) \| null | no | Target comment UUID if reacting to a comment or reply. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReactionActionResponse |  |
| `201` | ReactionActionResponse |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `status` | enum: `created` \| `updated` \| `removed` |  |
| `reaction` | ReactionDetail \| null |  |
| `target` | ReactionTargetMeta |  |
| `summary` | ReactionSummary |  |

</details>

---

## DELETE `/api/v1/posts/{post_id}/reactions/`

**Remove reaction from a post**

- **Auth:** Bearer JWT
- **operationId:** `posts_reactions_destroy`

Explicitly removes the authenticated user's reaction from the specified post.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReactionActionResponse |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `status` | enum: `created` \| `updated` \| `removed` |  |
| `reaction` | ReactionDetail \| null |  |
| `target` | ReactionTargetMeta |  |
| `summary` | ReactionSummary |  |

</details>

---

## GET `/api/v1/posts/{post_id}/reactions/summary/`

**Get post reactions summary**

- **Auth:** public — no token
- **operationId:** `posts_reactions_summary_retrieve`

Returns total reactions count, breakdown by emoji, top reactions, and viewer reaction for a post.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReactionSummary |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `total_reactions` | integer |  |
| `reaction_counts` | array of ReactionCountSummaryItem |  |
| `top_reactions` | array of TopReactionSummaryItem |  |
| `viewer_reaction` | ViewerReactionSummary \| null |  |

</details>

---

## POST `/api/v1/posts/{post_id}/repost/`

**Repost Post (Share on Profile or Share on Story)**

- **Auth:** Bearer JWT
- **operationId:** `posts_repost_create_2`

Reposts an existing post (another user's/gym's post or your own previous post) to `target='profile'` (showing on profile feed) or `target='story'` (sharing on Story). Owner type (`user` vs `gym`) is automatically detected from the Bearer token. Public user privacy choices: `public`, `followers`, `private`. Gym privacy choices: `public`, `followers`, `members_only`, `private`.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Request body** — `application/json` (RepostCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | UUID of the post being reposted (optional if passed in URL path). |
| `target` | string \| null | no | Where to share: 'profile' (showing on profile feed) or 'story' (share on Story). |
| `privacy` | string \| null | no | Public users: public, followers, private. Gyms: public, followers, members_only, private. |
| `content_text` | string \| null | no | Optional commentary text added when reposting to profile feed. |
| `caption` | string \| null | no | Optional Story overlay caption (falls back to content_text if omitted). |
| `background_color` | string \| null | no |  |
| `lifetime_hours` | string \| null | no |  |
| `lifetime` | string \| null | no |  |
| `media_url` | string \| null | no |  |
| `thumbnail_url` | string \| null | no |  |
| `file_size_bytes` | integer | no |  |
| `duration_seconds` | number(double) \| null | no |  |
| `file` | string(binary) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymPostDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_user_id` | string(uuid) | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `content_text` | string \| null | Optional if media attachments or source_post exist |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `gym_members_only` \| `private` |  |
| `is_repost` | boolean | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | string | read-only. |
| `source_post_unavailable` | boolean | read-only. |
| `reposts_count` | integer |  |
| `comments_count` | integer |  |
| `reactions_count` | integer |  |
| `published_at` | string(date-time) |  |
| `media_count` | integer | read-only. |
| `media_attachments` | array of GymPostMedia | read-only. |
| `is_following_gym` | boolean | read-only. |
| `is_following_author` | boolean | read-only. |
| `is_connected_gym` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/reposts/`

**List Reposts of a Post**

- **Auth:** public — no token
- **operationId:** `posts_reposts_list`

Retrieves visible profile reposts referencing the specified post ID.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedGymPostListList |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of GymPostList |  |

</details>

---
