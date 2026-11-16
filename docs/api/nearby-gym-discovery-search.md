# Nearby Gym Discovery & Search

4 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/nearby/`

**Search Nearby Gyms (Live Location or City)**

- **Auth:** public — no token
- **operationId:** `gyms_nearby_retrieve`

### Summary
Allows prospective gymgoers and members to discover gyms based on:
1. **Live Location Radius Search**: Provide `latitude` and `longitude` (obtained via browser/mobile live location sharing after user consent). By default searches within a **20 km radius** (customizable via `radius` parameter). Results are sorted ascending by distance from the user.
2. **City Search**: Provide `city` name (case-insensitive search) when location permission is not granted or user prefers manual city selection.
3. **Category Filter**: Filter gyms by primary/secondary type (`category`), e.g. `strength_bodybuilding_gym`, `functional_fitness_gym`, `yoga_pilates_studio`.
4. **Keyword Search**: Free-text query (`search` or `q`) matching gym name, description, address, or city.

### Architecture
- **Ultra-fast Geo Index (Redis GEO)**: Proximity queries are evaluated against Redis geospatial index (`GEOSEARCH`) in <1ms.
- **Resilient Fallback (PostGIS / Haversine)**: Automatically falls back to PostgreSQL spherical Haversine / PostGIS formulas on cache miss and warms up Redis.
- **Privacy & Safety**: Deactivated, unpublished, and soft-deleted gyms are automatically excluded. Gyms that have blocked the requesting user are hidden.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `category` | string | no | Gym category choice (e.g. general_fitness_gym, strength_bodybuilding_gym, functional_fitness_gym, yoga_pilates_studio). |
| `city` | string | no | Filter by city name (e.g. Dhaka, New York). Used when user opts for city selection. |
| `latitude` | number(double) | no | Live user latitude from browser geolocation (-90.0 to 90.0). Required together with longitude. |
| `longitude` | number(double) | no | Live user longitude from browser geolocation (-180.0 to 180.0). Required together with latitude. |
| `page` | integer | no | Page number for pagination (default: 1). |
| `page_size` | integer | no | Number of results per page (default: 20, max: 100). |
| `radius` | number(double) | no | Search radius in kilometers (default: 20 km, min: 0.1, max: 500.0). |
| `search` | string | no | Keyword search matching gym name, address, bio, or city. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymSearchItem | Paginated list of matching gyms. |
| `400` | ErrorDetail | Validation failure (e.g. latitude provided without longitude, or invalid coordinates). |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `name` | string |  |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | string |  |
| `primary_type_display` | string |  |
| `secondary_type` | string \| null |  |
| `secondary_type_display` | string \| null |  |
| `gender_required` | string |  |
| `gender_required_display` | string |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | GymLocation \| null |  |
| `distance_km` | number(double) \| null | Computed distance in kilometers from user's live coordinates (null if searched by city without coordinates). |
| `is_open_now` | boolean | Whether gym is currently open based on operating schedule. |
| `today_opening_hours` | string | Operating hours string for today (e.g. '08:00 - 20:00' or 'Closed'). |
| `amenities_preview` | array of string | Prominent amenities available at this gym. |
| `followers_count` | integer | Total active followers of this gym. |
| `is_following` | boolean | Whether the requesting user currently follows this gym. |
| `created_at` | string(date-time) |  |

</details>

---

## GET `/api/v1/gyms/search/`

**Search Nearby Gyms (Live Location or City)**

- **Auth:** public — no token
- **operationId:** `gyms_search_retrieve`

### Summary
Allows prospective gymgoers and members to discover gyms based on:
1. **Live Location Radius Search**: Provide `latitude` and `longitude` (obtained via browser/mobile live location sharing after user consent). By default searches within a **20 km radius** (customizable via `radius` parameter). Results are sorted ascending by distance from the user.
2. **City Search**: Provide `city` name (case-insensitive search) when location permission is not granted or user prefers manual city selection.
3. **Category Filter**: Filter gyms by primary/secondary type (`category`), e.g. `strength_bodybuilding_gym`, `functional_fitness_gym`, `yoga_pilates_studio`.
4. **Keyword Search**: Free-text query (`search` or `q`) matching gym name, description, address, or city.

### Architecture
- **Ultra-fast Geo Index (Redis GEO)**: Proximity queries are evaluated against Redis geospatial index (`GEOSEARCH`) in <1ms.
- **Resilient Fallback (PostGIS / Haversine)**: Automatically falls back to PostgreSQL spherical Haversine / PostGIS formulas on cache miss and warms up Redis.
- **Privacy & Safety**: Deactivated, unpublished, and soft-deleted gyms are automatically excluded. Gyms that have blocked the requesting user are hidden.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `category` | string | no | Gym category choice (e.g. general_fitness_gym, strength_bodybuilding_gym, functional_fitness_gym, yoga_pilates_studio). |
| `city` | string | no | Filter by city name (e.g. Dhaka, New York). Used when user opts for city selection. |
| `latitude` | number(double) | no | Live user latitude from browser geolocation (-90.0 to 90.0). Required together with longitude. |
| `longitude` | number(double) | no | Live user longitude from browser geolocation (-180.0 to 180.0). Required together with latitude. |
| `page` | integer | no | Page number for pagination (default: 1). |
| `page_size` | integer | no | Number of results per page (default: 20, max: 100). |
| `radius` | number(double) | no | Search radius in kilometers (default: 20 km, min: 0.1, max: 500.0). |
| `search` | string | no | Keyword search matching gym name, address, bio, or city. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymSearchItem | Paginated list of matching gyms. |
| `400` | ErrorDetail | Validation failure (e.g. latitude provided without longitude, or invalid coordinates). |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `name` | string |  |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | string |  |
| `primary_type_display` | string |  |
| `secondary_type` | string \| null |  |
| `secondary_type_display` | string \| null |  |
| `gender_required` | string |  |
| `gender_required_display` | string |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `location` | GymLocation \| null |  |
| `distance_km` | number(double) \| null | Computed distance in kilometers from user's live coordinates (null if searched by city without coordinates). |
| `is_open_now` | boolean | Whether gym is currently open based on operating schedule. |
| `today_opening_hours` | string | Operating hours string for today (e.g. '08:00 - 20:00' or 'Closed'). |
| `amenities_preview` | array of string | Prominent amenities available at this gym. |
| `followers_count` | integer | Total active followers of this gym. |
| `is_following` | boolean | Whether the requesting user currently follows this gym. |
| `created_at` | string(date-time) |  |

</details>

---

## GET `/api/v1/gyms/{gym_id}/detail/`

**Get Public Gym Details**

- **Auth:** public — no token
- **operationId:** `gyms_detail_retrieve`

### Summary
Retrieves comprehensive public view for a gym workspace:
- Core overview and branding images.
- Primary location and all branch addresses with coordinates.
- Full 7-day schedule with live `is_open_now` indicator based on the gym's timezone.
- Categorized amenities (complimentary vs paid).
- Media gallery assets with WebP optimized and thumbnail variants.
- Active membership plans and pricing tiers.
- Follower and member counts, including `is_following` flag for authenticated users.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymPublicDetail | Gym details retrieved successfully. |
| `404` | ErrorDetail | Gym not found or inactive. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `name` | string |  |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | string |  |
| `primary_type_display` | string |  |
| `secondary_type` | string \| null |  |
| `secondary_type_display` | string \| null |  |
| `gender_required` | string |  |
| `gender_required_display` | string |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `created_at` | string(date-time) |  |
| `owner_public` | GymOwnerPublic |  |
| `location` | GymLocation \| null |  |
| `locations` | array of GymLocation |  |
| `today_status` | GymTodayStatus |  |
| `operating_hours` | array of GymOpeningHoursItem |  |
| `amenities` | GymAmenitiesBreakdown |  |
| `gallery` | array of GymGalleryItemDetail |  |
| `membership_plans` | array of MembershipPlanPreview |  |
| `social` | GymSocialStats |  |

</details>

---

## GET `/api/v1/gyms/{gym_id}/public/`

**Get Public Gym Details**

- **Auth:** public — no token
- **operationId:** `gyms_public_retrieve`

### Summary
Retrieves comprehensive public view for a gym workspace:
- Core overview and branding images.
- Primary location and all branch addresses with coordinates.
- Full 7-day schedule with live `is_open_now` indicator based on the gym's timezone.
- Categorized amenities (complimentary vs paid).
- Media gallery assets with WebP optimized and thumbnail variants.
- Active membership plans and pricing tiers.
- Follower and member counts, including `is_following` flag for authenticated users.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymPublicDetail | Gym details retrieved successfully. |
| `404` | ErrorDetail | Gym not found or inactive. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `name` | string |  |
| `profile_picture_url` | string \| null |  |
| `cover_photo_url` | string \| null |  |
| `short_description` | string \| null |  |
| `primary_type` | string |  |
| `primary_type_display` | string |  |
| `secondary_type` | string \| null |  |
| `secondary_type_display` | string \| null |  |
| `gender_required` | string |  |
| `gender_required_display` | string |  |
| `min_age` | integer |  |
| `timezone` | string |  |
| `created_at` | string(date-time) |  |
| `owner_public` | GymOwnerPublic |  |
| `location` | GymLocation \| null |  |
| `locations` | array of GymLocation |  |
| `today_status` | GymTodayStatus |  |
| `operating_hours` | array of GymOpeningHoursItem |  |
| `amenities` | GymAmenitiesBreakdown |  |
| `gallery` | array of GymGalleryItemDetail |  |
| `membership_plans` | array of MembershipPlanPreview |  |
| `social` | GymSocialStats |  |

</details>

---
