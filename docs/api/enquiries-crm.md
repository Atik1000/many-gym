# Enquiries CRM

7 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/enquiries/`

**List Enquiries**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_retrieve`

### Summary
Retrieves paginated enquiries. Only authorized staff and owners of the respective gym can view inquiries.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Filter by Gym UUID (User must be gym staff/owner). |
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `search` | string | no | Search by name, email, phone, or summary. |
| `status` | string | no | Filter by status (NEW, CONTACTED, VISIT, BOOKED). |
| `type` | string | no | Filter by type (GENERAL_INQUIRY, CALLBACK_REQUEST, COMPLAINT, EMERGENCY, SPECIAL_REQUEST). |
| `user_id` | string | no | Filter by registered Manygym User UUID. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedEnquiryListList | Paginated list of enquiries. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Staff permission required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of EnquiryList |  |

</details>

---

## POST `/api/v1/enquiries/`

**Create a New Enquiry**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_create`

### Summary
Creates a new Enquiry record for a gym. Any authenticated user can submit an enquiry.
- **Mandatory**: `gym_id`, `first_name`, `last_name`, and **either** `email` or `phone`.
- **Optional**: `manygym_user_id`, `type`, `status`, `summary`, `notes`.

**Request body** — `application/json` (EnquiryCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `gym_id` | string(uuid) | yes | Gym UUID to which this enquiry belongs (required). |
| `first_name` | string | yes | First name (required). |
| `last_name` | string | yes | Last name (required). |
| `email` | any \| null | no |  |
| `phone` | string \| null | no |  |
| `manygym_user_id` | string(uuid) \| null | no | Optional Manygym registered User ID. |
| `type` | string | no |  |
| `status` | string | no |  |
| `summary` | string | no |  |
| `notes` | array of string | no | Optional list of text notes. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | EnquiryDetail | Enquiry created successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `manygym_user` | ManygymUserSlim |  |
| `first_name` | string | First name of the person enquiring. |
| `last_name` | string | Last name of the person enquiring. |
| `full_name` | string | read-only. Returns the full name of the enquiring lead. |
| `email` | any \| null | Email address (mandatory if phone number is omitted). |
| `phone` | string \| null | Phone number (mandatory if email address is omitted). |
| `type` | enum: `GENERAL_INQUIRY` \| `CALLBACK_REQUEST` \| `COMPLAINT` \| `EMERGENCY` \| `SPECIAL_REQUEST` |  |
| `type_display` | string | read-only. |
| `status` | enum: `NEW` \| `CONTACTED` \| `VISIT` \| `BOOKED` |  |
| `status_display` | string | read-only. |
| `summary` | string | Summary or query description. |
| `notes` | any | Chronological list of text notes. |
| `notes_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/enquiries/{enquiry_id}/`

**View an Enquiry**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_retrieve_2`

Retrieves full details of a single enquiry by its UUID. Only staff of the respective gym can access.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `enquiry_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | EnquiryDetail | Enquiry details. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Staff permission required. |
| `404` | ErrorDetail | Enquiry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `manygym_user` | ManygymUserSlim |  |
| `first_name` | string | First name of the person enquiring. |
| `last_name` | string | Last name of the person enquiring. |
| `full_name` | string | read-only. Returns the full name of the enquiring lead. |
| `email` | any \| null | Email address (mandatory if phone number is omitted). |
| `phone` | string \| null | Phone number (mandatory if email address is omitted). |
| `type` | enum: `GENERAL_INQUIRY` \| `CALLBACK_REQUEST` \| `COMPLAINT` \| `EMERGENCY` \| `SPECIAL_REQUEST` |  |
| `type_display` | string | read-only. |
| `status` | enum: `NEW` \| `CONTACTED` \| `VISIT` \| `BOOKED` |  |
| `status_display` | string | read-only. |
| `summary` | string | Summary or query description. |
| `notes` | any | Chronological list of text notes. |
| `notes_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PUT `/api/v1/enquiries/{enquiry_id}/`

- **Auth:** Bearer JWT
- **operationId:** `enquiries_update`

API endpoint for viewing, updating, and deleting an individual enquiry.
Restricted to staff/owner of that specific gym.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `enquiry_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | No response body |

---

## PATCH `/api/v1/enquiries/{enquiry_id}/`

**Update an Enquiry**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_partial_update`

Updates fields of an existing enquiry (status, type, summary, contact info, notes). Staff only.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `enquiry_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedEnquiryUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | no |  |
| `last_name` | string | no |  |
| `email` | any \| null | no |  |
| `phone` | string \| null | no |  |
| `gym_id` | string(uuid) | no |  |
| `manygym_user_id` | string(uuid) \| null | no |  |
| `type` | string | no |  |
| `status` | string | no |  |
| `summary` | string | no |  |
| `notes` | array of string | no | Full replacement list of text notes. |
| `append_note` | string | no | Convenience parameter to append a single new text note. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | EnquiryDetail | Enquiry updated successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Staff permission required. |
| `404` | ErrorDetail | Enquiry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `manygym_user` | ManygymUserSlim |  |
| `first_name` | string | First name of the person enquiring. |
| `last_name` | string | Last name of the person enquiring. |
| `full_name` | string | read-only. Returns the full name of the enquiring lead. |
| `email` | any \| null | Email address (mandatory if phone number is omitted). |
| `phone` | string \| null | Phone number (mandatory if email address is omitted). |
| `type` | enum: `GENERAL_INQUIRY` \| `CALLBACK_REQUEST` \| `COMPLAINT` \| `EMERGENCY` \| `SPECIAL_REQUEST` |  |
| `type_display` | string | read-only. |
| `status` | enum: `NEW` \| `CONTACTED` \| `VISIT` \| `BOOKED` |  |
| `status_display` | string | read-only. |
| `summary` | string | Summary or query description. |
| `notes` | any | Chronological list of text notes. |
| `notes_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/enquiries/{enquiry_id}/`

**Delete an Enquiry**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_destroy`

Permanently deletes an enquiry. Staff only.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `enquiry_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Enquiry deleted successfully. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Staff permission required. |
| `404` | ErrorDetail | Enquiry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/enquiries/{enquiry_id}/notes/`

**Add Note to Enquiry**

- **Auth:** Bearer JWT
- **operationId:** `enquiries_notes_create`

Appends a text note to the enquiry's notes list. Staff only.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `enquiry_id` | string(uuid) | yes |  |

**Request body** — `application/json` (EnquiryAddNoteRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `note` | string | no |  |
| `note_text` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | EnquiryDetail | Note added successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Staff permission required. |
| `404` | ErrorDetail | Enquiry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `gym_id` | string(uuid) | read-only. |
| `gym_name` | string | read-only. |
| `manygym_user` | ManygymUserSlim |  |
| `first_name` | string | First name of the person enquiring. |
| `last_name` | string | Last name of the person enquiring. |
| `full_name` | string | read-only. Returns the full name of the enquiring lead. |
| `email` | any \| null | Email address (mandatory if phone number is omitted). |
| `phone` | string \| null | Phone number (mandatory if email address is omitted). |
| `type` | enum: `GENERAL_INQUIRY` \| `CALLBACK_REQUEST` \| `COMPLAINT` \| `EMERGENCY` \| `SPECIAL_REQUEST` |  |
| `type_display` | string | read-only. |
| `status` | enum: `NEW` \| `CONTACTED` \| `VISIT` \| `BOOKED` |  |
| `status_display` | string | read-only. |
| `summary` | string | Summary or query description. |
| `notes` | any | Chronological list of text notes. |
| `notes_count` | integer | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
