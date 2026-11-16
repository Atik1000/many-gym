# Post Comments

22 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/comments/`

**List Paginated Post Comments (with Nested Replies)**

- **Auth:** public — no token
- **operationId:** `comments_list`

Retrieves paginated top-level comments for a post with optional nested reply previews. Supports `sort` (`newest`, `oldest`, `most_replied`), `media_type` (`photo`, `video`, `gif`, `text`), `include_replies`, `replies_limit` (0-10), `reply_depth` (0-5), `page`, and `page_size`.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `media_type` | enum: `photo` \| `video` \| `gif` \| `text` | no | * `photo` - Photo * `video` - Video * `gif` - GIF * `text` - Text Only |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | enum: `oldest` \| `newest` \| `most_replied` | no | * `oldest` - Oldest * `newest` - Newest * `most_replied` - Most Replied |
| `sort` | enum: `newest` \| `oldest` \| `most_replied` | no | * `newest` - Newest * `oldest` - Oldest * `most_replied` - Most Replied |
| `source_comment_id` | string(uuid) | no |  |
| `source_post_id` | string(uuid) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedPostCommentList |  |
| `400` | ErrorDetail |  |
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
| `results` | array of PostComment |  |

</details>

---

## POST `/api/v1/comments/`

**Create Comment or Reply on a Post**

- **Auth:** Bearer JWT
- **operationId:** `comments_create`

Creates a top-level comment on a post, or a nested reply when `source_comment_id` is supplied. Supports optional `comment_text` and up to one media attachment (`comment_photo`, `comment_video`, or `comment_gif`).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PostCommentCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | Target post UUID (optional if provided in URL path or inferred from source_comment_id). |
| `source_comment_id` | string(uuid) \| null | no | Optional parent comment UUID when replying to an existing comment. |
| `comment_text` | string \| null | no | Optional text content of the comment. |
| `comment_photo` | string \| null | no | Optional photo file upload (JPG/JPEG/PNG/WEBP, <=10MB) or photo URL. |
| `comment_video` | string \| null | no | Optional video file upload (MP4/MOV, <=200MB) or video URL. |
| `comment_gif` | string \| null | no | Optional GIF file upload (.gif, <=10MB) or GIF URL. |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/comments/{comment_id}/`

**Get Comment Detail (with Optional Nested Thread)**

- **Auth:** public — no token
- **operationId:** `comments_retrieve`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PostComment |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/comments/{comment_id}/`

**Update a Comment or Reply**

- **Auth:** Bearer JWT
- **operationId:** `comments_partial_update`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedPostCommentUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `comment_text` | string \| null | no |  |
| `comment_photo` | string \| null | no |  |
| `comment_video` | string \| null | no |  |
| `comment_gif` | string \| null | no |  |
| `remove_media` | boolean | no |  |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/comments/{comment_id}/`

**Delete a Comment or Reply**

