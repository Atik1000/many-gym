# Membership Plans

8 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/plans/`

**List Gym Membership Plans**

- **Auth:** Bearer JWT
- **operationId:** `plans_list`

Retrieves a list of membership plans for the gym, with optional filtering by status and type.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target gym UUID (if not inferred from active gym JWT context). |
| `plan_status` | string | no | Filter by plan status ('draft', 'active', 'archived'). |
| `plan_type` | string | no | Filter by plan type ('time_based', 'session_based'). |
| `search` | string | no | Search keyword matching plan name or description. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of MembershipPlanList |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `included_amenities_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/plans/`

**Create Membership Plan (5-Step Lifecycle)**

- **Auth:** Bearer JWT
- **operationId:** `plans_create`

Creates a new 5-step membership plan with pricing, duration, payment schedule, and bundled amenities.

**Request body** — `application/json` (MembershipPlanCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `description` | string \| null | no |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` | no |  |
| `plan_type` | enum: `time_based` \| `session_based` | yes |  |
| `price` | string(decimal) | yes |  |
| `duration_value` | integer | yes |  |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` | yes |  |
| `joining_fee` | string(decimal) | no |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` | no |  |
| `installment_schedule_config` | any \| null | no |  |
| `cancellation_policy` | string \| null | no |  |
| `refund_policy` | string \| null | no |  |
| `included_amenity_ids` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MembershipPlanDetail |  |
| `400` | ErrorDetail |  |
| `401` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `installment_schedule_config` | any \| null | Configuration parameters for installment payments if payment_schedule is instalments |
| `included_amenities` | array of PlanIncludedAmenity | read-only. |
| `included_amenity_ids` | array of string | read-only. |
| `cancellation_policy` | string \| null |  |
| `refund_policy` | string \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/plans/metrics/`

**Get Gym Plan Pricing Metrics**

- **Auth:** Bearer JWT
- **operationId:** `plans_metrics_retrieve`

Returns aggregated metrics (count by status, count by type, average, min, max price) in a single database query.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Aggregated pricing and count metrics. |

---

## GET `/api/v1/plans/{plan_id}/`

**Get Membership Plan Details**

- **Auth:** Bearer JWT
- **operationId:** `plans_retrieve`

Retrieves full 5-step details of a membership plan including included amenities.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MembershipPlanDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `installment_schedule_config` | any \| null | Configuration parameters for installment payments if payment_schedule is instalments |
| `included_amenities` | array of PlanIncludedAmenity | read-only. |
| `included_amenity_ids` | array of string | read-only. |
| `cancellation_policy` | string \| null |  |
| `refund_policy` | string \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/plans/{plan_id}/`

**Update Membership Plan**

- **Auth:** Bearer JWT
- **operationId:** `plans_partial_update`

Partially updates plan fields. If active subscriptions exist, pricing/duration are locked.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedMembershipPlanUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no |  |
| `description` | string \| null | no |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` | no |  |
| `plan_type` | enum: `time_based` \| `session_based` | no |  |
| `price` | string(decimal) | no |  |
| `duration_value` | integer | no |  |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` | no |  |
| `joining_fee` | string(decimal) | no |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` | no |  |
| `installment_schedule_config` | any \| null | no |  |
| `cancellation_policy` | string \| null | no |  |
| `refund_policy` | string \| null | no |  |
| `included_amenity_ids` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MembershipPlanDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `installment_schedule_config` | any \| null | Configuration parameters for installment payments if payment_schedule is instalments |
| `included_amenities` | array of PlanIncludedAmenity | read-only. |
| `included_amenity_ids` | array of string | read-only. |
| `cancellation_policy` | string \| null |  |
| `refund_policy` | string \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/plans/{plan_id}/`

**Delete Membership Plan**

- **Auth:** Bearer JWT
- **operationId:** `plans_destroy`

Permanently deletes draft plans without subscriptions, or archives active plans.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse |  |
| `404` | ErrorDetail |  |
| `409` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## PUT `/api/v1/plans/{plan_id}/amenities/`

**Sync Included Amenities**

- **Auth:** Bearer JWT
- **operationId:** `plans_amenities_update`

Synchronizes the list of free and paid amenities bundled with the membership plan.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PlanSyncAmenitiesRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `amenity_ids` | array of string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MembershipPlanDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `installment_schedule_config` | any \| null | Configuration parameters for installment payments if payment_schedule is instalments |
| `included_amenities` | array of PlanIncludedAmenity | read-only. |
| `included_amenity_ids` | array of string | read-only. |
| `cancellation_policy` | string \| null |  |
| `refund_policy` | string \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/plans/{plan_id}/status/`

**Transition Membership Plan Status**

- **Auth:** Bearer JWT
- **operationId:** `plans_status_create`

Transitions plan between draft, active, and archived states with validation.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PlanStatusTransitionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `plan_status` | enum: `draft` \| `active` \| `archived` | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MembershipPlanDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `name` | string |  |
| `description` | string \| null |  |
| `plan_status` | enum: `draft` \| `active` \| `archived` |  |
| `plan_type` | enum: `time_based` \| `session_based` |  |
| `price` | string(decimal) |  |
| `duration_value` | integer | e.g. 3 for 3 months or 10 for 10 sessions |
| `duration_unit` | enum: `day` \| `week` \| `month` \| `session` |  |
| `duration_display` | string | read-only. |
| `joining_fee` | string(decimal) |  |
| `payment_schedule` | enum: `full_payment` \| `instalments` |  |
| `installment_schedule_config` | any \| null | Configuration parameters for installment payments if payment_schedule is instalments |
| `included_amenities` | array of PlanIncludedAmenity | read-only. |
| `included_amenity_ids` | array of string | read-only. |
| `cancellation_policy` | string \| null |  |
| `refund_policy` | string \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
