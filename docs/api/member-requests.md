# Member Requests

11 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/{gym_id}/member-requests/`

**List Member Joining Requests**

- **Auth:** Bearer JWT
- **operationId:** `gyms_member_requests_retrieve`

Retrieves member joining requests for the gym with status filtering, keyword search, and pagination. Requires 'members:read' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `search` | string | no | Search by applicant name or email |
| `status` | string | no | Filter by status: pending, accepted, rejected, cancelled |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of MemberRequestList | Paginated member requests list. |
| `401` | ErrorDetail | Authentication credentials required. |
| `403` | ErrorDetail | Insufficient permissions. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/gyms/{gym_id}/member-requests/`

**Submit Member Joining Request**

- **Auth:** Bearer JWT
- **operationId:** `gyms_member_requests_create`

Sends a membership joining request from the authenticated user to the gym.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Request body** — `application/json` (MemberRequestCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `interested_plan_id` | string(uuid) \| null | no |  |
| `notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MessageResponse | Request submitted successfully. |
| `400` | ErrorDetail | Validation failure or already a member. |
| `403` | ErrorDetail | Gym does not accept requests or user is blocked. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/gyms/{gym_id}/member-requests/{request_id}/`

**Get Member Request Detail**

- **Auth:** Bearer JWT
- **operationId:** `gyms_member_requests_retrieve_2`

Fetches detailed information for a specific member joining request. Requires 'members:read' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRequestDetail | Request detail. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `rejection_reason` | string \| null |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/gyms/{gym_id}/member-requests/{request_id}/accept/`

**Accept Member Request**

- **Auth:** Bearer JWT
- **operationId:** `gyms_member_requests_accept_create`

Accepts a pending member request and enrolls the user as an active gym member with the provided subscription, trainer, payment, and demographic details. Requires 'members:edit' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (MemberRequestAcceptRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `plan_id` | string(uuid) \| null | no |  |
| `start_date` | string(date) \| null | no |  |
| `end_date` | string(date) \| null | no |  |
| `assigned_trainer_id` | string(uuid) \| null | no |  |
| `extra_amenity_ids` | array of string | no |  |
| `initial_payment_amount` | string(decimal) \| null | no |  |
| `initial_payment_method` | any \| null | no |  |
| `initial_payment_date` | string(date) \| null | no |  |
| `initial_payment_notes` | string \| null | no |  |
| `first_name` | any | no |  |
| `last_name` | any | no |  |
| `email` | any | no |  |
| `phone` | string \| null | no |  |
| `profile_photo` | string(binary) \| null | no |  |
| `profile_photo_url` | string \| null | no |  |
| `address` | string \| null | no |  |
| `city` | string \| null | no |  |
| `country` | string \| null | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string \| null | no |  |
| `nationality` | string \| null | no |  |
| `emergency_contact_name` | string \| null | no |  |
| `emergency_contact_phone` | string \| null | no |  |
| `emergency_contact_relationship` | string \| null | no |  |
| `internal_notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberDetail | Member created successfully from request. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Request or gym not found. |
| `409` | ErrorDetail | Request already processed or user already a member. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `user_id` | string(uuid) \| null | read-only. Linked user account once onboarding invitation is accepted. |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string | read-only. |
| `email` | string(email) |  |
| `phone` | string \| null |  |
| `profile_photo_url` | string \| null |  |
| `address` | string \| null |  |
| `city` | string \| null |  |
| `country` | string \| null |  |
| `date_of_birth` | string(date) \| null |  |
| `sex` | string \| null |  |
| `nationality` | string \| null |  |
| `emergency_contact_name` | string \| null |  |
| `emergency_contact_phone` | string \| null |  |
| `emergency_contact_relationship` | string \| null |  |
| `joining_status` | enum: `sent_invitation` \| `joined` |  |
| `invitation_sent_at` | string(date-time) \| null |  |
| `internal_notes` | string \| null |  |
| `assigned_trainer` | object | read-only. |
| `active_subscription` | object | read-only. |
| `subscriptions` | array of MemberSubscriptionDetail | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/gyms/{gym_id}/member-requests/{request_id}/reject/`

**Reject Member Request**

- **Auth:** Bearer JWT
- **operationId:** `gyms_member_requests_reject_create`

Rejects a pending member joining request with an optional reason. Requires 'members:edit' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (MemberRequestRejectRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `rejection_reason` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRequestDetail | Request rejected. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Not found. |
| `409` | ErrorDetail | Request already processed. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `rejection_reason` | string \| null |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/members/requests/`

**List Member Joining Requests**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_retrieve`

Retrieves member joining requests for the gym with status filtering, keyword search, and pagination. Requires 'members:read' permission.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `search` | string | no | Search by applicant name or email |
| `status` | string | no | Filter by status: pending, accepted, rejected, cancelled |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of MemberRequestList | Paginated member requests list. |
| `401` | ErrorDetail | Authentication credentials required. |
| `403` | ErrorDetail | Insufficient permissions. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/requests/`

**Submit Member Joining Request**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_create`

Sends a membership joining request from the authenticated user to the gym.

**Request body** — `application/json` (MemberRequestCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `interested_plan_id` | string(uuid) \| null | no |  |
| `notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MessageResponse | Request submitted successfully. |
| `400` | ErrorDetail | Validation failure or already a member. |
| `403` | ErrorDetail | Gym does not accept requests or user is blocked. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/members/requests/{request_id}/`

**Get Member Request Detail**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_retrieve_2`

Fetches detailed information for a specific member joining request. Requires 'members:read' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRequestDetail | Request detail. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `rejection_reason` | string \| null |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/requests/{request_id}/accept/`

**Accept Member Request**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_accept_create`

Accepts a pending member request and enrolls the user as an active gym member with the provided subscription, trainer, payment, and demographic details. Requires 'members:edit' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (MemberRequestAcceptRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `plan_id` | string(uuid) \| null | no |  |
| `start_date` | string(date) \| null | no |  |
| `end_date` | string(date) \| null | no |  |
| `assigned_trainer_id` | string(uuid) \| null | no |  |
| `extra_amenity_ids` | array of string | no |  |
| `initial_payment_amount` | string(decimal) \| null | no |  |
| `initial_payment_method` | any \| null | no |  |
| `initial_payment_date` | string(date) \| null | no |  |
| `initial_payment_notes` | string \| null | no |  |
| `first_name` | any | no |  |
| `last_name` | any | no |  |
| `email` | any | no |  |
| `phone` | string \| null | no |  |
| `profile_photo` | string(binary) \| null | no |  |
| `profile_photo_url` | string \| null | no |  |
| `address` | string \| null | no |  |
| `city` | string \| null | no |  |
| `country` | string \| null | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string \| null | no |  |
| `nationality` | string \| null | no |  |
| `emergency_contact_name` | string \| null | no |  |
| `emergency_contact_phone` | string \| null | no |  |
| `emergency_contact_relationship` | string \| null | no |  |
| `internal_notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberDetail | Member created successfully from request. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Request or gym not found. |
| `409` | ErrorDetail | Request already processed or user already a member. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `user_id` | string(uuid) \| null | read-only. Linked user account once onboarding invitation is accepted. |
| `first_name` | string |  |
| `last_name` | string |  |
| `full_name` | string | read-only. |
| `email` | string(email) |  |
| `phone` | string \| null |  |
| `profile_photo_url` | string \| null |  |
| `address` | string \| null |  |
| `city` | string \| null |  |
| `country` | string \| null |  |
| `date_of_birth` | string(date) \| null |  |
| `sex` | string \| null |  |
| `nationality` | string \| null |  |
| `emergency_contact_name` | string \| null |  |
| `emergency_contact_phone` | string \| null |  |
| `emergency_contact_relationship` | string \| null |  |
| `joining_status` | enum: `sent_invitation` \| `joined` |  |
| `invitation_sent_at` | string(date-time) \| null |  |
| `internal_notes` | string \| null |  |
| `assigned_trainer` | object | read-only. |
| `active_subscription` | object | read-only. |
| `subscriptions` | array of MemberSubscriptionDetail | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/requests/{request_id}/cancel/`

**Cancel Own Member Request**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_cancel_create`

Allows an applicant user to cancel their own pending join request.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Request cancelled successfully. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Request not found. |
| `409` | ErrorDetail | Cannot cancel non-pending request. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/members/requests/{request_id}/reject/`

**Reject Member Request**

- **Auth:** Bearer JWT
- **operationId:** `members_requests_reject_create`

Rejects a pending member joining request with an optional reason. Requires 'members:edit' permission.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no |  |

**Request body** — `application/json` (MemberRequestRejectRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `rejection_reason` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberRequestDetail | Request rejected. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Not found. |
| `409` | ErrorDetail | Request already processed. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `user` | MemberRequestUser |  |
| `interested_plan` | MemberRequestPlan |  |
| `notes` | string \| null |  |
| `status` | enum: `pending` \| `accepted` \| `rejected` \| `cancelled` |  |
| `rejection_reason` | string \| null |  |
| `created_member_id` | string(uuid) \| null | read-only. |
| `reviewed_by_name` | string \| null | read-only. |
| `reviewed_at` | string(date-time) \| null |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
