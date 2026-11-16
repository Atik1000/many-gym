# User Settings - Login & Security

16 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## GET `/api/v1/auth/settings/security/`

**Retrieve Login and Security Overview**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_retrieve`

### Summary
Retrieves comprehensive Login and Security settings including:
- Contact info (primary email, optional secondary email, optional phone)
- Two Factor Authentication (2FA) status (ON/OFF)
- Active logged-in devices count (max 5)
- Account status (deactivation, deletion grace period status)

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSecuritySettings | Security settings overview retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `contact_info` | UserContactInfo |  |
| `two_factor_enabled` | boolean |  |
| `logged_in_devices_count` | integer |  |
| `max_devices` | integer |  |
| `account_status` | object |  |

</details>

---

## GET `/api/v1/auth/settings/security/2fa/`

**Retrieve 2FA Status**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_2fa_retrieve`

Retrieves whether Two Factor Authentication (2FA) is enabled for the account.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserTwoFactorToggle | 2FA status retrieved. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `two_factor_enabled` | boolean | Two Factor Authentication toggle (true=ON, false=OFF). |

</details>

---

## PATCH `/api/v1/auth/settings/security/2fa/`

**Toggle 2FA (ON/OFF)**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_2fa_partial_update`

### Summary
Enables or disables Two Factor Authentication for the account.
When ON, subsequent logins will require a 6-digit OTP code dispatched via fallback:
Primary Email -> Secondary Email -> Phone SMS.

**Request body** — `application/json` (PatchedUserTwoFactorToggleRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `two_factor_enabled` | boolean | no | Two Factor Authentication toggle (true=ON, false=OFF). |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserTwoFactorToggle | 2FA status updated. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `two_factor_enabled` | boolean | Two Factor Authentication toggle (true=ON, false=OFF). |

</details>

---

## POST `/api/v1/auth/settings/security/change-password/`

**Change Password**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_change_password_create`

### Summary
Changes account password for the logged-in user after verifying current password.

### Request Body
- `current_password` (required): Current account password.
- `new_password` (required): New password (at least 8 characters).
- `confirm_password` (optional): Confirmation password matching new password.

