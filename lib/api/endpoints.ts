// AUTO-GENERATED from https://v0.manygym.com/api/v1/schema/ — do not edit by hand.
// 149 operations.

import { request } from "./http";
import type * as T from "./types";

// ===== Access Control & RBAC =====
/** GET /api/v1/access-control/permissions/ — List System Permissions Grouped by Topic */
export const accessControlPermissionsRetrieve = () =>
  request<unknown>("GET", `/api/v1/access-control/permissions/`);

/** GET /api/v1/access-control/roles/ — List Available Roles */
export const accessControlRolesRetrieve = (query?: { gym_id?: string; page?: number; page_size?: number }) =>
  request<T.PaginatedRoleList>("GET", `/api/v1/access-control/roles/`, { query });

/** POST /api/v1/access-control/roles/ — Create Custom Role */
export const accessControlRolesCreate = (body: T.CreateCustomRoleRequest) =>
  request<T.Role>("POST", `/api/v1/access-control/roles/`, { body });

/** DELETE /api/v1/access-control/roles/{role_id}/ — Delete Custom Role */
export const accessControlRolesDestroy = (roleId: string) =>
  request<T.MessageResponse>("DELETE", `/api/v1/access-control/roles/${encodeURIComponent(roleId)}/`);

/** GET /api/v1/access-control/roles/{role_id}/ — Get Role Details */
export const accessControlRolesRetrieve2 = (roleId: string) =>
  request<T.Role>("GET", `/api/v1/access-control/roles/${encodeURIComponent(roleId)}/`);

/** PATCH /api/v1/access-control/roles/{role_id}/ — Update Custom Role */
export const accessControlRolesPartialUpdate = (roleId: string, body: T.PatchedUpdateCustomRoleRequest) =>
  request<T.Role>("PATCH", `/api/v1/access-control/roles/${encodeURIComponent(roleId)}/`, { body });

/** GET /api/v1/access-control/staff/ — List Gym Staff Members */
export const accessControlStaffList = (query?: { all?: boolean; page?: number; page_size?: number }) =>
  request<T.PaginatedStaffAssignmentList>("GET", `/api/v1/access-control/staff/`, { query });

/** POST /api/v1/access-control/staff/ — Invite Staff Member */
export const accessControlStaffCreate = (body: T.InviteStaffRequest) =>
  request<T.StaffAssignment>("POST", `/api/v1/access-control/staff/`, { body });

/** DELETE /api/v1/access-control/staff/{assignment_id}/ — Revoke Staff Access */
export const accessControlStaffDestroy = (assignmentId: string) =>
  request<T.MessageResponse>("DELETE", `/api/v1/access-control/staff/${encodeURIComponent(assignmentId)}/`);

/** PATCH /api/v1/access-control/staff/{assignment_id}/ — Update Staff Status (Active / Inactive) */
export const accessControlStaffPartialUpdate = (assignmentId: string, body: T.PatchedUpdateStaffStatusRequest) =>
  request<T.StaffAssignment>("PATCH", `/api/v1/access-control/staff/${encodeURIComponent(assignmentId)}/`, { body });

// ===== Amenities =====
/** GET /api/v1/amenities/catalog/ — Get Master Amenities Catalog */
export const amenitiesCatalogRetrieve = () =>
  request<unknown>("GET", `/api/v1/amenities/catalog/`);

/** GET /api/v1/amenities/gym-amenities/ — Get Gym's Configured Amenities */
export const amenitiesGymAmenitiesRetrieve = (query?: { gym_id?: string }) =>
  request<T.GymAmenitiesConfigured>("GET", `/api/v1/amenities/gym-amenities/`, { query });

/** PUT /api/v1/amenities/gym-amenities/sync/ — Sync Gym Amenities (Free & Paid) */
export const amenitiesGymAmenitiesSyncUpdate = (body: T.SyncGymAmenitiesRequest, query?: { gym_id?: string }) =>
  request<T.SyncGymAmenitiesResponse>("PUT", `/api/v1/amenities/gym-amenities/sync/`, { body, query });

// ===== User Social & Follow =====
/** DELETE /api/v1/auth/{user_id}/follow/ — Unfollow a User */
export const authFollowDestroy2 = (userId: string) =>
  request<T.UserFollowActionResponse>("DELETE", `/api/v1/auth/${encodeURIComponent(userId)}/follow/`);

/** POST /api/v1/auth/{user_id}/follow/ — Follow a User */
export const authFollowCreate2 = (userId: string) =>
  request<T.UserFollowActionResponse>("POST", `/api/v1/auth/${encodeURIComponent(userId)}/follow/`);

/** GET /api/v1/auth/{user_id}/followers/ — List User Followers */
export const authFollowersRetrieve = (userId: string) =>
  request<Array<T.FollowUserItem>>("GET", `/api/v1/auth/${encodeURIComponent(userId)}/followers/`);

/** GET /api/v1/auth/{user_id}/following/ — List User Following */
export const authFollowingRetrieve = (userId: string, query?: { page?: number; page_size?: number }) =>
  request<Array<T.FollowUserItem>>("GET", `/api/v1/auth/${encodeURIComponent(userId)}/following/`, { query });

/** DELETE /api/v1/users/{user_id}/follow/ — Unfollow a User */
export const usersFollowDestroy2 = (userId: string) =>
  request<T.UserFollowActionResponse>("DELETE", `/api/v1/users/${encodeURIComponent(userId)}/follow/`);

