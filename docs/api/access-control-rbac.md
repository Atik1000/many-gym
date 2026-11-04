# Access Control & RBAC

10 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/access-control/permissions/`

**List System Permissions Grouped by Topic**

- **Auth:** Bearer JWT
- **operationId:** `access_control_permissions_retrieve`

### Summary
Retrieves all system permission scopes organized across the 9 core topics:
1. **Studio**
2. **Reports**
3. **Gym Profile**
4. **Subscription Plans**
5. **Members**
6. **Leads**
7. **Trainers**
8. **Routine Templates**
9. **People & Roles**

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- Used by UI when gym administrators select permission checkboxes to create or edit custom roles.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | _no schema documented_ | Permissions grouped by topic dictionary. |
| `401` | ErrorDetail | Authentication required. |

---

## GET `/api/v1/access-control/roles/`

**List Available Roles**

- **Auth:** Bearer JWT
- **operationId:** `access_control_roles_retrieve`

### Summary
Returns global system standard roles (`Administrator`, `Staff`, `Trainer`) along with gym-specific custom roles. Supports optional pagination.

### Parameters
- `gym_id`: Optional Gym UUID to include gym custom roles when using personal token.
- `page`: Page number (optional).
- `page_size`: Results per page (optional).

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `gym_id` | string | no | Optional Gym UUID to include gym custom roles when using personal token |
| `page` | integer | no | Page number |
| `page_size` | integer | no | Results per page (max 100) |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedRoleList | List of available roles. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of Role |  |

</details>

---

## POST `/api/v1/access-control/roles/`

**Create Custom Role**

- **Auth:** Bearer JWT
- **operationId:** `access_control_roles_create`

### Summary
Creates a new custom role scoped to the current gym and binds selected permission IDs.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: User must be Gym Owner or possess `people_roles:manage` scope.

### Business Rules
- Custom role slug is auto-generated from name.
- Slug must be unique within the owning gym.
- `is_custom` is automatically set to `True`.

**Request body** — `application/json` (CreateCustomRoleRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `description` | string | no |  |
| `permission_ids` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | Role | Custom role created. |
| `400` | ErrorDetail | Validation failure. |
| `403` | ErrorDetail | Permission denied (lacks people_roles:manage). |
| `409` | ErrorDetail | Role with this name already exists in gym. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `slug` | string |  |
| `is_custom` | boolean |  |
| `description` | string \| null |  |
| `gym_id` | string(uuid) \| null | read-only. |
| `permissions` | array of Permission | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## GET `/api/v1/access-control/roles/{role_id}/`

**Get Role Details**

- **Auth:** Bearer JWT
- **operationId:** `access_control_roles_retrieve_2`

Retrieves a specific role and its detailed permission scopes.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `role_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | Role | Role details. |
| `404` | ErrorDetail | Role not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `slug` | string |  |
| `is_custom` | boolean |  |
| `description` | string \| null |  |
| `gym_id` | string(uuid) \| null | read-only. |
| `permissions` | array of Permission | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## PATCH `/api/v1/access-control/roles/{role_id}/`

**Update Custom Role**

- **Auth:** Bearer JWT
- **operationId:** `access_control_roles_partial_update`

### Summary
Updates custom role metadata (name, description) and re-assigns selected permission scopes.

