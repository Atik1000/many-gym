# API coverage

Every operation in the OpenAPI document must be accounted for by this app. Verified by `npm run check:api`
([scripts/check-api-coverage.mjs](../../scripts/check-api-coverage.mjs)), which exits non-zero if any
operation is left unaccounted for — so a new endpoint cannot appear in the spec without a deliberate decision.

This page is generated: `node scripts/check-api-coverage.mjs --markdown > docs/api/coverage.md`.

[← All domains](./README.md)

| Disposition | Count | Meaning |
|---|---|---|
| `called` | 125 | a generated client function for it is invoked in app code |
| `handwritten` | 140 | called through `request()` in a hand-written module (routes newer than the generated client) |
| `duplicate` | 21 | the identical operation is published at another path, and that one is called |
| `superseded` | 5 | a declared variant of an operation that is called (listed with its reason) |
| **total** | **291** | |

## Aliased routes

The API publishes many features at more than one path and names no canonical one: follow, identity and
password under both `/auth/*` and `/users/*`, the security settings under both, admin logs at
`/gyms/admin-logs/` and `/gyms/logs/admin/`, comments at `/posts/{id}/comments/` and `/comments/`, reactions
at `/{target}/{id}/reactions/` and `/reactions/{target}/{id}/`, and token refresh at three paths. Rather
than guess, the client treats each group as a **fallback chain** —
[`lib/api/fallback.ts`](../../lib/api/fallback.ts) tries them in preference order and settles on whichever
the deployment actually serves, remembering the winner for the session.

A chain advances only when a route looks *absent* (a 404/405 with no `{code,message,details}` envelope). A real
rejection — validation, permissions, not-found from the API itself — is returned immediately, so one bad
request never becomes six.

## Every operation