/** POST /api/v1/users/{user_id}/follow/ — Follow a User */
export const usersFollowCreate2 = (userId: string) =>
  request<T.UserFollowActionResponse>("POST", `/api/v1/users/${encodeURIComponent(userId)}/follow/`);

/** GET /api/v1/users/{user_id}/followers/ — List User Followers */
export const usersFollowersRetrieve = (userId: string) =>
  request<Array<T.FollowUserItem>>("GET", `/api/v1/users/${encodeURIComponent(userId)}/followers/`);

/** GET /api/v1/users/{user_id}/following/ — List User Following */
export const usersFollowingRetrieve = (userId: string, query?: { page?: number; page_size?: number }) =>
  request<Array<T.FollowUserItem>>("GET", `/api/v1/users/${encodeURIComponent(userId)}/following/`, { query });

// ===== Password Management =====
/** POST /api/v1/auth/change-password/ — Change Password */
export const authChangePasswordCreate = (body: T.ChangePasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/change-password/`, { body });

/** POST /api/v1/auth/forgot-password/ — Request Password Reset OTP */
export const authForgotPasswordCreate = (body: T.ForgotPasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/forgot-password/`, { body, anonymous: true });

/** POST /api/v1/auth/reset-password/ — Reset Password with OTP */
export const authResetPasswordCreate = (body: T.ResetPasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/reset-password/`, { body, anonymous: true });

/** POST /api/v1/auth/verify-reset-otp/ — Verify Password Reset OTP */
export const authVerifyResetOtpCreate = (body: T.VerifyResetOTPRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/verify-reset-otp/`, { body, anonymous: true });

/** POST /api/v1/users/change-password/ — Change Password */
export const usersChangePasswordCreate = (body: T.ChangePasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/users/change-password/`, { body });

/** POST /api/v1/users/forgot-password/ — Request Password Reset OTP */
export const usersForgotPasswordCreate = (body: T.ForgotPasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/users/forgot-password/`, { body, anonymous: true });

/** POST /api/v1/users/reset-password/ — Reset Password with OTP */
export const usersResetPasswordCreate = (body: T.ResetPasswordRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/users/reset-password/`, { body, anonymous: true });

/** POST /api/v1/users/verify-reset-otp/ — Verify Password Reset OTP */
export const usersVerifyResetOtpCreate = (body: T.VerifyResetOTPRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/users/verify-reset-otp/`, { body, anonymous: true });

// ===== Unified Social Follow =====
/** DELETE /api/v1/auth/follow/ — Unfollow a User or Gym */
export const authFollowDestroy = () =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/auth/follow/`);

/** GET /api/v1/auth/follow/ — Get Followers or Following List */
export const authFollowRetrieve = (query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/auth/follow/`, { query });

/** POST /api/v1/auth/follow/ — Follow or Unfollow a User or Gym */
export const authFollowCreate = (body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/auth/follow/`, { body });

/** DELETE /api/v1/follow/ — Unfollow a User or Gym */
export const followDestroy = () =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/follow/`);

/** GET /api/v1/follow/ — Get Followers or Following List */
export const followRetrieve = (query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/follow/`, { query });

/** POST /api/v1/follow/ — Follow or Unfollow a User or Gym */
export const followCreate = (body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/follow/`, { body });

/** DELETE /api/v1/follow/{target_id}/ — Unfollow a User or Gym */
export const followDestroy2 = (targetId: string) =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/follow/${encodeURIComponent(targetId)}/`);

/** GET /api/v1/follow/{target_id}/ — Get Followers or Following List */
export const followRetrieve2 = (targetId: string, query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/follow/${encodeURIComponent(targetId)}/`, { query });

/** POST /api/v1/follow/{target_id}/ — Follow or Unfollow a User or Gym */
export const followCreate2 = (targetId: string, body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/follow/${encodeURIComponent(targetId)}/`, { body });

/** DELETE /api/v1/follows/ — Unfollow a User or Gym */
export const followsDestroy = () =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/follows/`);

/** GET /api/v1/follows/ — Get Followers or Following List */
export const followsRetrieve = (query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/follows/`, { query });

/** POST /api/v1/follows/ — Follow or Unfollow a User or Gym */
export const followsCreate = (body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/follows/`, { body });

/** DELETE /api/v1/follows/{target_id}/ — Unfollow a User or Gym */
export const followsDestroy2 = (targetId: string) =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/follows/${encodeURIComponent(targetId)}/`);

/** GET /api/v1/follows/{target_id}/ — Get Followers or Following List */
export const followsRetrieve2 = (targetId: string, query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/follows/${encodeURIComponent(targetId)}/`, { query });

