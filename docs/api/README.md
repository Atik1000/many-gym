# Many Gym API — reference

Multi-tenant gym management & social platform API, version 1.

| | |
|---|---|
| **Base URL** | `https://v0.manygym.com` |
| **Prefix** | `/api/v1` |
| **Auth** | Bearer JWT (`Authorization: Bearer <token>`) |
| **Endpoints** | 149 operations across 100 paths |
| **Schemas** | 187 |
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

> **There is no refresh endpoint.** A `refresh` token is issued but nothing accepts it, so an expired access
> token means signing in again.

## Errors

Every failure uses one envelope:

```json
{ "code": "VALIDATION_ERROR", "message": "Validation failed for the submitted data.",
  "details": { "email": ["This field is required."] } }
```

`code` is machine-readable. Codes observed live across all 149 operations: `VALIDATION_ERROR`,
`AUTHENTICATION_REQUIRED`, `RESOURCE_NOT_FOUND`, `METHOD_NOT_ALLOWED`.
`message` is safe to show a person, and `details` carries per-field errors when there are any.

## Before you build against it

Twenty-seven contract gaps, design inconsistencies and hardening issues are catalogued in
[known-issues.md](./known-issues.md) — including the missing token-refresh endpoint, an undocumented
120-character minimum, two different amenity id spaces, a staff endpoint that cannot invite anyone, and a
logout that does not revoke the token it was given.
Four of them are invisible in the schema and were found only by calling the API.

All 149 operations are called by the reference client in this repo; see [coverage.md](./coverage.md).
`npm run check:api` fails if any operation goes unaccounted for.

## Domains

