# Stories

13 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/stories/`

**List Active Stories**

- **Auth:** public — no token
- **operationId:** `stories_list`

Retrieves non-expired stories visible to the requesting user. Respects owner-type privacy rules (Public users: public/followers/private; Gyms: public/followers/members_only/private), blocklists, and age restrictions.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `feed_type` | string | no | Feed filter: 'all', 'followed', 'connected', or 'public'. |
| `gym_id` | string(uuid) | no | Filter active stories belonging to a specific gym. |
| `owner_type` | enum: `user` \| `gym` | no | Filter stories by uploader type ('user' or 'gym'). * `user` - Public User * `gym` - Gym |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `private` | no | Filter by story privacy level. * `public` - Public * `followers` - Followers * `members_only` - Members Only * `private` - Private |
| `user_id` | string(uuid) | no | Filter active stories belonging to a specific public user. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedStoryList |  |
| `400` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of Story |  |

</details>

---

## POST `/api/v1/stories/`

**Upload Story**

- **Auth:** Bearer JWT
- **operationId:** `stories_create`

Uploads a single-media story (1 image or 1 video) as either a Public User or a Gym. Supports lifetime selection (6, 12, 18 [default], 24, 48 hours), optional source_post_id, and owner-specific privacy levels.

**Request body** — `application/json` (StoryCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_post_id` | string(uuid) \| null | no | Optional UUID of a community post being shared to this story. |
| `media_url` | string \| null | no | Single pre-uploaded or external media URL (image or video). Omit when uploading a multipart file. media_type is auto-detected. |
| `thumbnail_url` | string \| null | no |  |
| `file_size_bytes` | integer | no |  |
| `duration_seconds` | number(double) \| null | no |  |
| `file` | string(binary) | no | Single media file upload (1 image [JPG/JPEG/PNG/WEBP <=10MB] or 1 video [MP4/MOV <=200MB]). media_type is auto-detected. |
| `lifetime_hours` | string \| null | no | Story lifetime in hours: 6, 12, 18 (default), 24, or 48. |
| `lifetime` | string \| null | no | Alias for lifetime_hours (6, 12, 18 [default], 24, or 48). |
| `privacy` | string \| null | no | Public users: public, followers, private. Gyms: public, followers, members_only, private. |
| `caption` | string \| null | no |  |
| `background_color` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | Story |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `user_id` | string(uuid) | read-only. |
| `user_name` | string | read-only. |
| `user_avatar_url` | string \| null | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | StorySourcePostSummary \| null |  |
| `media_url` | string | read-only. |
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `file_size_bytes` | integer | read-only. Size in bytes: <=10MB image, <=200MB video. |
| `width` | integer \| null | read-only. |
| `height` | integer \| null | read-only. |
| `duration_seconds` | number(double) \| null | read-only. Optional media playback duration in seconds. |
| `caption` | string \| null | read-only. Optional short text caption overlaid on the story. |
| `background_color` | string \| null | read-only. Optional backdrop hex/gradient color code. |
| `lifetime_hours` | enum: `6` \| `12` \| `18` \| `24` \| `48` |  |
| `lifetime_label` | string | read-only. |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `private` |  |
| `published_at` | string(date-time) | read-only. |
| `expires_at` | string(date-time) | read-only. |
| `is_expired` | boolean | read-only. |
| `is_archived` | boolean | read-only. |
| `views_count` | integer | read-only. |
| `reactions_count` | integer | read-only. |
| `has_viewed` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/stories/my/`

**List My Stories (Personal or Gym)**

- **Auth:** Bearer JWT
- **operationId:** `stories_my_list`

Lists stories owned by the current personal user or active gym context from the Bearer token (including private and optional expired archive).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `include_archived` | boolean | no |  |
| `include_expired` | boolean | no |  |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedStoryList |  |
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
| `results` | array of Story |  |

</details>

---

## GET `/api/v1/stories/tray/`

**Get Story Tray (Grouped by Owner)**

- **Auth:** public — no token
- **operationId:** `stories_tray_list`

Returns active stories grouped by Public User or Gym, prioritizing owners with unviewed stories.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `feed_type` | string | no |  |
| `owner_type` | enum: `gym` \| `user` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of StoryTrayBucket |  |
| `400` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `owner_type` | enum: `user` \| `gym` |  |
| `owner_id` | string(uuid) |  |
| `owner_name` | string |  |
| `owner_avatar_url` | string \| null |  |
| `latest_story_at` | string(date-time) |  |
| `has_unviewed` | boolean |  |
| `stories_count` | integer |  |
| `stories` | array of Story |  |

</details>

---

## GET `/api/v1/stories/{story_id}/`

**Get Story Detail**

- **Auth:** public — no token
- **operationId:** `stories_retrieve`

Retrieves a single story. Pass ?mark_viewed=true (when authenticated) to record a view.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `mark_viewed` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | Story |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `user_id` | string(uuid) | read-only. |
| `user_name` | string | read-only. |
| `user_avatar_url` | string \| null | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | StorySourcePostSummary \| null |  |
| `media_url` | string | read-only. |
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `file_size_bytes` | integer | read-only. Size in bytes: <=10MB image, <=200MB video. |
| `width` | integer \| null | read-only. |
| `height` | integer \| null | read-only. |
| `duration_seconds` | number(double) \| null | read-only. Optional media playback duration in seconds. |
| `caption` | string \| null | read-only. Optional short text caption overlaid on the story. |
| `background_color` | string \| null | read-only. Optional backdrop hex/gradient color code. |
| `lifetime_hours` | enum: `6` \| `12` \| `18` \| `24` \| `48` |  |
| `lifetime_label` | string | read-only. |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `private` |  |
| `published_at` | string(date-time) | read-only. |
| `expires_at` | string(date-time) | read-only. |
| `is_expired` | boolean | read-only. |
| `is_archived` | boolean | read-only. |
| `views_count` | integer | read-only. |
| `reactions_count` | integer | read-only. |
| `has_viewed` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/stories/{story_id}/`

