# Member Workouts

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/members/{member_id}/routines/`

**List Member Routines**

- **Auth:** Bearer JWT
- **operationId:** `members_routines_list`

Retrieves the current active workout routine and routine history for a gym member.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of MemberRoutineDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `member_id` | string(uuid) | read-only. |
| `source_template_id` | string(uuid) \| null | read-only. |
| `source_template_name` | string \| null | read-only. |
| `routine_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `is_active` | boolean |  |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `prescribed_by_staff_id` | string(uuid) \| null | read-only. |
| `prescribed_by_staff_name` | string \| null | read-only. |
| `assigned_at` | string(date-time) |  |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of MemberRoutineDay | read-only. |

</details>

---

## POST `/api/v1/members/{member_id}/routines/assign/`

**Assign Routine to Member**

- **Auth:** Bearer JWT
- **operationId:** `members_routines_assign_create`

Prescribes a template or custom workout routine to a member, deactivating any existing active routine.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (MemberRoutineAssignRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `source_template_id` | string(uuid) \| null | no |  |
| `routine_name` | string \| null | no |  |
| `routine_format` | any \| null | no |  |
| `level` | any \| null | no |  |
| `notes` | string \| null | no |  |
| `days` | array of DayInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberRoutineDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `member_id` | string(uuid) | read-only. |
| `source_template_id` | string(uuid) \| null | read-only. |
| `source_template_name` | string \| null | read-only. |
| `routine_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `is_active` | boolean |  |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `prescribed_by_staff_id` | string(uuid) \| null | read-only. |
| `prescribed_by_staff_name` | string \| null | read-only. |
| `assigned_at` | string(date-time) |  |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of MemberRoutineDay | read-only. |

</details>

---

## GET `/api/v1/members/{member_id}/routines/{routine_id}/`

**Get Member Routine Dossier**

- **Auth:** Bearer JWT
- **operationId:** `members_routines_retrieve`

Retrieves a specific member routine record with all exercises and workout days/sessions.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |
| `routine_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRoutineDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `member_id` | string(uuid) | read-only. |
| `source_template_id` | string(uuid) \| null | read-only. |
| `source_template_name` | string \| null | read-only. |
| `routine_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `is_active` | boolean |  |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `prescribed_by_staff_id` | string(uuid) \| null | read-only. |
| `prescribed_by_staff_name` | string \| null | read-only. |
| `assigned_at` | string(date-time) |  |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of MemberRoutineDay | read-only. |

</details>

---

## PATCH `/api/v1/members/{member_id}/routines/{routine_id}/`

**Customize Member Routine**

- **Auth:** Bearer JWT
- **operationId:** `members_routines_partial_update`

Allows assigned trainers to adjust exercises, sets, reps, notes, or active status specifically for that member.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |
| `routine_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PatchedMemberRoutineUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `routine_name` | string | no |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` | no |  |
| `notes` | string \| null | no |  |
| `is_active` | boolean | no |  |
| `days` | array of DayInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRoutineDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `member_id` | string(uuid) | read-only. |
| `source_template_id` | string(uuid) \| null | read-only. |
| `source_template_name` | string \| null | read-only. |
| `routine_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `is_active` | boolean |  |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `prescribed_by_staff_id` | string(uuid) \| null | read-only. |
| `prescribed_by_staff_name` | string \| null | read-only. |
| `assigned_at` | string(date-time) |  |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of MemberRoutineDay | read-only. |

</details>

---
