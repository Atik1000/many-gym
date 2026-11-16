# User Profile -> Education

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/users/profile/about/educations/`

**List User Education Records**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_educations_retrieve`

API endpoint for listing and creating education records for the authenticated user.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserEducation |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `university_name` | string |  |
| `from_year` | string(date) | Start date / year of education |
| `till_year` | string(date) \| null | End date / year of education (optional if still continuing) |
| `subject` | string |  |
| `graduated` | boolean |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/users/profile/about/educations/`

**Create User Education Record**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_educations_create`

API endpoint for listing and creating education records for the authenticated user.

**Request body** — `application/json` (UserEducationInputRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string(uuid) \| null | no |  |
| `university_name` | string | yes |  |
| `from_year` | string(date) | yes |  |
| `till_year` | string(date) \| null | no |  |
| `subject` | string | yes |  |
| `graduated` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | UserEducation | Education created. |
| `400` | ErrorDetail | Validation failure. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `university_name` | string |  |
| `from_year` | string(date) | Start date / year of education |
| `till_year` | string(date) \| null | End date / year of education (optional if still continuing) |
| `subject` | string |  |
| `graduated` | boolean |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/users/profile/about/educations/{education_id}/`

**Update User Education Record**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_educations_partial_update`

API endpoint for updating or deleting an individual education record.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `education_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedUserEducationInputRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string(uuid) \| null | no |  |
| `university_name` | string | no |  |
| `from_year` | string(date) | no |  |
| `till_year` | string(date) \| null | no |  |
| `subject` | string | no |  |
| `graduated` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserEducation | Education updated. |
| `400` | ErrorDetail | Validation failure. |
| `404` | ErrorDetail | Record not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `university_name` | string |  |
| `from_year` | string(date) | Start date / year of education |
| `till_year` | string(date) \| null | End date / year of education (optional if still continuing) |
| `subject` | string |  |
| `graduated` | boolean |  |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/users/profile/about/educations/{education_id}/`

**Delete User Education Record**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_educations_destroy`

API endpoint for updating or deleting an individual education record.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `education_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Education successfully deleted. |
| `404` | ErrorDetail | Record not found. |

---
