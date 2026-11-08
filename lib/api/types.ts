// AUTO-GENERATED from https://v0.manygym.com/api/v1/schema/ — do not edit by hand.
// 187 schemas. Regenerate when the API changes.

export interface AccessibleGymItem {
  /** Unique identifier of accessible gym. */
  gym_id: string;
  /** Display name of the gym. */
  name: string;
  /** User's role in this gym ('Owner' or assigned staff role). */
  role: string;
  /** True if user owns this gym tenant. */
  is_owner: boolean;
  /** Gym facility category/type. */
  primary_type: string;
  /** Profile/logo image URL of the gym. */
  profile_picture_url: string | null;
}

export type BlankEnum = "";

/** * `general` - General */
export type CategoryEnum = "general" | "equipment" | "workout_areas" | "studios_class_spaces" | "changing_rooms_showers" | "wellness_facilities" | "reception_lounge" | "interior_decor" | "exterior_entrance" | "other";

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/** * `personal` - Personal */
export type ContextTypeEnum = "personal" | "gym";

export interface ConversationCreateRequest {
  /** Optional: 'user_to_user', 'user_to_gym', 'gym_to_user', 'gym_to_gym'. Auto-detected if omitted. */
  conversation_type?: string;
  target_user_id?: string | null;
  target_gym_id?: string | null;
  source_gym_id?: string | null;
}

export interface ConversationList {
  id: string;
  conversation_type: ConversationTypeEnum;
  user_a?: string | null;
  user_b?: string | null;
  gym_a?: string | null;
  gym_b?: string | null;
  participants: Array<ConversationParticipant>;
  other_party: Record<string, unknown> | null;
  last_message_at?: string | null;
  last_message_preview?: string;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  participant_type: ParticipantTypeEnum;
  user?: string | null;
  user_id: string;
  profile_id: string | null;
  user_email: string;
  user_full_name: string | null;
  avatar_url: string | null;
  gym?: string | null;
  gym_name: string;
  unread_count?: number;
  last_read_at?: string | null;
  is_muted?: boolean;
}

/** * `user_to_user` - User to User */
export type ConversationTypeEnum = "user_to_user" | "user_to_gym" | "gym_to_gym";

export interface ConversionRates {
  trial_booking_rate_percentage: number;
  trial_to_join_rate_percentage: number;
  overall_conversion_rate_percentage: number;
  drop_off_rate_percentage: number;
}

export interface CreateCustomRoleRequest {
  name: string;
  description?: string;
  permission_ids?: Array<string>;
}

export interface CurrentContext {
  /** Active token session context ('personal' or 'gym'). */
  type: string;
  /** ID of active gym if in gym context; null if personal. */
  gym_id: string | null;
  /** Name of active gym if in gym context. */
  gym_name?: string | null;
  /** Profile picture URL of active gym if in gym context. */
  profile_picture_url?: string | null;
  /** Effective RBAC permission scopes for active context. */
  scopes: Array<string>;
}

export interface DailyRevenueBreakdown {
  date: string;
  amount: number;
  transaction_count: number;
}

export interface DashboardSummary {
  gym_id: string;
  gym_name: string;
  generated_at: string;
  headline_metrics: HeadlineMetrics;
}

export interface DayInputRequest {
  day_of_week?: number | null;
  session_number?: number | null;
  is_rest_day?: boolean;
  workout_title?: string | null;
  workday_note?: string | null;
  sort_order?: number;
  exercises?: Array<ExerciseInputRequest>;
}

/** * `0` - Sunday */
export type DayOfWeekEnum = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** * `sent` - Sent */
export type DeliveryStatusEnum = "sent" | "delivered" | "read";

/** * `day` - Day */
export type DurationUnitEnum = "day" | "week" | "month" | "session";

export interface EncryptedMessage {
  id: string;
  conversation_id: string;
  sender_type: SenderTypeEnum;
  sender_user_id: string | null;
  sender_user_full_name: string | null;
  sender_gym_id: string | null;
  sender_gym_name: string;
  sender_device_id?: string;
  /** Base64 ciphertext of the encrypted message */
  ciphertext: string;
  /** Base64 initialization vector / nonce */
  nonce: string;
  /** Sender ephemeral X25519 public key (Base64) */
  ephemeral_public_key?: string;
  /** Fingerprint of recipient's public key used */
  recipient_key_fingerprint?: string;
  /** Multi-device or gym staff wrapped session keys: {participant_or_device_id: encrypted_key} */
  encrypted_keys?: unknown;
  delivery_status?: DeliveryStatusEnum;
  sent_at?: string;
  delivered_at?: string | null;
  read_at?: string | null;
}

export interface ErrorDetail {
  /** Machine-readable error code */
  code?: string;
  /** Human-readable explanation of the error */
  message: string;
  /** Field-specific validation errors or context dictionary */
  details?: Record<string, unknown>;
}

export interface ExerciseInputRequest {
  exercise_name: string;
  sets?: number | null;
  reps_or_duration: string;
  rest_seconds?: number | null;
  notes?: string | null;
  sort_order?: number;
}

/** * `general_fitness` - General Fitness */
export type FitnessGoalsEnum = "general_fitness" | "strength" | "muscle_gain" | "weight_loss" | "other";

/** * `follow` - follow */
export type FollowActionActionEnum = "follow" | "unfollow";