/** POST /api/v1/follows/{target_id}/ — Follow or Unfollow a User or Gym */
export const followsCreate2 = (targetId: string, body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/follows/${encodeURIComponent(targetId)}/`, { body });

/** DELETE /api/v1/users/follow/ — Unfollow a User or Gym */
export const usersFollowDestroy = () =>
  request<T.FollowActionResponse>("DELETE", `/api/v1/users/follow/`);

/** GET /api/v1/users/follow/ — Get Followers or Following List */
export const usersFollowRetrieve = (query?: { page?: number; page_size?: number; target_id?: string }) =>
  request<T.UnifiedTargetFollowersResponse>("GET", `/api/v1/users/follow/`, { query });

/** POST /api/v1/users/follow/ — Follow or Unfollow a User or Gym */
export const usersFollowCreate = (body: T.FollowActionRequest) =>
  request<T.FollowActionResponse>("POST", `/api/v1/users/follow/`, { body });

// ===== Authentication & Sessions =====
/** POST /api/v1/auth/login/ — User Authentication & Login */
export const authLoginCreate = (body: T.LoginRequest) =>
  request<T.LoginResponse>("POST", `/api/v1/auth/login/`, { body, anonymous: true });

/** POST /api/v1/auth/logout/ — User Logout & Token Revocation */
export const authLogoutCreate = (body: T.LogoutRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/logout/`, { body });

/** POST /api/v1/auth/switch-context/ — Switch Token Context (Personal vs Gym) */
export const authSwitchContextCreate = (body: T.SwitchContextRequest) =>
  request<T.SwitchContextResponse>("POST", `/api/v1/auth/switch-context/`, { body });

// ===== User Profile =====
/** GET /api/v1/auth/me/ — Get Current User Profile & Accessible Gyms */
export const authMeRetrieve = () =>
  request<T.UserProfileMeResponse>("GET", `/api/v1/auth/me/`);

/** PATCH /api/v1/auth/me/ — Update Current User Profile */
export const authMePartialUpdate = (body: T.PatchedUpdateProfileRequest) =>
  request<T.UserProfileMeResponse>("PATCH", `/api/v1/auth/me/`, { body });

/** GET /api/v1/users/me/ — Get Current User Profile & Accessible Gyms */
export const usersMeRetrieve = () =>
  request<T.UserProfileMeResponse>("GET", `/api/v1/users/me/`);

/** PATCH /api/v1/users/me/ — Update Current User Profile */
export const usersMePartialUpdate = (body: T.PatchedUpdateProfileRequest) =>
  request<T.UserProfileMeResponse>("PATCH", `/api/v1/users/me/`, { body });

// ===== User Identity & Onboarding =====
/** POST /api/v1/auth/register/ — User Registration / Sign Up */
export const authRegisterCreate = (body: T.UserRegistrationRequest) =>
  request<T.RegisterResponse>("POST", `/api/v1/auth/register/`, { body, anonymous: true });

