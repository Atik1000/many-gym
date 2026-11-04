# Gym Profile & Multi-Location

13 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/gyms/`

**Create New Gym Workspace**

- **Auth:** Bearer JWT
- **operationId:** `gyms_create`

### Summary
Creates a new gym workspace entity, sets the creator as the Owner, provisions the initial primary location, seeds the default 7-day operating hours, and grants the Administrator role.

### File Upload Specifications (`profile_picture`, `cover_photo`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB per image.
- **Processing Behavior**: Synchronous. Camera/smartphone EXIF orientation is automatically corrected (prevents rotated/sideways photos), and images are directly converted to standardized WebP (`.webp`) format.
- **Alternative**: Existing external image URLs can be passed via `profile_picture_url` and `cover_photo_url`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- Any authenticated user can create a new gym.

**Request body** — `application/json` (GymCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` | no |  |
| `secondary_type` | any \| null | no |  |
| `short_description` | any | no |  |
| `profile_picture_url` | string | no |  |
| `profile_picture` | string(binary) \| null | no | Direct profile picture upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientatio |
| `cover_photo_url` | string | no |  |
| `cover_photo` | string(binary) \| null | no | Direct cover photo upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation an |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` | no |  |
| `min_age` | integer | no |  |
| `timezone` | string | no |  |
| `address` | string | no |  |
| `latitude` | string(decimal) | no |  |
| `longitude` | string(decimal) | no |  |
| `city` | string | no |  |
| `country` | string | no |  |
| `postal_code` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymDetail | Gym successfully created. |
| `400` | ErrorDetail | Validation failure. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `owner_email` | string | read-only. |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` |  |
| `secondary_type` | any \| null |  |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | string | read-only. |
| `opening_hours_count` | string | read-only. |
| `gallery_count` | string | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/gyms/gallery/`

**List Gallery Media Assets**

- **Auth:** Bearer JWT
- **operationId:** `gyms_gallery_retrieve`

Retrieves photos and videos, optionally filtered by category and ordered by order_index.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `category` | string | no | Filter by category (e.g. equipment, workout_areas) |
| `gym_id` | string | no | Optional Gym UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymGalleryItem | Gallery items. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `media_url` | string |  |
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `resolved_media_url` | string | read-only. |
| `resolved_thumbnail_url` | string | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `category` | enum: `general` \| `equipment` \| `workout_areas` \| `studios_class_spaces` \| `changing_rooms_showers` \| `wellness_facilities` \| `reception_lounge` \| `interior_decor` \| `exterior_entrance` \| `other` |  |
| `caption` | string \| null |  |
| `order_index` | integer |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null | read-only. |
| `height` | integer \| null | read-only. |
| `size_bytes` | integer \| null | read-only. |
| `optimized_size_bytes` | integer \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## POST `/api/v1/gyms/gallery/`

**Add Gallery Media Asset**

- **Auth:** Bearer JWT
- **operationId:** `gyms_gallery_create`

Uploads/registers a gallery photo or video with caption (up to 200 chars) and category.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (GymGalleryCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | string(binary) | no | Direct file upload (picture or video) |
| `media_url` | string | no | Media URL or local path |
| `media_type` | enum: `picture` \| `video` | no |  |
| `category` | enum: `general` \| `equipment` \| `workout_areas` \| `studios_class_spaces` \| `changing_rooms_showers` \| `wellness_facilities` \| `reception_lounge` \| `interior_decor` \| `exterior_entrance` \| `other` | no |  |
| `caption` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymGalleryItem | Media item added. |
| `400` | ErrorDetail | Validation failure. |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `media_url` | string |  |
| `original_url` | string \| null | read-only. |
| `optimized_url` | string \| null | read-only. |
| `thumbnail_url` | string \| null | read-only. |
| `resolved_media_url` | string | read-only. |
| `resolved_thumbnail_url` | string | read-only. |
| `media_type` | enum: `picture` \| `video` |  |
| `category` | enum: `general` \| `equipment` \| `workout_areas` \| `studios_class_spaces` \| `changing_rooms_showers` \| `wellness_facilities` \| `reception_lounge` \| `interior_decor` \| `exterior_entrance` \| `other` |  |
| `caption` | string \| null |  |
| `order_index` | integer |  |
| `processing_status` | enum: `pending` \| `processing` \| `completed` \| `failed` |  |
| `width` | integer \| null | read-only. |
| `height` | integer \| null | read-only. |
| `size_bytes` | integer \| null | read-only. |
| `optimized_size_bytes` | integer \| null | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/gyms/gallery/reorder/`