- **Auth:** Bearer JWT
- **operationId:** `comments_destroy`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/comments/{comment_id}/reactions/`

**List reactions for a comment**

- **Auth:** public — no token
- **operationId:** `comments_reactions_list`

Returns paginated list of reactors and summary breakdown for a post comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | string | no | Filter by reaction code |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

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

## POST `/api/v1/comments/{comment_id}/reactions/`

**React or toggle reaction on a comment**

- **Auth:** Bearer JWT
- **operationId:** `comments_reactions_create`

Creates, updates, or toggles off a reaction on a post comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

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

## DELETE `/api/v1/comments/{comment_id}/reactions/`

**Remove reaction from a comment**

- **Auth:** Bearer JWT
- **operationId:** `comments_reactions_destroy`

Explicitly removes viewer's reaction from the comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

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

## GET `/api/v1/comments/{comment_id}/reactions/summary/`

**Get comment reactions summary**

- **Auth:** public — no token
- **operationId:** `comments_reactions_summary_retrieve`

Returns total reactions, emoji frequency breakdown, and viewer reaction for a comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

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

## GET `/api/v1/comments/{comment_id}/replies/`

**List Paginated Replies to a Comment**

- **Auth:** public — no token
- **operationId:** `comments_replies_list`

Retrieves paginated direct replies for a specific comment (at any nesting level), with optional nested child previews.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `media_type` | enum: `photo` \| `video` \| `gif` \| `text` | no | * `photo` - Photo * `video` - Video * `gif` - GIF * `text` - Text Only |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | enum: `oldest` \| `newest` \| `most_replied` | no | * `oldest` - Oldest * `newest` - Newest * `most_replied` - Most Replied |
| `sort` | enum: `newest` \| `oldest` \| `most_replied` | no | * `newest` - Newest * `oldest` - Oldest * `most_replied` - Most Replied |
| `source_comment_id` | string(uuid) | no |  |
| `source_post_id` | string(uuid) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedPostCommentList |  |
| `400` | ErrorDetail |  |
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
| `results` | array of PostComment |  |

</details>

---

## POST `/api/v1/comments/{comment_id}/replies/`

**Reply to a Comment**

- **Auth:** Bearer JWT
- **operationId:** `comments_replies_create`

Creates a nested reply targeting the specified comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PostCommentCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | Target post UUID (optional if provided in URL path or inferred from source_comment_id). |
| `source_comment_id` | string(uuid) \| null | no | Optional parent comment UUID when replying to an existing comment. |
| `comment_text` | string \| null | no | Optional text content of the comment. |
| `comment_photo` | string \| null | no | Optional photo file upload (JPG/JPEG/PNG/WEBP, <=10MB) or photo URL. |
| `comment_video` | string \| null | no | Optional video file upload (MP4/MOV, <=200MB) or video URL. |
| `comment_gif` | string \| null | no | Optional GIF file upload (.gif, <=10MB) or GIF URL. |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/comments/`

**List Paginated Post Comments (with Nested Replies)**

- **Auth:** public — no token
- **operationId:** `posts_comments_list`

Retrieves paginated top-level comments for a post with optional nested reply previews. Supports `sort` (`newest`, `oldest`, `most_replied`), `media_type` (`photo`, `video`, `gif`, `text`), `include_replies`, `replies_limit` (0-10), `reply_depth` (0-5), `page`, and `page_size`.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `media_type` | enum: `photo` \| `video` \| `gif` \| `text` | no | * `photo` - Photo * `video` - Video * `gif` - GIF * `text` - Text Only |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | enum: `oldest` \| `newest` \| `most_replied` | no | * `oldest` - Oldest * `newest` - Newest * `most_replied` - Most Replied |
| `sort` | enum: `newest` \| `oldest` \| `most_replied` | no | * `newest` - Newest * `oldest` - Oldest * `most_replied` - Most Replied |
| `source_comment_id` | string(uuid) | no |  |
| `source_post_id` | string(uuid) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedPostCommentList |  |
| `400` | ErrorDetail |  |
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
| `results` | array of PostComment |  |

</details>

---

## POST `/api/v1/posts/{post_id}/comments/`

**Create Comment or Reply on a Post**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_create`

Creates a top-level comment on a post, or a nested reply when `source_comment_id` is supplied. Supports optional `comment_text` and up to one media attachment (`comment_photo`, `comment_video`, or `comment_gif`).

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PostCommentCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | Target post UUID (optional if provided in URL path or inferred from source_comment_id). |
| `source_comment_id` | string(uuid) \| null | no | Optional parent comment UUID when replying to an existing comment. |
| `comment_text` | string \| null | no | Optional text content of the comment. |
| `comment_photo` | string \| null | no | Optional photo file upload (JPG/JPEG/PNG/WEBP, <=10MB) or photo URL. |
| `comment_video` | string \| null | no | Optional video file upload (MP4/MOV, <=200MB) or video URL. |
| `comment_gif` | string \| null | no | Optional GIF file upload (.gif, <=10MB) or GIF URL. |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/posts/{post_id}/comments/{comment_id}/`

**Get Comment Detail (with Optional Nested Thread)**

- **Auth:** public — no token
- **operationId:** `posts_comments_retrieve`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PostComment |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/posts/{post_id}/comments/{comment_id}/`

**Update a Comment or Reply**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_partial_update`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedPostCommentUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `comment_text` | string \| null | no |  |
| `comment_photo` | string \| null | no |  |
| `comment_video` | string \| null | no |  |
| `comment_gif` | string \| null | no |  |
| `remove_media` | boolean | no |  |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/posts/{post_id}/comments/{comment_id}/`

**Delete a Comment or Reply**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_destroy`