/** POST /api/v1/auth/resend-otp/ — Resend Registration OTP */
export const authResendOtpCreate = (body: T.ResendOTPRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/auth/resend-otp/`, { body, anonymous: true });

/** POST /api/v1/auth/verify-signup-otp/ — Verify Account Registration OTP */
export const authVerifySignupOtpCreate = (body: T.VerifySignupOTPRequest) =>
  request<T.VerifySignupResponse>("POST", `/api/v1/auth/verify-signup-otp/`, { body, anonymous: true });

/** POST /api/v1/users/register/ — User Registration / Sign Up */
export const usersRegisterCreate = (body: T.UserRegistrationRequest) =>
  request<T.RegisterResponse>("POST", `/api/v1/users/register/`, { body, anonymous: true });

/** POST /api/v1/users/resend-otp/ — Resend Registration OTP */
export const usersResendOtpCreate = (body: T.ResendOTPRequest) =>
  request<T.MessageResponse>("POST", `/api/v1/users/resend-otp/`, { body, anonymous: true });

/** POST /api/v1/users/verify-signup-otp/ — Verify Account Registration OTP */
export const usersVerifySignupOtpCreate = (body: T.VerifySignupOTPRequest) =>
  request<T.VerifySignupResponse>("POST", `/api/v1/users/verify-signup-otp/`, { body, anonymous: true });

// ===== Dashboard & Reports =====
/** GET /api/v1/dashboard/summary/ — Executive Dashboard Summary */
export const dashboardSummaryRetrieve = (query: { gym_id: string }) =>
  request<T.DashboardSummary>("GET", `/api/v1/dashboard/summary/`, { query });

/** GET /api/v1/reports/leads-funnel/ — Lead Conversion Funnel Report */
export const reportsLeadsFunnelRetrieve = (query: { end_date?: string; gym_id: string; start_date?: string }) =>
  request<T.LeadFunnelReport>("GET", `/api/v1/reports/leads-funnel/`, { query });

/** GET /api/v1/reports/membership-growth/ — Membership Growth & Churn Report */
export const reportsMembershipGrowthRetrieve = (query: { end_date?: string; gym_id: string; start_date?: string }) =>
  request<T.MembershipGrowthReport>("GET", `/api/v1/reports/membership-growth/`, { query });

/** GET /api/v1/reports/revenue/ — Revenue & Collections Report */
export const reportsRevenueRetrieve = (query: { end_date?: string; gym_id: string; start_date?: string }) =>
  request<T.RevenueReport>("GET", `/api/v1/reports/revenue/`, { query });

/** GET /api/v1/reports/trainer-workload/ — Trainer Workload & Allocation Report */
export const reportsTrainerWorkloadRetrieve = (query: { gym_id: string }) =>
  request<T.TrainerWorkloadReport>("GET", `/api/v1/reports/trainer-workload/`, { query });

// ===== Gym Profile & Multi-Location =====
/** POST /api/v1/gyms/ — Create New Gym Workspace */
export const gymsCreate = (body: T.GymCreateRequest) =>
  request<T.GymDetail>("POST", `/api/v1/gyms/`, { body });

/** GET /api/v1/gyms/gallery/ — List Gallery Media Assets */
export const gymsGalleryRetrieve = (query?: { category?: string; gym_id?: string }) =>
  request<Array<T.GymGalleryItem>>("GET", `/api/v1/gyms/gallery/`, { query });

/** POST /api/v1/gyms/gallery/ — Add Gallery Media Asset */
export const gymsGalleryCreate = (body: T.GymGalleryCreateRequest, query?: { gym_id?: string }) =>
  request<T.GymGalleryItem>("POST", `/api/v1/gyms/gallery/`, { body, query });

/** PATCH /api/v1/gyms/gallery/reorder/ — Reorder Gallery Assets */
export const gymsGalleryReorderPartialUpdate = (body: T.PatchedGymGalleryReorderRequest, query?: { gym_id?: string }) =>
  request<T.MessageResponse>("PATCH", `/api/v1/gyms/gallery/reorder/`, { body, query });

/** DELETE /api/v1/gyms/gallery/{item_id}/ — Delete Gallery Media Asset */
export const gymsGalleryDestroy = (itemId: string, query?: { gym_id?: string }) =>
  request<T.MessageResponse>("DELETE", `/api/v1/gyms/gallery/${encodeURIComponent(itemId)}/`, { query });

/** GET /api/v1/gyms/opening-hours/ — Get Weekly Operating Hours */
export const gymsOpeningHoursRetrieve = (query?: { gym_id?: string }) =>
  request<Array<T.GymOpeningHoursItem>>("GET", `/api/v1/gyms/opening-hours/`, { query });

/** PUT /api/v1/gyms/opening-hours/ — Bulk Update Weekly Operating Hours */
export const gymsOpeningHoursUpdate = (body: T.GymOpeningHoursBulkUpdateRequest, query?: { gym_id?: string }) =>
  request<Array<T.GymOpeningHoursItem>>("PUT", `/api/v1/gyms/opening-hours/`, { body, query });

/** GET /api/v1/gyms/profile/ — Get Gym Profile Overview */
export const gymsProfileRetrieve = (query?: { gym_id?: string }) =>
  request<T.GymDetail>("GET", `/api/v1/gyms/profile/`, { query });

/** PATCH /api/v1/gyms/profile/ — Update Gym Overview Tab */
export const gymsProfilePartialUpdate = (body: T.PatchedGymOverviewUpdateRequest, query?: { gym_id?: string }) =>
  request<T.GymDetail>("PATCH", `/api/v1/gyms/profile/`, { body, query });

/** GET /api/v1/gyms/profile/location/ — Get Gym Physical Location */
export const gymsProfileLocationRetrieve = (query?: { gym_id?: string }) =>
  request<T.GymLocation>("GET", `/api/v1/gyms/profile/location/`, { query });

/** PATCH /api/v1/gyms/profile/location/ — Update Gym Location & Map Coordinates */
export const gymsProfileLocationPartialUpdate = (body: T.PatchedGymLocationUpdateRequest, query?: { gym_id?: string }) =>
  request<T.GymLocation>("PATCH", `/api/v1/gyms/profile/location/`, { body, query });

/** GET /api/v1/gyms/profile/overview/ — Get Gym Profile Overview */
export const gymsProfileOverviewRetrieve = (query?: { gym_id?: string }) =>
  request<T.GymDetail>("GET", `/api/v1/gyms/profile/overview/`, { query });

/** PATCH /api/v1/gyms/profile/overview/ — Update Gym Overview Tab */
export const gymsProfileOverviewPartialUpdate = (body: T.PatchedGymOverviewUpdateRequest, query?: { gym_id?: string }) =>
  request<T.GymDetail>("PATCH", `/api/v1/gyms/profile/overview/`, { body, query });

// ===== Gym Social & Follow =====
/** GET /api/v1/gyms/followed/ — List Gyms Followed by User */
export const gymsFollowedRetrieve = (query?: { page?: number; page_size?: number }) =>
  request<Array<T.FollowedGymItem>>("GET", `/api/v1/gyms/followed/`, { query });

/** DELETE /api/v1/gyms/{gym_id}/follow/ — Unfollow a Gym */
export const gymsFollowDestroy = (gymId: string) =>
  request<T.GymFollowActionResponse>("DELETE", `/api/v1/gyms/${encodeURIComponent(gymId)}/follow/`);

/** POST /api/v1/gyms/{gym_id}/follow/ — Follow a Gym */
export const gymsFollowCreate = (gymId: string) =>
  request<T.GymFollowActionResponse>("POST", `/api/v1/gyms/${encodeURIComponent(gymId)}/follow/`);

/** GET /api/v1/gyms/{gym_id}/followers/ — List Gym Followers */
export const gymsFollowersRetrieve = (gymId: string, query?: { page?: number; page_size?: number }) =>
  request<Array<T.GymFollowerItem>>("GET", `/api/v1/gyms/${encodeURIComponent(gymId)}/followers/`, { query });

/** GET /api/v1/gyms/{gym_id}/following/ — List People and Pages Gym Follows */
export const gymsFollowingRetrieve = (gymId: string) =>
  request<unknown>("GET", `/api/v1/gyms/${encodeURIComponent(gymId)}/following/`);

// ===== Gym Settings =====
/** GET /api/v1/gyms/settings/ — Retrieve Gym Settings */
export const gymsSettingsRetrieve = (query?: { gym_id?: string }) =>
  request<T.GymSetting>("GET", `/api/v1/gyms/settings/`, { query });

/** PATCH /api/v1/gyms/settings/ — Update Gym Settings */
export const gymsSettingsPartialUpdate = (body: T.PatchedGymSettingUpdateRequest, query?: { gym_id?: string }) =>
  request<T.GymSetting>("PATCH", `/api/v1/gyms/settings/`, { body, query });

// ===== Gym Settings - Access & Control =====
/** POST /api/v1/gyms/settings/access-control/ — Perform Access & Control Action */
export const gymsSettingsAccessControlCreate = (body: T.GymAccessControlActionRequest, query?: { gym_id?: string }) =>
  request<T.GymSetting>("POST", `/api/v1/gyms/settings/access-control/`, { body, query });

// ===== Gym Settings - Blocking =====
/** GET /api/v1/gyms/settings/blocked-users/ — List Blocked Users */
export const gymsSettingsBlockedUsersRetrieve = (query?: { gym_id?: string }) =>
  request<Array<T.GymBlockedUser>>("GET", `/api/v1/gyms/settings/blocked-users/`, { query });

/** POST /api/v1/gyms/settings/blocked-users/ — Block a User */
export const gymsSettingsBlockedUsersCreate = (body: T.GymBlockUserCreateRequest, query?: { gym_id?: string }) =>
  request<T.GymBlockedUser>("POST", `/api/v1/gyms/settings/blocked-users/`, { body, query });

/** GET /api/v1/gyms/settings/blocked-users/search/ — Search Users to Block */
export const gymsSettingsBlockedUsersSearchRetrieve = (query?: { gym_id?: string; q?: string }) =>
  request<Array<T.GymUserSearchToBlock>>("GET", `/api/v1/gyms/settings/blocked-users/search/`, { query });

/** DELETE /api/v1/gyms/settings/blocked-users/{user_id}/ — Unblock a User */
export const gymsSettingsBlockedUsersDestroy = (userId: string, query?: { gym_id?: string }) =>
  request<T.MessageResponse>("DELETE", `/api/v1/gyms/settings/blocked-users/${encodeURIComponent(userId)}/`, { query });

// ===== health =====
/** GET /api/v1/health/ — Service Health Check */
export const healthRetrieve = () =>
  request<unknown>("GET", `/api/v1/health/`);

// ===== Leads CRM =====
/** GET /api/v1/leads/ — List Leads */
export const leadsList = (query?: { assigned_staff_id?: string; gym_id?: string; interested_plan_id?: string; page?: number; page_size?: number; search?: string; source?: string; stage?: string }) =>
  request<Array<T.LeadList>>("GET", `/api/v1/leads/`, { query });

/** POST /api/v1/leads/ — Create Lead */
export const leadsCreate = (body: T.LeadCreateRequest, query?: { gym_id?: string }) =>
  request<T.LeadDetail>("POST", `/api/v1/leads/`, { body, query });

/** GET /api/v1/leads/metrics/ — Lead Pipeline Metrics */
export const leadsMetricsRetrieve = (query?: { gym_id?: string }) =>
  request<T.LeadMetrics>("GET", `/api/v1/leads/metrics/`, { query });

/** GET /api/v1/leads/reasons/ — List Lost Reasons */
export const leadsReasonsRetrieve = (query?: { gym_id?: string }) =>
  request<T.ReasonsDirectory>("GET", `/api/v1/leads/reasons/`, { query });

/** POST /api/v1/leads/reasons/ — Create Custom Lost Reason */
export const leadsReasonsCreate = (body: T.LeadCustomReasonCreateRequest, query?: { gym_id?: string }) =>
  request<T.LeadCustomReason>("POST", `/api/v1/leads/reasons/`, { body, query });

/** DELETE /api/v1/leads/{lead_id}/ — Delete Lead */
export const leadsDestroy = (leadId: string, query?: { gym_id?: string }) =>
  request<T.MessageResponse>("DELETE", `/api/v1/leads/${encodeURIComponent(leadId)}/`, { query });

/** GET /api/v1/leads/{lead_id}/ — Get Lead Dossier */
export const leadsRetrieve = (leadId: string, query?: { gym_id?: string }) =>
  request<T.LeadDetail>("GET", `/api/v1/leads/${encodeURIComponent(leadId)}/`, { query });

/** PATCH /api/v1/leads/{lead_id}/ — Update Lead */
export const leadsPartialUpdate = (leadId: string, body: T.PatchedLeadUpdateRequest, query?: { gym_id?: string }) =>
  request<T.LeadDetail>("PATCH", `/api/v1/leads/${encodeURIComponent(leadId)}/`, { body, query });

/** POST /api/v1/leads/{lead_id}/convert/ — Convert Lead to Member */
export const leadsConvertCreate = (leadId: string, body: T.LeadConvertToMemberRequest, query?: { gym_id?: string }) =>
  request<{
  message?: string;
  member_id?: string;
  lead_id?: string;
}>("POST", `/api/v1/leads/${encodeURIComponent(leadId)}/convert/`, { body, query });

/** POST /api/v1/leads/{lead_id}/next-moves/ — Schedule Next Move */
export const leadsNextMovesCreate = (leadId: string, body: T.LeadNextMoveCreateRequest, query?: { gym_id?: string }) =>
  request<T.LeadNextMove>("POST", `/api/v1/leads/${encodeURIComponent(leadId)}/next-moves/`, { body, query });

/** PATCH /api/v1/leads/{lead_id}/next-moves/{move_id}/ — Update Next Move */
export const leadsNextMovesPartialUpdate = (leadId: string, moveId: string, body: T.PatchedLeadNextMoveUpdateRequest, query?: { gym_id?: string }) =>
  request<T.LeadNextMove>("PATCH", `/api/v1/leads/${encodeURIComponent(leadId)}/next-moves/${encodeURIComponent(moveId)}/`, { body, query });

/** POST /api/v1/leads/{lead_id}/notes/ — Add Lead Note */
export const leadsNotesCreate = (leadId: string, body: T.LeadNoteCreateRequest, query?: { gym_id?: string }) =>
  request<T.LeadNote>("POST", `/api/v1/leads/${encodeURIComponent(leadId)}/notes/`, { body, query });

// ===== Members & Lifecycle =====
/** GET /api/v1/members/ — List Gym Members */
export const membersList = (query?: { assigned_trainer_id?: string; gym_id?: string; joining_status?: string; membership_status?: string; page?: number; page_size?: number; payment_status?: string; search?: string }) =>
  request<Array<T.MemberList>>("GET", `/api/v1/members/`, { query });

/** POST /api/v1/members/ — Create / Onboard Member */
export const membersCreate = (body: T.MemberCreateRequest) =>
  request<T.MemberDetail>("POST", `/api/v1/members/`, { body });

/** POST /api/v1/members/accept-invitation/ — Accept Member Invitation */
export const membersAcceptInvitationCreate = (body: T.MemberAcceptInvitationRequest) =>
  request<T.MemberDetail>("POST", `/api/v1/members/accept-invitation/`, { body });

/** GET /api/v1/members/metrics/ — Get Member Directory Metrics */
export const membersMetricsRetrieve = () =>
  request<unknown>("GET", `/api/v1/members/metrics/`);

/** DELETE /api/v1/members/{member_id}/ — Delete Member */
export const membersDestroy = (memberId: string) =>
  request<T.MessageResponse>("DELETE", `/api/v1/members/${encodeURIComponent(memberId)}/`);

/** GET /api/v1/members/{member_id}/ — Get Member Dossier */
export const membersRetrieve = (memberId: string) =>
  request<T.MemberDetail>("GET", `/api/v1/members/${encodeURIComponent(memberId)}/`);

/** PATCH /api/v1/members/{member_id}/ — Update Member Details */
export const membersPartialUpdate = (memberId: string, body: T.PatchedMemberUpdateRequest) =>
  request<T.MemberDetail>("PATCH", `/api/v1/members/${encodeURIComponent(memberId)}/`, { body });

/** POST /api/v1/members/{member_id}/resend-invitation/ — Resend Onboarding Invitation */
export const membersResendInvitationCreate = (memberId: string) =>
  request<T.MessageResponse>("POST", `/api/v1/members/${encodeURIComponent(memberId)}/resend-invitation/`);

// ===== Member Workouts =====
/** GET /api/v1/members/{member_id}/routines/ — List Member Routines */
export const membersRoutinesList = (memberId: string, query?: { gym_id?: string }) =>
  request<Array<T.MemberRoutineDetail>>("GET", `/api/v1/members/${encodeURIComponent(memberId)}/routines/`, { query });

/** POST /api/v1/members/{member_id}/routines/assign/ — Assign Routine to Member */
export const membersRoutinesAssignCreate = (memberId: string, body: T.MemberRoutineAssignRequest, query?: { gym_id?: string }) =>
  request<T.MemberRoutineDetail>("POST", `/api/v1/members/${encodeURIComponent(memberId)}/routines/assign/`, { body, query });

/** GET /api/v1/members/{member_id}/routines/{routine_id}/ — Get Member Routine Dossier */
export const membersRoutinesRetrieve = (memberId: string, routineId: string, query?: { gym_id?: string }) =>
  request<T.MemberRoutineDetail>("GET", `/api/v1/members/${encodeURIComponent(memberId)}/routines/${encodeURIComponent(routineId)}/`, { query });

/** PATCH /api/v1/members/{member_id}/routines/{routine_id}/ — Customize Member Routine */
export const membersRoutinesPartialUpdate = (memberId: string, routineId: string, body: T.PatchedMemberRoutineUpdateRequest, query?: { gym_id?: string }) =>
  request<T.MemberRoutineDetail>("PATCH", `/api/v1/members/${encodeURIComponent(memberId)}/routines/${encodeURIComponent(routineId)}/`, { body, query });

// ===== Members & Subscriptions =====
/** POST /api/v1/members/subscriptions/{subscription_id}/extra-amenities/ — Attach Extra Amenities */
export const membersSubscriptionsExtraAmenitiesCreate = (subscriptionId: string, body: T.MemberExtraAmenitiesCreateRequest) =>
  request<Array<T.MemberExtraAmenity>>("POST", `/api/v1/members/subscriptions/${encodeURIComponent(subscriptionId)}/extra-amenities/`, { body });

/** POST /api/v1/members/subscriptions/{subscription_id}/payments/ — Log Subscription Payment */
export const membersSubscriptionsPaymentsCreate = (subscriptionId: string, body: T.MemberPaymentCreateRequest) =>
  request<T.MemberPayment>("POST", `/api/v1/members/subscriptions/${encodeURIComponent(subscriptionId)}/payments/`, { body });

/** PATCH /api/v1/members/subscriptions/{subscription_id}/status/ — Transition Subscription Status */
export const membersSubscriptionsStatusPartialUpdate = (subscriptionId: string, body: T.PatchedMemberSubscriptionStatusTransitionRequest) =>
  request<T.MemberSubscriptionDetail>("PATCH", `/api/v1/members/subscriptions/${encodeURIComponent(subscriptionId)}/status/`, { body });

/** POST /api/v1/members/{member_id}/subscriptions/ — Attach Subscription to Member */
export const membersSubscriptionsCreate = (memberId: string, body: T.MemberSubscriptionCreateRequest) =>
  request<T.MemberSubscriptionDetail>("POST", `/api/v1/members/${encodeURIComponent(memberId)}/subscriptions/`, { body });

// ===== Messaging =====
/** GET /api/v1/messaging/conversations/ — List Conversations */
export const messagingConversationsList = (query?: { gym_id?: string; limit?: number }) =>
  request<Array<T.ConversationList>>("GET", `/api/v1/messaging/conversations/`, { query });

/** POST /api/v1/messaging/conversations/ — Create / Get Conversation */
export const messagingConversationsCreate = (body: T.ConversationCreateRequest) =>
  request<T.ConversationList>("POST", `/api/v1/messaging/conversations/`, { body });

/** GET /api/v1/messaging/conversations/{conversation_id}/ — Get Conversation Detail */
export const messagingConversationsRetrieve = (conversationId: string, query?: { gym_id?: string }) =>
  request<T.ConversationList>("GET", `/api/v1/messaging/conversations/${encodeURIComponent(conversationId)}/`, { query });

/** GET /api/v1/messaging/conversations/{conversation_id}/messages/ — Get Encrypted Message History */
export const messagingConversationsMessagesList = (conversationId: string, query?: { gym_id?: string; limit?: number }) =>
  request<Array<T.EncryptedMessage>>("GET", `/api/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages/`, { query });

/** POST /api/v1/messaging/conversations/{conversation_id}/messages/ — Send Encrypted Message */
export const messagingConversationsMessagesCreate = (conversationId: string, body: T.SendMessageRequest, query?: { gym_id?: string }) =>
  request<T.EncryptedMessage>("POST", `/api/v1/messaging/conversations/${encodeURIComponent(conversationId)}/messages/`, { body, query });

/** POST /api/v1/messaging/conversations/{conversation_id}/read/ — Mark Conversation Read */
export const messagingConversationsReadCreate = (conversationId: string, body: T.MarkReadRequest) =>
  request<unknown>("POST", `/api/v1/messaging/conversations/${encodeURIComponent(conversationId)}/read/`, { body });

/** POST /api/v1/messaging/keys/gym/register/ — Register Gym E2EE Key Bundle */
export const messagingKeysGymRegisterCreate = (body: T.GymDeviceKeyRegisterRequest) =>
  request<unknown>("POST", `/api/v1/messaging/keys/gym/register/`, { body });

/** GET /api/v1/messaging/keys/gym/{gym_id}/ — Get Gym E2EE Public Key Bundle */
export const messagingKeysGymList = (gymId: string) =>
  request<T.GymKeyBundleResponse>("GET", `/api/v1/messaging/keys/gym/${encodeURIComponent(gymId)}/`);

/** POST /api/v1/messaging/keys/register/ — Register User Device E2EE Key Bundle */
export const messagingKeysRegisterCreate = (body: T.UserDeviceKeyRegisterRequest) =>
  request<unknown>("POST", `/api/v1/messaging/keys/register/`, { body });

/** GET /api/v1/messaging/keys/user/{user_id}/ — Get User E2EE Public Key Bundle */
export const messagingKeysUserList = (userId: string) =>
  request<T.UserKeyBundleResponse>("GET", `/api/v1/messaging/keys/user/${encodeURIComponent(userId)}/`);

// ===== Membership Plans =====
/** GET /api/v1/plans/ — List Gym Membership Plans */
export const plansList = (query?: { gym_id?: string; plan_status?: string; plan_type?: string; search?: string }) =>
  request<Array<T.MembershipPlanList>>("GET", `/api/v1/plans/`, { query });

/** POST /api/v1/plans/ — Create Membership Plan (5-Step Lifecycle) */
export const plansCreate = (body: T.MembershipPlanCreateRequest) =>
  request<T.MembershipPlanDetail>("POST", `/api/v1/plans/`, { body });

/** GET /api/v1/plans/metrics/ — Get Gym Plan Pricing Metrics */
export const plansMetricsRetrieve = () =>
  request<unknown>("GET", `/api/v1/plans/metrics/`);

/** DELETE /api/v1/plans/{plan_id}/ — Delete Membership Plan */
export const plansDestroy = (planId: string) =>
  request<T.MessageResponse>("DELETE", `/api/v1/plans/${encodeURIComponent(planId)}/`);

/** GET /api/v1/plans/{plan_id}/ — Get Membership Plan Details */
export const plansRetrieve = (planId: string) =>
  request<T.MembershipPlanDetail>("GET", `/api/v1/plans/${encodeURIComponent(planId)}/`);

/** PATCH /api/v1/plans/{plan_id}/ — Update Membership Plan */
export const plansPartialUpdate = (planId: string, body: T.PatchedMembershipPlanUpdateRequest) =>
  request<T.MembershipPlanDetail>("PATCH", `/api/v1/plans/${encodeURIComponent(planId)}/`, { body });

/** PUT /api/v1/plans/{plan_id}/amenities/ — Sync Included Amenities */
export const plansAmenitiesUpdate = (planId: string, body: T.PlanSyncAmenitiesRequest) =>
  request<T.MembershipPlanDetail>("PUT", `/api/v1/plans/${encodeURIComponent(planId)}/amenities/`, { body });

/** POST /api/v1/plans/{plan_id}/status/ — Transition Membership Plan Status */
export const plansStatusCreate = (planId: string, body: T.PlanStatusTransitionRequest) =>
  request<T.MembershipPlanDetail>("POST", `/api/v1/plans/${encodeURIComponent(planId)}/status/`, { body });

// ===== Community Feed =====
/** GET /api/v1/posts/ — List Gym Community Feed */
export const postsList = (query: { gym_id: string; page?: number; page_size?: number; privacy?: string; search?: string }) =>
  request<Array<T.GymPostList>>("GET", `/api/v1/posts/`, { query });

/** POST /api/v1/posts/ — Create Community Post */
export const postsCreate = (body: T.GymPostCreateRequest, query?: { gym_id?: string }) =>
  request<T.GymPostDetail>("POST", `/api/v1/posts/`, { body, query });

/** DELETE /api/v1/posts/{post_id}/ — Delete Community Post */
export const postsDestroy = (postId: string, query?: { gym_id?: string }) =>
  request<T.ErrorDetail>("DELETE", `/api/v1/posts/${encodeURIComponent(postId)}/`, { query });

/** GET /api/v1/posts/{post_id}/ — Get Post Detail */
export const postsRetrieve = (postId: string, query: { gym_id: string }) =>
  request<T.GymPostDetail>("GET", `/api/v1/posts/${encodeURIComponent(postId)}/`, { query });

/** PATCH /api/v1/posts/{post_id}/ — Update Community Post */
export const postsPartialUpdate = (postId: string, body: T.PatchedGymPostUpdateRequest, query?: { gym_id?: string }) =>
  request<T.GymPostDetail>("PATCH", `/api/v1/posts/${encodeURIComponent(postId)}/`, { body, query });

/** PATCH /api/v1/posts/{post_id}/media/{media_id}/thumbnail/ — Upload Custom Video Thumbnail */
export const postsMediaThumbnailPartialUpdate = (postId: string, mediaId: string, body: T.PatchedCustomVideoThumbnailRequest, query?: { gym_id?: string }) =>
  request<T.GymPostMedia>("PATCH", `/api/v1/posts/${encodeURIComponent(postId)}/media/${encodeURIComponent(mediaId)}/thumbnail/`, { body, query });

// ===== Routine Templates =====
/** GET /api/v1/routine-templates/ — List Routine Templates */
export const routineTemplatesList = (query?: { goal?: string; gym_id?: string; level?: string; page?: number; page_size?: number; routine_format?: string; search?: string }) =>
  request<Array<T.RoutineTemplateList>>("GET", `/api/v1/routine-templates/`, { query });

/** POST /api/v1/routine-templates/ — Create Routine Template */
export const routineTemplatesCreate = (body: T.RoutineTemplateCreateRequest, query?: { gym_id?: string }) =>
  request<T.RoutineTemplateDetail>("POST", `/api/v1/routine-templates/`, { body, query });

/** DELETE /api/v1/routine-templates/{template_id}/ — Delete Routine Template */
export const routineTemplatesDestroy = (templateId: string, query?: { gym_id?: string }) =>
  request<T.MessageResponse>("DELETE", `/api/v1/routine-templates/${encodeURIComponent(templateId)}/`, { query });

/** GET /api/v1/routine-templates/{template_id}/ — Get Routine Template Dossier */
export const routineTemplatesRetrieve = (templateId: string, query?: { gym_id?: string }) =>
  request<T.RoutineTemplateDetail>("GET", `/api/v1/routine-templates/${encodeURIComponent(templateId)}/`, { query });

/** PATCH /api/v1/routine-templates/{template_id}/ — Partial Update Routine Template */
export const routineTemplatesPartialUpdate = (templateId: string, body: T.PatchedRoutineTemplateUpdateRequest, query?: { gym_id?: string }) =>
  request<T.RoutineTemplateDetail>("PATCH", `/api/v1/routine-templates/${encodeURIComponent(templateId)}/`, { body, query });

/** PUT /api/v1/routine-templates/{template_id}/ — Full Update Routine Template */
export const routineTemplatesUpdate = (templateId: string, body: T.RoutineTemplateUpdateRequest, query?: { gym_id?: string }) =>
  request<T.RoutineTemplateDetail>("PUT", `/api/v1/routine-templates/${encodeURIComponent(templateId)}/`, { body, query });
