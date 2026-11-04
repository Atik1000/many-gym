# API coverage

Every operation in the OpenAPI document is called by this app. Verified by `npm run check:api`
([scripts/check-api-coverage.mjs](../../scripts/check-api-coverage.mjs)), which exits non-zero if any
operation is left unaccounted for — so a new endpoint cannot appear in the spec without a deliberate decision.

[← All domains](./README.md)

| Disposition | Count | Meaning |
|---|---|---|
| `called` | 148 | a generated client function for it is invoked in app code |
| `multipart` | 1 | sent through `request()` with `FormData`, because the generated wrapper only sends JSON |
| **total** | **149** | |

## Aliased routes

The API publishes several features at more than one path and names no canonical one: the follow feature at six
prefixes, and all of identity/password/OTP under both `/auth/*` and `/users/*`. Rather than guess, the client
treats each group as a **fallback chain** — [`lib/api/fallback.ts`](../../lib/api/fallback.ts) tries them in
preference order and settles on whichever the deployment actually serves, remembering the winner for the
session. See [`lib/api/social.ts`](../../lib/api/social.ts) for the follow chains and `either()` in
[`lib/api/auth.ts`](../../lib/auth.ts) for the `/auth` ↔ `/users` pairs.

A chain advances only when a route looks *absent* (a 404/405 with no `{code,message,details}` envelope). A real
rejection — validation, permissions, not-found from the API itself — is returned immediately, so one bad
request never becomes six.

## Every operation

