# User Profile -> Social Links

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/users/profile/about/social-links/`

**List User Social Links**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_social_links_retrieve`

API endpoint for listing and creating social links for the authenticated user.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserSocialLink |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `platform` | enum: `facebook` \| `instagram` \| `twitter_x` \| `linkedin` \| `youtube` \| `tiktok` \| `github` \| `website` \| `other` |  |
| `link` | string |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/users/profile/about/social-links/`

**Create User Social Link**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_social_links_create`

API endpoint for listing and creating social links for the authenticated user.

**Request body** — `application/json` (UserSocialLinkInputRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string(uuid) \| null | no |  |
| `platform` | enum: `facebook` \| `instagram` \| `twitter_x` \| `linkedin` \| `youtube` \| `tiktok` \| `github` \| `website` \| `other` | yes |  |
| `link` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | UserSocialLink | Social link created. |
| `400` | ErrorDetail | Validation failure. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `platform` | enum: `facebook` \| `instagram` \| `twitter_x` \| `linkedin` \| `youtube` \| `tiktok` \| `github` \| `website` \| `other` |  |
| `link` | string |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/users/profile/about/social-links/{link_id}/`

**Update User Social Link**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_social_links_partial_update`

API endpoint for updating or deleting an individual social link.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `link_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedUserSocialLinkInputRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string(uuid) \| null | no |  |
| `platform` | enum: `facebook` \| `instagram` \| `twitter_x` \| `linkedin` \| `youtube` \| `tiktok` \| `github` \| `website` \| `other` | no |  |
| `link` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSocialLink | Social link updated. |
| `400` | ErrorDetail | Validation failure. |
| `404` | ErrorDetail | Record not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `platform` | enum: `facebook` \| `instagram` \| `twitter_x` \| `linkedin` \| `youtube` \| `tiktok` \| `github` \| `website` \| `other` |  |
| `link` | string |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/users/profile/about/social-links/{link_id}/`

**Delete User Social Link**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_social_links_destroy`

API endpoint for updating or deleting an individual social link.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `link_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Social link successfully deleted. |
| `404` | ErrorDetail | Record not found. |

---
