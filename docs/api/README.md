# Many Gym API — reference

Multi-tenant gym management & social platform API, version 1.

| | |
|---|---|
| **Base URL** | `https://v0.manygym.com` |
| **Prefix** | `/api/v1` |
| **Auth** | Bearer JWT (`Authorization: Bearer <token>`) |
| **Endpoints** | 291 operations across 198 paths |
| **Schemas** | 307 |
| **Interactive docs** | https://v0.manygym.com/api/v1/docs/ |
| **Raw schema** | [`postman/spec/manygym-openapi.json`](../../postman/spec/manygym-openapi.json) |

## Getting a token

Authentication is two steps, because the token carries the *context* it was minted in.

```bash
# 1. personal-context token
curl -X POST https://v0.manygym.com/api/v1/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"…"}'

# 2. swap it for a gym-context token (this is what the admin endpoints need)
curl -X POST https://v0.manygym.com/api/v1/auth/switch-context/ \
  -H 'Authorization: Bearer <personal access token>' \
  -H 'Content-Type: application/json' \
  -d '{"context_type":"gym","gym_id":"<uuid>"}'
```

The gym token carries `{context_type: "gym", gym_id, scopes}`. A gym **owner** gets every permission; staff get
the scopes attached to their assigned role.

New accounts register with `POST /auth/register/`, then verify a 6-digit emailed code with
`POST /auth/verify-signup-otp/`, which itself returns a token pair.

An expired access token is renewed with `POST /auth/refresh/` (`{"refresh": "<token>"}`), which returns a new
pair in the same context and revokes the refresh token it was given.

## Errors

Every failure uses one envelope:

```json
{ "code": "VALIDATION_ERROR", "message": "Validation failed for the submitted data.",
  "details": { "email": ["This field is required."] } }
```

`code` is machine-readable. Codes observed live: `VALIDATION_ERROR`,
`AUTHENTICATION_REQUIRED`, `RESOURCE_NOT_FOUND`, `METHOD_NOT_ALLOWED`.
`message` is safe to show a person, and `details` carries per-field errors when there are any.

## Before you build against it

Three auth issues cannot be worked around from a client and are written up separately for whoever owns
the API: [for-the-backend-team.md](./for-the-backend-team.md).

Some forty contract gaps, design inconsistencies and hardening issues are catalogued in
[known-issues.md](./known-issues.md) — including an undocumented 120-character minimum, two different amenity id spaces, a staff endpoint that cannot invite anyone, and a
logout that does not revoke the token it was given.
Four of them are invisible in the schema and were found only by calling the API.

Every one of the 291 operations is classified against the reference client in this repo — called, reached
through a twin, or flagged as unused; see [coverage.md](./coverage.md). `npm run check:api` fails while any
operation is unaccounted for.

The domain pages and the two tables below are generated from the schema:
`node scripts/generate-api-docs.mjs --all --index`.

## Domains

| Domain | Endpoints | Paths |
|---|---|---|
| [Access Control & RBAC](./access-control-rbac.md) | 10 | access-control |
| [Amenities](./amenities.md) | 3 | amenities |
| [Password Management](./password-management.md) | 4 | auth |
| [User Follow Requests](./user-follow-requests.md) | 20 | auth, users |
| [Authentication & Sessions](./authentication-sessions.md) | 8 | auth, token |
| [User Profile](./user-profile.md) | 4 | auth, users |
| [User Identity & Onboarding](./user-identity-onboarding.md) | 3 | auth |
| [User Settings - Blocking](./user-settings-blocking.md) | 9 | auth, users |
| [User Settings - Login & Security](./user-settings-login-security.md) | 16 | auth, users |
| [Post Comments](./post-comments.md) | 22 | comments, posts |
| [Dashboard & Reports](./dashboard-reports.md) | 5 | dashboard, reports |
| [Enquiries CRM](./enquiries-crm.md) | 7 | enquiries |
| [Unified Social Follow](./unified-social-follow.md) | 6 | follows |
| [Gym Profile & Multi-Location](./gym-profile-multi-location.md) | 13 | gyms |
| [Alerts & Logs - Admin Logs](./alerts-logs-admin-logs.md) | 12 | gyms |
| [Gym Social & Follow](./gym-social-follow.md) | 8 | gyms |
| [Nearby Gym Discovery & Search](./nearby-gym-discovery-search.md) | 4 | gyms |
| [Gym Settings](./gym-settings.md) | 2 | gyms |
| [Gym Settings - Access & Control](./gym-settings-access-control.md) | 1 | gyms |
| [Gym Settings - Blocking](./gym-settings-blocking.md) | 5 | gyms |
| [Member Requests](./member-requests.md) | 11 | gyms, members |
| [health](./health.md) | 1 | health |
| [Leads CRM](./leads-crm.md) | 12 | leads |
| [Members & Lifecycle](./members-lifecycle.md) | 8 | members |
| [Members & Subscriptions](./members-subscriptions.md) | 4 | members |
| [Member Workouts](./member-workouts.md) | 4 | members |
| [Messaging](./messaging.md) | 10 | messaging |
| [Membership Plans](./membership-plans.md) | 8 | plans |
| [Community Feed](./community-feed.md) | 16 | posts |
| [reactions](./reactions.md) | 17 | reactions |
| [Routine Templates](./routine-templates.md) | 6 | routine-templates |
| [Stories](./stories.md) | 13 | stories |
| [User Profile -> About](./user-profile-about.md) | 4 | users |
| [User Profile -> Education](./user-profile-education.md) | 4 | users |
| [User Profile -> Social Links](./user-profile-social-links.md) | 4 | users |
| [User Settings](./user-settings.md) | 2 | users |
| [User Settings - Access & Control](./user-settings-access-control.md) | 1 | users |
| [User Social & Follow](./user-social-follow.md) | 4 | users |

## Every endpoint