Retrieve, edit, or delete a single comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`

**List reactions for a comment**

- **Auth:** public — no token
- **operationId:** `posts_comments_reactions_list`

Returns paginated list of reactors and summary breakdown for a post comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | string | no | Filter by reaction code |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

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

## POST `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`

**React or toggle reaction on a comment**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_reactions_create`

Creates, updates, or toggles off a reaction on a post comment or nested reply.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
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

## DELETE `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`

**Remove reaction from a comment**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_reactions_destroy`

Explicitly removes viewer's reaction from the comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
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

## GET `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/summary/`

**Get comment reactions summary**

- **Auth:** public — no token
- **operationId:** `posts_comments_reactions_summary_retrieve`

Returns total reactions, emoji frequency breakdown, and viewer reaction for a comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
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

## GET `/api/v1/posts/{post_id}/comments/{comment_id}/replies/`

**List Paginated Replies to a Comment**

- **Auth:** public — no token
- **operationId:** `posts_comments_replies_list`

Retrieves paginated direct replies for a specific comment (at any nesting level), with optional nested child previews.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_replies` | boolean | no |  |
| `media_type` | enum: `photo` \| `video` \| `gif` \| `text` | no | * `photo` - Photo * `video` - Video * `gif` - GIF * `text` - Text Only |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `replies_limit` | integer | no |  |
| `reply_depth` | integer | no |  |
| `reply_sort` | enum: `oldest` \| `newest` \| `most_replied` | no | * `oldest` - Oldest * `newest` - Newest * `most_replied` - Most Replied |
| `sort` | enum: `newest` \| `oldest` \| `most_replied` | no | * `newest` - Newest * `oldest` - Oldest * `most_replied` - Most Replied |
| `source_comment_id` | string(uuid) | no |  |
| `source_post_id` | string(uuid) | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedPostCommentList |  |
| `400` | ErrorDetail |  |
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
| `results` | array of PostComment |  |

</details>

---

## POST `/api/v1/posts/{post_id}/comments/{comment_id}/replies/`

**Reply to a Comment**

- **Auth:** Bearer JWT
- **operationId:** `posts_comments_replies_create`

Creates a nested reply targeting the specified comment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `comment_id` | string(uuid) | yes |  |
| `post_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PostCommentCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | Target post UUID (optional if provided in URL path or inferred from source_comment_id). |
| `source_comment_id` | string(uuid) \| null | no | Optional parent comment UUID when replying to an existing comment. |
| `comment_text` | string \| null | no | Optional text content of the comment. |
| `comment_photo` | string \| null | no | Optional photo file upload (JPG/JPEG/PNG/WEBP, <=10MB) or photo URL. |
| `comment_video` | string \| null | no | Optional video file upload (MP4/MOV, <=200MB) or video URL. |
| `comment_gif` | string \| null | no | Optional GIF file upload (.gif, <=10MB) or GIF URL. |
| `duration_seconds` | number(double) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | PostComment |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `author_name` | string | read-only. |
| `author_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) | read-only. |
| `source_comment_id` | string(uuid) \| null | read-only. |
| `root_comment_id` | string(uuid) \| null | read-only. |
| `depth` | integer | Nesting depth: 0 for top-level post comments, 1+ for nested replies. |
| `reply_to_user_id` | string(uuid) \| null | read-only. |
| `reply_to_user_name` | string \| null | read-only. |
| `comment_text` | string \| null | Optional text body of the comment (required if no photo/video/gif is attached). |
| `comment_photo` | string \| null | read-only. |
| `comment_video` | string \| null | read-only. |
| `comment_gif` | string \| null | read-only. |
| `media_type` | any \| null | Media attachment kind ('photo', 'video', 'gif') when media is present. |
| `media_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null |  |
| `height` | integer \| null |  |
| `file_size_bytes` | integer | Uploaded file size in bytes: <=10MB photo/gif, <=200MB video. |
| `duration_seconds` | number(double) \| null | Optional video playback duration in seconds. |
| `replies_count` | integer | Direct child replies count. |
| `total_replies_count` | integer | Total nested descendant replies count across all depths under this comment. |
| `reactions_count` | integer | Total reactions count on this comment. |
| `has_more_replies` | boolean | read-only. |
| `replies` | array of object | read-only. |
| `is_edited` | boolean |  |
| `edited_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