| Method | Path | Disposition | How |
|---|---|---|---|
| `GET` | `/api/v1/access-control/permissions/` | called | accessControlPermissionsRetrieve() |
| `GET` | `/api/v1/access-control/roles/` | called | accessControlRolesRetrieve() |
| `POST` | `/api/v1/access-control/roles/` | called | accessControlRolesCreate() |
| `GET` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesRetrieve2() |
| `PATCH` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesPartialUpdate() |
| `DELETE` | `/api/v1/access-control/roles/{role_id}/` | called | accessControlRolesDestroy() |
| `GET` | `/api/v1/access-control/staff/` | called | accessControlStaffList() |
| `POST` | `/api/v1/access-control/staff/` | called | accessControlStaffCreate() |
| `PATCH` | `/api/v1/access-control/staff/{assignment_id}/` | called | accessControlStaffPartialUpdate() |
| `DELETE` | `/api/v1/access-control/staff/{assignment_id}/` | called | accessControlStaffDestroy() |
| `GET` | `/api/v1/amenities/catalog/` | called | amenitiesCatalogRetrieve() |
| `GET` | `/api/v1/amenities/gym-amenities/` | called | amenitiesGymAmenitiesRetrieve() |
| `PUT` | `/api/v1/amenities/gym-amenities/sync/` | called | amenitiesGymAmenitiesSyncUpdate() |
| `POST` | `/api/v1/auth/{user_id}/follow/accept/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/accept/, which is used |
| `POST` | `/api/v1/auth/{user_id}/follow/cancel/` | handwritten | request() in lib/api/social.ts |
| `DELETE` | `/api/v1/auth/{user_id}/follow/cancel/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/auth/{user_id}/follow/confirm/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/accept/, which is used |
| `POST` | `/api/v1/auth/{user_id}/follow/reject/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/reject/, which is used |
| `POST` | `/api/v1/auth/change-password/` | called | authChangePasswordCreate() |
| `GET` | `/api/v1/auth/follow-requests/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/auth/follow-requests/{request_id}/accept/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/auth/follow-requests/{request_id}/cancel/` | handwritten | request() in lib/api/social.ts |
| `DELETE` | `/api/v1/auth/follow-requests/{request_id}/cancel/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/auth/follow-requests/{request_id}/reject/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/auth/forgot-password/` | called | authForgotPasswordCreate() |
| `POST` | `/api/v1/auth/login/` | called | authLoginCreate() |
| `POST` | `/api/v1/auth/logout/` | called | authLogoutCreate() |
| `GET` | `/api/v1/auth/me/` | called | authMeRetrieve() |
| `PATCH` | `/api/v1/auth/me/` | called | authMePartialUpdate() |
| `POST` | `/api/v1/auth/refresh/` | handwritten | request() in lib/api/http.ts |
| `POST` | `/api/v1/auth/register/` | called | authRegisterCreate() |
| `POST` | `/api/v1/auth/resend-2fa/` | handwritten | request() in lib/api/security.ts |
| `POST` | `/api/v1/auth/resend-otp/` | called | authResendOtpCreate() |
| `POST` | `/api/v1/auth/reset-password/` | called | authResetPasswordCreate() |
| `POST` | `/api/v1/auth/settings/blocked-users/followers/{user_id}/` | duplicate | same operation as POST /api/v1/users/followers/{user_id}/block/, which is used |
| `POST` | `/api/v1/auth/settings/followers/{user_id}/block/` | duplicate | same operation as POST /api/v1/users/followers/{user_id}/block/, which is used |
| `GET` | `/api/v1/auth/settings/security/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/auth/settings/security/2fa/` | handwritten | request() in lib/api/security.ts |
| `PATCH` | `/api/v1/auth/settings/security/2fa/` | handwritten | request() in lib/api/security.ts |
| `POST` | `/api/v1/auth/settings/security/change-password/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/auth/settings/security/contact-info/` | handwritten | request() in lib/api/security.ts |
| `PATCH` | `/api/v1/auth/settings/security/contact-info/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/auth/settings/security/devices/` | handwritten | request() in lib/api/security.ts |
| `DELETE` | `/api/v1/auth/settings/security/devices/{device_id}/` | handwritten | request() in lib/api/security.ts |
| `POST` | `/api/v1/auth/switch-context/` | called | authSwitchContextCreate() |
| `POST` | `/api/v1/auth/token/refresh/` | handwritten | request() in lib/api/http.ts |
| `POST` | `/api/v1/auth/verify-2fa/` | handwritten | request() in lib/api/security.ts |
| `POST` | `/api/v1/auth/verify-reset-otp/` | called | authVerifyResetOtpCreate() |
| `POST` | `/api/v1/auth/verify-signup-otp/` | called | authVerifySignupOtpCreate() |
| `GET` | `/api/v1/comments/` | duplicate | same operation as GET /api/v1/posts/{post_id}/comments/, which is used |
| `POST` | `/api/v1/comments/` | duplicate | same operation as POST /api/v1/posts/{post_id}/comments/, which is used |
| `GET` | `/api/v1/comments/{comment_id}/` | duplicate | same operation as GET /api/v1/posts/{post_id}/comments/{comment_id}/, which is used |
| `PATCH` | `/api/v1/comments/{comment_id}/` | duplicate | same operation as PATCH /api/v1/posts/{post_id}/comments/{comment_id}/, which is used |
| `DELETE` | `/api/v1/comments/{comment_id}/` | duplicate | same operation as DELETE /api/v1/posts/{post_id}/comments/{comment_id}/, which is used |
| `GET` | `/api/v1/comments/{comment_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/comments/{comment_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/comments/{comment_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/comments/{comment_id}/reactions/summary/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/comments/{comment_id}/replies/` | duplicate | same operation as GET /api/v1/posts/{post_id}/comments/{comment_id}/replies/, which is used |
| `POST` | `/api/v1/comments/{comment_id}/replies/` | duplicate | same operation as POST /api/v1/posts/{post_id}/comments/{comment_id}/replies/, which is used |
| `GET` | `/api/v1/dashboard/summary/` | called | dashboardSummaryRetrieve() |
| `GET` | `/api/v1/enquiries/` | handwritten | request() in lib/api/enquiries.ts |
| `POST` | `/api/v1/enquiries/` | handwritten | request() in lib/api/enquiries.ts |
| `GET` | `/api/v1/enquiries/{enquiry_id}/` | handwritten | request() in lib/api/enquiries.ts |
| `PUT` | `/api/v1/enquiries/{enquiry_id}/` | superseded | full-replace form of PATCH on the same resource, which is used (the form sends only changed fields) |
| `PATCH` | `/api/v1/enquiries/{enquiry_id}/` | handwritten | request() in lib/api/enquiries.ts |
| `DELETE` | `/api/v1/enquiries/{enquiry_id}/` | handwritten | request() in lib/api/enquiries.ts |
| `POST` | `/api/v1/enquiries/{enquiry_id}/notes/` | handwritten | request() in lib/api/enquiries.ts |
| `GET` | `/api/v1/follows/` | called | followsRetrieve() |
| `POST` | `/api/v1/follows/` | called | followsCreate() |
| `DELETE` | `/api/v1/follows/` | called | followsDestroy() |
| `GET` | `/api/v1/follows/{target_id}/` | called | followsRetrieve2() |
| `POST` | `/api/v1/follows/{target_id}/` | called | followsCreate2() |
| `DELETE` | `/api/v1/follows/{target_id}/` | called | followsDestroy2() |
| `POST` | `/api/v1/gyms/` | called | gymsCreate() |
| `GET` | `/api/v1/gyms/{gym_id}/detail/` | handwritten | request() in lib/api/discover.ts |
| `POST` | `/api/v1/gyms/{gym_id}/follow/` | called | gymsFollowCreate() |
| `DELETE` | `/api/v1/gyms/{gym_id}/follow/` | called | gymsFollowDestroy() |
| `GET` | `/api/v1/gyms/{gym_id}/followers/` | called | gymsFollowersRetrieve() |
| `POST` | `/api/v1/gyms/{gym_id}/followers/{user_id}/block/` | handwritten | request() in lib/api/member-requests.ts |
| `GET` | `/api/v1/gyms/{gym_id}/following/` | called | gymsFollowingRetrieve() |
| `GET` | `/api/v1/gyms/{gym_id}/join-request/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/gyms/{gym_id}/join-request/` | handwritten | request() in lib/api/member-requests.ts |
| `GET` | `/api/v1/gyms/{gym_id}/member-requests/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/gyms/{gym_id}/member-requests/` | handwritten | request() in lib/api/member-requests.ts |
| `GET` | `/api/v1/gyms/{gym_id}/member-requests/{request_id}/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/gyms/{gym_id}/member-requests/{request_id}/accept/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/gyms/{gym_id}/member-requests/{request_id}/reject/` | handwritten | request() in lib/api/member-requests.ts |
| `GET` | `/api/v1/gyms/{gym_id}/members/` | handwritten | request() in lib/api/member-requests.ts |
| `GET` | `/api/v1/gyms/{gym_id}/public/` | handwritten | request() in lib/api/discover.ts |
| `GET` | `/api/v1/gyms/admin-logs/` | handwritten | request() in lib/api/admin-logs.ts |
| `POST` | `/api/v1/gyms/admin-logs/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/admin-logs/{log_id}/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/admin-logs/actions/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/admin-logs/export/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/admin-logs/metrics/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/followed/` | called | gymsFollowedRetrieve() |
| `GET` | `/api/v1/gyms/gallery/` | called | gymsGalleryRetrieve() |
| `POST` | `/api/v1/gyms/gallery/` | called | gymsGalleryCreate() |
| `DELETE` | `/api/v1/gyms/gallery/{item_id}/` | called | gymsGalleryDestroy() |
| `PATCH` | `/api/v1/gyms/gallery/reorder/` | called | gymsGalleryReorderPartialUpdate() |
| `GET` | `/api/v1/gyms/logs/admin/` | handwritten | request() in lib/api/admin-logs.ts |
| `POST` | `/api/v1/gyms/logs/admin/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/logs/admin/{log_id}/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/logs/admin/actions/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/logs/admin/export/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/logs/admin/metrics/` | handwritten | request() in lib/api/admin-logs.ts |
| `GET` | `/api/v1/gyms/nearby/` | handwritten | request() in lib/api/discover.ts |
| `GET` | `/api/v1/gyms/opening-hours/` | called | gymsOpeningHoursRetrieve() |
| `PUT` | `/api/v1/gyms/opening-hours/` | called | gymsOpeningHoursUpdate() |
| `GET` | `/api/v1/gyms/profile/` | called | gymsProfileRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/` | called | gymsProfilePartialUpdate() |
| `GET` | `/api/v1/gyms/profile/location/` | called | gymsProfileLocationRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/location/` | called | gymsProfileLocationPartialUpdate() |
| `GET` | `/api/v1/gyms/profile/overview/` | called | gymsProfileOverviewRetrieve() |
| `PATCH` | `/api/v1/gyms/profile/overview/` | called | gymsProfileOverviewPartialUpdate() |
| `GET` | `/api/v1/gyms/search/` | handwritten | request() in lib/api/discover.ts |
| `GET` | `/api/v1/gyms/settings/` | called | gymsSettingsRetrieve() |
| `PATCH` | `/api/v1/gyms/settings/` | called | gymsSettingsPartialUpdate() |
| `POST` | `/api/v1/gyms/settings/access-control/` | called | gymsSettingsAccessControlCreate() |
| `GET` | `/api/v1/gyms/settings/blocked-users/` | called | gymsSettingsBlockedUsersRetrieve() |
| `POST` | `/api/v1/gyms/settings/blocked-users/` | called | gymsSettingsBlockedUsersCreate() |
| `DELETE` | `/api/v1/gyms/settings/blocked-users/{user_id}/` | called | gymsSettingsBlockedUsersDestroy() |
| `GET` | `/api/v1/gyms/settings/blocked-users/search/` | called | gymsSettingsBlockedUsersSearchRetrieve() |
| `GET` | `/api/v1/health/` | called | healthRetrieve() |
| `GET` | `/api/v1/leads/` | called | leadsList() |
| `POST` | `/api/v1/leads/` | called | leadsCreate() |
| `GET` | `/api/v1/leads/{lead_id}/` | called | leadsRetrieve() |
| `PATCH` | `/api/v1/leads/{lead_id}/` | called | leadsPartialUpdate() |
| `DELETE` | `/api/v1/leads/{lead_id}/` | called | leadsDestroy() |
| `POST` | `/api/v1/leads/{lead_id}/convert/` | called | leadsConvertCreate() |
| `POST` | `/api/v1/leads/{lead_id}/next-moves/` | called | leadsNextMovesCreate() |
| `PATCH` | `/api/v1/leads/{lead_id}/next-moves/{move_id}/` | called | leadsNextMovesPartialUpdate() |
| `POST` | `/api/v1/leads/{lead_id}/notes/` | called | leadsNotesCreate() |
| `GET` | `/api/v1/leads/metrics/` | called | leadsMetricsRetrieve() |
| `GET` | `/api/v1/leads/reasons/` | called | leadsReasonsRetrieve() |
| `POST` | `/api/v1/leads/reasons/` | called | leadsReasonsCreate() |
| `GET` | `/api/v1/members/` | called | membersList() |
| `POST` | `/api/v1/members/` | called | membersCreate() |
| `GET` | `/api/v1/members/{member_id}/` | called | membersRetrieve() |
| `PATCH` | `/api/v1/members/{member_id}/` | called | membersPartialUpdate() |
| `DELETE` | `/api/v1/members/{member_id}/` | called | membersDestroy() |
| `POST` | `/api/v1/members/{member_id}/resend-invitation/` | called | membersResendInvitationCreate() |
| `GET` | `/api/v1/members/{member_id}/routines/` | called | membersRoutinesList() |
| `GET` | `/api/v1/members/{member_id}/routines/{routine_id}/` | called | membersRoutinesRetrieve() |
| `PATCH` | `/api/v1/members/{member_id}/routines/{routine_id}/` | called | membersRoutinesPartialUpdate() |
| `POST` | `/api/v1/members/{member_id}/routines/assign/` | called | membersRoutinesAssignCreate() |
| `POST` | `/api/v1/members/{member_id}/subscriptions/` | called | membersSubscriptionsCreate() |
| `POST` | `/api/v1/members/accept-invitation/` | called | membersAcceptInvitationCreate() |
| `GET` | `/api/v1/members/metrics/` | called | membersMetricsRetrieve() |
| `GET` | `/api/v1/members/requests/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/members/requests/` | duplicate | same operation as POST /api/v1/gyms/{gym_id}/join-request/, which is used |
| `GET` | `/api/v1/members/requests/{request_id}/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/members/requests/{request_id}/accept/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/members/requests/{request_id}/cancel/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/members/requests/{request_id}/reject/` | handwritten | request() in lib/api/member-requests.ts |
| `POST` | `/api/v1/members/subscriptions/{subscription_id}/extra-amenities/` | called | membersSubscriptionsExtraAmenitiesCreate() |
| `POST` | `/api/v1/members/subscriptions/{subscription_id}/payments/` | called | membersSubscriptionsPaymentsCreate() |
| `PATCH` | `/api/v1/members/subscriptions/{subscription_id}/status/` | called | membersSubscriptionsStatusPartialUpdate() |
| `GET` | `/api/v1/messaging/conversations/` | called | messagingConversationsList() |
| `POST` | `/api/v1/messaging/conversations/` | called | messagingConversationsCreate() |
| `GET` | `/api/v1/messaging/conversations/{conversation_id}/` | called | messagingConversationsRetrieve() |
| `GET` | `/api/v1/messaging/conversations/{conversation_id}/messages/` | called | messagingConversationsMessagesList() |
| `POST` | `/api/v1/messaging/conversations/{conversation_id}/messages/` | called | messagingConversationsMessagesCreate() |
| `POST` | `/api/v1/messaging/conversations/{conversation_id}/read/` | called | messagingConversationsReadCreate() |
| `GET` | `/api/v1/messaging/keys/gym/{gym_id}/` | called | messagingKeysGymList() |
| `POST` | `/api/v1/messaging/keys/gym/register/` | called | messagingKeysGymRegisterCreate() |
| `POST` | `/api/v1/messaging/keys/register/` | called | messagingKeysRegisterCreate() |
| `GET` | `/api/v1/messaging/keys/user/{user_id}/` | called | messagingKeysUserList() |
| `GET` | `/api/v1/plans/` | called | plansList() |
| `POST` | `/api/v1/plans/` | called | plansCreate() |
| `GET` | `/api/v1/plans/{plan_id}/` | called | plansRetrieve() |
| `PATCH` | `/api/v1/plans/{plan_id}/` | called | plansPartialUpdate() |
| `DELETE` | `/api/v1/plans/{plan_id}/` | called | plansDestroy() |
| `PUT` | `/api/v1/plans/{plan_id}/amenities/` | called | plansAmenitiesUpdate() |
| `POST` | `/api/v1/plans/{plan_id}/status/` | called | plansStatusCreate() |
| `GET` | `/api/v1/plans/metrics/` | called | plansMetricsRetrieve() |
| `GET` | `/api/v1/posts/` | called | postsList() |
| `POST` | `/api/v1/posts/` | called | postsCreate() |
| `GET` | `/api/v1/posts/{post_id}/` | called | postsRetrieve() |
| `PATCH` | `/api/v1/posts/{post_id}/` | called | postsPartialUpdate() |
| `DELETE` | `/api/v1/posts/{post_id}/` | called | postsDestroy() |
| `GET` | `/api/v1/posts/{post_id}/comments/` | handwritten | request() in lib/api/comments.ts |
| `POST` | `/api/v1/posts/{post_id}/comments/` | handwritten | request() in lib/api/comments.ts |
| `GET` | `/api/v1/posts/{post_id}/comments/{comment_id}/` | handwritten | request() in lib/api/comments.ts |
| `PATCH` | `/api/v1/posts/{post_id}/comments/{comment_id}/` | handwritten | request() in lib/api/comments.ts |
| `DELETE` | `/api/v1/posts/{post_id}/comments/{comment_id}/` | handwritten | request() in lib/api/comments.ts |
| `GET` | `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/` | duplicate | same operation as GET /api/v1/comments/{comment_id}/reactions/, which is used |
| `POST` | `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/` | duplicate | same operation as POST /api/v1/comments/{comment_id}/reactions/, which is used |
| `DELETE` | `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/` | duplicate | same operation as DELETE /api/v1/comments/{comment_id}/reactions/, which is used |
| `GET` | `/api/v1/posts/{post_id}/comments/{comment_id}/reactions/summary/` | duplicate | same operation as GET /api/v1/comments/{comment_id}/reactions/summary/, which is used |
| `GET` | `/api/v1/posts/{post_id}/comments/{comment_id}/replies/` | handwritten | request() in lib/api/comments.ts |
| `POST` | `/api/v1/posts/{post_id}/comments/{comment_id}/replies/` | handwritten | request() in lib/api/comments.ts |
| `PATCH` | `/api/v1/posts/{post_id}/media/{media_id}/thumbnail/` | handwritten | request() in lib/api/actions.ts |
| `GET` | `/api/v1/posts/{post_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/posts/{post_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/posts/{post_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/posts/{post_id}/reactions/summary/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/posts/{post_id}/repost/` | handwritten | request() in lib/api/feed.ts |
| `GET` | `/api/v1/posts/{post_id}/reposts/` | handwritten | request() in lib/api/feed.ts |
| `GET` | `/api/v1/posts/feed/` | superseded | documented alias of GET /api/v1/posts/ (same handler, same parameters), which is used |
| `POST` | `/api/v1/posts/feed/` | superseded | documented alias of POST /api/v1/posts/ (same handler), which is used |
| `GET` | `/api/v1/posts/my/` | handwritten | request() in lib/api/feed.ts |
| `POST` | `/api/v1/posts/repost/` | duplicate | same operation as POST /api/v1/posts/{post_id}/repost/, which is used |
| `GET` | `/api/v1/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/{reaction_id}/` | superseded | one reaction by id — the same ReactionDetail row the target's reaction list returns, which is what the who-reacted list reads; no screen opens a single reaction |
| `DELETE` | `/api/v1/reactions/{reaction_id}/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/comments/{comment_id}/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/reactions/comments/{comment_id}/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/reactions/comments/{comment_id}/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/comments/{comment_id}/summary/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/items/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/posts/{post_id}/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/reactions/posts/{post_id}/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/reactions/posts/{post_id}/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/posts/{post_id}/summary/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/stories/{story_id}/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/reactions/stories/{story_id}/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/reactions/stories/{story_id}/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reactions/stories/{story_id}/summary/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/reports/leads-funnel/` | called | reportsLeadsFunnelRetrieve() |
| `GET` | `/api/v1/reports/membership-growth/` | called | reportsMembershipGrowthRetrieve() |
| `GET` | `/api/v1/reports/revenue/` | called | reportsRevenueRetrieve() |
| `GET` | `/api/v1/reports/trainer-workload/` | called | reportsTrainerWorkloadRetrieve() |
| `GET` | `/api/v1/routine-templates/` | called | routineTemplatesList() |
| `POST` | `/api/v1/routine-templates/` | called | routineTemplatesCreate() |
| `GET` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesRetrieve() |
| `PUT` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesUpdate() |
| `PATCH` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesPartialUpdate() |
| `DELETE` | `/api/v1/routine-templates/{template_id}/` | called | routineTemplatesDestroy() |
| `GET` | `/api/v1/stories/` | handwritten | request() in lib/api/stories.ts |
| `POST` | `/api/v1/stories/` | handwritten | request() in lib/api/stories.ts |
| `GET` | `/api/v1/stories/{story_id}/` | handwritten | request() in lib/api/stories.ts |
| `PATCH` | `/api/v1/stories/{story_id}/` | handwritten | request() in lib/api/stories.ts |
| `DELETE` | `/api/v1/stories/{story_id}/` | handwritten | request() in lib/api/stories.ts |
| `GET` | `/api/v1/stories/{story_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/stories/{story_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `DELETE` | `/api/v1/stories/{story_id}/reactions/` | handwritten | request() in lib/api/reactions.ts |
| `GET` | `/api/v1/stories/{story_id}/reactions/summary/` | handwritten | request() in lib/api/reactions.ts |
| `POST` | `/api/v1/stories/{story_id}/view/` | handwritten | request() in lib/api/stories.ts |
| `GET` | `/api/v1/stories/{story_id}/viewers/` | handwritten | request() in lib/api/stories.ts |
| `GET` | `/api/v1/stories/my/` | handwritten | request() in lib/api/stories.ts |
| `GET` | `/api/v1/stories/tray/` | handwritten | request() in lib/api/stories.ts |
| `POST` | `/api/v1/token/refresh/` | handwritten | request() in lib/api/http.ts |
| `POST` | `/api/v1/users/{user_id}/follow/` | called | usersFollowCreate2() |
| `DELETE` | `/api/v1/users/{user_id}/follow/` | called | usersFollowDestroy2() |
| `POST` | `/api/v1/users/{user_id}/follow/accept/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/accept/, which is used |
| `POST` | `/api/v1/users/{user_id}/follow/cancel/` | handwritten | request() in lib/api/social.ts |
| `DELETE` | `/api/v1/users/{user_id}/follow/cancel/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/users/{user_id}/follow/confirm/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/accept/, which is used |
| `POST` | `/api/v1/users/{user_id}/follow/reject/` | duplicate | same operation as POST /api/v1/auth/follow-requests/{request_id}/reject/, which is used |
| `GET` | `/api/v1/users/{user_id}/followers/` | called | usersFollowersRetrieve() |
| `GET` | `/api/v1/users/{user_id}/following/` | called | usersFollowingRetrieve() |
| `GET` | `/api/v1/users/{user_id}/profile/about/` | handwritten | request() in lib/api/profile.ts |
| `GET` | `/api/v1/users/follow-requests/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/users/follow-requests/{request_id}/accept/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/users/follow-requests/{request_id}/cancel/` | handwritten | request() in lib/api/social.ts |
| `DELETE` | `/api/v1/users/follow-requests/{request_id}/cancel/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/users/follow-requests/{request_id}/reject/` | handwritten | request() in lib/api/social.ts |
| `POST` | `/api/v1/users/followers/{user_id}/block/` | handwritten | request() in lib/api/user-settings.ts |
| `GET` | `/api/v1/users/me/` | called | usersMeRetrieve() |
| `PATCH` | `/api/v1/users/me/` | called | usersMePartialUpdate() |
| `GET` | `/api/v1/users/profile/about/` | handwritten | request() in lib/api/profile.ts |
| `PUT` | `/api/v1/users/profile/about/` | superseded | full-replace form of PATCH on the same resource, which is used (each section saves on its own) |
| `PATCH` | `/api/v1/users/profile/about/` | handwritten | request() in lib/api/profile.ts |
| `GET` | `/api/v1/users/profile/about/educations/` | handwritten | request() in lib/api/profile.ts |
| `POST` | `/api/v1/users/profile/about/educations/` | handwritten | request() in lib/api/profile.ts |
| `PATCH` | `/api/v1/users/profile/about/educations/{education_id}/` | handwritten | request() in lib/api/profile.ts |
| `DELETE` | `/api/v1/users/profile/about/educations/{education_id}/` | handwritten | request() in lib/api/profile.ts |
| `GET` | `/api/v1/users/profile/about/social-links/` | handwritten | request() in lib/api/profile.ts |
| `POST` | `/api/v1/users/profile/about/social-links/` | handwritten | request() in lib/api/profile.ts |
| `PATCH` | `/api/v1/users/profile/about/social-links/{link_id}/` | handwritten | request() in lib/api/profile.ts |
| `DELETE` | `/api/v1/users/profile/about/social-links/{link_id}/` | handwritten | request() in lib/api/profile.ts |
| `GET` | `/api/v1/users/settings/` | handwritten | request() in lib/api/user-settings.ts |
| `PATCH` | `/api/v1/users/settings/` | handwritten | request() in lib/api/user-settings.ts |
| `POST` | `/api/v1/users/settings/access-control/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/users/settings/blocked-users/` | handwritten | request() in lib/api/user-settings.ts |
| `POST` | `/api/v1/users/settings/blocked-users/` | handwritten | request() in lib/api/user-settings.ts |
| `DELETE` | `/api/v1/users/settings/blocked-users/{user_id}/` | handwritten | request() in lib/api/user-settings.ts |
| `POST` | `/api/v1/users/settings/blocked-users/followers/{user_id}/` | handwritten | request() in lib/api/user-settings.ts |
| `GET` | `/api/v1/users/settings/blocked-users/search/` | handwritten | request() in lib/api/user-settings.ts |
| `POST` | `/api/v1/users/settings/followers/{user_id}/block/` | handwritten | request() in lib/api/user-settings.ts |
| `GET` | `/api/v1/users/settings/security/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/users/settings/security/2fa/` | handwritten | request() in lib/api/security.ts |
| `PATCH` | `/api/v1/users/settings/security/2fa/` | handwritten | request() in lib/api/security.ts |
| `POST` | `/api/v1/users/settings/security/change-password/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/users/settings/security/contact-info/` | handwritten | request() in lib/api/security.ts |
| `PATCH` | `/api/v1/users/settings/security/contact-info/` | handwritten | request() in lib/api/security.ts |
| `GET` | `/api/v1/users/settings/security/devices/` | handwritten | request() in lib/api/security.ts |
| `DELETE` | `/api/v1/users/settings/security/devices/{device_id}/` | handwritten | request() in lib/api/security.ts |
