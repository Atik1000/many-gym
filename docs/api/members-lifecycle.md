# Members & Lifecycle

8 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/members/`

**List Gym Members**

- **Auth:** Bearer JWT
- **operationId:** `members_list`

Retrieves the member directory with search, filters (status, payment, trainer), and pagination.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `assigned_trainer_id` | string | no |  |
| `gym_id` | string | no |  |
| `joining_status` | string | no |  |
| `membership_status` | string | no |  |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `payment_status` | string | no |  |
| `search` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of MemberList |  |
| `400` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `full_name` | string | read-only. |
| `first_name` | string |  |
| `last_name` | string |  |
| `email` | string(email) |  |
| `phone` | string \| null |  |
| `profile_photo_url` | string \| null |  |
| `joining_status` | enum: `sent_invitation` \| `joined` |  |
| `current_plan_name` | string \| null | read-only. |
| `membership_status` | string \| null | read-only. |
| `payment_status` | string \| null | read-only. |
| `expiry_date` | string \| null | read-only. |
| `assigned_trainer` | object | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/members/`

**Create / Onboard Member**

- **Auth:** Bearer JWT
- **operationId:** `members_create`

### Summary
Creates a new member profile, dispatches onboarding invitation email, and sets up initial subscription/payment.

### File Upload Specifications (`profile_photo`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB.
- **Processing Behavior**: Synchronous. Camera/smartphone EXIF orientation is automatically corrected (prevents rotated/sideways photos), and the image is converted directly to optimized WebP (`.webp`) format with an accompanying thumbnail.
- **Alternative**: An existing external image URL can be passed via `profile_photo_url`.

**Request body** — `application/json` (MemberCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | yes |  |
| `last_name` | string | yes |  |
| `email` | string(email) | yes |  |
| `phone` | string \| null | no |  |
| `profile_photo_url` | string \| null | no |  |
| `profile_photo` | string(binary) \| null | no | Direct profile photo image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orient |
| `address` | string \| null | no |  |
| `city` | string \| null | no |  |
| `country` | string \| null | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string \| null | no |  |
| `nationality` | string \| null | no |  |
| `emergency_contact_name` | string \| null | no |  |
| `emergency_contact_phone` | string \| null | no |  |
| `emergency_contact_relationship` | string \| null | no |  |
| `assigned_trainer_id` | string(uuid) \| null | no |  |
| `internal_notes` | string \| null | no |  |
| `plan_id` | string(uuid) \| null | no |  |
| `start_date` | string(date) \| null | no |  |
| `end_date` | string(date) \| null | no |  |
| `extra_amenity_ids` | array of string | no |  |
| `initial_payment_amount` | string(decimal) \| null | no |  |
| `initial_payment_method` | any \| null | no |  |
| `initial_payment_date` | string(date) \| null | no |  |
| `initial_payment_notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | MemberDetail |  |
| `400` | ErrorDetail |  |
| `403` | ErrorDetail |  |

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

## POST `/api/v1/members/accept-invitation/`

**Accept Member Invitation**

- **Auth:** Bearer JWT
- **operationId:** `members_accept_invitation_create`

Links the active authenticated user account to the member profile using the invitation token.

**Request body** — `application/json` (MemberAcceptInvitationRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | no |  |
| `invitation_token` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberDetail |  |
| `400` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

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

## GET `/api/v1/members/metrics/`

**Get Member Directory Metrics**

- **Auth:** Bearer JWT
- **operationId:** `members_metrics_retrieve`

Returns total members, joined count, invited count, active subscriptions, unpaid count, and total revenue.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Aggregated member and subscription metrics. |

---

## GET `/api/v1/members/{member_id}/`

**Get Member Dossier**

- **Auth:** Bearer JWT
- **operationId:** `members_retrieve`

Retrieves full member profile, subscription history, extra amenities, and payment transactions.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

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

## PATCH `/api/v1/members/{member_id}/`

**Update Member Details**

- **Auth:** Bearer JWT
- **operationId:** `members_partial_update`

### Summary
Partially updates demographic information, emergency contact, assigned trainer, or profile photo.

### File Upload Specifications (`profile_photo`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB.
- **Processing Behavior**: Automatically corrects EXIF orientation and converts directly to WebP (`.webp`) format.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedMemberUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | no |  |
| `last_name` | string | no |  |
| `email` | string(email) | no |  |
| `phone` | string \| null | no |  |
| `profile_photo_url` | string \| null | no |  |
| `profile_photo` | string(binary) \| null | no | Direct profile photo image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orient |
| `address` | string \| null | no |  |
| `city` | string \| null | no |  |
| `country` | string \| null | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string \| null | no |  |
| `nationality` | string \| null | no |  |
| `emergency_contact_name` | string \| null | no |  |
| `emergency_contact_phone` | string \| null | no |  |
| `emergency_contact_relationship` | string \| null | no |  |
| `assigned_trainer_id` | string(uuid) \| null | no |  |
| `internal_notes` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MemberDetail |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

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

## DELETE `/api/v1/members/{member_id}/`

**Delete Member**

- **Auth:** Bearer JWT
- **operationId:** `members_destroy`

Permanently deletes member if no payments exist.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

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

## POST `/api/v1/members/{member_id}/resend-invitation/`

**Resend Onboarding Invitation**

- **Auth:** Bearer JWT
- **operationId:** `members_resend_invitation_create`

Regenerates an invitation token and sends onboarding confirmation email.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `member_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse |  |
| `400` | ErrorDetail |  |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