export interface FollowActionRequest {
  /** UUID of target User or Gym. Auto-detected whether user or gym. */
  target_id?: string | null;
  /** Alias for target_id. */
  id?: string | null;
  /** Optional entity type ('user' or 'gym'). Auto-detected automatically if omitted. */
  target_type?: (TargetTypeEnum | BlankEnum | NullEnum);
  /** Action to perform: 'follow' (default) or 'unfollow'. */
  action?: FollowActionActionEnum;
}

export interface FollowActionResponse {
  message: string;
  is_following: boolean;
  target_type: string;
  target_id: string;
  target_name?: string | null;
}

export interface FollowUserItem {
  /** User unique identifier. */
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string | null;
  is_private?: boolean;
  followed_at: string;
}

export interface FollowedGymItem {
  /** Gym unique identifier. */
  gym_id: string;
  name: string;
  primary_type: string;
  profile_picture_url?: string | null;
  followed_at: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface FunnelStages {
  new: number;
  contacted: number;
  trial_booked: number;
  joined: number;
  lost: number;
}

/** * `everyone` - Everyone */
export type GenderRequiredEnum = "everyone" | "women_only" | "men_only";

/** * `general_fitness` - General Fitness */
export type GoalsEnum = "general_fitness" | "strength" | "muscle_gain" | "weight_loss" | "other";

/** * `deactivate` - deactivate */
export type GymAccessControlActionActionEnum = "deactivate" | "reactivate" | "unpublish" | "publish" | "delete" | "restore";

/** Request payload serializer for gym lifecycle state transitions. */
export interface GymAccessControlActionRequest {
  /** Lifecycle state transition action. */
  action: GymAccessControlActionActionEnum;
}

export interface GymAmenitiesConfigured {
  free_amenities: Array<GymAmenityItem>;
  paid_amenities: Array<GymAmenityItem>;
  total_count: number;
}

export interface GymAmenityItem {
  id: string;
  amenity_id: string;
  name: string;
  group_name: string;
  group_display: string;
  is_paid: boolean;
  default_price: string;
}

/** Request serializer for blocking a user from a gym. */
export interface GymBlockUserCreateRequest {
  /** Valid UUID string of the user to block. */
  user_id: string;
  /** Optional administrative rationale for blocking. */
  reason?: string;
}

/** Serializer representing a blocked user record within a gym's workspace context. */
export interface GymBlockedUser {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  blocked_by_email: string;
  reason: string | null;
  created_at: string;
}

export interface GymCreateRequest {
  name: string;
  primary_type?: PrimaryTypeEnum;
  secondary_type?: (SecondaryTypeEnum | NullEnum);
  short_description?: string;
  profile_picture_url?: string;
  /** Direct profile picture upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, */
  profile_picture?: string | null;
  cover_photo_url?: string;
  /** Direct cover photo upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIF */
  cover_photo?: string | null;
  gender_required?: GenderRequiredEnum;
  min_age?: number;
  timezone?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface GymDetail {
  id: string;
  name: string;
  owner_email: string;
  profile_picture_url?: string | null;
  cover_photo_url?: string | null;
  short_description?: string | null;
  primary_type?: PrimaryTypeEnum;
  secondary_type?: (SecondaryTypeEnum | BlankEnum | NullEnum);
  gender_required?: GenderRequiredEnum;
  min_age?: number;
  timezone?: string;
  location: string;
  opening_hours_count: string;
  gallery_count: string;
  created_at: string;
  updated_at: string;
}

export interface GymDeviceKeyRegisterRequest {
  gym_id: string;
  device_id: string;
  device_name?: string;
  identity_key: string;
  signed_prekey: string;
  signed_prekey_signature?: string;
  one_time_prekeys?: Array<string>;
}

export interface GymFollowActionResponse {
  message: string;
  is_following: boolean;
  gym_id: string;
  gym_name: string;
}

export interface GymFollowerItem {
  /** User unique identifier. */
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string | null;
  followed_at: string;
}

export interface GymGalleryCreateRequest {
  /** Direct file upload (picture or video) */
  file?: string;
  /** Media URL or local path */
  media_url?: string;
  media_type?: MediaTypeEnum;
  category?: CategoryEnum;
  caption?: string;
}

export interface GymGalleryItem {
  id: string;
  media_url: string;
  original_url: string | null;
  optimized_url: string | null;
  thumbnail_url: string | null;
  resolved_media_url: string;
  resolved_thumbnail_url: string;
  media_type?: MediaTypeEnum;
  category?: CategoryEnum;
  caption?: string | null;
  order_index?: number;
  processing_status: ProcessingStatusEnum;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  optimized_size_bytes: number | null;
  created_at: string;
}

export interface GymGalleryReorderItemRequest {
  id: string;
  order_index: number;
}

export interface GymLocation {
  id: string;
  address: string;
  latitude: string;
  longitude: string;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  is_primary?: boolean;
  updated_at: string;
}

export interface GymOpeningHoursBulkItemRequest {
  day_of_week: number;
  start_time?: string | null;
  end_time?: string | null;
  is_closed?: boolean;
}

export interface GymOpeningHoursBulkUpdateRequest {
  hours: Array<GymOpeningHoursBulkItemRequest>;
}

export interface GymOpeningHoursItem {
  id: string;
  day_of_week: DayOfWeekEnum;
  day_name: string;
  start_time?: string | null;
  end_time?: string | null;
  is_closed?: boolean;
}

export interface GymPostCreateRequest {
  content_text?: string | null;
  privacy?: PrivacyEnum;
  media_items?: Array<MediaItemInputRequest>;
}

export interface GymPostDetail {
  id: string;
  gym_id: string;
  author_user_id: string;
  author_name: string;
  author_avatar_url: string | null;
  /** Optional if media attachments exist */
  content_text?: string | null;
  privacy?: PrivacyEnum;
  published_at?: string;
  media_count: number;
  media_attachments: Array<GymPostMedia>;
  created_at: string;
  updated_at: string;
}

export interface GymPostList {
  id: string;
  gym_id: string;
  author_user_id: string;
  author_name: string;
  author_avatar_url: string | null;
  /** Optional if media attachments exist */
  content_text?: string | null;
  privacy?: PrivacyEnum;
  published_at?: string;
  media_count: number;
  media_attachments: Array<GymPostMedia>;
  created_at: string;
  updated_at: string;
}

export interface GymPostMedia {
  id: string;
  post_id: string;
  media_url: string;
  original_url?: string | null;
  media_type?: MediaTypeEnum;
  thumbnail_url: string;
  /** Size in bytes: <=10MB image, <=200MB video */
  file_size_bytes?: number;
  order_index?: number;
  processing_status?: ProcessingStatusEnum;
  created_at: string;
}

/** Read-only presentation serializer for complete Gym Configuration & Privacy Settings. */
export interface GymSetting {
  id: string;
  gym_id: string;
  /** Display language (e.g. en, bn). */
  language?: string;
  /** Video Autoplay (ON/OFF). */
  video_autoplay?: boolean;
  /** Dark Mode (ON/OFF). */
  dark_mode?: boolean;
  /** Admin Logs alert notifications enabled (ON/OFF). */
  admin_logs_alerts?: boolean;
  /** Issues alert notifications enabled (ON/OFF). */
  issues_alerts?: boolean;
  /** Who can send you messages? (Everyone, Followers & Members, Members only) */
  who_can_message?: WhoCanMessageEnum;
  /** Who can send you a Member joining request? (Everyone, No one) */
  who_can_send_joining_request?: WhoCanSendJoiningRequestEnum;
  /** Who can see your Gym’s Members? (Everyone, Only Members) */
  who_can_see_members?: WhoCanSeeMembersEnum;
  /** Who can see your Gym’s followers? (Everyone, Only members, Private) */
  who_can_see_followers?: WhoCanSeeFollowersEnum;
  /** Who can see the people and pages you follow? (Everyone, Only members, Private) */
  who_can_see_following?: WhoCanSeeFollowingEnum;
  /** Age restriction for your Gym’s posts (Any age, 17+, 18+, 19+, 20+) */
  posts_age_restriction?: PostsAgeRestrictionEnum;
  /** Whether the gym is deactivated. */
  is_deactivated?: boolean;
  /** Timestamp when the gym was deactivated. */
  deactivated_at: string | null;
  /** Whether the gym is published. */
  is_published?: boolean;
  /** Timestamp when the gym was unpublished. */
  unpublished_at: string | null;
  /** Soft-delete flag for gym. */
  is_deleted?: boolean;
  /** Timestamp when the gym was deleted. */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight projection serializer for searching active users to block. */
export interface GymUserSearchToBlock {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface HeadlineMetrics {
  total_members: number;
  total_active_members: number;
  expiring_memberships_next_7_days: number;
  expiring_memberships_next_30_days: number;
  new_leads_this_week: number;
  pending_next_moves_today: number;
  overdue_next_moves: number;
  todays_scheduled_trials: number;
  todays_revenue: number;
  current_month_revenue: number;
}

/** * `cash` - Cash */
export type InitialPaymentMethodEnum = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "mobile_pay" | "other";

export interface InviteStaffRequest {
  email: string;
  role_id: string;
}

/** * `sent_invitation` - Sent Invitation */
export type JoiningStatusEnum = "sent_invitation" | "joined";

export interface LeadConvertToMemberRequest {
  plan_id?: string | null;
  last_name?: string | null;
  member_email?: string;
  assigned_trainer_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  extra_amenity_ids?: Array<string>;
  initial_payment_amount?: string | null;
  initial_payment_method?: (InitialPaymentMethodEnum | NullEnum);
  initial_payment_date?: string | null;
  initial_payment_notes?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  nationality?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface LeadCreateRequest {
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string;
  interested_plan_id?: string | null;
  assigned_staff_id?: string | null;
  source?: SourceEnum;
  stage?: StageEnum;
  expected_start_date?: string | null;
  trial_booked_at?: string | null;
  not_joining_reason_standard?: (NotJoiningReasonStandardEnum | NullEnum);
  not_joining_custom_reason_id?: string | null;
  fitness_goals?: Array<FitnessGoalsEnum>;
  initial_note?: string | null;
}

export interface LeadCustomReason {
  id: string;
  gym_id: string;
  reason_name: string;
  created_at: string;
}

export interface LeadCustomReasonCreateRequest {
  reason_name: string;
}

export interface LeadDetail {
  id: string;
  gym_id: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string;
  stage?: StageEnum;
  source?: SourceEnum;
  expected_start_date?: string | null;
  trial_booked_at?: string | null;
  not_joining_reason_standard?: (NotJoiningReasonStandardEnum | BlankEnum | NullEnum);
  not_joining_custom_reason: string;
  interested_plan: string;
  assigned_staff: string;
  converted_member: string;
  fitness_goals: Array<unknown>;
  pending_next_moves_count: number;
  created_at: string;
  updated_at: string;
  next_moves: Array<LeadNextMove>;
  notes: Array<LeadNote>;
}

export interface LeadFunnelReport {
  gym_id: string;
  start_date: string;
  end_date: string;
  total_leads: number;
  funnel_stages: FunnelStages;
  conversion_rates: ConversionRates;
  stage_breakdown: Array<LeadStageCount>;
  lost_reason_distribution: Array<LostReasonCount>;
  source_breakdown: Array<SourceCount>;
}

export interface LeadList {
  id: string;
  gym_id: string;
  first_name: string;
  last_name?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string;
  stage?: StageEnum;
  source?: SourceEnum;
  expected_start_date?: string | null;
  trial_booked_at?: string | null;
  not_joining_reason_standard?: (NotJoiningReasonStandardEnum | BlankEnum | NullEnum);
  not_joining_custom_reason: string;
  interested_plan: string;
  assigned_staff: string;
  converted_member: string;
  fitness_goals: Array<unknown>;
  pending_next_moves_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeadMetrics {
  total_leads: number;
  new: number;
  contacted: number;
  visit_trial_booked: number;
  joined: number;
  not_joining: number;
  conversion_rate_percentage: number;
  pending_next_moves_count: number;
}

export interface LeadNextMove {
  id: string;
  lead_id: string;
  scheduled_date: string;
  short_description: string;
  is_completed?: boolean;
  created_at: string;
}

export interface LeadNextMoveCreateRequest {
  scheduled_date: string;
  short_description: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_staff_id: string | null;
  author_name: string;
  note_text: string;
  created_at: string;
}

export interface LeadNoteCreateRequest {
  note_text: string;
  author_staff_id?: string | null;
}

export interface LeadStageCount {
  stage: string;
  count: number;
}

/** * `beginner` - Beginner */
export type LevelEnum = "beginner" | "intermediate" | "advanced";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  tokens: TokenResponse;
}

export interface LogoutRequest {
  refresh?: string;
}

export interface LostReasonCount {
  reason: string | null;
  type: string;
  count: number;
}

export interface MarkReadRequest {
  gym_id?: string | null;
  up_to_message_id?: string | null;
}

export interface MediaItemInputRequest {
  media_url: string;
  media_type?: MediaTypeEnum;
  thumbnail_url?: string | null;
  file_size_bytes?: number;
  order_index?: number;
}

export interface MediaOrderItemRequest {
  media_id: string;
  order_index: number;
}

/** * `picture` - Picture */
export type MediaTypeEnum = "picture" | "video";

/** Validates token payload for accepting onboarding invite. */
export interface MemberAcceptInvitationRequest {
  token?: string;
  invitation_token?: string;
}

/** Validates payload for onboarding a new gym member and optional initial subscription. */
export interface MemberCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  profile_photo_url?: string | null;
  /** Direct profile photo image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, H */
  profile_photo?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  nationality?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  assigned_trainer_id?: string | null;
  internal_notes?: string | null;
  plan_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  extra_amenity_ids?: Array<string>;
  initial_payment_amount?: string | null;
  initial_payment_method?: (InitialPaymentMethodEnum | NullEnum);
  initial_payment_date?: string | null;
  initial_payment_notes?: string | null;
}

/** Complete dossier representation of a gym member. */
export interface MemberDetail {
  id: string;
  gym_id: string;
  /** Linked user account once onboarding invitation is accepted. */
  user_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  profile_photo_url?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  nationality?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  joining_status?: JoiningStatusEnum;
  invitation_sent_at?: string | null;
  internal_notes?: string | null;
  assigned_trainer: Record<string, unknown> | null;
  active_subscription: Record<string, unknown> | null;
  subscriptions: Array<MemberSubscriptionDetail>;
  created_at: string;
  updated_at: string;
}

/** Validates attaching extra paid amenities. */
export interface MemberExtraAmenitiesCreateRequest {
  amenity_ids: Array<string>;
}

export interface MemberExtraAmenity {
  id: string;
  amenity_id: string;
  name: string;
  group_name: string;
  extra_fee?: string;
  is_active?: boolean;
  created_at: string;
}

/** Summary view for the Member Directory listing table. */
export interface MemberList {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  profile_photo_url?: string | null;
  joining_status?: JoiningStatusEnum;
  current_plan_name: string | null;
  membership_status: string | null;
  payment_status: string | null;
  expiry_date: string | null;
  assigned_trainer: Record<string, unknown> | null;
  created_at: string;
}

export interface MemberPayment {
  id: string;
  amount: string;
  payment_method: PaymentMethodEnum;
  payment_date: string;
  is_initial_payment?: boolean;
  notes?: string | null;
  created_at: string;
}

/** Validates recording a payment transaction against a subscription. */
export interface MemberPaymentCreateRequest {
  amount: string;
  payment_method: PaymentMethodEnum;
  payment_date?: string;
  notes?: string | null;
}

export interface MemberRoutineAssignRequest {
  source_template_id?: string | null;
  routine_name?: string | null;
  routine_format?: (RoutineFormatEnum | NullEnum);
  level?: (LevelEnum | NullEnum);
  notes?: string | null;
  days?: Array<DayInputRequest>;
}

export interface MemberRoutineDay {
  id: string;
  day_of_week?: number | null;
  session_number?: number | null;
  is_rest_day?: boolean;
  workout_title?: string | null;
  workday_note?: string | null;
  sort_order?: number;
  exercises: Array<MemberRoutineExercise>;
}

export interface MemberRoutineDetail {
  id: string;
  member_id: string;
  source_template_id: string | null;
  source_template_name: string | null;
  routine_name: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  is_active?: boolean;
  notes?: string | null;
  days_count: number;
  prescribed_by_staff_id: string | null;
  prescribed_by_staff_name: string | null;
  assigned_at?: string;
  updated_at: string;
  days: Array<MemberRoutineDay>;
}

export interface MemberRoutineExercise {
  id: string;
  exercise_name: string;
  sets?: number | null;
  reps_or_duration: string;
  rest_seconds?: number | null;
  notes?: string | null;
  sort_order?: number;
}

/** Validates creation of a new subscription attached to an existing member. */
export interface MemberSubscriptionCreateRequest {
  plan_id: string;
  start_date?: string;
  end_date?: string | null;
  extra_amenity_ids?: Array<string>;
  initial_payment_amount?: string | null;
  initial_payment_method?: (InitialPaymentMethodEnum | NullEnum);
  initial_payment_date?: string | null;
  initial_payment_notes?: string | null;
}

export interface MemberSubscriptionDetail {
  id: string;
  plan_id: string;
  plan_name: string;
  plan_type: string;
  plan_price: string;
  joining_fee: string;
  membership_status?: MembershipStatusEnum;
  payment_status?: PaymentStatusEnum;
  start_date: string;
  end_date: string;
  /** Total available sessions for session-based plans. */
  total_sessions?: number | null;
  /** Remaining sessions left to consume. */
  remaining_sessions?: number | null;
  total_cost: string;
  total_paid: string;
  extra_amenities: Array<MemberExtraAmenity>;
  payments: Array<MemberPayment>;
  created_at: string;
  updated_at: string;
}

export interface MembershipGrowthReport {
  gym_id: string;
  start_date: string;
  end_date: string;
  total_members: number;
  active_subscriptions: number;
  new_members_in_period: number;
  new_subscriptions_in_period: number;
  cancelled_subscriptions_in_period: number;
  net_growth: number;
  churn_rate_percentage: number;
  status_breakdown: Array<SubscriptionStatusBreakdown>;
  plan_breakdown: Array<PlanActiveSubscription>;
}

/** Validates payload for creating a 5-step membership plan. */
export interface MembershipPlanCreateRequest {
  name: string;
  description?: string | null;
  plan_status?: PlanStatusEnum;
  plan_type: PlanTypeEnum;
  price: string;
  duration_value: number;
  duration_unit: DurationUnitEnum;
  joining_fee?: string;
  payment_schedule?: PaymentScheduleEnum;
  installment_schedule_config?: unknown | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  included_amenity_ids?: Array<string>;
}

/** Full 5-step details of a membership plan, including bundled amenities. */
export interface MembershipPlanDetail {
  id: string;
  gym_id: string;
  name: string;
  description?: string | null;
  plan_status?: PlanStatusEnum;
  plan_type: PlanTypeEnum;
  price: string;
  /** e.g. 3 for 3 months or 10 for 10 sessions */
  duration_value: number;
  duration_unit: DurationUnitEnum;
  duration_display: string;
  joining_fee?: string;
  payment_schedule?: PaymentScheduleEnum;
  /** Configuration parameters for installment payments if payment_schedule is instalments */
  installment_schedule_config?: unknown | null;
  included_amenities: Array<PlanIncludedAmenity>;
  included_amenity_ids: Array<string>;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  created_at: string;
  updated_at: string;
}

/** Summary view of a membership plan for directory listings. */
export interface MembershipPlanList {
  id: string;
  name: string;
  description?: string | null;
  plan_status?: PlanStatusEnum;
  plan_type: PlanTypeEnum;
  price: string;
  /** e.g. 3 for 3 months or 10 for 10 sessions */
  duration_value: number;
  duration_unit: DurationUnitEnum;
  duration_display: string;
  joining_fee?: string;
  payment_schedule?: PaymentScheduleEnum;
  included_amenities_count: number;
  created_at: string;
  updated_at: string;
}

/** * `scheduled` - Scheduled */
export type MembershipStatusEnum = "scheduled" | "active" | "paused" | "expired" | "cancelled";

export interface MessageResponse {
  /** Operation feedback message */
  message: string;
}

/** * `price` - Price */
export type NotJoiningReasonStandardEnum = "price" | "location" | "timing" | "chose_another_gym" | "other";

export type NullEnum = null;

export interface PaginatedRoleList {
  count?: number;
  total_pages?: number;
  current_page?: number;
  next?: string | null;
  previous?: string | null;
  results?: Array<Role>;
}

export interface PaginatedStaffAssignmentList {
  count?: number;
  total_pages?: number;
  current_page?: number;
  next?: string | null;
  previous?: string | null;
  results?: Array<StaffAssignment>;
}

export interface PaidAmenityInputRequest {
  /** UUID of the catalog amenity */
  amenity_id: string;
  /** Price for this paid amenity (e.g. 5.00) */
  default_price: string;
}

/** * `user` - User */
export type ParticipantTypeEnum = "user" | "gym";

export interface PatchedCustomVideoThumbnailRequest {
  /** Custom video poster image (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIF */
  thumbnail_image?: string;
}

export interface PatchedGymGalleryReorderRequest {
  items?: Array<GymGalleryReorderItemRequest>;
}

export interface PatchedGymLocationUpdateRequest {
  address?: string;
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface PatchedGymOverviewUpdateRequest {
  name?: string;
  primary_type?: PrimaryTypeEnum;
  secondary_type?: (SecondaryTypeEnum | NullEnum);
  short_description?: string;
  profile_picture_url?: string;
  /** Direct profile picture upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, */
  profile_picture?: string | null;
  cover_photo_url?: string;
  /** Direct cover photo upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TIF */
  cover_photo?: string | null;
  gender_required?: GenderRequiredEnum;
  min_age?: number;
  timezone?: string;
}

export interface PatchedGymPostUpdateRequest {
  content_text?: string | null;
  privacy?: PrivacyEnum;
  media_order?: Array<MediaOrderItemRequest>;
}

/** Validation and deserialization serializer for updating Gym Settings. */
export interface PatchedGymSettingUpdateRequest {
  language?: string;
  video_autoplay?: boolean;
  dark_mode?: boolean;
  admin_logs_alerts?: boolean;
  issues_alerts?: boolean;
  /** Controls messaging permission: 'everyone', 'followers_and_members', 'members_only' */
  who_can_message?: WhoCanMessageEnum;
  /** Controls who can submit a membership request: 'everyone', 'no_one' */
  who_can_send_joining_request?: WhoCanSendJoiningRequestEnum;
  /** Visibility of gym member roster: 'everyone', 'only_members' */
  who_can_see_members?: WhoCanSeeMembersEnum;
  /** Visibility of gym followers: 'everyone', 'only_members', 'private' */
  who_can_see_followers?: WhoCanSeeFollowersEnum;
  /** Visibility of followed pages/people: 'everyone', 'only_members', 'private' */
  who_can_see_following?: WhoCanSeeFollowingEnum;
  /** Age restriction filter for gym posts: 'any_age', '17_plus', '18_plus', '19_plus', '20_plus' */
  posts_age_restriction?: PostsAgeRestrictionEnum;
  is_deactivated?: boolean;
  is_published?: boolean;
  is_deleted?: boolean;
}

export interface PatchedLeadNextMoveUpdateRequest {
  is_completed?: boolean;
  scheduled_date?: string;
  short_description?: string;
}

export interface PatchedLeadUpdateRequest {
  first_name?: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string;
  interested_plan_id?: string | null;
  assigned_staff_id?: string | null;
  source?: SourceEnum;
  stage?: StageEnum;
  expected_start_date?: string | null;
  trial_booked_at?: string | null;
  not_joining_reason_standard?: (NotJoiningReasonStandardEnum | NullEnum);
  not_joining_custom_reason_id?: string | null;
  fitness_goals?: Array<FitnessGoalsEnum>;
}

export interface PatchedMemberRoutineUpdateRequest {
  routine_name?: string;
  level?: LevelEnum;
  notes?: string | null;
  is_active?: boolean;
  days?: Array<DayInputRequest>;
}

/** Validates status transition (active, paused, cancelled). */
export interface PatchedMemberSubscriptionStatusTransitionRequest {
  membership_status?: MembershipStatusEnum;
  status?: Status927Enum;
}

/** Validates partial update of member demographic details or trainer assignment. */
export interface PatchedMemberUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  profile_photo_url?: string | null;
  /** Direct profile photo image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, H */
  profile_photo?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  nationality?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  assigned_trainer_id?: string | null;
  internal_notes?: string | null;
}

/** Validates payload for updating an existing membership plan. */
export interface PatchedMembershipPlanUpdateRequest {
  name?: string;
  description?: string | null;
  plan_status?: PlanStatusEnum;
  plan_type?: PlanTypeEnum;
  price?: string;
  duration_value?: number;
  duration_unit?: DurationUnitEnum;
  joining_fee?: string;
  payment_schedule?: PaymentScheduleEnum;
  installment_schedule_config?: unknown | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  included_amenity_ids?: Array<string>;
}

export interface PatchedRoutineTemplateUpdateRequest {
  template_name?: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  notes?: string | null;
  goals?: Array<GoalsEnum>;
  days?: Array<DayInputRequest>;
}

export interface PatchedUpdateCustomRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: Array<string>;
}

export interface PatchedUpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  /** Direct avatar image upload (multipart/form-data). Max size: 10MB. Formats: JPEG, PNG, WebP, BMP, GIF, HEIC, TI */
  avatar?: string | null;
  address?: string;
  city?: string;
  country?: string;
  date_of_birth?: string | null;
  sex?: string;
  nationality?: string;
  is_private?: boolean;
}

export interface PatchedUpdateStaffStatusRequest {
  status?: Status684Enum;
}

export interface PaymentMethodBreakdown {
  payment_method: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

/** * `cash` - Cash */
export type PaymentMethodEnum = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "mobile_pay" | "other";

/** * `full_payment` - Full Payment */
export type PaymentScheduleEnum = "full_payment" | "instalments";

/** * `fully_paid` - Fully Paid */
export type PaymentStatusEnum = "fully_paid" | "partially_paid" | "unpaid";

export interface Permission {
  id: string;
  topic: string;
  scope_code: string;
  name: string;
  description?: string | null;
}

export interface PlanActiveSubscription {
  plan_id: string | null;
  plan_name: string;
  active_subscriptions: number;
}

/** Representation of an amenity bundled into a membership plan. */
export interface PlanIncludedAmenity {
  id: string;
  catalog_id: string;
  name: string;
  group: string;
  group_name: string;
  is_paid: boolean;
  is_free: boolean;
  price: string;
}

export interface PlanRevenueDistribution {
  plan_id: string | null;
  plan_name: string;
  total_amount: number;
  subscription_count: number;
  transaction_count: number;
}

/** * `draft` - Draft */
export type PlanStatusEnum = "draft" | "active" | "archived";

/** Validates status transition (draft, active, archived). */
export interface PlanStatusTransitionRequest {
  plan_status: PlanStatusEnum;
}

/** Validates bulk synchronization of included amenities. */
export interface PlanSyncAmenitiesRequest {
  amenity_ids: Array<string>;
}

/** * `time_based` - Time Based */
export type PlanTypeEnum = "time_based" | "session_based";

/** * `any_age` - Any age */
export type PostsAgeRestrictionEnum = "any_age" | "17_plus" | "18_plus" | "19_plus" | "20_plus";

/** * `general_fitness_gym` - General Fitness Gym */
export type PrimaryTypeEnum = "general_fitness_gym" | "strength_bodybuilding_gym" | "functional_fitness_gym" | "personal_training_studio" | "boutique_fitness_studio" | "boxing_martial_arts_gym" | "yoga_pilates_studio" | "indoor_cycling_studio" | "sports_performance_centre" | "other";

/** * `public` - Public */
export type PrivacyEnum = "public" | "members_only" | "gym_members_only" | "private";

/** * `pending` - Pending */
export type ProcessingStatusEnum = "pending" | "processing" | "completed" | "failed";

export interface PublicKeyBundle {
  device_id: string;
  device_name: string;
  algorithm: string;
  identity_key: string;
  signed_prekey: string;
  signed_prekey_signature: string;
  one_time_prekeys: Array<string>;
}

/** GET /messaging/keys/user/{id}/ — a user's registered devices and their public key bundles. */
export interface UserKeyBundleResponse {
  user_id: string;
  devices: Array<PublicKeyBundle>;
}

/** GET /messaging/keys/gym/{id}/ — a gym's registered devices and their public key bundles. */
export interface GymKeyBundleResponse {
  gym_id: string;
  devices: Array<PublicKeyBundle>;
}

export interface ReasonsDirectory {
  standard_reasons: Array<Record<string, unknown>>;
  custom_reasons: Array<LeadCustomReason>;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp_code: string;
  new_password: string;
}

export interface RevenueReport {
  gym_id: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_transactions: number;
  average_transaction_value: number;
  payment_method_breakdown: Array<PaymentMethodBreakdown>;
  plan_distribution: Array<PlanRevenueDistribution>;
  daily_breakdown: Array<DailyRevenueBreakdown>;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  is_custom?: boolean;
  description?: string | null;
  gym_id: string | null;
  permissions: Array<Permission>;
  created_at: string;
}

/** * `weekly` - Weekly */
export type RoutineFormatEnum = "weekly" | "session_based";

export interface RoutineTemplateCreateRequest {
  template_name: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  notes?: string | null;
  goals?: Array<GoalsEnum>;
  days?: Array<DayInputRequest>;
}

export interface RoutineTemplateDay {
  id: string;
  /** 1=Monday, 2=Tuesday ... 7=Sunday for weekly format */
  day_of_week?: number | null;
  /** 1, 2, 3... for session-based format */
  session_number?: number | null;
  is_rest_day?: boolean;
  workout_title?: string | null;
  workday_note?: string | null;
  sort_order?: number;
  exercises: Array<RoutineTemplateExercise>;
}

export interface RoutineTemplateDetail {
  id: string;
  gym_id: string;
  template_name: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  goals: Array<unknown>;
  notes?: string | null;
  days_count: number;
  total_exercises_count: number;
  created_by_staff_id: string | null;
  created_by_staff_name: string | null;
  created_at: string;
  updated_at: string;
  days: Array<RoutineTemplateDay>;
}

export interface RoutineTemplateExercise {
  id: string;
  exercise_name: string;
  /** Nullable for cardio */
  sets?: number | null;
  /** e.g. 10 reps or 15 min */
  reps_or_duration: string;
  rest_seconds?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface RoutineTemplateList {
  id: string;
  gym_id: string;
  template_name: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  goals: Array<unknown>;
  notes?: string | null;
  days_count: number;
  total_exercises_count: number;
  created_by_staff_id: string | null;
  created_by_staff_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineTemplateUpdateRequest {
  template_name?: string;
  routine_format?: RoutineFormatEnum;
  level?: LevelEnum;
  notes?: string | null;
  goals?: Array<GoalsEnum>;
  days?: Array<DayInputRequest>;
}

/** * `general_fitness_gym` - General Fitness Gym */
export type SecondaryTypeEnum = "general_fitness_gym" | "strength_bodybuilding_gym" | "functional_fitness_gym" | "personal_training_studio" | "boutique_fitness_studio" | "boxing_martial_arts_gym" | "yoga_pilates_studio" | "indoor_cycling_studio" | "sports_performance_centre" | "other";

export interface SendMessageRequest {
  /** Base64 ciphertext string */
  ciphertext: string;
  /** Base64 nonce / IV */
  nonce: string;
  ephemeral_public_key?: string;
  recipient_key_fingerprint?: string;
  sender_device_id?: string;
  encrypted_keys?: Record<string, unknown>;
  sender_type?: SenderTypeEnum;
  sender_gym_id?: string | null;
}

/** * `user` - User */
export type SenderTypeEnum = "user" | "gym";

export interface SourceCount {
  source: string;
  count: number;
  percentage: number;
}

/** * `walk_in` - Walk In */
export type SourceEnum = "walk_in" | "phone" | "social_media" | "referral" | "website" | "other";

export interface StaffAssignment {
  id: string;
  user: User;
  gym_id: string;
  role: Role;
  status?: Status684Enum;
  invited_at: string;
  joined_at?: string | null;
}

/** * `new` - New */
export type StageEnum = "new" | "contacted" | "visit_trial_booked" | "joined" | "not_joining";

/** * `invited` - Invited */
export type Status684Enum = "invited" | "active" | "inactive";

/** * `scheduled` - Scheduled */
export type Status927Enum = "scheduled" | "active" | "paused" | "expired" | "cancelled";

export interface SubscriptionStatusBreakdown {
  status: string;
  count: number;
}

export interface SwitchContextRequest {
  /** Target context type: 'personal' or 'gym' */
  context_type: ContextTypeEnum;
  /** Required if context_type is 'gym' */
  gym_id?: string | null;
}

export interface SwitchContextResponse {
  message: string;
  tokens: TokenResponse;
}

export interface SyncGymAmenitiesRequest {
  /** List of AmenityCatalog UUIDs that are free / complimentary */
  free_amenity_ids?: Array<string>;
  /** List of paid amenities with pricing */
  paid_amenities?: Array<PaidAmenityInputRequest>;
}

export interface SyncGymAmenitiesResponse {
  message: string;
  free_count: number;
  paid_count: number;
}

/** * `user` - user */
export type TargetTypeEnum = "user" | "gym";

export interface TokenResponse {
  access: string;
  refresh: string;
  context_type: string;
  gym_id: string | null;
  gym_name: string | null;
  scopes: Array<string>;
}

export interface TrainerWorkloadItem {
  staff_assignment_id: string;
  user_id: string;
  name: string;
  email: string;
  role_name: string;
  role_slug: string | null;
  assigned_members_count: number;
  active_routines_count: number;
  total_routines_prescribed: number;
}

export interface TrainerWorkloadReport {
  gym_id: string;
  gym_name: string;
  total_active_staff: number;
  total_assigned_members: number;
  total_active_routines: number;
  average_members_per_trainer: number;
  trainers: Array<TrainerWorkloadItem>;
}

export interface UnifiedTargetFollowersResponse {
  /** Type of the target entity ('user' or 'gym'). */
  target_type: TargetTypeEnum;
  /** UUID of target entity. */
  target_id: string;
  /** Total number of followers. */
  followers_count: number;
  /** Whether authenticated user follows this target. */
  is_following: boolean;
  /** Followers list. */
  followers: Array<Record<string, unknown>>;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  status: UserStatusEnum;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  profile: UserProfile;
}

export interface UserDeviceKeyRegisterRequest {
  device_id: string;
  device_name?: string;
  identity_key: string;
  signed_prekey: string;
  signed_prekey_signature?: string;
  one_time_prekeys?: Array<string>;
}

export interface UserFollowActionResponse {
  message: string;
  is_following: boolean;
  target_user_id: string;
}

export interface UserProfile {
  avatar_url?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  nationality?: string | null;
  /** If True, this user's profile is private and cannot be followed by other users. */
  is_private?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileMeResponse {
  user: User;
  current_context: CurrentContext;
  accessible_gyms: Array<AccessibleGymItem>;
}

export interface UserRegistrationRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

/** * `active` - Active */
export type UserStatusEnum = "active" | "inactive" | "suspended";

export interface VerifyResetOTPRequest {
  email: string;
  otp_code: string;
}

export interface VerifySignupOTPRequest {
  email: string;
  otp_code: string;
}

export interface VerifySignupResponse {
  message: string;
  user: User;
  tokens: TokenResponse;
}

/** * `everyone` - Everyone */
export type WhoCanMessageEnum = "everyone" | "followers_and_members" | "members_only";

/** * `everyone` - Everyone */
export type WhoCanSeeFollowersEnum = "everyone" | "only_members" | "private";

/** * `everyone` - Everyone */
export type WhoCanSeeFollowingEnum = "everyone" | "only_members" | "private";

/** * `everyone` - Everyone */
export type WhoCanSeeMembersEnum = "everyone" | "only_members";

/** * `everyone` - Everyone */
export type WhoCanSendJoiningRequestEnum = "everyone" | "no_one";
