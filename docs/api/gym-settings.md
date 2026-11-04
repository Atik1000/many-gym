# Gym Settings

2 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/settings/`

**Retrieve Gym Settings**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_retrieve`

### Summary
Retrieves comprehensive gym workspace settings spanning Display preferences, Alert notification toggles, Audience & Sharing rules, and Access & Control lifecycle states.

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
| `200` | GymSetting | Gym settings retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `language` | string | Display language (e.g. en, bn). |
| `video_autoplay` | boolean | Video Autoplay (ON/OFF). |
| `dark_mode` | boolean | Dark Mode (ON/OFF). |
| `admin_logs_alerts` | boolean | Admin Logs alert notifications enabled (ON/OFF). |
| `issues_alerts` | boolean | Issues alert notifications enabled (ON/OFF). |
| `who_can_message` | enum: `everyone` \| `followers_and_members` \| `members_only` |  |
| `who_can_send_joining_request` | enum: `everyone` \| `no_one` |  |
| `who_can_see_members` | enum: `everyone` \| `only_members` |  |
| `who_can_see_followers` | enum: `everyone` \| `only_members` \| `private` |  |
| `who_can_see_following` | enum: `everyone` \| `only_members` \| `private` |  |
| `posts_age_restriction` | enum: `any_age` \| `17_plus` \| `18_plus` \| `19_plus` \| `20_plus` |  |
| `is_deactivated` | boolean | Whether the gym is deactivated. |
| `deactivated_at` | string(date-time) \| null | read-only. Timestamp when the gym was deactivated. |
| `is_published` | boolean | Whether the gym is published. |
| `unpublished_at` | string(date-time) \| null | read-only. Timestamp when the gym was unpublished. |
| `is_deleted` | boolean | Soft-delete flag for gym. |
| `deleted_at` | string(date-time) \| null | read-only. Timestamp when the gym was deleted. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/gyms/settings/`

**Update Gym Settings**

- **Auth:** Bearer JWT
- **operationId:** `gyms_settings_partial_update`

### Summary
Performs partial update (PATCH) of gym configuration settings across Display, Alerts, Audience, and Access & Control.

### Authorization & Scopes
- **Authentication**: Required (`Bearer <JWT>`).
- **Required Permission**: Gym Owner or active Gym Context Token with `gym_profile:edit` scope.

### Error Codes
- `400 Bad Request`: Payload validation error or invalid enum value.
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: User does not possess the required `gym_profile:edit` scope.
- `404 Not Found`: Target gym workspace not found.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Request body** — `application/json` (PatchedGymSettingUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `language` | string | no |  |
| `video_autoplay` | boolean | no |  |
| `dark_mode` | boolean | no |  |
| `admin_logs_alerts` | boolean | no |  |
| `issues_alerts` | boolean | no |  |
| `who_can_message` | enum: `everyone` \| `followers_and_members` \| `members_only` | no |  |
| `who_can_send_joining_request` | enum: `everyone` \| `no_one` | no |  |
| `who_can_see_members` | enum: `everyone` \| `only_members` | no |  |
| `who_can_see_followers` | enum: `everyone` \| `only_members` \| `private` | no |  |
| `who_can_see_following` | enum: `everyone` \| `only_members` \| `private` | no |  |
| `posts_age_restriction` | enum: `any_age` \| `17_plus` \| `18_plus` \| `19_plus` \| `20_plus` | no |  |
| `is_deactivated` | boolean | no |  |
| `is_published` | boolean | no |  |
| `is_deleted` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymSetting | Gym settings updated successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `language` | string | Display language (e.g. en, bn). |
| `video_autoplay` | boolean | Video Autoplay (ON/OFF). |
| `dark_mode` | boolean | Dark Mode (ON/OFF). |
| `admin_logs_alerts` | boolean | Admin Logs alert notifications enabled (ON/OFF). |
| `issues_alerts` | boolean | Issues alert notifications enabled (ON/OFF). |
| `who_can_message` | enum: `everyone` \| `followers_and_members` \| `members_only` |  |
| `who_can_send_joining_request` | enum: `everyone` \| `no_one` |  |
| `who_can_see_members` | enum: `everyone` \| `only_members` |  |
| `who_can_see_followers` | enum: `everyone` \| `only_members` \| `private` |  |
| `who_can_see_following` | enum: `everyone` \| `only_members` \| `private` |  |
| `posts_age_restriction` | enum: `any_age` \| `17_plus` \| `18_plus` \| `19_plus` \| `20_plus` |  |
| `is_deactivated` | boolean | Whether the gym is deactivated. |
| `deactivated_at` | string(date-time) \| null | read-only. Timestamp when the gym was deactivated. |
| `is_published` | boolean | Whether the gym is published. |
| `unpublished_at` | string(date-time) \| null | read-only. Timestamp when the gym was unpublished. |
| `is_deleted` | boolean | Soft-delete flag for gym. |
| `deleted_at` | string(date-time) \| null | read-only. Timestamp when the gym was deleted. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
