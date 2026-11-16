"use client";

/**
 * Login & Security — contact info, password, two-factor, signed-in devices and the account lifecycle.
 *
 * Hand-written on purpose: these routes are newer than the committed OpenAPI document that
 * `lib/api/endpoints.ts` is generated from (and checked against), so they go through `request()` directly.
 *
 * Everything under `/users/settings/security/…` is also published at `/auth/settings/security/…`. `/users/`
 * is the documented base, so it goes first; `firstAvailable` falls back only when a route is absent.
 */
import * as api from "./endpoints";
import { firstAvailable } from "./fallback";
import { request, type RequestOptions } from "./http";

// ---------------------------------------------------------------- types

export type ContactInfo = {
  /** The sign-in email. Permanent: the API rejects any attempt to change or clear it. */
  primary_email: string;
  secondary_email: string | null;
  phone: string | null;
};

export type AccountStatus = {
  is_deactivated: boolean;
  deactivated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  /** True inside the 24-hour window after a delete request, while it can still be undone. */
  delete_pending: boolean;
};

export type SecurityOverview = {
  contact_info: ContactInfo;
  two_factor_enabled: boolean;
  logged_in_devices_count: number;
  max_devices?: number;
  account_status: Partial<AccountStatus>;
};

export type UserDevice = {
  /** The server's record id. */
  id: string;
  /** The identifier the client sent at sign-in. */
  device_id: string;
  device_name: string;
  ip_address: string | null;
  user_agent: string;
  last_login: string;
  created_at: string;
  is_current_device: boolean;
};

export type TwoFactorChannel = "primary_email" | "secondary_email" | "phone_sms";

/** What `POST /auth/login/` answers instead of tokens when the account has two-factor switched on. */
export type TwoFactorChallenge = {
  two_factor_required: true;
  message?: string;
  channel?: TwoFactorChannel | string;
  /** Masked address or number the code went to, e.g. "al***@manygym.com". */
  destination?: string;
  email: string;
};

export type DeviceIdentity = { device_id?: string; device_name?: string };

export type LifecycleAction = "deactivate" | "reactivate" | "delete" | "restore";

/** The slice of `UserSetting` the lifecycle endpoint returns that this screen cares about. */
export type LifecycleResult = {
  is_deactivated?: boolean;
  deactivated_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export const MAX_DEVICES = 5;

// ---------------------------------------------------------------- plumbing

const SECURITY = "settings/security/";

/** `/users/<suffix>` first, then its `/auth/<suffix>` alias. */
const both = <X,>(feature: string, method: string, suffix: string, opts?: RequestOptions) =>
  firstAvailable<X>(`security:${feature}`, [
    { path: `${method} /users/${suffix}`, call: () => request<X>(method, `/api/v1/users/${suffix}`, opts) },
    { path: `${method} /auth/${suffix}`, call: () => request<X>(method, `/api/v1/auth/${suffix}`, opts) },
  ]);

// ---------------------------------------------------------------- overview & contact info

/** `GET /users/settings/security/` */
export const overview = () => both<SecurityOverview>("overview", "GET", SECURITY);

/** `GET /users/settings/security/contact-info/` */
export const contactInfo = () => both<ContactInfo>("contact:get", "GET", `${SECURITY}contact-info/`);

/**
 * `PATCH /users/settings/security/contact-info/`.
 *
 * Deliberately has no way to pass `primary_email`: submitting it at all is a 400. `null` clears a field.
 */
export const updateContactInfo = (patch: { secondary_email?: string | null; phone?: string | null }) =>
  both<ContactInfo>("contact:patch", "PATCH", `${SECURITY}contact-info/`, { body: patch });

// ---------------------------------------------------------------- password

/**
 * `POST /users/settings/security/change-password/`, falling back to the older `/auth/change-password/` and
 * `/users/change-password/` routes for deployments that predate the security section. Only the newer route
 * documents `confirm_password`, so the fallbacks are sent without it.
 */
export function changePassword(current_password: string, new_password: string, confirm_password?: string) {
  const body = { current_password, new_password, ...(confirm_password !== undefined ? { confirm_password } : {}) };
  const legacy = { current_password, new_password };
  return firstAvailable<{ message?: string }>("security:change-password", [
    { path: "POST /users/settings/security/change-password/", call: () => request("POST", `/api/v1/users/${SECURITY}change-password/`, { body }) },
    { path: "POST /auth/settings/security/change-password/", call: () => request("POST", `/api/v1/auth/${SECURITY}change-password/`, { body }) },
    { path: "POST /auth/change-password/", call: () => api.authChangePasswordCreate(legacy) },
    { path: "POST /users/change-password/", call: () => api.usersChangePasswordCreate(legacy) },
  ]);
}

// ---------------------------------------------------------------- two-factor (settings)

/** `GET /users/settings/security/2fa/` */
export const twoFactor = () => both<{ two_factor_enabled: boolean }>("2fa:get", "GET", `${SECURITY}2fa/`);

/** `PATCH /users/settings/security/2fa/` */
export const setTwoFactor = (two_factor_enabled: boolean) =>
  both<{ two_factor_enabled: boolean }>("2fa:patch", "PATCH", `${SECURITY}2fa/`, { body: { two_factor_enabled } });

// ---------------------------------------------------------------- two-factor (sign-in challenge)

/** True when a login response is the two-factor challenge rather than a token pair. */
export const isTwoFactorChallenge = (res: unknown): res is TwoFactorChallenge =>
  !!res && typeof res === "object" && (res as { two_factor_required?: unknown }).two_factor_required === true;

/**
 * `POST /auth/verify-2fa/` — public, so it is sent without the stored bearer token: a left-over expired token
 * would otherwise get the request rejected with 401 before the code is even looked at.
 */
export const verifyTwoFactor = (email: string, otp_code: string, device: DeviceIdentity = {}) =>
  request<{ message?: string; tokens?: unknown }>("POST", `/api/v1/auth/verify-2fa/`, {
    body: { email, otp_code, ...device },
    anonymous: true,
  });

/** `POST /auth/resend-2fa/` — omit `channel` to let the server run its primary → secondary → SMS fallback. */
export const resendTwoFactor = (email: string, channel?: TwoFactorChannel) =>
  request<{ message?: string; channel?: string; destination?: string }>("POST", `/api/v1/auth/resend-2fa/`, {
    body: { email, ...(channel ? { channel } : {}) },
    anonymous: true,
  });

// ---------------------------------------------------------------- devices

/** `GET /users/settings/security/devices/` */
export const devices = () => both<UserDevice[]>("devices:list", "GET", `${SECURITY}devices/`);

/**
 * `DELETE /users/settings/security/devices/{device_id}/` — accepts the client `device_id` or the record `id`.
 * Revokes that device's tokens and deletes its end-to-end encryption key.
 */
export const removeDevice = (deviceId: string) =>
  both<{ message?: string }>("devices:remove", "DELETE", `${SECURITY}devices/${encodeURIComponent(deviceId)}/`);

// ---------------------------------------------------------------- account lifecycle

/**
 * `POST /users/settings/access-control/`.
 *
 *   deactivate — immediate; signing in again reactivates the account.
 *   delete     — needs the password and the literal confirmation "delete"; starts a 24-hour window in which
 *                signing in (or `restore`) cancels it.
 *   reactivate / restore — undo the above while still signed in; `restore` needs the password.
 */
export const lifecycle = (action: LifecycleAction, extra: { password?: string; confirmation?: string } = {}) =>
  both<LifecycleResult>("lifecycle", "POST", "settings/access-control/", { body: { action, ...extra } });
