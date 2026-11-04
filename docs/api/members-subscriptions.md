# Members & Subscriptions

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/members/subscriptions/{subscription_id}/extra-amenities/`

**Attach Extra Amenities**

- **Auth:** Bearer JWT
- **operationId:** `members_subscriptions_extra_amenities_create`

Subscribes member to additional paid amenities (e.g. personal locker, sauna).

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `subscription_id` | string(uuid) | yes |  |

**Request body** — `application/json` (MemberExtraAmenitiesCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `amenity_ids` | array of string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | array of MemberExtraAmenity |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `amenity_id` | string(uuid) | read-only. |
| `name` | string | read-only. |
| `group_name` | string | read-only. |
| `extra_fee` | string(decimal) |  |
| `is_active` | boolean |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/subscriptions/{subscription_id}/payments/`

**Log Subscription Payment**

- **Auth:** Bearer JWT
- **operationId:** `members_subscriptions_payments_create`

Records a payment transaction against the subscription and recalculates payment standing.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `subscription_id` | string(uuid) | yes |  |

**Request body** — `application/json` (MemberPaymentCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | string(decimal) | yes |  |
| `payment_method` | enum: `cash` \| `credit_card` \| `debit_card` \| `bank_transfer` \| `mobile_pay` \| `other` | yes |  |
| `payment_date` | string(date) | no |  |
| `notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberPayment |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `amount` | string(decimal) |  |
| `payment_method` | enum: `cash` \| `credit_card` \| `debit_card` \| `bank_transfer` \| `mobile_pay` \| `other` |  |
| `payment_date` | string(date) |  |
| `is_initial_payment` | boolean |  |
| `notes` | string \| null |  |
| `created_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/members/subscriptions/{subscription_id}/status/`

**Transition Subscription Status**

- **Auth:** Bearer JWT
- **operationId:** `members_subscriptions_status_partial_update`

Transitions subscription state (active <-> paused, active/paused -> cancelled).

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `subscription_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedMemberSubscriptionStatusTransitionRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `membership_status` | enum: `scheduled` \| `active` \| `paused` \| `expired` \| `cancelled` | no |  |
| `status` | enum: `scheduled` \| `active` \| `paused` \| `expired` \| `cancelled` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberSubscriptionDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `plan_id` | string(uuid) | read-only. |
| `plan_name` | string | read-only. |
| `plan_type` | string | read-only. |
| `plan_price` | string(decimal) | read-only. |
| `joining_fee` | string(decimal) | read-only. |
| `membership_status` | enum: `scheduled` \| `active` \| `paused` \| `expired` \| `cancelled` |  |
| `payment_status` | enum: `fully_paid` \| `partially_paid` \| `unpaid` |  |
| `start_date` | string(date) |  |
| `end_date` | string(date) |  |
| `total_sessions` | integer \| null | Total available sessions for session-based plans. |
| `remaining_sessions` | integer \| null | Remaining sessions left to consume. |
| `total_cost` | string | read-only. |
| `total_paid` | string | read-only. |
| `extra_amenities` | array of MemberExtraAmenity | read-only. |
| `payments` | array of MemberPayment | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/{member_id}/subscriptions/`

**Attach Subscription to Member**

- **Auth:** Bearer JWT
- **operationId:** `members_subscriptions_create`

Attaches a new membership plan subscription, optional extra amenities, and initial payment.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Request body** — `application/json` (MemberSubscriptionCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `plan_id` | string(uuid) | yes |  |
| `start_date` | string(date) | no |  |
| `end_date` | string(date) \| null | no |  |
| `extra_amenity_ids` | array of string | no |  |
| `initial_payment_amount` | string(decimal) \| null | no |  |
| `initial_payment_method` | any \| null | no |  |
| `initial_payment_date` | string(date) \| null | no |  |
| `initial_payment_notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberSubscriptionDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `plan_id` | string(uuid) | read-only. |
| `plan_name` | string | read-only. |
| `plan_type` | string | read-only. |
| `plan_price` | string(decimal) | read-only. |
| `joining_fee` | string(decimal) | read-only. |
| `membership_status` | enum: `scheduled` \| `active` \| `paused` \| `expired` \| `cancelled` |  |
| `payment_status` | enum: `fully_paid` \| `partially_paid` \| `unpaid` |  |
| `start_date` | string(date) |  |
| `end_date` | string(date) |  |
| `total_sessions` | integer \| null | Total available sessions for session-based plans. |
| `remaining_sessions` | integer \| null | Remaining sessions left to consume. |
| `total_cost` | string | read-only. |
| `total_paid` | string | read-only. |
| `extra_amenities` | array of MemberExtraAmenity | read-only. |
| `payments` | array of MemberPayment | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
