# User Settings

2 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/users/settings/`

**Retrieve User Settings**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_retrieve`

### Summary
Retrieves comprehensive personal profile settings for the authenticated user, covering Display Preferences, Privacy & Audience visibility, and Account Lifecycle status.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: Authenticated personal account context.

### Success Response
Returns the current `UserSetting` state including personal display choices (language, video autoplay, dark mode), audience privacy rules (who can follow, who can message, follower/following visibility), and account status timestamps.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSetting | User settings retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `language` | string | Display language (e.g. en, bn). |
| `video_autoplay` | boolean | Video Autoplay (ON/OFF). |
| `dark_mode` | boolean | Dark Mode (ON/OFF). |
| `two_factor_enabled` | boolean | read-only. Two Factor Authentication (ON/OFF). |
| `is_private` | boolean | read-only. |
| `require_follow_approval` | boolean | If True, followers must be confirmed before they can follow this user. |
| `who_can_follow` | enum: `everyone` \| `friends_of_friends` |  |
| `who_can_follow_me` | string | read-only. |
| `who_can_message` | enum: `everyone` \| `followers` \| `no_one` |  |
| `who_can_see_followers` | enum: `everyone` \| `followers` \| `private` |  |
| `who_can_see_following` | enum: `everyone` \| `followers` \| `private` |  |
| `is_deactivated` | boolean | Whether the user profile is deactivated. |
| `deactivated_at` | string(date-time) \| null | read-only. Timestamp when the user account was deactivated. |
| `is_deleted` | boolean | Soft-delete flag for user account. |
| `deleted_at` | string(date-time) \| null | read-only. Timestamp when the user account was soft-deleted. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/users/settings/`

**Update User Settings**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_partial_update`

### Summary
Updates display preferences, privacy policies, audience rules, or private profile status for the authenticated user.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: User can only modify their own settings (strict tenant isolation).

### Request Fields
- `language` (optional, string, max 20 chars): Display language code (e.g. `'en'`, `'es'`).
- `video_autoplay` (optional, boolean): Video Autoplay toggle (ON/OFF).
- `dark_mode` (optional, boolean): Dark mode theme toggle (ON/OFF).
- `is_private` (optional, boolean): Sets account visibility to private profile.
- `require_follow_approval` (optional, boolean): Require confirmation before someone can follow you.
- `who_can_follow` (optional, enum): `'everyone'`, `'friends_of_friends'`.
- `who_can_follow_me` (optional, enum): Alias for `who_can_follow`.
- `who_can_message` (optional, enum): `'everyone'`, `'followers'`, `'no_one'`. Default is `'followers'`.
- `who_can_see_followers` (optional, enum): `'everyone'`, `'followers'`, `'private'`.
- `who_can_see_following` (optional, enum): `'everyone'`, `'followers'`, `'private'`.

### Error Responses
- `400 Bad Request`: Validation failure or invalid enum value.
- `401 Unauthorized`: Missing or invalid credentials.

**Request body** — `application/json` (PatchedUserSettingUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `language` | string | no |  |
| `video_autoplay` | boolean | no | Video Autoplay (ON/OFF). |
| `dark_mode` | boolean | no |  |
| `is_private` | boolean | no | Toggle private profile state. |
| `require_follow_approval` | boolean | no | Require approval before someone can follow you. |
| `who_can_follow` | enum: `everyone` \| `friends_of_friends` | no |  |
| `who_can_follow_me` | enum: `everyone` \| `friends_of_friends` | no |  |
| `who_can_message` | enum: `everyone` \| `followers` \| `no_one` | no |  |
| `who_can_see_followers` | enum: `everyone` \| `followers` \| `private` | no |  |
| `who_can_see_following` | enum: `everyone` \| `followers` \| `private` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSetting | User settings updated successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user_id` | string(uuid) | read-only. |
| `language` | string | Display language (e.g. en, bn). |
| `video_autoplay` | boolean | Video Autoplay (ON/OFF). |
| `dark_mode` | boolean | Dark Mode (ON/OFF). |
| `two_factor_enabled` | boolean | read-only. Two Factor Authentication (ON/OFF). |
| `is_private` | boolean | read-only. |
| `require_follow_approval` | boolean | If True, followers must be confirmed before they can follow this user. |
| `who_can_follow` | enum: `everyone` \| `friends_of_friends` |  |
| `who_can_follow_me` | string | read-only. |
| `who_can_message` | enum: `everyone` \| `followers` \| `no_one` |  |
| `who_can_see_followers` | enum: `everyone` \| `followers` \| `private` |  |
| `who_can_see_following` | enum: `everyone` \| `followers` \| `private` |  |
| `is_deactivated` | boolean | Whether the user profile is deactivated. |
| `deactivated_at` | string(date-time) \| null | read-only. Timestamp when the user account was deactivated. |
| `is_deleted` | boolean | Soft-delete flag for user account. |
| `deleted_at` | string(date-time) \| null | read-only. Timestamp when the user account was soft-deleted. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
