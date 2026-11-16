# User Settings - Access & Control

1 endpoint. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/users/settings/access-control/`

**Perform Profile Access & Control Action**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_access_control_create`

### Summary
Executes administrative account lifecycle state transitions on the authenticated user profile.

### Actions & Workflow Rules
- `deactivate`: Temporarily suspend personal account. Revokes active session tokens.
- `reactivate`: Restore personal account from suspension. Restores `status=ACTIVE`.
- `delete`: Soft-delete personal user account. Requires valid `password` and `confirmation: "delete"`. Revokes all active session tokens.
- `restore`: Restore soft-deleted account. Requires valid `password`. Restores `status=ACTIVE`.

### Side Effects
- `deactivate` and `delete` immediately revoke all active `AuthToken` sessions.
- Deleted or deactivated accounts return structured reactivation/restoration notices upon subsequent login attempts.

### Error Responses
- `400 Bad Request`: Invalid action, incorrect password, or missing confirmation text.
- `401 Unauthorized`: Missing or invalid authentication token.

**Request body** — `application/json` (UserAccessControlActionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `action` | enum: `deactivate` \| `reactivate` \| `delete` \| `restore` | yes |  |
| `password` | string | no | Account password required for delete or restore confirmation. |
| `confirmation` | string | no | Confirmation keyword ('delete') required for delete confirmation. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSetting | Settings after state transition. |
| `400` | ErrorDetail | Validation failure or password confirmation mismatch. |
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