**Reorder Gallery Assets**

- **Auth:** Bearer JWT
- **operationId:** `gyms_gallery_reorder_partial_update`

Bulk updates display sequential position indices for gallery assets.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (PatchedGymGalleryReorderRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | array of GymGalleryReorderItemRequest | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Gallery order updated. |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## DELETE `/api/v1/gyms/gallery/{item_id}/`

**Delete Gallery Media Asset**

- **Auth:** Bearer JWT
- **operationId:** `gyms_gallery_destroy`

Removes a photo or video from the gym gallery.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `item_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Asset deleted. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Asset not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/gyms/opening-hours/`

**Get Weekly Operating Hours**

- **Auth:** Bearer JWT
- **operationId:** `gyms_opening_hours_retrieve`

Retrieves the full 7-day schedule (Sunday=0 through Saturday=6).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymOpeningHoursItem | 7-day operating schedule. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `day_of_week` | enum: `0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` |  |
| `day_name` | string | read-only. |
| `start_time` | string(time) \| null |  |
| `end_time` | string(time) \| null |  |
| `is_closed` | boolean |  |

</details>

---

## PUT `/api/v1/gyms/opening-hours/`

**Bulk Update Weekly Operating Hours**

- **Auth:** Bearer JWT
- **operationId:** `gyms_opening_hours_update`

### Summary
Atomically updates the operating hours for all 7 days of the week.

### Business Rules
- `day_of_week` values range from 0 (Sunday) to 6 (Saturday).
- When `is_closed=False`, both `start_time` and `end_time` are required, and `start_time < end_time`.
- When `is_closed=True`, times are cleared automatically.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (GymOpeningHoursBulkUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `hours` | array of GymOpeningHoursBulkItemRequest | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of GymOpeningHoursItem | Operating hours updated. |
| `400` | ErrorDetail | Time validation failure. |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `day_of_week` | enum: `0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` |  |
| `day_name` | string | read-only. |
| `start_time` | string(time) \| null |  |
| `end_time` | string(time) \| null |  |
| `is_closed` | boolean |  |

</details>

---

## GET `/api/v1/gyms/profile/`

**Get Gym Profile Overview**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_retrieve`

### Summary
Retrieves complete gym profile overview including physical location, operating hours count, and media gallery count.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID if not using a Gym context token |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymDetail | Gym profile details. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `owner_email` | string | read-only. |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` |  |
| `secondary_type` | any \| null |  |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | string | read-only. |
| `opening_hours_count` | string | read-only. |
| `gallery_count` | string | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/gyms/profile/`

**Update Gym Overview Tab**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_partial_update`

### Summary
Updates core overview attributes: name, types (primary & secondary), description (min 120 chars), age restriction (1-99), gender requirements, and branding photos.

### File Upload Specifications (`profile_picture`, `cover_photo`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB per image.
- **Processing Behavior**: Synchronous. Automatically corrects EXIF orientation and converts directly to WebP (`.webp`) format.

### Authorization
- Requires Gym Ownership or `gym_profile:edit` scope.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (PatchedGymOverviewUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` | no |  |
| `secondary_type` | any \| null | no |  |
| `short_description` | string | no |  |
| `profile_picture_url` | string | no |  |
| `profile_picture` | string(binary) \| null | no | Direct profile picture upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientatio |
| `cover_photo_url` | string | no |  |
| `cover_photo` | string(binary) \| null | no | Direct cover photo upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation an |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` | no |  |
| `min_age` | integer | no |  |
| `timezone` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymDetail | Overview updated. |
| `400` | ErrorDetail | Validation failure (e.g. description under 120 chars). |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `owner_email` | string | read-only. |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` |  |
| `secondary_type` | any \| null |  |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | string | read-only. |
| `opening_hours_count` | string | read-only. |
| `gallery_count` | string | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/gyms/profile/location/`

**Get Gym Physical Location**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_location_retrieve`

Retrieves the primary map coordinates and address data.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymLocation | Location data. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `address` | string |  |
| `latitude` | string(decimal) |  |
| `longitude` | string(decimal) |  |
| `city` | string \| null |  |
| `country` | string \| null |  |
| `postal_code` | string \| null |  |
| `is_primary` | boolean |  |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/gyms/profile/location/`

**Update Gym Location & Map Coordinates**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_location_partial_update`

### Summary
Saves live map pinpoint coordinates (`latitude`, `longitude`) while maintaining custom edits to the address string.

### Authorization
- Requires Gym Ownership or `gym_profile:edit` scope.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (PatchedGymLocationUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `address` | string | no |  |
| `latitude` | string(decimal) | no |  |
| `longitude` | string(decimal) | no |  |
| `city` | string | no |  |
| `country` | string | no |  |
| `postal_code` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymLocation | Location updated. |
| `400` | ErrorDetail | Validation failure. |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `address` | string |  |
| `latitude` | string(decimal) |  |
| `longitude` | string(decimal) |  |
| `city` | string \| null |  |
| `country` | string \| null |  |
| `postal_code` | string \| null |  |
| `is_primary` | boolean |  |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/gyms/profile/overview/`

**Get Gym Profile Overview**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_overview_retrieve`

### Summary
Retrieves complete gym profile overview including physical location, operating hours count, and media gallery count.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID if not using a Gym context token |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymDetail | Gym profile details. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `owner_email` | string | read-only. |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` |  |
| `secondary_type` | any \| null |  |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | string | read-only. |
| `opening_hours_count` | string | read-only. |
| `gallery_count` | string | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/gyms/profile/overview/`

**Update Gym Overview Tab**

- **Auth:** Bearer JWT
- **operationId:** `gyms_profile_overview_partial_update`

### Summary
Updates core overview attributes: name, types (primary & secondary), description (min 120 chars), age restriction (1-99), gender requirements, and branding photos.

### File Upload Specifications (`profile_picture`, `cover_photo`)
- **Supported Content-Types**: `multipart/form-data` or `application/json`.
- **Accepted Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.bmp`, `.gif`, `.tiff`, `.jfif`, `.avif`.
- **Maximum File Size**: 10MB per image.
- **Processing Behavior**: Synchronous. Automatically corrects EXIF orientation and converts directly to WebP (`.webp`) format.

### Authorization
- Requires Gym Ownership or `gym_profile:edit` scope.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID |

**Request body** — `application/json` (PatchedGymOverviewUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` | no |  |
| `secondary_type` | any \| null | no |  |
| `short_description` | string | no |  |
| `profile_picture_url` | string | no |  |
| `profile_picture` | string(binary) \| null | no | Direct profile picture upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientatio |
| `cover_photo_url` | string | no |  |
| `cover_photo` | string(binary) \| null | no | Direct cover photo upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIFF. Automatically corrects orientation an |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` | no |  |
| `min_age` | integer | no |  |
| `timezone` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymDetail | Overview updated. |
| `400` | ErrorDetail | Validation failure (e.g. description under 120 chars). |
| `403` | ErrorDetail | Permission denied. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `owner_email` | string | read-only. |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | enum: `general_fitness_gym` \| `strength_bodybuilding_gym` \| `functional_fitness_gym` \| `personal_training_studio` \| `boutique_fitness_studio` \| `boxing_martial_arts_gym` \| `yoga_pilates_studio` \| `indoor_cycling_studio` \| `sports_performance_centre` \| `other` |  |
| `secondary_type` | any \| null |  |
| `gender_required` | enum: `everyone` \| `women_only` \| `men_only` |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | string | read-only. |
| `opening_hours_count` | string | read-only. |
| `gallery_count` | string | read-only. |
| `created_at` | string(date-time) | read-only. |
| `updated_at` | string(date-time) | read-only. |

</details>

---