| Domain | Endpoints | Paths |
|---|---|---|
| [Access Control & RBAC](./access-control-rbac.md) | 10 | access-control |
| [Amenities](./amenities.md) | 3 | amenities |
| [Password Management](./password-management.md) | 8 | auth, users |
| [Unified Social Follow](./unified-social-follow.md) | 18 | auth, follow, follows, users |
| [Authentication & Sessions](./authentication-sessions.md) | 3 | auth |
| [User Profile](./user-profile.md) | 4 | auth, users |
| [User Identity & Onboarding](./user-identity-onboarding.md) | 6 | auth, users |
| [User Social & Follow](./user-social-follow.md) | 8 | auth, users |
| [Dashboard & Reports](./dashboard-reports.md) | 5 | dashboard, reports |
| [Gym Profile & Multi-Location](./gym-profile-multi-location.md) | 13 | gyms |
| [Gym Social & Follow](./gym-social-follow.md) | 5 | gyms |
| [Gym Settings](./gym-settings.md) | 2 | gyms |
| [Gym Settings - Access & Control](./gym-settings-access-control.md) | 1 | gyms |
| [Gym Settings - Blocking](./gym-settings-blocking.md) | 4 | gyms |
| [health](./health.md) | 1 | health |
| [Leads CRM](./leads-crm.md) | 12 | leads |
| [Members & Lifecycle](./members-lifecycle.md) | 8 | members |
| [Members & Subscriptions](./members-subscriptions.md) | 4 | members |
| [Member Workouts](./member-workouts.md) | 4 | members |
| [Messaging](./messaging.md) | 10 | messaging |
| [Membership Plans](./membership-plans.md) | 8 | plans |
| [Community Feed](./community-feed.md) | 6 | posts |
| [Routine Templates](./routine-templates.md) | 6 | routine-templates |

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
| `POST` | [`/api/v1/auth/forgot-password/`](./password-management.md#post-api-v1-auth-forgot-password) | public | Request Password Reset OTP |
| `POST` | [`/api/v1/auth/reset-password/`](./password-management.md#post-api-v1-auth-reset-password) | public | Reset Password with OTP |
| `POST` | [`/api/v1/auth/verify-reset-otp/`](./password-management.md#post-api-v1-auth-verify-reset-otp) | public | Verify Password Reset OTP |
| `POST` | [`/api/v1/users/change-password/`](./password-management.md#post-api-v1-users-change-password) | JWT | Change Password |
| `POST` | [`/api/v1/users/forgot-password/`](./password-management.md#post-api-v1-users-forgot-password) | public | Request Password Reset OTP |
| `POST` | [`/api/v1/users/reset-password/`](./password-management.md#post-api-v1-users-reset-password) | public | Reset Password with OTP |
| `POST` | [`/api/v1/users/verify-reset-otp/`](./password-management.md#post-api-v1-users-verify-reset-otp) | public | Verify Password Reset OTP |
| `GET` | [`/api/v1/auth/follow/`](./unified-social-follow.md#get-api-v1-auth-follow) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/auth/follow/`](./unified-social-follow.md#post-api-v1-auth-follow) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/auth/follow/`](./unified-social-follow.md#delete-api-v1-auth-follow) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/follow/`](./unified-social-follow.md#get-api-v1-follow) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follow/`](./unified-social-follow.md#post-api-v1-follow) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follow/`](./unified-social-follow.md#delete-api-v1-follow) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/follow/{target_id}/`](./unified-social-follow.md#get-api-v1-follow-target-id) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follow/{target_id}/`](./unified-social-follow.md#post-api-v1-follow-target-id) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follow/{target_id}/`](./unified-social-follow.md#delete-api-v1-follow-target-id) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/follows/`](./unified-social-follow.md#get-api-v1-follows) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follows/`](./unified-social-follow.md#post-api-v1-follows) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follows/`](./unified-social-follow.md#delete-api-v1-follows) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#get-api-v1-follows-target-id) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#post-api-v1-follows-target-id) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/follows/{target_id}/`](./unified-social-follow.md#delete-api-v1-follows-target-id) | JWT | Unfollow a User or Gym |
| `GET` | [`/api/v1/users/follow/`](./unified-social-follow.md#get-api-v1-users-follow) | JWT | Get Followers or Following List |
| `POST` | [`/api/v1/users/follow/`](./unified-social-follow.md#post-api-v1-users-follow) | JWT | Follow or Unfollow a User or Gym |
| `DELETE` | [`/api/v1/users/follow/`](./unified-social-follow.md#delete-api-v1-users-follow) | JWT | Unfollow a User or Gym |
| `POST` | [`/api/v1/auth/login/`](./authentication-sessions.md#post-api-v1-auth-login) | public | User Authentication & Login |
| `POST` | [`/api/v1/auth/logout/`](./authentication-sessions.md#post-api-v1-auth-logout) | JWT | User Logout & Token Revocation |
| `POST` | [`/api/v1/auth/switch-context/`](./authentication-sessions.md#post-api-v1-auth-switch-context) | JWT | Switch Token Context (Personal vs Gym) |
| `GET` | [`/api/v1/auth/me/`](./user-profile.md#get-api-v1-auth-me) | JWT | Get Current User Profile & Accessible Gyms |
| `PATCH` | [`/api/v1/auth/me/`](./user-profile.md#patch-api-v1-auth-me) | JWT | Update Current User Profile |
| `GET` | [`/api/v1/users/me/`](./user-profile.md#get-api-v1-users-me) | JWT | Get Current User Profile & Accessible Gyms |
| `PATCH` | [`/api/v1/users/me/`](./user-profile.md#patch-api-v1-users-me) | JWT | Update Current User Profile |
| `POST` | [`/api/v1/auth/register/`](./user-identity-onboarding.md#post-api-v1-auth-register) | public | User Registration / Sign Up |
| `POST` | [`/api/v1/auth/resend-otp/`](./user-identity-onboarding.md#post-api-v1-auth-resend-otp) | public | Resend Registration OTP |
| `POST` | [`/api/v1/auth/verify-signup-otp/`](./user-identity-onboarding.md#post-api-v1-auth-verify-signup-otp) | public | Verify Account Registration OTP |
| `POST` | [`/api/v1/users/register/`](./user-identity-onboarding.md#post-api-v1-users-register) | public | User Registration / Sign Up |
| `POST` | [`/api/v1/users/resend-otp/`](./user-identity-onboarding.md#post-api-v1-users-resend-otp) | public | Resend Registration OTP |
| `POST` | [`/api/v1/users/verify-signup-otp/`](./user-identity-onboarding.md#post-api-v1-users-verify-signup-otp) | public | Verify Account Registration OTP |
| `POST` | [`/api/v1/auth/{user_id}/follow/`](./user-social-follow.md#post-api-v1-auth-user-id-follow) | JWT | Follow a User |
| `DELETE` | [`/api/v1/auth/{user_id}/follow/`](./user-social-follow.md#delete-api-v1-auth-user-id-follow) | JWT | Unfollow a User |
| `GET` | [`/api/v1/auth/{user_id}/followers/`](./user-social-follow.md#get-api-v1-auth-user-id-followers) | JWT | List User Followers |
| `GET` | [`/api/v1/auth/{user_id}/following/`](./user-social-follow.md#get-api-v1-auth-user-id-following) | JWT | List User Following |
| `POST` | [`/api/v1/users/{user_id}/follow/`](./user-social-follow.md#post-api-v1-users-user-id-follow) | JWT | Follow a User |
| `DELETE` | [`/api/v1/users/{user_id}/follow/`](./user-social-follow.md#delete-api-v1-users-user-id-follow) | JWT | Unfollow a User |
| `GET` | [`/api/v1/users/{user_id}/followers/`](./user-social-follow.md#get-api-v1-users-user-id-followers) | JWT | List User Followers |
| `GET` | [`/api/v1/users/{user_id}/following/`](./user-social-follow.md#get-api-v1-users-user-id-following) | JWT | List User Following |
| `GET` | [`/api/v1/dashboard/summary/`](./dashboard-reports.md#get-api-v1-dashboard-summary) | JWT | Executive Dashboard Summary |
| `GET` | [`/api/v1/reports/leads-funnel/`](./dashboard-reports.md#get-api-v1-reports-leads-funnel) | JWT | Lead Conversion Funnel Report |
| `GET` | [`/api/v1/reports/membership-growth/`](./dashboard-reports.md#get-api-v1-reports-membership-growth) | JWT | Membership Growth & Churn Report |
| `GET` | [`/api/v1/reports/revenue/`](./dashboard-reports.md#get-api-v1-reports-revenue) | JWT | Revenue & Collections Report |
| `GET` | [`/api/v1/reports/trainer-workload/`](./dashboard-reports.md#get-api-v1-reports-trainer-workload) | JWT | Trainer Workload & Allocation Report |
| `POST` | [`/api/v1/gyms/`](./gym-profile-multi-location.md#post-api-v1-gyms) | JWT | Create New Gym Workspace |
| `GET` | [`/api/v1/gyms/gallery/`](./gym-profile-multi-location.md#get-api-v1-gyms-gallery) | JWT | List Gallery Media Assets |
| `POST` | [`/api/v1/gyms/gallery/`](./gym-profile-multi-location.md#post-api-v1-gyms-gallery) | JWT | Add Gallery Media Asset |
| `PATCH` | [`/api/v1/gyms/gallery/reorder/`](./gym-profile-multi-location.md#patch-api-v1-gyms-gallery-reorder) | JWT | Reorder Gallery Assets |
| `DELETE` | [`/api/v1/gyms/gallery/{item_id}/`](./gym-profile-multi-location.md#delete-api-v1-gyms-gallery-item-id) | JWT | Delete Gallery Media Asset |
| `GET` | [`/api/v1/gyms/opening-hours/`](./gym-profile-multi-location.md#get-api-v1-gyms-opening-hours) | JWT | Get Weekly Operating Hours |
| `PUT` | [`/api/v1/gyms/opening-hours/`](./gym-profile-multi-location.md#put-api-v1-gyms-opening-hours) | JWT | Bulk Update Weekly Operating Hours |
| `GET` | [`/api/v1/gyms/profile/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile) | JWT | Get Gym Profile Overview |
| `PATCH` | [`/api/v1/gyms/profile/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile) | JWT | Update Gym Overview Tab |
| `GET` | [`/api/v1/gyms/profile/location/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile-location) | JWT | Get Gym Physical Location |
| `PATCH` | [`/api/v1/gyms/profile/location/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile-location) | JWT | Update Gym Location & Map Coordinates |
| `GET` | [`/api/v1/gyms/profile/overview/`](./gym-profile-multi-location.md#get-api-v1-gyms-profile-overview) | JWT | Get Gym Profile Overview |
| `PATCH` | [`/api/v1/gyms/profile/overview/`](./gym-profile-multi-location.md#patch-api-v1-gyms-profile-overview) | JWT | Update Gym Overview Tab |
| `GET` | [`/api/v1/gyms/followed/`](./gym-social-follow.md#get-api-v1-gyms-followed) | JWT | List Gyms Followed by User |
| `POST` | [`/api/v1/gyms/{gym_id}/follow/`](./gym-social-follow.md#post-api-v1-gyms-gym-id-follow) | JWT | Follow a Gym |
| `DELETE` | [`/api/v1/gyms/{gym_id}/follow/`](./gym-social-follow.md#delete-api-v1-gyms-gym-id-follow) | JWT | Unfollow a Gym |
| `GET` | [`/api/v1/gyms/{gym_id}/followers/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-followers) | JWT | List Gym Followers |
| `GET` | [`/api/v1/gyms/{gym_id}/following/`](./gym-social-follow.md#get-api-v1-gyms-gym-id-following) | JWT | List People and Pages Gym Follows |
| `GET` | [`/api/v1/gyms/settings/`](./gym-settings.md#get-api-v1-gyms-settings) | JWT | Retrieve Gym Settings |
| `PATCH` | [`/api/v1/gyms/settings/`](./gym-settings.md#patch-api-v1-gyms-settings) | JWT | Update Gym Settings |
| `POST` | [`/api/v1/gyms/settings/access-control/`](./gym-settings-access-control.md#post-api-v1-gyms-settings-access-control) | JWT | Perform Access & Control Action |
| `GET` | [`/api/v1/gyms/settings/blocked-users/`](./gym-settings-blocking.md#get-api-v1-gyms-settings-blocked-users) | JWT | List Blocked Users |
| `POST` | [`/api/v1/gyms/settings/blocked-users/`](./gym-settings-blocking.md#post-api-v1-gyms-settings-blocked-users) | JWT | Block a User |
| `GET` | [`/api/v1/gyms/settings/blocked-users/search/`](./gym-settings-blocking.md#get-api-v1-gyms-settings-blocked-users-search) | JWT | Search Users to Block |
| `DELETE` | [`/api/v1/gyms/settings/blocked-users/{user_id}/`](./gym-settings-blocking.md#delete-api-v1-gyms-settings-blocked-users-user-id) | JWT | Unblock a User |
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
| `GET` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#get-api-v1-members-member-id) | JWT | Get Member Dossier |
| `PATCH` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#patch-api-v1-members-member-id) | JWT | Update Member Details |
| `DELETE` | [`/api/v1/members/{member_id}/`](./members-lifecycle.md#delete-api-v1-members-member-id) | JWT | Delete Member |
| `POST` | [`/api/v1/members/{member_id}/resend-invitation/`](./members-lifecycle.md#post-api-v1-members-member-id-resend-invitation) | JWT | Resend Onboarding Invitation |
| `POST` | [`/api/v1/members/subscriptions/{subscription_id}/extra-amenities/`](./members-subscriptions.md#post-api-v1-members-subscriptions-subscription-id-extra-amenities) | JWT | Attach Extra Amenities |
| `POST` | [`/api/v1/members/subscriptions/{subscription_id}/payments/`](./members-subscriptions.md#post-api-v1-members-subscriptions-subscription-id-payments) | JWT | Log Subscription Payment |
| `PATCH` | [`/api/v1/members/subscriptions/{subscription_id}/status/`](./members-subscriptions.md#patch-api-v1-members-subscriptions-subscription-id-status) | JWT | Transition Subscription Status |
| `POST` | [`/api/v1/members/{member_id}/subscriptions/`](./members-subscriptions.md#post-api-v1-members-member-id-subscriptions) | JWT | Attach Subscription to Member |
| `GET` | [`/api/v1/members/{member_id}/routines/`](./member-workouts.md#get-api-v1-members-member-id-routines) | JWT | List Member Routines |
| `POST` | [`/api/v1/members/{member_id}/routines/assign/`](./member-workouts.md#post-api-v1-members-member-id-routines-assign) | JWT | Assign Routine to Member |
| `GET` | [`/api/v1/members/{member_id}/routines/{routine_id}/`](./member-workouts.md#get-api-v1-members-member-id-routines-routine-id) | JWT | Get Member Routine Dossier |
| `PATCH` | [`/api/v1/members/{member_id}/routines/{routine_id}/`](./member-workouts.md#patch-api-v1-members-member-id-routines-routine-id) | JWT | Customize Member Routine |
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
| `GET` | [`/api/v1/posts/`](./community-feed.md#get-api-v1-posts) | public | List Gym Community Feed |
| `POST` | [`/api/v1/posts/`](./community-feed.md#post-api-v1-posts) | JWT | Create Community Post |
| `GET` | [`/api/v1/posts/{post_id}/`](./community-feed.md#get-api-v1-posts-post-id) | public | Get Post Detail |
| `PATCH` | [`/api/v1/posts/{post_id}/`](./community-feed.md#patch-api-v1-posts-post-id) | JWT | Update Community Post |
| `DELETE` | [`/api/v1/posts/{post_id}/`](./community-feed.md#delete-api-v1-posts-post-id) | JWT | Delete Community Post |
| `PATCH` | [`/api/v1/posts/{post_id}/media/{media_id}/thumbnail/`](./community-feed.md#patch-api-v1-posts-post-id-media-media-id-thumbnail) | JWT | Upload Custom Video Thumbnail |
| `GET` | [`/api/v1/routine-templates/`](./routine-templates.md#get-api-v1-routine-templates) | JWT | List Routine Templates |
| `POST` | [`/api/v1/routine-templates/`](./routine-templates.md#post-api-v1-routine-templates) | JWT | Create Routine Template |
| `GET` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#get-api-v1-routine-templates-template-id) | JWT | Get Routine Template Dossier |
| `PUT` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#put-api-v1-routine-templates-template-id) | JWT | Full Update Routine Template |
| `PATCH` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#patch-api-v1-routine-templates-template-id) | JWT | Partial Update Routine Template |
| `DELETE` | [`/api/v1/routine-templates/{template_id}/`](./routine-templates.md#delete-api-v1-routine-templates-template-id) | JWT | Delete Routine Template |
