# Alerts & Logs - Admin Logs

12 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/gyms/admin-logs/`

**List Admin Logs**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_retrieve`

### Summary
Retrieves a paginated list of administration audit logs for the specified gym workspace.
Matches the Alerts & Logs sidebar menu UI table:
- **Admin**: Staff member / administrator who executed the action
- **Action**: Human-readable action label (e.g. Updated page information, Published a post, Added an admin)
- **Details**: Change description or item title
- **Date and time**: Timestamp and human-friendly formatted date

### Filtering & Search
- `category`: Filter by module category (e.g. `gym_profile`, `posts`, `access_control`, `visibility`, `members`, `membership_plans`).
- `action_type`: Filter by machine action code (e.g. `update_page_info`, `publish_post`, `add_admin`, `change_page_visibility`).
- `actor_id`: Filter by the UUID of the admin who performed the action.
- `start_date` / `end_date`: Filter by ISO date/datetime range.
- `search`: Full text search matching action, details, or admin name/email.
- `page` / `page_size`: Pagination parameters.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `action_type` | string | no | Filter by action type code. |
| `actor_id` | string | no | Filter by administrator User UUID. |
| `category` | string | no | Filter by module category. |
| `end_date` | string | no | Filter logs created on or before this ISO date/datetime. |
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |
| `page` | integer | no | Page number (default 1). |
| `page_size` | integer | no | Number of logs per page (default 20, max 100). |
| `search` | string | no | Search query matching action, details, admin name or email. |
| `start_date` | string | no | Filter logs created on or after this ISO date/datetime. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLogsPaginatedResponse | Paginated admin logs. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `page` | integer |  |
| `page_size` | integer |  |
| `total_pages` | integer |  |
| `results` | array of GymAdminLog |  |

</details>

---

## POST `/api/v1/gyms/admin-logs/`

**Record Admin Log Entry**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_create`

### Summary
Creates a new administrative audit log entry within the target gym workspace.
Useful for custom administrative actions, integrations, or client-side administrative event tracking.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Request body** — `application/json` (GymAdminLogCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `action` | string | yes |  |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` | no |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` | no |  |
| `details` | string | no |  |
| `target_type` | string \| null | no |  |
| `target_id` | string \| null | no |  |
| `metadata` | object | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymAdminLog | Admin log entry created successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `admin` | object | read-only. |
| `admin_name` | string | read-only. |
| `action` | string | read-only. |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` |  |
| `category_display` | string | read-only. |
| `details` | string | read-only. |
| `target_type` | string \| null | read-only. |
| `target_id` | string \| null | read-only. |
| `metadata` | any | read-only. |
| `date_and_time` | string(date-time) | read-only. |
| `formatted_date_time` | string | read-only. |

</details>

---

## GET `/api/v1/gyms/admin-logs/actions/`

**List Admin Log Categories & Action Types**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_actions_retrieve`

Returns predefined categories and action types for UI dropdown filters.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | AdminLogOptionsResponse | Available options. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `categories` | array of KeyValueOption |  |
| `action_types` | array of KeyValueOption |  |

</details>

---

## GET `/api/v1/gyms/admin-logs/export/`

**Export Admin Logs**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_export_retrieve`

### Summary
Exports administration audit logs as a downloadable CSV or JSON file.
Accepts the same filtering parameters as the list endpoint.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `action_type` | string | no |  |
| `actor_id` | string | no |  |
| `category` | string | no |  |
| `end_date` | string | no |  |
| `format` | string | no | Export format: 'csv' (default) or 'json' |
| `gym_id` | string | no |  |
| `search` | string | no |  |
| `start_date` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | File download attachment (CSV) or JSON array. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

---

## GET `/api/v1/gyms/admin-logs/metrics/`