| Method | Path | Auth | Summary |
|---|---|---|---|
| `GET` | [`/api/v1/access-control/permissions/`](./access-control-rbac.md#get-api-v1-access-control-permissions) | JWT | List System Permissions Grouped by Topic |
| `GET` | [`/api/v1/access-control/roles/`](./access-control-rbac.md#get-api-v1-access-control-roles) | JWT | List Available Roles |
| `POST` | [`/api/v1/access-control/roles/`](./access-control-rbac.md#post-api-v1-access-control-roles) | JWT | Create Custom Role |
| `GET` | [`/api/v1/access-control/roles/{role_id}/`](./access-control-rbac.md#get-api-v1-access-control-roles-role-id) | JWT | Get Role Details |
| `PATCH` | [`/api/v1/access-control/roles/{role_id}/`](./access-control-rbac.md#patch-api-v1-access-control-roles-role-id) | JWT | Update Custom Role |
| `DELETE` | [`/api/v1/access-control/roles/{role_id}/`](./access-control-rbac.md#delete-api-v1-access-control-roles-role-id) | JWT | Delete Custom Role |
| `GET` | [`/api/v1/access-control/staff/`](./access-control-rbac.md#get-api-v1-access-control-staff) | JWT | List Gym Staff Members |
| `POST` | [`/api/v1/access-control/staff/`](./access-control-rbac.md#post-api-v1-access-control-staff) | JWT | Invite Staff Member |
| `PATCH` | [`/api/v1/access-control/staff/{assignment_id}/`](./access-control-rbac.md#patch-api-v1-access-control-staff-assignment-id) | JWT | Update Staff Status (Active / Inactive) |
| `DELETE` | [`/api/v1/access-control/staff/{assignment_id}/`](./access-control-rbac.md#delete-api-v1-access-control-staff-assignment-id) | JWT | Revoke Staff Access |
| `GET` | [`/api/v1/amenities/catalog/`](./amenities.md#get-api-v1-amenities-catalog) | JWT | Get Master Amenities Catalog |
| `GET` | [`/api/v1/amenities/gym-amenities/`](./amenities.md#get-api-v1-amenities-gym-amenities) | JWT | Get Gym's Configured Amenities |
| `PUT` | [`/api/v1/amenities/gym-amenities/sync/`](./amenities.md#put-api-v1-amenities-gym-amenities-sync) | JWT | Sync Gym Amenities (Free & Paid) |
| `POST` | [`/api/v1/auth/change-password/`](./password-management.md#post-api-v1-auth-change-password) | JWT | Change Password |
| `GET` | [`/api/v1/auth/follow-requests/`](./user-follow-requests.md#get-api-v1-auth-follow-requests) | JWT | List Follow Requests |
| `POST` | [`/api/v1/auth/follow-requests/{request_id}/accept/`](./user-follow-requests.md#post-api-v1-auth-follow-requests-request-id-accept) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/auth/follow-requests/{request_id}/cancel/`](./user-follow-requests.md#post-api-v1-auth-follow-requests-request-id-cancel) | JWT | Cancel / Withdraw Follow Request |
| `DELETE` | [`/api/v1/auth/follow-requests/{request_id}/cancel/`](./user-follow-requests.md#delete-api-v1-auth-follow-requests-request-id-cancel) | JWT |  |
| `POST` | [`/api/v1/auth/follow-requests/{request_id}/reject/`](./user-follow-requests.md#post-api-v1-auth-follow-requests-request-id-reject) | JWT | Reject / Decline Follow Request |
| `POST` | [`/api/v1/auth/forgot-password/`](./password-management.md#post-api-v1-auth-forgot-password) | public | Request Password Reset OTP |
| `POST` | [`/api/v1/auth/login/`](./authentication-sessions.md#post-api-v1-auth-login) | public | User Authentication & Login |
| `POST` | [`/api/v1/auth/logout/`](./authentication-sessions.md#post-api-v1-auth-logout) | JWT | User Logout & Token Revocation |
| `GET` | [`/api/v1/auth/me/`](./user-profile.md#get-api-v1-auth-me) | JWT | Get Current User Profile & Accessible Gyms |
| `PATCH` | [`/api/v1/auth/me/`](./user-profile.md#patch-api-v1-auth-me) | JWT | Update Current User Profile |
| `POST` | [`/api/v1/auth/refresh/`](./authentication-sessions.md#post-api-v1-auth-refresh) | public | Refresh Contextual JWT Token |
| `POST` | [`/api/v1/auth/register/`](./user-identity-onboarding.md#post-api-v1-auth-register) | public | User Registration / Sign Up |
| `POST` | [`/api/v1/auth/resend-2fa/`](./authentication-sessions.md#post-api-v1-auth-resend-2fa) | public | Resend 2FA OTP Code |
| `POST` | [`/api/v1/auth/resend-otp/`](./user-identity-onboarding.md#post-api-v1-auth-resend-otp) | public | Resend Registration OTP |
| `POST` | [`/api/v1/auth/reset-password/`](./password-management.md#post-api-v1-auth-reset-password) | public | Reset Password with OTP |
| `POST` | [`/api/v1/auth/settings/blocked-users/followers/{user_id}/`](./user-settings-blocking.md#post-api-v1-auth-settings-blocked-users-followers-user-id) | JWT | Block User From Followers |
| `POST` | [`/api/v1/auth/settings/followers/{user_id}/block/`](./user-settings-blocking.md#post-api-v1-auth-settings-followers-user-id-block) | JWT | Block User From Followers |
| `GET` | [`/api/v1/auth/settings/security/`](./user-settings-login-security.md#get-api-v1-auth-settings-security) | JWT | Retrieve Login and Security Overview |
| `GET` | [`/api/v1/auth/settings/security/2fa/`](./user-settings-login-security.md#get-api-v1-auth-settings-security-2fa) | JWT | Retrieve 2FA Status |
| `PATCH` | [`/api/v1/auth/settings/security/2fa/`](./user-settings-login-security.md#patch-api-v1-auth-settings-security-2fa) | JWT | Toggle 2FA (ON/OFF) |
| `POST` | [`/api/v1/auth/settings/security/change-password/`](./user-settings-login-security.md#post-api-v1-auth-settings-security-change-password) | JWT | Change Password |
| `GET` | [`/api/v1/auth/settings/security/contact-info/`](./user-settings-login-security.md#get-api-v1-auth-settings-security-contact-info) | JWT | Retrieve Contact Information |
| `PATCH` | [`/api/v1/auth/settings/security/contact-info/`](./user-settings-login-security.md#patch-api-v1-auth-settings-security-contact-info) | JWT | Update Contact Information |
| `GET` | [`/api/v1/auth/settings/security/devices/`](./user-settings-login-security.md#get-api-v1-auth-settings-security-devices) | JWT | List Logged-In Devices |
| `DELETE` | [`/api/v1/auth/settings/security/devices/{device_id}/`](./user-settings-login-security.md#delete-api-v1-auth-settings-security-devices-device-id) | JWT | Delete Logged-In Device |
| `POST` | [`/api/v1/auth/switch-context/`](./authentication-sessions.md#post-api-v1-auth-switch-context) | JWT | Switch Token Context (Personal vs Gym) |
| `POST` | [`/api/v1/auth/token/refresh/`](./authentication-sessions.md#post-api-v1-auth-token-refresh) | public | Refresh Contextual JWT Token |
| `POST` | [`/api/v1/auth/verify-2fa/`](./authentication-sessions.md#post-api-v1-auth-verify-2fa) | public | Verify 2FA OTP Code |
| `POST` | [`/api/v1/auth/verify-reset-otp/`](./password-management.md#post-api-v1-auth-verify-reset-otp) | public | Verify Password Reset OTP |
| `POST` | [`/api/v1/auth/verify-signup-otp/`](./user-identity-onboarding.md#post-api-v1-auth-verify-signup-otp) | public | Verify Account Registration OTP |
| `POST` | [`/api/v1/auth/{user_id}/follow/accept/`](./user-follow-requests.md#post-api-v1-auth-user-id-follow-accept) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/auth/{user_id}/follow/cancel/`](./user-follow-requests.md#post-api-v1-auth-user-id-follow-cancel) | JWT | Cancel / Withdraw Follow Request |
| `DELETE` | [`/api/v1/auth/{user_id}/follow/cancel/`](./user-follow-requests.md#delete-api-v1-auth-user-id-follow-cancel) | JWT |  |
| `POST` | [`/api/v1/auth/{user_id}/follow/confirm/`](./user-follow-requests.md#post-api-v1-auth-user-id-follow-confirm) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/auth/{user_id}/follow/reject/`](./user-follow-requests.md#post-api-v1-auth-user-id-follow-reject) | JWT | Reject / Decline Follow Request |
| `GET` | [`/api/v1/comments/`](./post-comments.md#get-api-v1-comments) | public | List Paginated Post Comments (with Nested Replies) |
| `POST` | [`/api/v1/comments/`](./post-comments.md#post-api-v1-comments) | JWT | Create Comment or Reply on a Post |
| `GET` | [`/api/v1/comments/{comment_id}/`](./post-comments.md#get-api-v1-comments-comment-id) | public | Get Comment Detail (with Optional Nested Thread) |
| `PATCH` | [`/api/v1/comments/{comment_id}/`](./post-comments.md#patch-api-v1-comments-comment-id) | JWT | Update a Comment or Reply |
| `DELETE` | [`/api/v1/comments/{comment_id}/`](./post-comments.md#delete-api-v1-comments-comment-id) | JWT | Delete a Comment or Reply |
| `GET` | [`/api/v1/comments/{comment_id}/reactions/`](./post-comments.md#get-api-v1-comments-comment-id-reactions) | public | List reactions for a comment |
| `POST` | [`/api/v1/comments/{comment_id}/reactions/`](./post-comments.md#post-api-v1-comments-comment-id-reactions) | JWT | React or toggle reaction on a comment |
| `DELETE` | [`/api/v1/comments/{comment_id}/reactions/`](./post-comments.md#delete-api-v1-comments-comment-id-reactions) | JWT | Remove reaction from a comment |
| `GET` | [`/api/v1/comments/{comment_id}/reactions/summary/`](./post-comments.md#get-api-v1-comments-comment-id-reactions-summary) | public | Get comment reactions summary |
| `GET` | [`/api/v1/comments/{comment_id}/replies/`](./post-comments.md#get-api-v1-comments-comment-id-replies) | public | List Paginated Replies to a Comment |
| `POST` | [`/api/v1/comments/{comment_id}/replies/`](./post-comments.md#post-api-v1-comments-comment-id-replies) | JWT | Reply to a Comment |
| `GET` | [`/api/v1/dashboard/summary/`](./dashboard-reports.md#get-api-v1-dashboard-summary) | JWT | Executive Dashboard Summary |
| `GET` | [`/api/v1/enquiries/`](./enquiries-crm.md#get-api-v1-enquiries) | JWT | List Enquiries |
| `POST` | [`/api/v1/enquiries/`](./enquiries-crm.md#post-api-v1-enquiries) | JWT | Create a New Enquiry |
| `GET` | [`/api/v1/enquiries/{enquiry_id}/`](./enquiries-crm.md#get-api-v1-enquiries-enquiry-id) | JWT | View an Enquiry |
| `PUT` | [`/api/v1/enquiries/{enquiry_id}/`](./enquiries-crm.md#put-api-v1-enquiries-enquiry-id) | JWT |  |
| `PATCH` | [`/api/v1/enquiries/{enquiry_id}/`](./enquiries-crm.md#patch-api-v1-enquiries-enquiry-id) | JWT | Update an Enquiry |
| `DELETE` | [`/api/v1/enquiries/{enquiry_id}/`](./enquiries-crm.md#delete-api-v1-enquiries-enquiry-id) | JWT | Delete an Enquiry |
| `POST` | [`/api/v1/enquiries/{enquiry_id}/notes/`](./enquiries-crm.md#post-api-v1-enquiries-enquiry-id-notes) | JWT | Add Note to Enquiry |
| `GET` | [`/api/v1/follows/`](./unified-social-follow.md#get-api-v1-follows) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follows/`](./unified-social-follow.md#post-api-v1-follows) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follows/`](./unified-social-follow.md#delete-api-v1-follows) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#get-api-v1-follows-target-id) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#post-api-v1-follows-target-id) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#delete-api-v1-follows-target-id) | JWT | Unfollow a User or Gym |
| `POST` | [`/api/v1/gyms/`](./gym-profile-multi-location.md#post-api-v1-gyms) | JWT | Create New Gym Workspace |
| `GET` | [`/api/v1/gyms/admin-logs/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-admin-logs) | JWT | List Admin Logs |
| `POST` | [`/api/v1/gyms/admin-logs/`](./alerts-logs-admin-logs.md#post-api-v1-gyms-admin-logs) | JWT | Record Admin Log Entry |
| `GET` | [`/api/v1/gyms/admin-logs/actions/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-admin-logs-actions) | JWT | List Admin Log Categories & Action Types |
| `GET` | [`/api/v1/gyms/admin-logs/export/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-admin-logs-export) | JWT | Export Admin Logs |
| `GET` | [`/api/v1/gyms/admin-logs/metrics/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-admin-logs-metrics) | JWT | Retrieve Admin Logs Metrics |
| `GET` | [`/api/v1/gyms/admin-logs/{log_id}/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-admin-logs-log-id) | JWT | Retrieve Admin Log Detail |
| `GET` | [`/api/v1/gyms/followed/`](./gym-social-follow.md#get-api-v1-gyms-followed) | JWT | List Gyms Followed by User |
| `GET` | [`/api/v1/gyms/gallery/`](./gym-profile-multi-location.md#get-api-v1-gyms-gallery) | JWT | List Gallery Media Assets |
| `POST` | [`/api/v1/gyms/gallery/`](./gym-profile-multi-location.md#post-api-v1-gyms-gallery) | JWT | Add Gallery Media Asset |
| `PATCH` | [`/api/v1/gyms/gallery/reorder/`](./gym-profile-multi-location.md#patch-api-v1-gyms-gallery-reorder) | JWT | Reorder Gallery Assets |
| `DELETE` | [`/api/v1/gyms/gallery/{item_id}/`](./gym-profile-multi-location.md#delete-api-v1-gyms-gallery-item-id) | JWT | Delete Gallery Media Asset |
| `GET` | [`/api/v1/gyms/logs/admin/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-logs-admin) | JWT | List Admin Logs |
| `POST` | [`/api/v1/gyms/logs/admin/`](./alerts-logs-admin-logs.md#post-api-v1-gyms-logs-admin) | JWT | Record Admin Log Entry |
| `GET` | [`/api/v1/gyms/logs/admin/actions/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-logs-admin-actions) | JWT | List Admin Log Categories & Action Types |
| `GET` | [`/api/v1/gyms/logs/admin/export/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-logs-admin-export) | JWT | Export Admin Logs |
| `GET` | [`/api/v1/gyms/logs/admin/metrics/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-logs-admin-metrics) | JWT | Retrieve Admin Logs Metrics |
| `GET` | [`/api/v1/gyms/logs/admin/{log_id}/`](./alerts-logs-admin-logs.md#get-api-v1-gyms-logs-admin-log-id) | JWT | Retrieve Admin Log Detail |
| `GET` | [`/api/v1/gyms/nearby/`](./nearby-gym-discovery-search.md#get-api-v1-gyms-nearby) | public | Search Nearby Gyms (Live Location or City) |
| `GET` | [`/api/v1/gyms/opening-hours/`](./gym-profile-multi-location.md#get-api-v1-gyms-opening-hours) | JWT | Get Weekly Operating Hours |
| `PUT` | [`/api/v1/gyms/opening-hours/`](./gym-profile-multi-location.md#put-api-v1-gyms-opening-hours) | JWT | Bulk Update Weekly Operating Hours |
| `GET` | [`/api/v1/gyms/profile/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile) | JWT | Get Gym Profile Overview |
| `PATCH` | [`/api/v1/gyms/profile/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile) | JWT | Update Gym Overview Tab |
| `GET` | [`/api/v1/gyms/profile/location/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile-location) | JWT | Get Gym Physical Location |
| `PATCH` | [`/api/v1/gyms/profile/location/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile-location) | JWT | Update Gym Location & Map Coordinates |
| `GET` | [`/api/v1/gyms/profile/overview/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile-overview) | JWT | Get Gym Profile Overview |
| `PATCH` | [`/api/v1/gyms/profile/overview/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile-overview) | JWT | Update Gym Overview Tab |
| `GET` | [`/api/v1/gyms/search/`](./nearby-gym-discovery-search.md#get-api-v1-gyms-search) | public | Search Nearby Gyms (Live Location or City) |
| `GET` | [`/api/v1/gyms/settings/`](./gym-settings.md#get-api-v1-gyms-settings) | JWT | Retrieve Gym Settings |
| `PATCH` | [`/api/v1/gyms/settings/`](./gym-settings.md#patch-api-v1-gyms-settings) | JWT | Update Gym Settings |
| `POST` | [`/api/v1/gyms/settings/access-control/`](./gym-settings-access-control.md#post-api-v1-gyms-settings-access-control) | JWT | Perform Access & Control Action |
| `GET` | [`/api/v1/gyms/settings/blocked-users/`](./gym-settings-blocking.md#get-api-v1-gyms-settings-blocked-users) | JWT | List Blocked Users |
| `POST` | [`/api/v1/gyms/settings/blocked-users/`](./gym-settings-blocking.md#post-api-v1-gyms-settings-blocked-users) | JWT | Block a User |
| `GET` | [`/api/v1/gyms/settings/blocked-users/search/`](./gym-settings-blocking.md#get-api-v1-gyms-settings-blocked-users-search) | JWT | Search Users to Block |
| `DELETE` | [`/api/v1/gyms/settings/blocked-users/{user_id}/`](./gym-settings-blocking.md#delete-api-v1-gyms-settings-blocked-users-user-id) | JWT | Unblock a User |
| `GET` | [`/api/v1/gyms/{gym_id}/detail/`](./nearby-gym-discovery-search.md#get-api-v1-gyms-gym-id-detail) | public | Get Public Gym Details |
| `POST` | [`/api/v1/gyms/{gym_id}/follow/`](./gym-social-follow.md#post-api-v1-gyms-gym-id-follow) | JWT | Follow a Gym |
| `DELETE` | [`/api/v1/gyms/{gym_id}/follow/`](./gym-social-follow.md#delete-api-v1-gyms-gym-id-follow) | JWT | Unfollow a Gym |
| `GET` | [`/api/v1/gyms/{gym_id}/followers/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-followers) | JWT | List Gym Followers |
| `POST` | [`/api/v1/gyms/{gym_id}/followers/{user_id}/block/`](./gym-settings-blocking.md#post-api-v1-gyms-gym-id-followers-user-id-block) | JWT | Block User from Followers |
| `GET` | [`/api/v1/gyms/{gym_id}/following/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-following) | JWT | List People and Pages Gym Follows |
| `GET` | [`/api/v1/gyms/{gym_id}/join-request/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-join-request) | JWT | Get Member Joining Request Status |
| `POST` | [`/api/v1/gyms/{gym_id}/join-request/`](./gym-social-follow.md#post-api-v1-gyms-gym-id-join-request) | JWT | Submit Member Joining Request |
| `GET` | [`/api/v1/gyms/{gym_id}/member-requests/`](./member-requests.md#get-api-v1-gyms-gym-id-member-requests) | JWT | List Member Joining Requests |
| `POST` | [`/api/v1/gyms/{gym_id}/member-requests/`](./member-requests.md#post-api-v1-gyms-gym-id-member-requests) | JWT | Submit Member Joining Request |
| `GET` | [`/api/v1/gyms/{gym_id}/member-requests/{request_id}/`](./member-requests.md#get-api-v1-gyms-gym-id-member-requests-request-id) | JWT | Get Member Request Detail |
| `POST` | [`/api/v1/gyms/{gym_id}/member-requests/{request_id}/accept/`](./member-requests.md#post-api-v1-gyms-gym-id-member-requests-request-id-accept) | JWT | Accept Member Request |
| `POST` | [`/api/v1/gyms/{gym_id}/member-requests/{request_id}/reject/`](./member-requests.md#post-api-v1-gyms-gym-id-member-requests-request-id-reject) | JWT | Reject Member Request |
| `GET` | [`/api/v1/gyms/{gym_id}/members/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-members) | JWT | List Gym Members (Audience) |
| `GET` | [`/api/v1/gyms/{gym_id}/public/`](./nearby-gym-discovery-search.md#get-api-v1-gyms-gym-id-public) | public | Get Public Gym Details |
| `GET` | [`/api/v1/health/`](./health.md#get-api-v1-health) | public | Service Health Check |
| `GET` | [`/api/v1/leads/`](./leads-crm.md#get-api-v1-leads) | JWT | List Leads |
| `POST` | [`/api/v1/leads/`](./leads-crm.md#post-api-v1-leads) | JWT | Create Lead |
| `GET` | [`/api/v1/leads/metrics/`](./leads-crm.md#get-api-v1-leads-metrics) | JWT | Lead Pipeline Metrics |
| `GET` | [`/api/v1/leads/reasons/`](./leads-crm.md#get-api-v1-leads-reasons) | JWT | List Lost Reasons |
| `POST` | [`/api/v1/leads/reasons/`](./leads-crm.md#post-api-v1-leads-reasons) | JWT | Create Custom Lost Reason |
| `GET` | [`/api/v1/leads/{lead_id}/`](./leads-crm.md#get-api-v1-leads-lead-id) | JWT | Get Lead Dossier |
| `PATCH` | [`/api/v1/leads/{lead_id}/`](./leads-crm.md#patch-api-v1-leads-lead-id) | JWT | Update Lead |
| `DELETE` | [`/api/v1/leads/{lead_id}/`](./leads-crm.md#delete-api-v1-leads-lead-id) | JWT | Delete Lead |
| `POST` | [`/api/v1/leads/{lead_id}/convert/`](./leads-crm.md#post-api-v1-leads-lead-id-convert) | JWT | Convert Lead to Member |
| `POST` | [`/api/v1/leads/{lead_id}/next-moves/`](./leads-crm.md#post-api-v1-leads-lead-id-next-moves) | JWT | Schedule Next Move |
| `PATCH` | [`/api/v1/leads/{lead_id}/next-moves/{move_id}/`](./leads-crm.md#patch-api-v1-leads-lead-id-next-moves-move-id) | JWT | Update Next Move |
| `POST` | [`/api/v1/leads/{lead_id}/notes/`](./leads-crm.md#post-api-v1-leads-lead-id-notes) | JWT | Add Lead Note |
| `GET` | [`/api/v1/members/`](./members-lifecycle.md#get-api-v1-members) | JWT | List Gym Members |
| `POST` | [`/api/v1/members/`](./members-lifecycle.md#post-api-v1-members) | JWT | Create / Onboard Member |
| `POST` | [`/api/v1/members/accept-invitation/`](./members-lifecycle.md#post-api-v1-members-accept-invitation) | JWT | Accept Member Invitation |
| `GET` | [`/api/v1/members/metrics/`](./members-lifecycle.md#get-api-v1-members-metrics) | JWT | Get Member Directory Metrics |
| `GET` | [`/api/v1/members/requests/`](./member-requests.md#get-api-v1-members-requests) | JWT | List Member Joining Requests |
| `POST` | [`/api/v1/members/requests/`](./member-requests.md#post-api-v1-members-requests) | JWT | Submit Member Joining Request |
| `GET` | [`/api/v1/members/requests/{request_id}/`](./member-requests.md#get-api-v1-members-requests-request-id) | JWT | Get Member Request Detail |
| `POST` | [`/api/v1/members/requests/{request_id}/accept/`](./member-requests.md#post-api-v1-members-requests-request-id-accept) | JWT | Accept Member Request |
| `POST` | [`/api/v1/members/requests/{request_id}/cancel/`](./member-requests.md#post-api-v1-members-requests-request-id-cancel) | JWT | Cancel Own Member Request |
| `POST` | [`/api/v1/members/requests/{request_id}/reject/`](./member-requests.md#post-api-v1-members-requests-request-id-reject) | JWT | Reject Member Request |
| `POST` | [`/api/v1/members/subscriptions/{subscription_id}/extra-amenities/`](./members-subscriptions.md#post-api-v1-members-subscriptions-subscription-id-extra-amenities) | JWT | Attach Extra Amenities |
| `POST` | [`/api/v1/members/subscriptions/{subscription_id}/payments/`](./members-subscriptions.md#post-api-v1-members-subscriptions-subscription-id-payments) | JWT | Log Subscription Payment |
| `PATCH` | [`/api/v1/members/subscriptions/{subscription_id}/status/`](./members-subscriptions.md#patch-api-v1-members-subscriptions-subscription-id-status) | JWT | Transition Subscription Status |
| `GET` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#get-api-v1-members-member-id) | JWT | Get Member Dossier |
| `PATCH` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#patch-api-v1-members-member-id) | JWT | Update Member Details |
| `DELETE` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#delete-api-v1-members-member-id) | JWT | Delete Member |
| `POST` | [`/api/v1/members/{member_id}/resend-invitation/`](./members-lifecycle.md#post-api-v1-members-member-id-resend-invitation) | JWT | Resend Onboarding Invitation |
| `GET` | [`/api/v1/members/{member_id}/routines/`](./member-workouts.md#get-api-v1-members-member-id-routines) | JWT | List Member Routines |
| `POST` | [`/api/v1/members/{member_id}/routines/assign/`](./member-workouts.md#post-api-v1-members-member-id-routines-assign) | JWT | Assign Routine to Member |
| `GET` | [`/api/v1/members/{member_id}/routines/{routine_id}/`](./member-workouts.md#get-api-v1-members-member-id-routines-routine-id) | JWT | Get Member Routine Dossier |
| `PATCH` | [`/api/v1/members/{member_id}/routines/{routine_id}/`](./member-workouts.md#patch-api-v1-members-member-id-routines-routine-id) | JWT | Customize Member Routine |
| `POST` | [`/api/v1/members/{member_id}/subscriptions/`](./members-subscriptions.md#post-api-v1-members-member-id-subscriptions) | JWT | Attach Subscription to Member |
| `GET` | [`/api/v1/messaging/conversations/`](./messaging.md#get-api-v1-messaging-conversations) | JWT | List Conversations |
| `POST` | [`/api/v1/messaging/conversations/`](./messaging.md#post-api-v1-messaging-conversations) | JWT | Create / Get Conversation |
| `GET` | [`/api/v1/messaging/conversations/{conversation_id}/`](./messaging.md#get-api-v1-messaging-conversations-conversation-id) | JWT | Get Conversation Detail |
| `GET` | [`/api/v1/messaging/conversations/{conversation_id}/messages/`](./messaging.md#get-api-v1-messaging-conversations-conversation-id-messages) | JWT | Get Encrypted Message History |
| `POST` | [`/api/v1/messaging/conversations/{conversation_id}/messages/`](./messaging.md#post-api-v1-messaging-conversations-conversation-id-messages) | JWT | Send Encrypted Message |
| `POST` | [`/api/v1/messaging/conversations/{conversation_id}/read/`](./messaging.md#post-api-v1-messaging-conversations-conversation-id-read) | JWT | Mark Conversation Read |
| `POST` | [`/api/v1/messaging/keys/gym/register/`](./messaging.md#post-api-v1-messaging-keys-gym-register) | JWT | Register Gym E2EE Key Bundle |
| `GET` | [`/api/v1/messaging/keys/gym/{gym_id}/`](./messaging.md#get-api-v1-messaging-keys-gym-gym-id) | JWT | Get Gym E2EE Public Key Bundle |
| `POST` | [`/api/v1/messaging/keys/register/`](./messaging.md#post-api-v1-messaging-keys-register) | JWT | Register User Device E2EE Key Bundle |
| `GET` | [`/api/v1/messaging/keys/user/{user_id}/`](./messaging.md#get-api-v1-messaging-keys-user-user-id) | JWT | Get User E2EE Public Key Bundle |
| `GET` | [`/api/v1/plans/`](./membership-plans.md#get-api-v1-plans) | JWT | List Gym Membership Plans |
| `POST` | [`/api/v1/plans/`](./membership-plans.md#post-api-v1-plans) | JWT | Create Membership Plan (5-Step Lifecycle) |
| `GET` | [`/api/v1/plans/metrics/`](./membership-plans.md#get-api-v1-plans-metrics) | JWT | Get Gym Plan Pricing Metrics |
| `GET` | [`/api/v1/plans/{plan_id}/`](./membership-plans.md#get-api-v1-plans-plan-id) | JWT | Get Membership Plan Details |
| `PATCH` | [`/api/v1/plans/{plan_id}/`](./membership-plans.md#patch-api-v1-plans-plan-id) | JWT | Update Membership Plan |
| `DELETE` | [`/api/v1/plans/{plan_id}/`](./membership-plans.md#delete-api-v1-plans-plan-id) | JWT | Delete Membership Plan |
| `PUT` | [`/api/v1/plans/{plan_id}/amenities/`](./membership-plans.md#put-api-v1-plans-plan-id-amenities) | JWT | Sync Included Amenities |
| `POST` | [`/api/v1/plans/{plan_id}/status/`](./membership-plans.md#post-api-v1-plans-plan-id-status) | JWT | Transition Membership Plan Status |
| `GET` | [`/api/v1/posts/`](./community-feed.md#get-api-v1-posts) | public | List Community & Profile Feed |
| `POST` | [`/api/v1/posts/`](./community-feed.md#post-api-v1-posts) | JWT | Create Post or Repost |
| `GET` | [`/api/v1/posts/feed/`](./community-feed.md#get-api-v1-posts-feed) | public | List Community & Profile Feed |
| `POST` | [`/api/v1/posts/feed/`](./community-feed.md#post-api-v1-posts-feed) | JWT | Create Post or Repost |
| `GET` | [`/api/v1/posts/my/`](./community-feed.md#get-api-v1-posts-my) | JWT | List My Profile Feed (Personal or Gym) |
| `POST` | [`/api/v1/posts/repost/`](./community-feed.md#post-api-v1-posts-repost) | JWT | Repost Post (Share on Profile or Share on Story) |
| `GET` | [`/api/v1/posts/{post_id}/`](./community-feed.md#get-api-v1-posts-post-id) | public | Get Post Detail |
| `PATCH` | [`/api/v1/posts/{post_id}/`](./community-feed.md#patch-api-v1-posts-post-id) | JWT | Update Post or Repost |
| `DELETE` | [`/api/v1/posts/{post_id}/`](./community-feed.md#delete-api-v1-posts-post-id) | JWT | Delete Post or Repost |
| `GET` | [`/api/v1/posts/{post_id}/comments/`](./post-comments.md#get-api-v1-posts-post-id-comments) | public | List Paginated Post Comments (with Nested Replies) |
| `POST` | [`/api/v1/posts/{post_id}/comments/`](./post-comments.md#post-api-v1-posts-post-id-comments) | JWT | Create Comment or Reply on a Post |
| `GET` | [`/api/v1/posts/{post_id}/comments/{comment_id}/`](./post-comments.md#get-api-v1-posts-post-id-comments-comment-id) | public | Get Comment Detail (with Optional Nested Thread) |
| `PATCH` | [`/api/v1/posts/{post_id}/comments/{comment_id}/`](./post-comments.md#patch-api-v1-posts-post-id-comments-comment-id) | JWT | Update a Comment or Reply |
| `DELETE` | [`/api/v1/posts/{post_id}/comments/{comment_id}/`](./post-comments.md#delete-api-v1-posts-post-id-comments-comment-id) | JWT | Delete a Comment or Reply |
| `GET` | [`/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`](./post-comments.md#get-api-v1-posts-post-id-comments-comment-id-reactions) | public | List reactions for a comment |
| `POST` | [`/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`](./post-comments.md#post-api-v1-posts-post-id-comments-comment-id-reactions) | JWT | React or toggle reaction on a comment |
| `DELETE` | [`/api/v1/posts/{post_id}/comments/{comment_id}/reactions/`](./post-comments.md#delete-api-v1-posts-post-id-comments-comment-id-reactions) | JWT | Remove reaction from a comment |
| `GET` | [`/api/v1/posts/{post_id}/comments/{comment_id}/reactions/summary/`](./post-comments.md#get-api-v1-posts-post-id-comments-comment-id-reactions-summary) | public | Get comment reactions summary |
| `GET` | [`/api/v1/posts/{post_id}/comments/{comment_id}/replies/`](./post-comments.md#get-api-v1-posts-post-id-comments-comment-id-replies) | public | List Paginated Replies to a Comment |
| `POST` | [`/api/v1/posts/{post_id}/comments/{comment_id}/replies/`](./post-comments.md#post-api-v1-posts-post-id-comments-comment-id-replies) | JWT | Reply to a Comment |
| `PATCH` | [`/api/v1/posts/{post_id}/media/{media_id}/thumbnail/`](./community-feed.md#patch-api-v1-posts-post-id-media-media-id-thumbnail) | JWT | Upload Custom Video Thumbnail |
| `GET` | [`/api/v1/posts/{post_id}/reactions/`](./community-feed.md#get-api-v1-posts-post-id-reactions) | public | List reactions for a post |
| `POST` | [`/api/v1/posts/{post_id}/reactions/`](./community-feed.md#post-api-v1-posts-post-id-reactions) | JWT | React or toggle reaction on a post |
| `DELETE` | [`/api/v1/posts/{post_id}/reactions/`](./community-feed.md#delete-api-v1-posts-post-id-reactions) | JWT | Remove reaction from a post |
| `GET` | [`/api/v1/posts/{post_id}/reactions/summary/`](./community-feed.md#get-api-v1-posts-post-id-reactions-summary) | public | Get post reactions summary |
| `POST` | [`/api/v1/posts/{post_id}/repost/`](./community-feed.md#post-api-v1-posts-post-id-repost) | JWT | Repost Post (Share on Profile or Share on Story) |
| `GET` | [`/api/v1/posts/{post_id}/reposts/`](./community-feed.md#get-api-v1-posts-post-id-reposts) | public | List Reposts of a Post |
| `GET` | [`/api/v1/reactions/`](./reactions.md#get-api-v1-reactions) | public | List reactions across targets |
| `POST` | [`/api/v1/reactions/`](./reactions.md#post-api-v1-reactions) | JWT | Create or toggle reaction on any target |
| `GET` | [`/api/v1/reactions/comments/{comment_id}/`](./reactions.md#get-api-v1-reactions-comments-comment-id) | public | List reactions for a comment |
| `POST` | [`/api/v1/reactions/comments/{comment_id}/`](./reactions.md#post-api-v1-reactions-comments-comment-id) | JWT | React or toggle reaction on a comment |
| `DELETE` | [`/api/v1/reactions/comments/{comment_id}/`](./reactions.md#delete-api-v1-reactions-comments-comment-id) | JWT | Remove reaction from a comment |
| `GET` | [`/api/v1/reactions/comments/{comment_id}/summary/`](./reactions.md#get-api-v1-reactions-comments-comment-id-summary) | public | Get comment reactions summary |
| `GET` | [`/api/v1/reactions/items/`](./reactions.md#get-api-v1-reactions-items) | public | List available reaction items |
| `GET` | [`/api/v1/reactions/posts/{post_id}/`](./reactions.md#get-api-v1-reactions-posts-post-id) | public | List reactions for a post |
| `POST` | [`/api/v1/reactions/posts/{post_id}/`](./reactions.md#post-api-v1-reactions-posts-post-id) | JWT | React or toggle reaction on a post |
| `DELETE` | [`/api/v1/reactions/posts/{post_id}/`](./reactions.md#delete-api-v1-reactions-posts-post-id) | JWT | Remove reaction from a post |
| `GET` | [`/api/v1/reactions/posts/{post_id}/summary/`](./reactions.md#get-api-v1-reactions-posts-post-id-summary) | public | Get post reactions summary |
| `GET` | [`/api/v1/reactions/stories/{story_id}/`](./reactions.md#get-api-v1-reactions-stories-story-id) | public | List reactions for a story |
| `POST` | [`/api/v1/reactions/stories/{story_id}/`](./reactions.md#post-api-v1-reactions-stories-story-id) | JWT | React or toggle reaction on a story |
| `DELETE` | [`/api/v1/reactions/stories/{story_id}/`](./reactions.md#delete-api-v1-reactions-stories-story-id) | JWT | Remove reaction from a story |
| `GET` | [`/api/v1/reactions/stories/{story_id}/summary/`](./reactions.md#get-api-v1-reactions-stories-story-id-summary) | public | Get story reactions summary |
| `GET` | [`/api/v1/reactions/{reaction_id}/`](./reactions.md#get-api-v1-reactions-reaction-id) | JWT | Retrieve reaction details by ID |
| `DELETE` | [`/api/v1/reactions/{reaction_id}/`](./reactions.md#delete-api-v1-reactions-reaction-id) | JWT | Delete reaction by ID |
| `GET` | [`/api/v1/reports/leads-funnel/`](./dashboard-reports.md#get-api-v1-reports-leads-funnel) | JWT | Lead Conversion Funnel Report |
| `GET` | [`/api/v1/reports/membership-growth/`](./dashboard-reports.md#get-api-v1-reports-membership-growth) | JWT | Membership Growth & Churn Report |
| `GET` | [`/api/v1/reports/revenue/`](./dashboard-reports.md#get-api-v1-reports-revenue) | JWT | Revenue & Collections Report |
| `GET` | [`/api/v1/reports/trainer-workload/`](./dashboard-reports.md#get-api-v1-reports-trainer-workload) | JWT | Trainer Workload & Allocation Report |
| `GET` | [`/api/v1/routine-templates/`](./routine-templates.md#get-api-v1-routine-templates) | JWT | List Routine Templates |
| `POST` | [`/api/v1/routine-templates/`](./routine-templates.md#post-api-v1-routine-templates) | JWT | Create Routine Template |
| `GET` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#get-api-v1-routine-templates-template-id) | JWT | Get Routine Template Dossier |
| `PUT` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#put-api-v1-routine-templates-template-id) | JWT | Full Update Routine Template |
| `PATCH` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#patch-api-v1-routine-templates-template-id) | JWT | Partial Update Routine Template |
| `DELETE` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#delete-api-v1-routine-templates-template-id) | JWT | Delete Routine Template |
| `GET` | [`/api/v1/stories/`](./stories.md#get-api-v1-stories) | public | List Active Stories |
| `POST` | [`/api/v1/stories/`](./stories.md#post-api-v1-stories) | JWT | Upload Story |
| `GET` | [`/api/v1/stories/my/`](./stories.md#get-api-v1-stories-my) | JWT | List My Stories (Personal or Gym) |
| `GET` | [`/api/v1/stories/tray/`](./stories.md#get-api-v1-stories-tray) | public | Get Story Tray (Grouped by Owner) |
| `GET` | [`/api/v1/stories/{story_id}/`](./stories.md#get-api-v1-stories-story-id) | public | Get Story Detail |
| `PATCH` | [`/api/v1/stories/{story_id}/`](./stories.md#patch-api-v1-stories-story-id) | JWT | Update Story |
| `DELETE` | [`/api/v1/stories/{story_id}/`](./stories.md#delete-api-v1-stories-story-id) | JWT | Delete Story |
| `GET` | [`/api/v1/stories/{story_id}/reactions/`](./stories.md#get-api-v1-stories-story-id-reactions) | public | List reactions for a story |
| `POST` | [`/api/v1/stories/{story_id}/reactions/`](./stories.md#post-api-v1-stories-story-id-reactions) | JWT | React or toggle reaction on a story |
| `DELETE` | [`/api/v1/stories/{story_id}/reactions/`](./stories.md#delete-api-v1-stories-story-id-reactions) | JWT | Remove reaction from a story |
| `GET` | [`/api/v1/stories/{story_id}/reactions/summary/`](./stories.md#get-api-v1-stories-story-id-reactions-summary) | public | Get story reactions summary |
| `POST` | [`/api/v1/stories/{story_id}/view/`](./stories.md#post-api-v1-stories-story-id-view) | JWT | Record Story View |
| `GET` | [`/api/v1/stories/{story_id}/viewers/`](./stories.md#get-api-v1-stories-story-id-viewers) | JWT | List Story Viewers |
| `POST` | [`/api/v1/token/refresh/`](./authentication-sessions.md#post-api-v1-token-refresh) | public | Refresh Contextual JWT Token |
| `GET` | [`/api/v1/users/follow-requests/`](./user-follow-requests.md#get-api-v1-users-follow-requests) | JWT | List Follow Requests |
| `POST` | [`/api/v1/users/follow-requests/{request_id}/accept/`](./user-follow-requests.md#post-api-v1-users-follow-requests-request-id-accept) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/users/follow-requests/{request_id}/cancel/`](./user-follow-requests.md#post-api-v1-users-follow-requests-request-id-cancel) | JWT | Cancel / Withdraw Follow Request |
| `DELETE` | [`/api/v1/users/follow-requests/{request_id}/cancel/`](./user-follow-requests.md#delete-api-v1-users-follow-requests-request-id-cancel) | JWT |  |
| `POST` | [`/api/v1/users/follow-requests/{request_id}/reject/`](./user-follow-requests.md#post-api-v1-users-follow-requests-request-id-reject) | JWT | Reject / Decline Follow Request |
| `POST` | [`/api/v1/users/followers/{user_id}/block/`](./user-settings-blocking.md#post-api-v1-users-followers-user-id-block) | JWT | Block User From Followers |
| `GET` | [`/api/v1/users/me/`](./user-profile.md#get-api-v1-users-me) | JWT | Get Current User Profile & Accessible Gyms |
| `PATCH` | [`/api/v1/users/me/`](./user-profile.md#patch-api-v1-users-me) | JWT | Update Current User Profile |
| `GET` | [`/api/v1/users/profile/about/`](./user-profile-about.md#get-api-v1-users-profile-about) | JWT | Get Current User 'About' Profile |
| `PUT` | [`/api/v1/users/profile/about/`](./user-profile-about.md#put-api-v1-users-profile-about) | JWT |  |
| `PATCH` | [`/api/v1/users/profile/about/`](./user-profile-about.md#patch-api-v1-users-profile-about) | JWT | Update Current User 'About' Profile |
| `GET` | [`/api/v1/users/profile/about/educations/`](./user-profile-education.md#get-api-v1-users-profile-about-educations) | JWT | List User Education Records |
| `POST` | [`/api/v1/users/profile/about/educations/`](./user-profile-education.md#post-api-v1-users-profile-about-educations) | JWT | Create User Education Record |
| `PATCH` | [`/api/v1/users/profile/about/educations/{education_id}/`](./user-profile-education.md#patch-api-v1-users-profile-about-educations-education-id) | JWT | Update User Education Record |
| `DELETE` | [`/api/v1/users/profile/about/educations/{education_id}/`](./user-profile-education.md#delete-api-v1-users-profile-about-educations-education-id) | JWT | Delete User Education Record |
| `GET` | [`/api/v1/users/profile/about/social-links/`](./user-profile-social-links.md#get-api-v1-users-profile-about-social-links) | JWT | List User Social Links |
| `POST` | [`/api/v1/users/profile/about/social-links/`](./user-profile-social-links.md#post-api-v1-users-profile-about-social-links) | JWT | Create User Social Link |
| `PATCH` | [`/api/v1/users/profile/about/social-links/{link_id}/`](./user-profile-social-links.md#patch-api-v1-users-profile-about-social-links-link-id) | JWT | Update User Social Link |
| `DELETE` | [`/api/v1/users/profile/about/social-links/{link_id}/`](./user-profile-social-links.md#delete-api-v1-users-profile-about-social-links-link-id) | JWT | Delete User Social Link |
| `GET` | [`/api/v1/users/settings/`](./user-settings.md#get-api-v1-users-settings) | JWT | Retrieve User Settings |
| `PATCH` | [`/api/v1/users/settings/`](./user-settings.md#patch-api-v1-users-settings) | JWT | Update User Settings |
| `POST` | [`/api/v1/users/settings/access-control/`](./user-settings-access-control.md#post-api-v1-users-settings-access-control) | JWT | Perform Profile Access & Control Action |
| `GET` | [`/api/v1/users/settings/blocked-users/`](./user-settings-blocking.md#get-api-v1-users-settings-blocked-users) | JWT | List Blocked Users |
| `POST` | [`/api/v1/users/settings/blocked-users/`](./user-settings-blocking.md#post-api-v1-users-settings-blocked-users) | JWT | Block User |
| `POST` | [`/api/v1/users/settings/blocked-users/followers/{user_id}/`](./user-settings-blocking.md#post-api-v1-users-settings-blocked-users-followers-user-id) | JWT | Block User From Followers |
| `GET` | [`/api/v1/users/settings/blocked-users/search/`](./user-settings-blocking.md#get-api-v1-users-settings-blocked-users-search) | JWT | Search Users to Block |
| `DELETE` | [`/api/v1/users/settings/blocked-users/{user_id}/`](./user-settings-blocking.md#delete-api-v1-users-settings-blocked-users-user-id) | JWT | Unblock User |
| `POST` | [`/api/v1/users/settings/followers/{user_id}/block/`](./user-settings-blocking.md#post-api-v1-users-settings-followers-user-id-block) | JWT | Block User From Followers |
| `GET` | [`/api/v1/users/settings/security/`](./user-settings-login-security.md#get-api-v1-users-settings-security) | JWT | Retrieve Login and Security Overview |
| `GET` | [`/api/v1/users/settings/security/2fa/`](./user-settings-login-security.md#get-api-v1-users-settings-security-2fa) | JWT | Retrieve 2FA Status |
| `PATCH` | [`/api/v1/users/settings/security/2fa/`](./user-settings-login-security.md#patch-api-v1-users-settings-security-2fa) | JWT | Toggle 2FA (ON/OFF) |
| `POST` | [`/api/v1/users/settings/security/change-password/`](./user-settings-login-security.md#post-api-v1-users-settings-security-change-password) | JWT | Change Password |
| `GET` | [`/api/v1/users/settings/security/contact-info/`](./user-settings-login-security.md#get-api-v1-users-settings-security-contact-info) | JWT | Retrieve Contact Information |
| `PATCH` | [`/api/v1/users/settings/security/contact-info/`](./user-settings-login-security.md#patch-api-v1-users-settings-security-contact-info) | JWT | Update Contact Information |
| `GET` | [`/api/v1/users/settings/security/devices/`](./user-settings-login-security.md#get-api-v1-users-settings-security-devices) | JWT | List Logged-In Devices |
| `DELETE` | [`/api/v1/users/settings/security/devices/{device_id}/`](./user-settings-login-security.md#delete-api-v1-users-settings-security-devices-device-id) | JWT | Delete Logged-In Device |
| `POST` | [`/api/v1/users/{user_id}/follow/`](./user-social-follow.md#post-api-v1-users-user-id-follow) | JWT | Follow a User |
| `DELETE` | [`/api/v1/users/{user_id}/follow/`](./user-social-follow.md#delete-api-v1-users-user-id-follow) | JWT | Unfollow a User |
| `POST` | [`/api/v1/users/{user_id}/follow/accept/`](./user-follow-requests.md#post-api-v1-users-user-id-follow-accept) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/users/{user_id}/follow/cancel/`](./user-follow-requests.md#post-api-v1-users-user-id-follow-cancel) | JWT | Cancel / Withdraw Follow Request |
| `DELETE` | [`/api/v1/users/{user_id}/follow/cancel/`](./user-follow-requests.md#delete-api-v1-users-user-id-follow-cancel) | JWT |  |
| `POST` | [`/api/v1/users/{user_id}/follow/confirm/`](./user-follow-requests.md#post-api-v1-users-user-id-follow-confirm) | JWT | Accept / Confirm Follow Request |
| `POST` | [`/api/v1/users/{user_id}/follow/reject/`](./user-follow-requests.md#post-api-v1-users-user-id-follow-reject) | JWT | Reject / Decline Follow Request |
| `GET` | [`/api/v1/users/{user_id}/followers/`](./user-social-follow.md#get-api-v1-users-user-id-followers) | JWT | List User Followers |
| `GET` | [`/api/v1/users/{user_id}/following/`](./user-social-follow.md#get-api-v1-users-user-id-following) | JWT | List User Following |
| `GET` | [`/api/v1/users/{user_id}/profile/about/`](./user-profile-about.md#get-api-v1-users-user-id-profile-about) | JWT | Get Target User Public 'About' Profile |
