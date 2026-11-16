# User Follow Requests

20 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/auth/follow-requests/`

**List Follow Requests**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_requests_retrieve`

### Summary
Lists follow requests for the authenticated user.
- `type=received` (default): lists incoming follow requests sent to you that await your confirmation.
- `type=sent`: lists outgoing follow requests you sent to other users that await their confirmation.
- `status=pending` (default): filters by pending status. Pass `status=all` to see full history.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `status` | string | no | Status filter: 'pending' (default), 'accepted', 'rejected', 'cancelled', or 'all'. |
| `type` | string | no | Request type: 'received' (default) or 'sent'. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowRequestItem | List of follow requests. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `status` | string |  |
| `created_at` | string(date-time) |  |
| `updated_at` | string(date-time) |  |
| `requester` | string | read-only. |
| `target_user` | string | read-only. |

</details>

---

## POST `/api/v1/auth/follow-requests/{request_id}/accept/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_requests_accept_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/auth/follow-requests/{request_id}/cancel/`

**Cancel / Withdraw Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_requests_cancel_create`

### Summary
Cancels/withdraws a pending follow request previously sent by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request cancelled successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## DELETE `/api/v1/auth/follow-requests/{request_id}/cancel/`

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_requests_cancel_destroy`

API endpoint for canceling/withdrawing a pending follow request sent by the authenticated user.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `204` | _no schema documented_ | No response body |

---

## POST `/api/v1/auth/follow-requests/{request_id}/reject/`

**Reject / Decline Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_requests_reject_create`

### Summary
Rejects/declines a pending follow request received by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request rejected successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/auth/{user_id}/follow/accept/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_accept_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/auth/{user_id}/follow/cancel/`

**Cancel / Withdraw Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_cancel_create`

### Summary
Cancels/withdraws a pending follow request previously sent by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request cancelled successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## DELETE `/api/v1/auth/{user_id}/follow/cancel/`

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_cancel_destroy`

API endpoint for canceling/withdrawing a pending follow request sent by the authenticated user.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `204` | _no schema documented_ | No response body |

---

## POST `/api/v1/auth/{user_id}/follow/confirm/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_confirm_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/auth/{user_id}/follow/reject/`

**Reject / Decline Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `auth_follow_reject_create`

### Summary
Rejects/declines a pending follow request received by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request rejected successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## GET `/api/v1/users/follow-requests/`

**List Follow Requests**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_requests_retrieve`

### Summary
Lists follow requests for the authenticated user.
- `type=received` (default): lists incoming follow requests sent to you that await your confirmation.
- `type=sent`: lists outgoing follow requests you sent to other users that await their confirmation.
- `status=pending` (default): filters by pending status. Pass `status=all` to see full history.

**Query parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no |  |
| `page_size` | integer | no |  |
| `status` | string | no | Status filter: 'pending' (default), 'accepted', 'rejected', 'cancelled', or 'all'. |
| `type` | string | no | Request type: 'received' (default) or 'sent'. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of FollowRequestItem | List of follow requests. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) |  |
| `status` | string |  |
| `created_at` | string(date-time) |  |
| `updated_at` | string(date-time) |  |
| `requester` | string | read-only. |
| `target_user` | string | read-only. |

</details>

---

## POST `/api/v1/users/follow-requests/{request_id}/accept/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_requests_accept_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/users/follow-requests/{request_id}/cancel/`

**Cancel / Withdraw Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_requests_cancel_create`

### Summary
Cancels/withdraws a pending follow request previously sent by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request cancelled successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## DELETE `/api/v1/users/follow-requests/{request_id}/cancel/`

- **Auth:** Bearer JWT
- **operationId:** `users_follow_requests_cancel_destroy`

API endpoint for canceling/withdrawing a pending follow request sent by the authenticated user.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `204` | _no schema documented_ | No response body |

---

## POST `/api/v1/users/follow-requests/{request_id}/reject/`

**Reject / Decline Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_requests_reject_create`

### Summary
Rejects/declines a pending follow request received by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `request_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request rejected successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/users/{user_id}/follow/accept/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_accept_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/users/{user_id}/follow/cancel/`

**Cancel / Withdraw Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_cancel_create`

### Summary
Cancels/withdraws a pending follow request previously sent by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request cancelled successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## DELETE `/api/v1/users/{user_id}/follow/cancel/`

- **Auth:** Bearer JWT
- **operationId:** `users_follow_cancel_destroy`

API endpoint for canceling/withdrawing a pending follow request sent by the authenticated user.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `204` | _no schema documented_ | No response body |

---

## POST `/api/v1/users/{user_id}/follow/confirm/`

**Accept / Confirm Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_confirm_create`

### Summary
Confirms and accepts a pending follow request. The requester immediately becomes a follower of the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request accepted successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---

## POST `/api/v1/users/{user_id}/follow/reject/`

**Reject / Decline Follow Request**

- **Auth:** Bearer JWT
- **operationId:** `users_follow_reject_create`

### Summary
Rejects/declines a pending follow request received by the authenticated user.
Accepts `request_id` or `user_id` in path or body.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `user_id` | string(uuid) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | FollowRequestActionResponse | Follow request rejected successfully. |
| `400` | ErrorDetail | Validation failure or invalid ID. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Pending follow request not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `status` | string |  |
| `request_id` | string(uuid) \| null |  |
| `is_following` | boolean |  |
| `target_user_id` | string(uuid) \| null |  |
| `requester_id` | string(uuid) \| null |  |

</details>

---
