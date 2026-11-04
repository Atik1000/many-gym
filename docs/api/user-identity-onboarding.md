# User Identity & Onboarding

6 endpoints. Base URL `https://v0.manygym.com`.

[← All domains](./README.md)

---

## POST `/api/v1/auth/register/`

**User Registration / Sign Up**

- **Auth:** public — no token
- **operationId:** `auth_register_create`

### Summary
Creates a new customer account with unverified status and immediately queues an asynchronous verification OTP via SMTP email.

### Authentication & Authorization
- **Authentication**: None (Public endpoint).
- **Authorization**: Anyone may register.

### Business Rules & Workflow
1. Normalizes and validates uniqueness of `email`.
2. Password must be at least 8 characters.
3. Automatically provisions an empty `UserProfile` attached to the user.
4. Generates a cryptographic 6-digit numeric OTP valid for **15 minutes**.
5. Sets `is_verified=False` and status to `active`.

### Side Effects
- Dispatches a Celery background task (`send_email_task`) to deliver the verification code via configured SMTP backend.

**Request body** — `application/json` (UserRegistrationRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `password` | string | yes |  |
| `first_name` | string | yes |  |
| `last_name` | string | yes |  |
| `phone` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | RegisterResponse | Account created successfully; verification OTP email queued. |
| `400` | ErrorDetail | Input validation failure (e.g. weak password or invalid email format). |
| `409` | ErrorDetail | An account with this email already exists. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `email` | string(email) |  |

</details>

---

## POST `/api/v1/auth/resend-otp/`

**Resend Registration OTP**

- **Auth:** public — no token
- **operationId:** `auth_resend_otp_create`

### Summary
Invalidates prior unused registration OTPs and dispatches a fresh 6-digit OTP code to the user's email.

### Business Rules
- User must exist and not already be verified (`is_verified=False`).
- Generates a new 15-minute OTP and sends via SMTP.

**Request body** — `application/json` (ResendOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | New verification code queued. |
| `400` | ErrorDetail | Account is already verified. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/auth/verify-signup-otp/`

**Verify Account Registration OTP**

- **Auth:** public — no token
- **operationId:** `auth_verify_signup_otp_create`

### Summary
Validates the 6-digit registration OTP, marks the account as verified, and immediately generates initial session JWT tokens in Personal Profile context.

### Authentication & Authorization
- **Authentication**: None.
- **Authorization**: Public endpoint.

### Business Rules & Workflow
1. Verifies OTP matching the email and purpose `signup_verification`.
2. Validates that OTP has not expired (within 15 minutes) and has not already been used.
3. Sets `user.is_verified = True`.
4. Invalidates the used OTP.
5. Issues a JWT access and refresh token pair signed with `context_type: personal`.

**Request body** — `application/json` (VerifySignupOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | VerifySignupResponse | Account verified; initial session tokens issued. |
| `400` | ErrorDetail | Invalid or expired OTP code. |
| `404` | ErrorDetail | User with this email was not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `user` | User |  |
| `tokens` | TokenResponse |  |

</details>

---

## POST `/api/v1/users/register/`

**User Registration / Sign Up**

- **Auth:** public — no token
- **operationId:** `users_register_create`

### Summary
Creates a new customer account with unverified status and immediately queues an asynchronous verification OTP via SMTP email.

### Authentication & Authorization
- **Authentication**: None (Public endpoint).
- **Authorization**: Anyone may register.

### Business Rules & Workflow
1. Normalizes and validates uniqueness of `email`.
2. Password must be at least 8 characters.
3. Automatically provisions an empty `UserProfile` attached to the user.
4. Generates a cryptographic 6-digit numeric OTP valid for **15 minutes**.
5. Sets `is_verified=False` and status to `active`.

### Side Effects
- Dispatches a Celery background task (`send_email_task`) to deliver the verification code via configured SMTP backend.

**Request body** — `application/json` (UserRegistrationRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `password` | string | yes |  |
| `first_name` | string | yes |  |
| `last_name` | string | yes |  |
| `phone` | string | no |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `201` | RegisterResponse | Account created successfully; verification OTP email queued. |
| `400` | ErrorDetail | Input validation failure (e.g. weak password or invalid email format). |
| `409` | ErrorDetail | An account with this email already exists. |

<details><summary>Response fields (201)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `email` | string(email) |  |

</details>

---

## POST `/api/v1/users/resend-otp/`

**Resend Registration OTP**

- **Auth:** public — no token
- **operationId:** `users_resend_otp_create`

### Summary
Invalidates prior unused registration OTPs and dispatches a fresh 6-digit OTP code to the user's email.

### Business Rules
- User must exist and not already be verified (`is_verified=False`).
- Generates a new 15-minute OTP and sends via SMTP.

**Request body** — `application/json` (ResendOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | MessageResponse | New verification code queued. |
| `400` | ErrorDetail | Account is already verified. |
| `404` | ErrorDetail | User not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string | Operation feedback message |

</details>

---

## POST `/api/v1/users/verify-signup-otp/`

**Verify Account Registration OTP**

- **Auth:** public — no token
- **operationId:** `users_verify_signup_otp_create`

### Summary
Validates the 6-digit registration OTP, marks the account as verified, and immediately generates initial session JWT tokens in Personal Profile context.

### Authentication & Authorization
- **Authentication**: None.
- **Authorization**: Public endpoint.

### Business Rules & Workflow
1. Verifies OTP matching the email and purpose `signup_verification`.
2. Validates that OTP has not expired (within 15 minutes) and has not already been used.
3. Sets `user.is_verified = True`.
4. Invalidates the used OTP.
5. Issues a JWT access and refresh token pair signed with `context_type: personal`.

**Request body** — `application/json` (VerifySignupOTPRequest)

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string(email) | yes |  |
| `otp_code` | string | yes |  |

**Responses**

| Status | Body | Description |
|---|---|---|
| `200` | VerifySignupResponse | Account verified; initial session tokens issued. |
| `400` | ErrorDetail | Invalid or expired OTP code. |
| `404` | ErrorDetail | User with this email was not found. |

<details><summary>Response fields (200)</summary>

| Field | Type | Notes |
|---|---|---|
| `message` | string |  |
| `user` | User |  |
| `tokens` | TokenResponse |  |

</details>

---