**Request body** — `application/json` (ChangePasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes |  |
| `new_password` | string | yes |  |
| `confirm_password` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully changed. |
| `400` | ErrorDetail | Incorrect current password or weak new password. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/auth/settings/security/contact-info/`

**Retrieve Contact Information**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_contact_info_retrieve`

### Summary
Retrieves the user's contact information:
- Primary email (immutable/read-only)
- Secondary email (optional)
- Phone number (optional)

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserContactInfo | Contact information retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `primary_email` | string(email) | read-only. |
| `secondary_email` | string(email) \| null |  |
| `phone` | string \| null |  |

</details>

---

## PATCH `/api/v1/auth/settings/security/contact-info/`

**Update Contact Information**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_contact_info_partial_update`

### Summary
Updates optional secondary email and/or phone.
Primary email is immutable and cannot be updated or deleted.

### Validation Rules
- `primary_email` or `email`: Attempting to submit either will return a 400 Bad Request error.
- `secondary_email`: Valid email string, or null/empty to remove. Cannot be identical to primary email.
- `phone`: Max 50 characters, or null/empty to remove.

**Request body** — `application/json` (PatchedUserContactInfoUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `primary_email` | string | no |  |
| `email` | string | no |  |
| `secondary_email` | any \| null | no |  |
| `phone` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserContactInfo | Contact information updated successfully. |
| `400` | ErrorDetail | Validation failure or primary email modification attempt. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `primary_email` | string(email) | read-only. |
| `secondary_email` | string(email) \| null |  |
| `phone` | string \| null |  |

</details>

---

## GET `/api/v1/auth/settings/security/devices/`

**List Logged-In Devices**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_devices_retrieve`

### Summary
Lists all active logged-in devices for the authenticated user profile (up to 5 devices).
Each device record displays device identifier, friendly name, IP address, user agent, and last active timestamp.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserDevice | Logged-in devices list retrieved. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `device_id` | string | read-only. |
| `device_name` | string | read-only. |
| `ip_address` | string \| null | read-only. |
| `user_agent` | string | read-only. |
| `last_login` | string(date-time) | read-only. |
| `created_at` | string(date-time) | read-only. |
| `is_current_device` | boolean | read-only. |

</details>

---

## DELETE `/api/v1/auth/settings/security/devices/{device_id}/`

**Delete Logged-In Device**

- **Auth:** Bearer JWT
- **operationId:** `auth_settings_security_devices_destroy`

### Summary
Removes a logged-in device session.
- Revokes active authentication tokens associated with the device.
- Cleans and purges all cryptographic device keys (`UserDeviceKey`) stored for this device.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `device_id` | string | yes | Client device identifier string or device record UUID. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Device removed and keys cleaned successfully. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Device not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/users/settings/security/`

**Retrieve Login and Security Overview**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_retrieve`

### Summary
Retrieves comprehensive Login and Security settings including:
- Contact info (primary email, optional secondary email, optional phone)
- Two Factor Authentication (2FA) status (ON/OFF)
- Active logged-in devices count (max 5)
- Account status (deactivation, deletion grace period status)

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserSecuritySettings | Security settings overview retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `contact_info` | UserContactInfo |  |
| `two_factor_enabled` | boolean |  |
| `logged_in_devices_count` | integer |  |
| `max_devices` | integer |  |
| `account_status` | object |  |

</details>

---

## GET `/api/v1/users/settings/security/2fa/`

**Retrieve 2FA Status**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_2fa_retrieve`

Retrieves whether Two Factor Authentication (2FA) is enabled for the account.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserTwoFactorToggle | 2FA status retrieved. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `two_factor_enabled` | boolean | Two Factor Authentication toggle (true=ON, false=OFF). |

</details>

---

## PATCH `/api/v1/users/settings/security/2fa/`

**Toggle 2FA (ON/OFF)**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_2fa_partial_update`

### Summary
Enables or disables Two Factor Authentication for the account.
When ON, subsequent logins will require a 6-digit OTP code dispatched via fallback:
Primary Email -> Secondary Email -> Phone SMS.

**Request body** — `application/json` (PatchedUserTwoFactorToggleRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `two_factor_enabled` | boolean | no | Two Factor Authentication toggle (true=ON, false=OFF). |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserTwoFactorToggle | 2FA status updated. |
| `400` | ErrorDetail | Validation failure. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `two_factor_enabled` | boolean | Two Factor Authentication toggle (true=ON, false=OFF). |

</details>

---

## POST `/api/v1/users/settings/security/change-password/`

**Change Password**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_change_password_create`

### Summary
Changes account password for the logged-in user after verifying current password.

### Request Body
- `current_password` (required): Current account password.
- `new_password` (required): New password (at least 8 characters).
- `confirm_password` (optional): Confirmation password matching new password.

**Request body** — `application/json` (ChangePasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes |  |
| `new_password` | string | yes |  |
| `confirm_password` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully changed. |
| `400` | ErrorDetail | Incorrect current password or weak new password. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## GET `/api/v1/users/settings/security/contact-info/`

**Retrieve Contact Information**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_contact_info_retrieve`

### Summary
Retrieves the user's contact information:
- Primary email (immutable/read-only)
- Secondary email (optional)
- Phone number (optional)

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserContactInfo | Contact information retrieved successfully. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `primary_email` | string(email) | read-only. |
| `secondary_email` | string(email) \| null |  |
| `phone` | string \| null |  |

</details>

---

## PATCH `/api/v1/users/settings/security/contact-info/`

**Update Contact Information**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_contact_info_partial_update`

### Summary
Updates optional secondary email and/or phone.
Primary email is immutable and cannot be updated or deleted.

### Validation Rules
- `primary_email` or `email`: Attempting to submit either will return a 400 Bad Request error.
- `secondary_email`: Valid email string, or null/empty to remove. Cannot be identical to primary email.
- `phone`: Max 50 characters, or null/empty to remove.

**Request body** — `application/json` (PatchedUserContactInfoUpdateRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `primary_email` | string | no |  |
| `email` | string | no |  |
| `secondary_email` | any \| null | no |  |
| `phone` | string \| null | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | UserContactInfo | Contact information updated successfully. |
| `400` | ErrorDetail | Validation failure or primary email modification attempt. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `primary_email` | string(email) | read-only. |
| `secondary_email` | string(email) \| null |  |
| `phone` | string \| null |  |

</details>

---

## GET `/api/v1/users/settings/security/devices/`

**List Logged-In Devices**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_devices_retrieve`

### Summary
Lists all active logged-in devices for the authenticated user profile (up to 5 devices).
Each device record displays device identifier, friendly name, IP address, user agent, and last active timestamp.

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | array of UserDevice | Logged-in devices list retrieved. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `id` | string(uuid) | read-only. |
| `device_id` | string | read-only. |
| `device_name` | string | read-only. |
| `ip_address` | string \| null | read-only. |
| `user_agent` | string | read-only. |
| `last_login` | string(date-time) | read-only. |
| `created_at` | string(date-time) | read-only. |
| `is_current_device` | boolean | read-only. |

</details>

---

## DELETE `/api/v1/users/settings/security/devices/{device_id}/`

**Delete Logged-In Device**

- **Auth:** Bearer JWT
- **operationId:** `users_settings_security_devices_destroy`

### Summary
Removes a logged-in device session.
- Revokes active authentication tokens associated with the device.
- Cleans and purges all cryptographic device keys (`UserDeviceKey`) stored for this device.

**Path parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `device_id` | string | yes | Client device identifier string or device record UUID. |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Device removed and keys cleaned successfully. |
| `401` | ErrorDetail | Authentication required. |
| `404` | ErrorDetail | Device not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
