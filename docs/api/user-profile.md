# User Profile

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/auth/me/`

**Get Current User Profile & Accessible Gyms**

- **Auth:** Bearer JWT
- **operationId:** `auth_me_retrieve`

### Summary
Retrieves personal profile data, current active token context, and the full list of gyms accessible to the authenticated user (both owned gyms and staff assignments).

### Context Awareness & Behavior
1. **Gym Context**: When the session token represents a specific gym context (`type: 'gym'`), `current_context` contains `gym_id`, `gym_name`, and `profile_picture_url`.
2. **Context Sorting**: The active gym is automatically sorted to the top of `accessible_gyms` (index 0) for seamless UI dropdown rendering.
3. **Personal Context**: In personal context (`type: 'personal'`), `gym_id`, `gym_name`, and `profile_picture_url` are `null`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: Accessible to any authenticated user.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserProfileMeResponse | Current user profile and gym access directory. |
| `401` | ErrorDetail | Authentication credentials were not provided or are invalid. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user` | User |  |
| `current_context` | CurrentContext |  |
| `accessible_gyms` | array of AccessibleGymItem |  |

</details>

---

## PATCH `/api/v1/auth/me/`

**Update Current User Profile**

- **Auth:** Bearer JWT
- **operationId:** `auth_me_partial_update`

### Summary
Updates mutable personal profile attributes (first_name, last_name, phone, address, city, country, avatar, sex, date_of_birth, nationality).

### File Upload Specifications (`avatar`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB.
- **Processing Behavior**: Synchronous. Camera/smartphone EXIF orientation is automatically corrected (prevents rotated/sideways photos), and the image is converted directly to optimized WebP (`.webp`) format.
- **Alternative**: An existing external image URL can be passed via `avatar_url`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).

**Request body** — `application/json` (PatchedUpdateProfileRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | no |  |
| `last_name` | string | no |  |
| `phone` | string | no |  |
| `avatar_url` | string | no |  |
| `avatar` | string(binary) \| null | no | Direct avatar image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation a |
| `address` | string | no |  |
| `city` | string | no |  |
| `country` | string | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string | no |  |
| `nationality` | string | no |  |
| `is_private` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserProfileMeResponse | Profile successfully updated. |
| `400` | ErrorDetail | Validation failure on updated profile values. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user` | User |  |
| `current_context` | CurrentContext |  |
| `accessible_gyms` | array of AccessibleGymItem |  |

</details>

---

## GET `/api/v1/users/me/`

**Get Current User Profile & Accessible Gyms**

- **Auth:** Bearer JWT
- **operationId:** `users_me_retrieve`

### Summary
Retrieves personal profile data, current active token context, and the full list of gyms accessible to the authenticated user (both owned gyms and staff assignments).

### Context Awareness & Behavior
1. **Gym Context**: When the session token represents a specific gym context (`type: 'gym'`), `current_context` contains `gym_id`, `gym_name`, and `profile_picture_url`.
2. **Context Sorting**: The active gym is automatically sorted to the top of `accessible_gyms` (index 0) for seamless UI dropdown rendering.
3. **Personal Context**: In personal context (`type: 'personal'`), `gym_id`, `gym_name`, and `profile_picture_url` are `null`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: Accessible to any authenticated user.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserProfileMeResponse | Current user profile and gym access directory. |
| `401` | ErrorDetail | Authentication credentials were not provided or are invalid. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user` | User |  |
| `current_context` | CurrentContext |  |
| `accessible_gyms` | array of AccessibleGymItem |  |

</details>

---

## PATCH `/api/v1/users/me/`

**Update Current User Profile**

- **Auth:** Bearer JWT
- **operationId:** `users_me_partial_update`

### Summary
Updates mutable personal profile attributes (first_name, last_name, phone, address, city, country, avatar, sex, date_of_birth, nationality).

### File Upload Specifications (`avatar`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB.
- **Processing Behavior**: Synchronous. Camera/smartphone EXIF orientation is automatically corrected (prevents rotated/sideways photos), and the image is converted directly to optimized WebP (`.webp`) format.
- **Alternative**: An existing external image URL can be passed via `avatar_url`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).

**Request body** — `application/json` (PatchedUpdateProfileRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `first_name` | string | no |  |
| `last_name` | string | no |  |
| `phone` | string | no |  |
| `avatar_url` | string | no |  |
| `avatar` | string(binary) \| null | no | Direct avatar image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation a |
| `address` | string | no |  |
| `city` | string | no |  |
| `country` | string | no |  |
| `date_of_birth` | string(date) \| null | no |  |
| `sex` | string | no |  |
| `nationality` | string | no |  |
| `is_private` | boolean | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserProfileMeResponse | Profile successfully updated. |
| `400` | ErrorDetail | Validation failure on updated profile values. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `user` | User |  |
| `current_context` | CurrentContext |  |
| `accessible_gyms` | array of AccessibleGymItem |  |

</details>

---
