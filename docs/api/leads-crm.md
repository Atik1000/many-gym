# Leads CRM

12 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/leads/`

**List Leads**

- **Auth:** Bearer JWT
- **operationId:** `leads_list`

Retrieves the gym leads directory with stage, source, staff filters, search, and pagination.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `assigned_staff_id` | string | no |  |
| `gym_id` | string | no |  |
| `interested_plan_id` | string | no |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `search` | string | no |  |
| `source` | string | no |  |
| `stage` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of LeadList |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `first_name` | string |  |
| `last_name` | string \| null |  |
| `full_name` | string | read-only. |
| `phone` | string \| null |  |
| `email` | any \| null |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` |  |
| `expected_start_date` | string(date) \| null |  |
| `trial_booked_at` | string(date-time) \| null |  |
| `not_joining_reason_standard` | any \| null |  |
| `not_joining_custom_reason` | string | read-only. |
| `interested_plan` | string | read-only. |
| `assigned_staff` | string | read-only. |
| `converted_member` | string | read-only. |
| `fitness_goals` | array of object | read-only. |
| `pending_next_moves_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/leads/`

**Create Lead**

- **Auth:** Bearer JWT
- **operationId:** `leads_create`

Captures a new prospective gym lead with contact information, fitness goals, and initial note.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (LeadCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | yes |  |
| `last_name` | string \| null | no |  |
| `phone` | string \| null | no |  |
| `email` | any \| null | no |  |
| `interested_plan_id` | string(uuid) \| null | no |  |
| `assigned_staff_id` | string(uuid) \| null | no |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` | no |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` | no |  |
| `expected_start_date` | string(date) \| null | no |  |
| `trial_booked_at` | string(date-time) \| null | no |  |
| `not_joining_reason_standard` | any \| null | no |  |
| `not_joining_custom_reason_id` | string(uuid) \| null | no |  |
| `fitness_goals` | array of `general_fitness` \| `strength` \| `muscle_gain` \| `weight_loss` \| `other` | no |  |
| `initial_note` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | LeadDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `first_name` | string |  |
| `last_name` | string \| null |  |
| `full_name` | string | read-only. |
| `phone` | string \| null |  |
| `email` | any \| null |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` |  |
| `expected_start_date` | string(date) \| null |  |
| `trial_booked_at` | string(date-time) \| null |  |
| `not_joining_reason_standard` | any \| null |  |
| `not_joining_custom_reason` | string | read-only. |
| `interested_plan` | string | read-only. |
| `assigned_staff` | string | read-only. |
| `converted_member` | string | read-only. |
| `fitness_goals` | array of object | read-only. |
| `pending_next_moves_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `next_moves` | array of LeadNextMove | read-only. |
| `notes` | array of LeadNote | read-only. |

</details>

---

## GET `/api/v1/leads/metrics/`

**Lead Pipeline Metrics**

- **Auth:** Bearer JWT
- **operationId:** `leads_metrics_retrieve`

Aggregated pipeline analytics including stage counts, conversion rate, and pending next moves.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LeadMetrics |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `total_leads` | integer |  |
| `new` | integer |  |
| `contacted` | integer |  |
| `visit_trial_booked` | integer |  |
| `joined` | integer |  |
| `not_joining` | integer |  |
| `conversion_rate_percentage` | number(double) |  |
| `pending_next_moves_count` | integer |  |

</details>

---

## GET `/api/v1/leads/reasons/`

**List Lost Reasons**

- **Auth:** Bearer JWT
- **operationId:** `leads_reasons_retrieve`

Retrieves both standard system lost reasons and gym-specific custom reasons.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | ReasonsDirectory |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `standard_reasons` | array of object |  |
| `custom_reasons` | array of LeadCustomReason |  |

</details>

---

## POST `/api/v1/leads/reasons/`

**Create Custom Lost Reason**

- **Auth:** Bearer JWT
- **operationId:** `leads_reasons_create`

Configures a new gym-specific custom reason for lost lead classifications.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (LeadCustomReasonCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason_name` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | LeadCustomReason |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `reason_name` | string |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/leads/{lead_id}/`

**Get Lead Dossier**

- **Auth:** Bearer JWT
- **operationId:** `leads_retrieve`

Retrieves detailed lead dossier including action items (next moves), staff notes, and goals.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LeadDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `first_name` | string |  |
| `last_name` | string \| null |  |
| `full_name` | string | read-only. |
| `phone` | string \| null |  |
| `email` | any \| null |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` |  |
| `expected_start_date` | string(date) \| null |  |
| `trial_booked_at` | string(date-time) \| null |  |
| `not_joining_reason_standard` | any \| null |  |
| `not_joining_custom_reason` | string | read-only. |
| `interested_plan` | string | read-only. |
| `assigned_staff` | string | read-only. |
| `converted_member` | string | read-only. |
| `fitness_goals` | array of object | read-only. |
| `pending_next_moves_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `next_moves` | array of LeadNextMove | read-only. |
| `notes` | array of LeadNote | read-only. |

</details>

---

## PATCH `/api/v1/leads/{lead_id}/`

**Update Lead**

- **Auth:** Bearer JWT
- **operationId:** `leads_partial_update`

Updates lead contact info, interested plan, staff assignment, pipeline stage, or fitness goals.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PatchedLeadUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | no |  |
| `last_name` | string \| null | no |  |
| `phone` | string \| null | no |  |
| `email` | any \| null | no |  |
| `interested_plan_id` | string(uuid) \| null | no |  |
| `assigned_staff_id` | string(uuid) \| null | no |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` | no |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` | no |  |
| `expected_start_date` | string(date) \| null | no |  |
| `trial_booked_at` | string(date-time) \| null | no |  |
| `not_joining_reason_standard` | any \| null | no |  |
| `not_joining_custom_reason_id` | string(uuid) \| null | no |  |
| `fitness_goals` | array of `general_fitness` \| `strength` \| `muscle_gain` \| `weight_loss` \| `other` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LeadDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `first_name` | string |  |
| `last_name` | string \| null |  |
| `full_name` | string | read-only. |
| `phone` | string \| null |  |
| `email` | any \| null |  |
| `stage` | enum: `new` \| `contacted` \| `visit_trial_booked` \| `joined` \| `not_joining` |  |
| `source` | enum: `walk_in` \| `phone` \| `social_media` \| `referral` \| `website` \| `other` |  |
| `expected_start_date` | string(date) \| null |  |
| `trial_booked_at` | string(date-time) \| null |  |
| `not_joining_reason_standard` | any \| null |  |
| `not_joining_custom_reason` | string | read-only. |
| `interested_plan` | string | read-only. |
| `assigned_staff` | string | read-only. |
| `converted_member` | string | read-only. |
| `fitness_goals` | array of object | read-only. |
| `pending_next_moves_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |
| `next_moves` | array of LeadNextMove | read-only. |
| `notes` | array of LeadNote | read-only. |

</details>

---

## DELETE `/api/v1/leads/{lead_id}/`

**Delete Lead**

- **Auth:** Bearer JWT
- **operationId:** `leads_destroy`

Permanently deletes an unjoined lead record from the CRM.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

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

## POST `/api/v1/leads/{lead_id}/convert/`

**Convert Lead to Member**

- **Auth:** Bearer JWT
- **operationId:** `leads_convert_create`

Atomically provisions a Member dossier, assigns membership plan, triggers onboarding invitation, and marks lead as joined.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (LeadConvertToMemberRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `plan_id` | string(uuid) \| null | no |  |
| `last_name` | string \| null | no |  |
| `member_email` | any \| null | no |  |
| `assigned_trainer_id` | string(uuid) \| null | no |  |
| `start_date` | string(date) \| null | no |  |
| `end_date` | string(date) \| null | no |  |
| `extra_amenity_ids` | array of string | no |  |
| `initial_payment_amount` | string(decimal) \| null | no |  |
| `initial_payment_method` | any \| null | no |  |
| `initial_payment_date` | string(date) \| null | no |  |
| `initial_payment_notes` | string \| null | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string \| null | no |  |
| `nationality` | string \| null | no |  |
| `emergency_contact_name` | string \| null | no |  |
| `emergency_contact_phone` | string \| null | no |  |
| `emergency_contact_relationship` | string \| null | no |  |
| `address` | string \| null | no |  |
| `city` | string \| null | no |  |
| `country` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | object | Lead converted successfully. |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |
| `409` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `member_id` | string(uuid) |  |
| `lead_id` | string(uuid) |  |

</details>

---

## POST `/api/v1/leads/{lead_id}/next-moves/`

**Schedule Next Move**

- **Auth:** Bearer JWT
- **operationId:** `leads_next_moves_create`

Adds a scheduled action item or follow-up task to a lead's agenda.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (LeadNextMoveCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `scheduled_date` | string(date) | yes |  |
| `short_description` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | LeadNextMove |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `lead_id` | string(uuid) | read-only. |
| `scheduled_date` | string(date) |  |
| `short_description` | string |  |
| `is_completed` | boolean |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/leads/{lead_id}/next-moves/{move_id}/`

**Update Next Move**

- **Auth:** Bearer JWT
- **operationId:** `leads_next_moves_partial_update`

Updates scheduled date, description, or marks the action item as completed.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |
| `move_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (PatchedLeadNextMoveUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `is_completed` | boolean | no |  |
| `scheduled_date` | string(date) | no |  |
| `short_description` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | LeadNextMove |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `lead_id` | string(uuid) | read-only. |
| `scheduled_date` | string(date) |  |
| `short_description` | string |  |
| `is_completed` | boolean |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/leads/{lead_id}/notes/`

**Add Lead Note**

- **Auth:** Bearer JWT
- **operationId:** `leads_notes_create`

Records an internal staff note or call summary on the prospective lead.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `lead_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (LeadNoteCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `note_text` | string | yes |  |
| `author_staff_id` | string(uuid) \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | LeadNote |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `lead_id` | string(uuid) | read-only. |
| `author_staff_id` | string(uuid) \| null | read-only. |
| `author_name` | string | read-only. |
| `note_text` | string |  |
| `created_at` | string(date-time) | read-only. |

</details>

---
