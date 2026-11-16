# reactions

17 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/reactions/`

**List reactions across targets**

- **Auth:** public — no token
- **operationId:** `reactions_list`

Query reactions filtered by target (post_id, story_id, or comment_id) and reaction criteria.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | string | no |  |
| `comment_id` | string(uuid) | no |  |
| `page` | integer | no | A page number within the paginated result set. |
| `page_size` | integer | no | Number of results to return per page. |
| `post_id` | string(uuid) | no |  |
| `reaction_item_id` | string(uuid) | no |  |
| `story_id` | string(uuid) | no |  |

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

## POST `/api/v1/reactions/`

**Create or toggle reaction on any target**

- **Auth:** Bearer JWT
- **operationId:** `reactions_create`

Creates, updates, or toggles off a reaction on a target specified in the request body.

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

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `status` | enum: `created` \| `updated` \| `removed` |  |
| `reaction` | ReactionDetail \| null |  |
| `target` | ReactionTargetMeta |  |
| `summary` | ReactionSummary |  |

</details>

---

## GET `/api/v1/reactions/comments/{comment_id}/`

**List reactions for a comment**

- **Auth:** public — no token
- **operationId:** `reactions_comments_list`

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

## POST `/api/v1/reactions/comments/{comment_id}/`

**React or toggle reaction on a comment**

- **Auth:** Bearer JWT
- **operationId:** `reactions_comments_create`

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

## DELETE `/api/v1/reactions/comments/{comment_id}/`

**Remove reaction from a comment**

- **Auth:** Bearer JWT
- **operationId:** `reactions_comments_destroy`

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

## GET `/api/v1/reactions/comments/{comment_id}/summary/`

**Get comment reactions summary**

- **Auth:** public — no token
- **operationId:** `reactions_comments_summary_retrieve`

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

## GET `/api/v1/reactions/items/`

**List available reaction items**

- **Auth:** public — no token
- **operationId:** `reactions_items_list`

Returns the active catalog of reactions (emojis, labels, and codes) including 😊 and 😆.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of ReactionItem |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `code` | string | read-only. |
| `emoji` | string | read-only. |
| `label` | string | read-only. |
| `order` | integer | read-only. |
| `is_active` | boolean | read-only. |

</details>

---

## GET `/api/v1/reactions/posts/{post_id}/`

**List reactions for a post**

- **Auth:** public — no token
- **operationId:** `reactions_posts_list`

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

## POST `/api/v1/reactions/posts/{post_id}/`

**React or toggle reaction on a post**

- **Auth:** Bearer JWT
- **operationId:** `reactions_posts_create`

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

## DELETE `/api/v1/reactions/posts/{post_id}/`

**Remove reaction from a post**

- **Auth:** Bearer JWT
- **operationId:** `reactions_posts_destroy`

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

## GET `/api/v1/reactions/posts/{post_id}/summary/`

**Get post reactions summary**

- **Auth:** public — no token
- **operationId:** `reactions_posts_summary_retrieve`

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

## GET `/api/v1/reactions/stories/{story_id}/`

**List reactions for a story**

- **Auth:** public — no token
- **operationId:** `reactions_stories_list`

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

## POST `/api/v1/reactions/stories/{story_id}/`

**React or toggle reaction on a story**

- **Auth:** Bearer JWT
- **operationId:** `reactions_stories_create`

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

## DELETE `/api/v1/reactions/stories/{story_id}/`

**Remove reaction from a story**

- **Auth:** Bearer JWT
- **operationId:** `reactions_stories_destroy`

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

## GET `/api/v1/reactions/stories/{story_id}/summary/`

**Get story reactions summary**

- **Auth:** public — no token
- **operationId:** `reactions_stories_summary_retrieve`

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

## GET `/api/v1/reactions/{reaction_id}/`

**Retrieve reaction details by ID**

- **Auth:** Bearer JWT
- **operationId:** `reactions_retrieve`

Direct lookup or deletion of a reaction by its primary UUID.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `reaction_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReactionDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `user_name` | string | read-only. |
| `user_avatar_url` | string \| null | read-only. |
| `owner_type` | string | read-only. |
| `gym_id` | string(uuid) \| null | read-only. |
| `gym_name` | string \| null | read-only. |
| `gym_avatar_url` | string \| null | read-only. |
| `reaction_item` | ReactionItem |  |
| `post_id` | string(uuid) \| null | read-only. |
| `story_id` | string(uuid) \| null | read-only. |
| `comment_id` | string(uuid) \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/reactions/{reaction_id}/`

**Delete reaction by ID**

- **Auth:** Bearer JWT
- **operationId:** `reactions_destroy`

Direct lookup or deletion of a reaction by its primary UUID.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `reaction_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReactionActionResponse |  |
| `403` | ErrorDetail |  |
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