### Rules
- Global system standard roles cannot be altered.
- Requires `people_roles:manage` or Gym Ownership.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `role_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedUpdateCustomRoleRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no |  |
| `description` | string | no |  |
| `permission_ids` | array of string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | Role | Custom role updated. |
| `400` | ErrorDetail | Validation error or attempt to edit standard role. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Role not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `name` | string |  |
| `slug` | string |  |
| `is_custom` | boolean |  |
| `description` | string \| null |  |
| `gym_id` | string(uuid) \| null | read-only. |
| `permissions` | array of Permission | read-only. |
| `created_at` | string(date-time) | read-only. |

</details>

---

## DELETE `/api/v1/access-control/roles/{role_id}/`

**Delete Custom Role**

- **Auth:** Bearer JWT
- **operationId:** `access_control_roles_destroy`

### Summary
Deletes an unused custom role from the gym.

### Rules
- Cannot delete global system standard roles.
- Cannot delete a role that is currently assigned to any active staff members.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `role_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Role deleted. |
| `400` | ErrorDetail | Cannot delete active assigned role. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Role not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/access-control/staff/`

**List Gym Staff Members**

- **Auth:** Bearer JWT
- **operationId:** `access_control_staff_list`

### Summary
Retrieves paginated directory of all staff members assigned to the active gym with their role, invitation date, and assignment status.

### Parameters
- `page`: Page number (default: 1).
- `page_size`: Results per page (default: 20, max: 100).
- `all`: If `true`, returns unpaginated full list.

### Authorization
- Requires active Gym context or Gym Ownership.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `all` | boolean | no | Set to 'true' to retrieve all staff members unpaginated |
| `page` | integer | no | Page number |
| `page_size` | integer | no | Results per page (max 100) |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | PaginatedStaffAssignmentList |  |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `count` | integer |  |
| `total_pages` | integer |  |
| `current_page` | integer |  |
| `next` | string(uri) \| null |  |
| `previous` | string(uri) \| null |  |
| `results` | array of StaffAssignment |  |

</details>

---

## POST `/api/v1/access-control/staff/`

**Invite Staff Member**

- **Auth:** Bearer JWT
- **operationId:** `access_control_staff_create`

### Summary
Invites an existing registered user to join the gym with a designated role (e.g. Trainer, Staff, or Custom Role).

### Business Rules
- User must be registered in Many Gym platform.
- Target role must be a system standard role or belong to this gym.
- If previously inactive, the assignment is reactivated.

**Request body** — `application/json` (InviteStaffRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `role_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | StaffAssignment | Staff assignment created. |
| `400` | ErrorDetail | Validation failure. |
| `403` | ErrorDetail | Permission denied (requires people_roles:manage). |
| `404` | ErrorDetail | User email or role not found. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user` | User |  |
| `gym_id` | string(uuid) | read-only. |
| `role` | Role |  |
| `status` | enum: `invited` \| `active` \| `inactive` |  |
| `invited_at` | string(date-time) | read-only. |
| `joined_at` | string(date-time) \| null |  |

</details>

---

## PATCH `/api/v1/access-control/staff/{assignment_id}/`

**Update Staff Status (Active / Inactive)**

- **Auth:** Bearer JWT
- **operationId:** `access_control_staff_partial_update`

### Summary
Toggles a staff member's assignment status between `active` and `inactive`.

### Impact
When `inactive`, the staff member can no longer switch context to this gym or execute operations on its behalf.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `assignment_id` | string(uuid) | yes |  |

**Request body** — `application/json` (PatchedUpdateStaffStatusRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | enum: `invited` \| `active` \| `inactive` | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | StaffAssignment | Staff status updated. |
| `400` | ErrorDetail | Invalid status value. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Staff assignment not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `user` | User |  |
| `gym_id` | string(uuid) | read-only. |
| `role` | Role |  |
| `status` | enum: `invited` \| `active` \| `inactive` |  |
| `invited_at` | string(date-time) | read-only. |
| `joined_at` | string(date-time) \| null |  |

</details>

---

## DELETE `/api/v1/access-control/staff/{assignment_id}/`

**Revoke Staff Access**

- **Auth:** Bearer JWT
- **operationId:** `access_control_staff_destroy`

### Summary
Permanently removes a staff member assignment from the gym.

### Side Effects
- Any active gym context tokens for this user on this gym will immediately fail context validation.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `assignment_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Staff access revoked. |
| `403` | ErrorDetail | Permission denied. |
| `404` | ErrorDetail | Staff assignment not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
