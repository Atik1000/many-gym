# Amenities

3 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/amenities/catalog/`

**Get Master Amenities Catalog**

- **Auth:** Bearer JWT
- **operationId:** `amenities_catalog_retrieve`

Returns system-wide master amenities categorized into 7 domains for UI rendering.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Master catalog grouped by domain category. |

---

## GET `/api/v1/amenities/gym-amenities/`

**Get Gym's Configured Amenities**

- **Auth:** Bearer JWT
- **operationId:** `amenities_gym_amenities_retrieve`

Returns all free and paid amenities enabled for the specified Gym.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target gym UUID (if not inferred from active gym JWT context). |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAmenitiesConfigured | Active configured amenities list. |
| `404` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `free_amenities` | array of GymAmenityItem |  |
| `paid_amenities` | array of GymAmenityItem |  |
| `total_count` | integer |  |

</details>

---

## PUT `/api/v1/amenities/gym-amenities/sync/`

**Sync Gym Amenities (Free & Paid)**

- **Auth:** Bearer JWT
- **operationId:** `amenities_gym_amenities_sync_update`

Full sync of enabled amenities for a gym. Replaces previous selection. Enforces mutual exclusion.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target gym UUID (if not inferred from active gym JWT context). |

**Request body** — `application/json` (SyncGymAmenitiesRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `free_amenity_ids` | array of string | no | List of AmenityCatalog UUIDs that are free / complimentary |
| `paid_amenities` | array of PaidAmenityInputRequest | no | List of paid amenities with pricing |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | SyncGymAmenitiesResponse |  |
| `400` | ErrorDetail |  |
| `403` | ErrorDetail |  |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `free_count` | integer |  |
| `paid_count` | integer |  |

</details>

---