**Retrieve Admin Logs Metrics**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_metrics_retrieve`

### Summary
Returns aggregate statistics for gym administration logs:
- `total_logs`: Total number of administrative actions recorded.
- `logs_today`: Number of actions executed today.
- `by_category`: Count breakdown by category.
- `recent_logs`: 5 most recent administrative actions.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLogsMetrics | Admin log metrics retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `total_logs` | integer |  |
| `logs_today` | integer |  |
| `by_category` | object |  |
| `recent_logs` | array of GymAdminLog |  |

</details>

---

## GET `/api/v1/gyms/admin-logs/{log_id}/`

**Retrieve Admin Log Detail**

- **Auth:** Bearer JWT
- **operationId:** `gyms_admin_logs_retrieve_2`

Retrieves a specific administrative log record by UUID.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `log_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLog | Admin log detail retrieved successfully. |
| `400` | ErrorDetail | Invalid UUID. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Log entry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `admin` | object | read-only. |
| `admin_name` | string | read-only. |
| `action` | string | read-only. |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` |  |
| `category_display` | string | read-only. |
| `details` | string | read-only. |
| `target_type` | string \| null | read-only. |
| `target_id` | string \| null | read-only. |
| `metadata` | any | read-only. |
| `date_and_time` | string(date-time) | read-only. |
| `formatted_date_time` | string | read-only. |

</details>

---

## GET `/api/v1/gyms/logs/admin/`

**List Admin Logs**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_retrieve`

### Summary
Retrieves a paginated list of administration audit logs for the specified gym workspace.
Matches the Alerts & Logs sidebar menu UI table:
- **Admin**: Staff member / administrator who executed the action
- **Action**: Human-readable action label (e.g. Updated page information, Published a post, Added an admin)
- **Details**: Change description or item title
- **Date and time**: Timestamp and human-friendly formatted date

### Filtering & Search
- `category`: Filter by module category (e.g. `gym_profile`, `posts`, `access_control`, `visibility`, `members`, `membership_plans`).
- `action_type`: Filter by machine action code (e.g. `update_page_info`, `publish_post`, `add_admin`, `change_page_visibility`).
- `actor_id`: Filter by the UUID of the admin who performed the action.
- `start_date` / `end_date`: Filter by ISO date/datetime range.
- `search`: Full text search matching action, details, or admin name/email.
- `page` / `page_size`: Pagination parameters.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `action_type` | string | no | Filter by action type code. |
| `actor_id` | string | no | Filter by administrator User UUID. |
| `category` | string | no | Filter by module category. |
| `end_date` | string | no | Filter logs created on or before this ISO date/datetime. |
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |
| `page` | integer | no | Page number (default 1). |
| `page_size` | integer | no | Number of logs per page (default 20, max 100). |
| `search` | string | no | Search query matching action, details, admin name or email. |
| `start_date` | string | no | Filter logs created on or after this ISO date/datetime. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLogsPaginatedResponse | Paginated admin logs. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `page` | integer |  |
| `page_size` | integer |  |
| `total_pages` | integer |  |
| `results` | array of GymAdminLog |  |

</details>

---

## POST `/api/v1/gyms/logs/admin/`

**Record Admin Log Entry**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_create`

### Summary
Creates a new administrative audit log entry within the target gym workspace.
Useful for custom administrative actions, integrations, or client-side administrative event tracking.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Request body** — `application/json` (GymAdminLogCreateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `action` | string | yes |  |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` | no |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` | no |  |
| `details` | string | no |  |
| `target_type` | string \| null | no |  |
| `target_id` | string \| null | no |  |
| `metadata` | object | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | GymAdminLog | Admin log entry created successfully. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `admin` | object | read-only. |
| `admin_name` | string | read-only. |
| `action` | string | read-only. |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` |  |
| `category_display` | string | read-only. |
| `details` | string | read-only. |
| `target_type` | string \| null | read-only. |
| `target_id` | string \| null | read-only. |
| `metadata` | any | read-only. |
| `date_and_time` | string(date-time) | read-only. |
| `formatted_date_time` | string | read-only. |