| Method | Path | Disposition | How |
|---|---|---|---|
| `GET` | `/api/v1/access-control/permissions/` | called | accessControlPermissionsRetrieve() |
| `GET` | `/api/v1/access-control/roles/` | called | accessControlRolesRetrieve() |
| `POST` | `/api/v1/access-control/roles/` | called | accessControlRolesCreate() |
| `DELETE` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesDestroy() |
| `GET` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesRetrieve2() |
| `PATCH` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesPartialUpdate() |
| `GET` | `/api/v1/access-control/staff/` | called | accessControlStaffList() |
| `POST` | `/api/v1/access-control/staff/` | called | accessControlStaffCreate() |
| `DELETE` | `/api/v1/access-control/staff/{assignment_id}/` | called | accessControlStaffDestroy() |
| `PATCH` | `/api/v1/access-control/staff/{assignment_id}/` | called | accessControlStaffPartialUpdate() |
| `GET` | `/api/v1/amenities/catalog/` | called | amenitiesCatalogRetrieve() |
| `GET` | `/api/v1/amenities/gym-amenities/` | called | amenitiesGymAmenitiesRetrieve() |
| `PUT` | `/api/v1/amenities/gym-amenities/sync/` | called | amenitiesGymAmenitiesSyncUpdate() |
| `POST` | `/api/v1/auth/change-password/` | called | authChangePasswordCreate() |
| `DELETE` | `/api/v1/auth/follow/` | called | authFollowDestroy() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/auth/follow/` | called | authFollowRetrieve() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/auth/follow/` | called | authFollowCreate() |
| `POST` | `/api/v1/auth/forgot-password/` | called | authForgotPasswordCreate() |
| `POST` | `/api/v1/auth/login/` | called | authLoginCreate() |
| `POST` | `/api/v1/auth/logout/` | called | authLogoutCreate() |
| `GET` | `/api/v1/auth/me/` | called | authMeRetrieve() |
| `PATCH` | `/api/v1/auth/me/` | called | authMePartialUpdate() |
| `POST` | `/api/v1/auth/register/` | called | authRegisterCreate() |
| `POST` | `/api/v1/auth/resend-otp/` | called | authResendOtpCreate() |
| `POST` | `/api/v1/auth/reset-password/` | called | authResetPasswordCreate() |
| `POST` | `/api/v1/auth/switch-context/` | called | authSwitchContextCreate() |
| `POST` | `/api/v1/auth/verify-reset-otp/` | called | authVerifyResetOtpCreate() |
| `POST` | `/api/v1/auth/verify-signup-otp/` | called | authVerifySignupOtpCreate() |
| `DELETE` | `/api/v1/auth/{user_id}/follow/` | called | authFollowDestroy2() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/auth/{user_id}/follow/` | called | authFollowCreate2() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/auth/{user_id}/followers/` | called | authFollowersRetrieve() |
| `GET` | `/api/v1/auth/{user_id}/following/` | called | authFollowingRetrieve() |
| `GET` | `/api/v1/dashboard/summary/` | called | dashboardSummaryRetrieve() |
| `DELETE` | `/api/v1/follow/` | called | followDestroy() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/follow/` | called | followRetrieve() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/follow/` | called | followCreate() |
| `DELETE` | `/api/v1/follow/{target_id}/` | called | followDestroy2() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/follow/{target_id}/` | called | followRetrieve2() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/follow/{target_id}/` | called | followCreate2() |
| `DELETE` | `/api/v1/follows/` | called | followsDestroy() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/follows/` | called | followsRetrieve() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/follows/` | called | followsCreate() |
| `DELETE` | `/api/v1/follows/{target_id}/` | called | followsDestroy2() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/follows/{target_id}/` | called | followsRetrieve2() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/follows/{target_id}/` | called | followsCreate2() |
| `POST` | `/api/v1/gyms/` | called | gymsCreate() |
| `GET` | `/api/v1/gyms/followed/` | called | gymsFollowedRetrieve() |
| `GET` | `/api/v1/gyms/gallery/` | called | gymsGalleryRetrieve() |
| `POST` | `/api/v1/gyms/gallery/` | called | gymsGalleryCreate() |
| `PATCH` | `/api/v1/gyms/gallery/reorder/` | called | gymsGalleryReorderPartialUpdate() |
| `DELETE` | `/api/v1/gyms/gallery/{item_id}/` | called | gymsGalleryDestroy() |
| `GET` | `/api/v1/gyms/opening-hours/` | called | gymsOpeningHoursRetrieve() |
| `PUT` | `/api/v1/gyms/opening-hours/` | called | gymsOpeningHoursUpdate() |
| `GET` | `/api/v1/gyms/profile/` | called | gymsProfileRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/` | called | gymsProfilePartialUpdate() |
| `GET` | `/api/v1/gyms/profile/location/` | called | gymsProfileLocationRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/location/` | called | gymsProfileLocationPartialUpdate() |
| `GET` | `/api/v1/gyms/profile/overview/` | called | gymsProfileOverviewRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/overview/` | called | gymsProfileOverviewPartialUpdate() |
| `GET` | `/api/v1/gyms/settings/` | called | gymsSettingsRetrieve() |
| `PATCH` | `/api/v1/gyms/settings/` | called | gymsSettingsPartialUpdate() |
| `POST` | `/api/v1/gyms/settings/access-control/` | called | gymsSettingsAccessControlCreate() |
| `GET` | `/api/v1/gyms/settings/blocked-users/` | called | gymsSettingsBlockedUsersRetrieve() |
| `POST` | `/api/v1/gyms/settings/blocked-users/` | called | gymsSettingsBlockedUsersCreate() |
| `GET` | `/api/v1/gyms/settings/blocked-users/search/` | called | gymsSettingsBlockedUsersSearchRetrieve() |
| `DELETE` | `/api/v1/gyms/settings/blocked-users/{user_id}/` | called | gymsSettingsBlockedUsersDestroy() |
| `DELETE` | `/api/v1/gyms/{gym_id}/follow/` | called | gymsFollowDestroy() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/gyms/{gym_id}/follow/` | called | gymsFollowCreate() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/gyms/{gym_id}/followers/` | called | gymsFollowersRetrieve() |
| `GET` | `/api/v1/gyms/{gym_id}/following/` | called | gymsFollowingRetrieve() |
| `GET` | `/api/v1/health/` | called | healthRetrieve() |
| `GET` | `/api/v1/leads/` | called | leadsList() |
| `POST` | `/api/v1/leads/` | called | leadsCreate() |
| `GET` | `/api/v1/leads/metrics/` | called | leadsMetricsRetrieve() |
| `GET` | `/api/v1/leads/reasons/` | called | leadsReasonsRetrieve() |
| `POST` | `/api/v1/leads/reasons/` | called | leadsReasonsCreate() |
| `DELETE` | `/api/v1/leads/{lead_id}/` | called | leadsDestroy() |
| `GET` | `/api/v1/leads/{lead_id}/` | called | leadsRetrieve() |
| `PATCH` | `/api/v1/leads/{lead_id}/` | called | leadsPartialUpdate() |
| `POST` | `/api/v1/leads/{lead_id}/convert/` | called | leadsConvertCreate() |
| `POST` | `/api/v1/leads/{lead_id}/next-moves/` | called | leadsNextMovesCreate() |
| `PATCH` | `/api/v1/leads/{lead_id}/next-moves/{move_id}/` | called | leadsNextMovesPartialUpdate() |
| `POST` | `/api/v1/leads/{lead_id}/notes/` | called | leadsNotesCreate() |
| `GET` | `/api/v1/members/` | called | membersList() |
| `POST` | `/api/v1/members/` | called | membersCreate() |
| `POST` | `/api/v1/members/accept-invitation/` | called | membersAcceptInvitationCreate() |
| `GET` | `/api/v1/members/metrics/` | called | membersMetricsRetrieve() |
| `POST` | `/api/v1/members/subscriptions/{subscription_id}/extra-amenities/` | called | membersSubscriptionsExtraAmenitiesCreate() |
| `POST` | `/api/v1/members/subscriptions/{subscription_id}/payments/` | called | membersSubscriptionsPaymentsCreate() |
| `PATCH` | `/api/v1/members/subscriptions/{subscription_id}/status/` | called | membersSubscriptionsStatusPartialUpdate() |
| `DELETE` | `/api/v1/members/{member_id}/` | called | membersDestroy() |
| `GET` | `/api/v1/members/{member_id}/` | called | membersRetrieve() |
| `PATCH` | `/api/v1/members/{member_id}/` | called | membersPartialUpdate() |
| `POST` | `/api/v1/members/{member_id}/resend-invitation/` | called | membersResendInvitationCreate() |
| `GET` | `/api/v1/members/{member_id}/routines/` | called | membersRoutinesList() |
| `POST` | `/api/v1/members/{member_id}/routines/assign/` | called | membersRoutinesAssignCreate() |
| `GET` | `/api/v1/members/{member_id}/routines/{routine_id}/` | called | membersRoutinesRetrieve() |
| `PATCH` | `/api/v1/members/{member_id}/routines/{routine_id}/` | called | membersRoutinesPartialUpdate() |
| `POST` | `/api/v1/members/{member_id}/subscriptions/` | called | membersSubscriptionsCreate() |
| `GET` | `/api/v1/messaging/conversations/` | called | messagingConversationsList() |
| `POST` | `/api/v1/messaging/conversations/` | called | messagingConversationsCreate() |
| `GET` | `/api/v1/messaging/conversations/{conversation_id}/` | called | messagingConversationsRetrieve() |
| `GET` | `/api/v1/messaging/conversations/{conversation_id}/messages/` | called | messagingConversationsMessagesList() |
| `POST` | `/api/v1/messaging/conversations/{conversation_id}/messages/` | called | messagingConversationsMessagesCreate() |
| `POST` | `/api/v1/messaging/conversations/{conversation_id}/read/` | called | messagingConversationsReadCreate() |
| `POST` | `/api/v1/messaging/keys/gym/register/` | called | messagingKeysGymRegisterCreate() |
| `GET` | `/api/v1/messaging/keys/gym/{gym_id}/` | called | messagingKeysGymList() |
| `POST` | `/api/v1/messaging/keys/register/` | called | messagingKeysRegisterCreate() |
| `GET` | `/api/v1/messaging/keys/user/{user_id}/` | called | messagingKeysUserList() |
| `GET` | `/api/v1/plans/` | called | plansList() |
| `POST` | `/api/v1/plans/` | called | plansCreate() |
| `GET` | `/api/v1/plans/metrics/` | called | plansMetricsRetrieve() |
| `DELETE` | `/api/v1/plans/{plan_id}/` | called | plansDestroy() |
| `GET` | `/api/v1/plans/{plan_id}/` | called | plansRetrieve() |
| `PATCH` | `/api/v1/plans/{plan_id}/` | called | plansPartialUpdate() |
| `PUT` | `/api/v1/plans/{plan_id}/amenities/` | called | plansAmenitiesUpdate() |
| `POST` | `/api/v1/plans/{plan_id}/status/` | called | plansStatusCreate() |
| `GET` | `/api/v1/posts/` | called | postsList() |
| `POST` | `/api/v1/posts/` | called | postsCreate() |
| `DELETE` | `/api/v1/posts/{post_id}/` | called | postsDestroy() |
| `GET` | `/api/v1/posts/{post_id}/` | called | postsRetrieve() |
| `PATCH` | `/api/v1/posts/{post_id}/` | called | postsPartialUpdate() |
| `PATCH` | `/api/v1/posts/{post_id}/media/{media_id}/thumbnail/` | multipart | multipart: sent via request() with FormData from postActions.setVideoThumbnail — the generated wrapper takes a JSON body |
| `GET` | `/api/v1/reports/leads-funnel/` | called | reportsLeadsFunnelRetrieve() |
| `GET` | `/api/v1/reports/membership-growth/` | called | reportsMembershipGrowthRetrieve() |
| `GET` | `/api/v1/reports/revenue/` | called | reportsRevenueRetrieve() |
| `GET` | `/api/v1/reports/trainer-workload/` | called | reportsTrainerWorkloadRetrieve() |
| `GET` | `/api/v1/routine-templates/` | called | routineTemplatesList() |
| `POST` | `/api/v1/routine-templates/` | called | routineTemplatesCreate() |
| `DELETE` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesDestroy() |
| `GET` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesRetrieve() |
| `PATCH` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesPartialUpdate() |
| `PUT` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesUpdate() |
| `POST` | `/api/v1/users/change-password/` | called | usersChangePasswordCreate() |
| `DELETE` | `/api/v1/users/follow/` | called | usersFollowDestroy() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/users/follow/` | called | usersFollowRetrieve() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/users/follow/` | called | usersFollowCreate() |
| `POST` | `/api/v1/users/forgot-password/` | called | usersForgotPasswordCreate() |
| `GET` | `/api/v1/users/me/` | called | usersMeRetrieve() |
| `PATCH` | `/api/v1/users/me/` | called | usersMePartialUpdate() |
| `POST` | `/api/v1/users/register/` | called | usersRegisterCreate() |
| `POST` | `/api/v1/users/resend-otp/` | called | usersResendOtpCreate() |
| `POST` | `/api/v1/users/reset-password/` | called | usersResetPasswordCreate() |
| `POST` | `/api/v1/users/verify-reset-otp/` | called | usersVerifyResetOtpCreate() |
| `POST` | `/api/v1/users/verify-signup-otp/` | called | usersVerifySignupOtpCreate() |
| `DELETE` | `/api/v1/users/{user_id}/follow/` | called | usersFollowDestroy2() — alias tried via lib/api/social.ts fallback chain |
| `POST` | `/api/v1/users/{user_id}/follow/` | called | usersFollowCreate2() — alias tried via lib/api/social.ts fallback chain |
| `GET` | `/api/v1/users/{user_id}/followers/` | called | usersFollowersRetrieve() |
| `GET` | `/api/v1/users/{user_id}/following/` | called | usersFollowingRetrieve() |
