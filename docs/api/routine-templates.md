# Routine Templates

6 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/routine-templates/`

**List Routine Templates**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_list`

Retrieves gym routine templates filtered by format, level, fitness goals, and search keyword.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `goal` | string | no |  |
| `gym_id` | string | no |  |
| `level` | string | no |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `routine_format` | string | no |  |
| `search` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of RoutineTemplateList |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `template_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `goals` | array of object | read-only. |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `total_exercises_count` | integer | read-only. |
| `created_by_staff_id` | string(uuid) \| null | read-only. |
| `created_by_staff_name` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/routine-templates/`

**Create Routine Template**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_create`

Atomically provisions a reusable workout routine template with nested days/sessions and exercises.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (RoutineTemplateCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `template_name` | string | yes |  |
| `routine_format` | enum: `weekly` \| `session_based` | no |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` | no |  |
| `notes` | string \| null | no |  |
| `goals` | array of `general_fitness` \| `strength` \| `muscle_gain` \| `weight_loss` \| `other` | no |  |
| `days` | array of DayInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | RoutineTemplateDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `template_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `goals` | array of object | read-only. |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `total_exercises_count` | integer | read-only. |
| `created_by_staff_id` | string(uuid) \| null | read-only. |
| `created_by_staff_name` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of RoutineTemplateDay | read-only. |

</details>

---

## GET `/api/v1/routine-templates/{template_id}/`

**Get Routine Template Dossier**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_retrieve`

Retrieves a complete routine template with all nested workout days/sessions and exercises.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `template_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RoutineTemplateDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `template_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `goals` | array of object | read-only. |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `total_exercises_count` | integer | read-only. |
| `created_by_staff_id` | string(uuid) \| null | read-only. |
| `created_by_staff_name` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of RoutineTemplateDay | read-only. |

</details>

---

## PUT `/api/v1/routine-templates/{template_id}/`

**Full Update Routine Template**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_update`

Overwrites routine template metadata and replaces days/exercises layout.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `template_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (RoutineTemplateUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `template_name` | string | no |  |
| `routine_format` | enum: `weekly` \| `session_based` | no |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` | no |  |
| `notes` | string \| null | no |  |
| `goals` | array of `general_fitness` \| `strength` \| `muscle_gain` \| `weight_loss` \| `other` | no |  |
| `days` | array of DayInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RoutineTemplateDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `template_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `goals` | array of object | read-only. |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `total_exercises_count` | integer | read-only. |
| `created_by_staff_id` | string(uuid) \| null | read-only. |
| `created_by_staff_name` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of RoutineTemplateDay | read-only. |

</details>

---

## PATCH `/api/v1/routine-templates/{template_id}/`

**Partial Update Routine Template**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_partial_update`

Updates specific fields of a routine template without modifying omitted fields.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `template_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PatchedRoutineTemplateUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `template_name` | string | no |  |
| `routine_format` | enum: `weekly` \| `session_based` | no |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` | no |  |
| `notes` | string \| null | no |  |
| `goals` | array of `general_fitness` \| `strength` \| `muscle_gain` \| `weight_loss` \| `other` | no |  |
| `days` | array of DayInputRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | RoutineTemplateDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `template_name` | string |  |
| `routine_format` | enum: `weekly` \| `session_based` |  |
| `level` | enum: `beginner` \| `intermediate` \| `advanced` |  |
| `goals` | array of object | read-only. |
| `notes` | string \| null |  |
| `days_count` | integer | read-only. |
| `total_exercises_count` | integer | read-only. |
| `created_by_staff_id` | string(uuid) \| null | read-only. |
| `created_by_staff_name` | string \| null | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `days` | array of RoutineTemplateDay | read-only. |

</details>

---

## DELETE `/api/v1/routine-templates/{template_id}/`

**Delete Routine Template**

- **Auth:** Bearer JWT
- **operationId:** `routine_templates_destroy`

Removes a routine template if it is not currently actively prescribed to members.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `template_id` | string(uuid) | yes |  |

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
| `409` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
