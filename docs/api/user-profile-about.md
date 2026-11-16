# User Profile -> About

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/users/profile/about/`

**Get Current User 'About' Profile**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_retrieve`

### Summary
Retrieves the current user's complete Public Profile -> About details across all 5 sections:
1. **Personal Details**: Current address, home town, date of birth, gender.
2. **Education**: University name, from year, till year (optional if continuing), subject, graduated status.
3. **Hobbies**: List of user hobbies (free text items).
4. **Contact Info**: Phone number, social links (platform + link URL), and registered account email (read-only).
5. **Details About You**: About you description (max 320 chars) and favourite quote (max 160 chars).

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: Current authenticated user.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserAboutResponse | Complete user about profile data. |
| `401` | ErrorDetail | Authentication credentials required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `personal_details` | PersonalDetails |  |
| `education_list` | array of UserEducation |  |
| `hobbies` | array of string | read-only. |
| `contact_info` | ContactInfo |  |
| `details_about_you` | DetailsAboutYou |  |

</details>

---

## PUT `/api/v1/users/profile/about/`

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_update`

API endpoint for retrieving and updating the authenticated user's Public Profile -> About details.

**Request body** — `application/json` (UserAboutResponseRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |
| `first_name` | string | yes |  |
| `last_name` | string | yes |  |
| `avatar_url` | string \| null | yes |  |
| `is_private` | boolean | yes |  |
| `education_list` | array of UserEducationRequest | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserAboutResponse |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `personal_details` | PersonalDetails |  |
| `education_list` | array of UserEducation |  |
| `hobbies` | array of string | read-only. |
| `contact_info` | ContactInfo |  |
| `details_about_you` | DetailsAboutYou |  |

</details>

---

## PATCH `/api/v1/users/profile/about/`

**Update Current User 'About' Profile**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_partial_update`

### Summary
Updates the current user's Public Profile -> About details.
Supports both structured nested sections (`personal_details`, `education_list`, `hobbies`, `contact_info`, `details_about_you`) and direct flat properties.

### Validation Invariants
- **Email**: Immutable. Registered account email cannot be changed.
- **About You**: Maximum 320 characters.
- **Favourite Quote**: Maximum 160 characters.
- **Education Dates**: `till_year` cannot be earlier than `from_year`.
- **Social Platforms**: Must be one of the supported platform identifiers (`facebook`, `instagram`, `twitter_x`, `linkedin`, `youtube`, `tiktok`, `github`, `website`, `other`).
- **Gender**: Must be one of the supported enum choices (`male`, `female`, `other`, `prefer_not_to_say`).

**Request body** — `application/json` (PatchedUserAboutUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `personal_details` | PersonalDetailsRequest | no |  |
| `education_list` | array of UserEducationInputRequest | no |  |
| `hobbies` | array of string | no |  |
| `contact_info` | ContactInfoInputRequest | no |  |
| `details_about_you` | DetailsAboutYouRequest | no |  |
| `current_address` | string | no |  |
| `home_town` | string | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `gender` | any \| null | no |  |
| `phone_number` | string | no |  |
| `social_links` | array of UserSocialLinkInputRequest | no |  |
| `about_you` | string | no |  |
| `favourite_quote` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserAboutResponse | About profile successfully updated. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `personal_details` | PersonalDetails |  |
| `education_list` | array of UserEducation |  |
| `hobbies` | array of string | read-only. |
| `contact_info` | ContactInfo |  |
| `details_about_you` | DetailsAboutYou |  |

</details>

---

## GET `/api/v1/users/{user_id}/profile/about/`

**Get Target User Public 'About' Profile**

- **Auth:** Bearer JWT
- **operationId:** `users_profile_about_retrieve_2`

### Summary
Retrieves the public "About" section for a specific user by UUID.

### Privacy & Access Rules
- **Soft-Deleted**: Returns `404 Not Found`.
- **Deactivated**: Returns `400 Bad Request` unless viewed by the account owner.
- **Blocked Users**: Returns `403 Forbidden` if the target user has blocked the requester.
- **Private Profiles**: Returns `403 Forbidden` if `is_private=True` and requester is not following the target user.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserAboutResponse | Public about profile. |
| `400` | ErrorDetail | Target account is deactivated. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Target user is private or has blocked you. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | string(uuid) |  |
| `first_name` | string |  |
| `last_name` | string |  |
| `avatar_url` | string \| null |  |
| `is_private` | boolean |  |
| `personal_details` | PersonalDetails |  |
| `education_list` | array of UserEducation |  |
| `hobbies` | array of string | read-only. |
| `contact_info` | ContactInfo |  |
| `details_about_you` | DetailsAboutYou |  |

</details>

---