</details>

---

## GET `/api/v1/gyms/logs/admin/actions/`

**List Admin Log Categories & Action Types**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_actions_retrieve`

Returns predefined categories and action types for UI dropdown filters.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | AdminLogOptionsResponse | Available options. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `categories` | array of KeyValueOption |  |
| `action_types` | array of KeyValueOption |  |

</details>

---

## GET `/api/v1/gyms/logs/admin/export/`

**Export Admin Logs**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_export_retrieve`

### Summary
Exports administration audit logs as a downloadable CSV or JSON file.
Accepts the same filtering parameters as the list endpoint.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `action_type` | string | no |  |
| `actor_id` | string | no |  |
| `category` | string | no |  |
| `end_date` | string | no |  |
| `format` | string | no | Export format: 'csv' (default) or 'json' |
| `gym_id` | string | no |  |
| `search` | string | no |  |
| `start_date` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | File download attachment (CSV) or JSON array. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

---

## GET `/api/v1/gyms/logs/admin/metrics/`

**Retrieve Admin Logs Metrics**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_metrics_retrieve`

### Summary
Returns aggregate statistics for gym administration logs:
- `total_logs`: Total number of administrative actions recorded.
- `logs_today`: Number of actions executed today.
- `by_category`: Count breakdown by category.
- `recent_logs`: 5 most recent administrative actions.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLogsMetrics | Admin log metrics retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Gym not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `total_logs` | integer |  |
| `logs_today` | integer |  |
| `by_category` | object |  |
| `recent_logs` | array of GymAdminLog |  |

</details>

---

## GET `/api/v1/gyms/logs/admin/{log_id}/`

**Retrieve Admin Log Detail**

- **Auth:** Bearer JWT
- **operationId:** `gyms_logs_admin_retrieve_2`

Retrieves a specific administrative log record by UUID.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `log_id` | string(uuid) | yes |  |

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Target Gym UUID if not using a gym context JWT token. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | GymAdminLog | Admin log detail retrieved successfully. |
| `400` | ErrorDetail | Invalid UUID. |
| `401` | ErrorDetail | Authentication required. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Log entry not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `admin` | object | read-only. |
| `admin_name` | string | read-only. |
| `action` | string | read-only. |
| `action_type` | enum: `update_page_info` \| `update_gym_profile` \| `update_gym_location` \| `update_opening_hours` \| `add_gallery_media` \| `delete_gallery_media` \| `reorder_gallery` \| `publish_post` \| `update_post` \| `delete_post` \| `add_admin` \| `update_staff_role` \| `remove_staff` \| `create_role` \| `update_role` \| `delete_role` \| `change_page_visibility` \| `update_settings` \| `block_user` \| `unblock_user` \| `create_member_request` \| `update_member_request` \| `delete_member_request` \| `accept_member_request` \| `reject_member_request` \| `create_member` \| `update_member` \| `delete_member` \| `resend_member_invitation` \| `create_subscription` \| `update_subscription_status` \| `record_payment` \| `create_membership_plan` \| `update_membership_plan` \| `delete_membership_plan` \| `change_plan_status` \| `create_routine` \| `update_routine` \| `delete_routine` \| `assign_routine` \| `create_lead` \| `update_lead` \| `update_lead_stage` \| `convert_lead` \| `delete_lead` \| `export_logs` \| `custom_action` |  |
| `category` | enum: `gym_profile` \| `posts` \| `access_control` \| `visibility` \| `settings` \| `members` \| `subscriptions` \| `member_requests` \| `membership_plans` \| `routines` \| `leads` \| `general` |  |
| `category_display` | string | read-only. |
| `details` | string | read-only. |
| `target_type` | string \| null | read-only. |
| `target_id` | string \| null | read-only. |
| `metadata` | any | read-only. |
| `date_and_time` | string(date-time) | read-only. |
| `formatted_date_time` | string | read-only. |

</details>

---
