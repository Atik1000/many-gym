# Password Management

8 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/auth/change-password/`

**Change Password**

- **Auth:** Bearer JWT
- **operationId:** `auth_change_password_create`

### Summary
Allows an authenticated logged-in user to change their password by validating their `current_password` and setting a `new_password`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).

**Request body** — `application/json` (ChangePasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes |  |
| `new_password` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully changed. |
| `400` | ErrorDetail | Current password does not match or new password is too weak. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/forgot-password/`

**Request Password Reset OTP**

- **Auth:** public — no token
- **operationId:** `auth_forgot_password_create`

### Summary
Initiates self-service password recovery by generating a 6-digit password reset OTP and emailing it to the registered user.

### Security Note
For security against user enumeration, the endpoint always returns a generic 200 OK success message regardless of whether the email exists in the database.

**Request body** — `application/json` (ForgotPasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password reset code queued if email exists. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/reset-password/`

**Reset Password with OTP**

- **Auth:** public — no token
- **operationId:** `auth_reset_password_create`

### Summary
Resets the account password to the provided `new_password` after re-verifying the OTP code.

### Business Rules
- `new_password` must be at least 8 characters long.
- Marks the OTP as used immediately.
- User can now login with their new password.

**Request body** — `application/json` (ResetPasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |
| `new_password` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully updated. |
| `400` | ErrorDetail | Invalid OTP or password requirement not met. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/verify-reset-otp/`

**Verify Password Reset OTP**

- **Auth:** public — no token
- **operationId:** `auth_verify_reset_otp_create`

### Summary
Pre-checks if a provided password reset OTP is currently valid and unexpired before presenting the new password entry form.

**Request body** — `application/json` (VerifyResetOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | OTP is valid. |
| `400` | ErrorDetail | Invalid or expired reset code. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/change-password/`

**Change Password**

- **Auth:** Bearer JWT
- **operationId:** `users_change_password_create`

### Summary
Allows an authenticated logged-in user to change their password by validating their `current_password` and setting a `new_password`.

### Authentication & Authorization
- **Authentication**: Required (`Bearer <JWT>`).

**Request body** — `application/json` (ChangePasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes |  |
| `new_password` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully changed. |
| `400` | ErrorDetail | Current password does not match or new password is too weak. |
| `401` | ErrorDetail | Authentication required. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/forgot-password/`

**Request Password Reset OTP**

- **Auth:** public — no token
- **operationId:** `users_forgot_password_create`

### Summary
Initiates self-service password recovery by generating a 6-digit password reset OTP and emailing it to the registered user.

### Security Note
For security against user enumeration, the endpoint always returns a generic 200 OK success message regardless of whether the email exists in the database.

**Request body** — `application/json` (ForgotPasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password reset code queued if email exists. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/reset-password/`

**Reset Password with OTP**

- **Auth:** public — no token
- **operationId:** `users_reset_password_create`

### Summary
Resets the account password to the provided `new_password` after re-verifying the OTP code.

### Business Rules
- `new_password` must be at least 8 characters long.
- Marks the OTP as used immediately.
- User can now login with their new password.

**Request body** — `application/json` (ResetPasswordRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |
| `new_password` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | Password successfully updated. |
| `400` | ErrorDetail | Invalid OTP or password requirement not met. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/verify-reset-otp/`

**Verify Password Reset OTP**

- **Auth:** public — no token
- **operationId:** `users_verify_reset_otp_create`

### Summary
Pre-checks if a provided password reset OTP is currently valid and unexpired before presenting the new password entry form.

**Request body** — `application/json` (VerifyResetOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | OTP is valid. |
| `400` | ErrorDetail | Invalid or expired reset code. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---