**Update Story**

- **Auth:** Bearer JWT
- **operationId:** `stories_partial_update`

Updates story caption, background_color, privacy, lifetime, or archive status. Owner/Gym manager only.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedStoryUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `caption` | string \| null | no |  |
| `background_color` | string \| null | no |  |
| `privacy` | string | no |  |
| `lifetime_hours` | string | no |  |
| `lifetime` | string | no |  |
| `is_archived` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | Story |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `owner_type` | string | read-only. |
| `user_id` | string(uuid) | read-only. |
| `user_name` | string | read-only. |
| `user_avatar_url` | string \| null | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `source_post_id` | string(uuid) \| null | read-only. |
| `source_post` | StorySourcePostSummary \| null |  |
| `media_url` | string | read-only. |
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `file_size_bytes` | integer | read-only. Size in bytes: <=10MB image, <=200MB video. |
| `width` | integer \| null | read-only. |
| `height` | integer \| null | read-only. |
| `duration_seconds` | number(double) \| null | read-only. Optional media playback duration in seconds. |
| `caption` | string \| null | read-only. Optional short text caption overlaid on the story. |
| `background_color` | string \| null | read-only. Optional backdrop hex/gradient color code. |
| `lifetime_hours` | enum: `6` \| `12` \| `18` \| `24` \| `48` |  |
| `lifetime_label` | string | read-only. |
| `privacy` | enum: `public` \| `followers` \| `members_only` \| `private` |  |
| `published_at` | string(date-time) | read-only. |
| `expires_at` | string(date-time) | read-only. |
| `is_expired` | boolean | read-only. |
| `is_archived` | boolean | read-only. |
| `views_count` | integer | read-only. |
| `reactions_count` | integer | read-only. |
| `has_viewed` | boolean | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/stories/{story_id}/`

**Delete Story**

- **Auth:** Bearer JWT
- **operationId:** `stories_destroy`

Permanently deletes a story and cleans up story-owned media files. Owner/Gym manager only.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## GET `/api/v1/stories/{story_id}/reactions/`

**List reactions for a story**

- **Auth:** public — no token
- **operationId:** `stories_reactions_list`

Returns paginated list of reactors and summary breakdown for a story.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## POST `/api/v1/stories/{story_id}/reactions/`

**React or toggle reaction on a story**

- **Auth:** Bearer JWT
- **operationId:** `stories_reactions_create`

Creates, updates, or toggles off a reaction on an active story.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## DELETE `/api/v1/stories/{story_id}/reactions/`

**Remove reaction from a story**

- **Auth:** Bearer JWT
- **operationId:** `stories_reactions_destroy`

Explicitly removes viewer's reaction from the story.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## GET `/api/v1/stories/{story_id}/reactions/summary/`

**Get story reactions summary**

- **Auth:** public — no token
- **operationId:** `stories_reactions_summary_retrieve`

Returns total reactions, emoji frequency breakdown, and viewer reaction for a story.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## POST `/api/v1/stories/{story_id}/view/`

**Record Story View**

- **Auth:** Bearer JWT
- **operationId:** `stories_view_create`

Marks the story as viewed by the authenticated user and updates unique views_count.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

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

## GET `/api/v1/stories/{story_id}/viewers/`

**List Story Viewers**

- **Auth:** Bearer JWT
- **operationId:** `stories_viewers_list`

Retrieves users who viewed this story. Restricted to the story owner or authorized gym staff.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `story_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedStoryViewList |  |
| `401` | ErrorDetail |  |
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
| `results` | array of StoryView |  |

</details>

---
