/**
 * Translates between the Many Gym API wire format (snake_case, enum codes, UUIDs) and the models the
 * screens already use (camelCase, human labels). Every screen keeps its existing types; only this file
 * knows what the server calls things.
 *
 * Where the API has no equivalent for a field the UI shows, the mapping says so in a comment rather than
 * inventing a value — those gaps are listed in the integration report.
 */
import * as api from "./endpoints";
import type * as T from "./types";
import { currentGymId } from "./http";
import { firstAvailable } from "./fallback";

import type { GalleryItem, GymProfile } from "../gym-data";
import { DAYS } from "../gym-data";
import type { Lead, NextMove, Stage } from "../leads";
import type { Member, MemberStatus, Membership, Payment, PaymentStatus } from "../members";
import type { Permissions, Person, Role } from "../people";
import type { Plan, PlanStatus } from "../plans";
import type { Post, PostMedia } from "../posts";
import type { Day, Exercise, Routine, Session } from "../routines";

/** Gym id for every gym-scoped call: the context the token was minted in. */
const gym = () => currentGymId() ?? undefined;
const G = () => ({ gym_id: gym() });

const str = (v: unknown) => (v == null ? "" : String(v));
const titleCase = (code: string) => code.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

// ============================================================ membership plans

const PLAN_TYPE_IN: Record<string, Plan["type"]> = { time_based: "time", session_based: "session" };
const PLAN_TYPE_OUT: Record<Plan["type"], T.PlanTypeEnum> = { time: "time_based", session: "session_based" };

export const planFromApi = (p: T.MembershipPlanDetail | T.MembershipPlanList): Plan => {
  const d = p as T.MembershipPlanDetail;
  return {
    id: str(d.id),
    name: str(d.name),
    description: str(d.description),
    status: (d.plan_status ?? "draft") as PlanStatus,
    type: PLAN_TYPE_IN[str(d.plan_type)] ?? "time",
    price: str(d.price),
    duration: str(d.duration_value),
    per: (d.duration_unit ?? "month") as Plan["per"],
    joiningFee: str(d.joining_fee ?? "0"),
    schedule: d.payment_schedule === "instalments" ? "instalments" : "full",
    // The API stores the instalment plan as a free-form JSON blob, so shape-check it before trusting it.
    instalments: Array.isArray(d.installment_schedule_config)
      ? (d.installment_schedule_config as unknown[]).map((raw, i) => {
          const r = (raw ?? {}) as Record<string, unknown>;
          return {
            id: str(r.id) || `i${i + 1}`,
            amount: str(r.amount),
            dueAfter: str(r.due_after ?? r.dueAfter ?? "0"),
            dueUnit: (str(r.due_unit ?? r.dueUnit) || "days") as Plan["instalments"][number]["dueUnit"],
          };
        })
      : [],
    freeAmenities: (d.included_amenities ?? []).filter((a) => !a.is_paid).map((a) => str(a.name)),
    paidAmenities: (d.included_amenities ?? []).filter((a) => a.is_paid).map((a) => str(a.name)),
    cancellationPolicy: str(d.cancellation_policy),
    refundPolicy: str(d.refund_policy),
  };
};

/** Amenity names the UI edits must become catalog ids on the way out. */
export const planToApi = (p: Plan, amenityIds: string[] = []): T.MembershipPlanCreateRequest => ({
  name: p.name,
  description: p.description || undefined,
  plan_status: p.status,
  plan_type: PLAN_TYPE_OUT[p.type],
  price: p.price || "0",
  duration_value: parseInt(p.duration, 10) || 1,
  duration_unit: p.per,
  joining_fee: p.joiningFee || "0",
  payment_schedule: p.schedule === "instalments" ? "instalments" : "full_payment",
  installment_schedule_config:
    p.schedule === "instalments"
      ? p.instalments.map((i) => ({ id: i.id, amount: i.amount, due_after: i.dueAfter, due_unit: i.dueUnit }))
      : undefined,
  cancellation_policy: p.cancellationPolicy || undefined,
  refund_policy: p.refundPolicy || undefined,
  included_amenity_ids: amenityIds.length ? amenityIds : undefined,
});

export const plans = {
  list: async (): Promise<Plan[]> => {
    const rows = await api.plansList(G());
    return asArray<T.MembershipPlanList>(rows).map(planFromApi);
  },
  get: async (id: string): Promise<Plan> => planFromApi(await api.plansRetrieve(id)),
  create: async (p: Plan, amenityIds?: string[]): Promise<Plan> =>
    planFromApi(await api.plansCreate(planToApi(p, amenityIds))),
  update: async (p: Plan, amenityIds?: string[]): Promise<Plan> =>
    planFromApi(await api.plansPartialUpdate(p.id, planToApi(p, amenityIds))),
  remove: (id: string) => api.plansDestroy(id),
  setStatus: (id: string, plan_status: PlanStatus) => api.plansStatusCreate(id, { plan_status }),
  syncAmenities: (id: string, amenity_ids: string[]) => api.plansAmenitiesUpdate(id, { amenity_ids }),
};

// ============================================================ members

const SUB_PAYMENT: Record<string, string> = {
  cash: "Cash", credit_card: "Card", debit_card: "Card", bank_transfer: "Bank transfer", mobile_pay: "Other", other: "Other",
};

const paymentFromApi = (p: T.MemberPayment): Payment => ({
  id: str(p.id),
  amount: Number(p.amount ?? 0),
  method: SUB_PAYMENT[str(p.payment_method)] ?? "Other",
  date: str(p.payment_date),
});

const membershipFromApi = (s: T.MemberSubscriptionDetail): Membership => ({
  id: str(s.id),
  planId: str(s.plan_id),
  planName: str(s.plan_name),
  type: PLAN_TYPE_IN[str(s.plan_type)] ?? "time",
  price: Number(s.plan_price ?? 0),
  joiningFee: Number(s.joining_fee ?? 0),
  extras: (s.extra_amenities ?? []).map((a) => ({ name: str(a.name), price: Number(a.extra_fee ?? 0) })),
  start: str(s.start_date),
  end: str(s.end_date),
  sessionsTotal: s.total_sessions ?? 0,
  sessionsUsed: Math.max(0, (s.total_sessions ?? 0) - (s.remaining_sessions ?? 0)),
  payments: (s.payments ?? []).map(paymentFromApi),
});

/** `GET /members/` statuses, mapped onto the UI's own vocabulary. */
const LIST_STATUS: Record<string, MemberStatus> = {
  scheduled: "scheduled", active: "active", paused: "paused", expired: "expired", cancelled: "cancelled",
};
const LIST_PAYMENT: Record<string, PaymentStatus> = {
  fully_paid: "paid", partially_paid: "partial", unpaid: "unpaid",
};

export const memberFromApi = (m: T.MemberDetail | T.MemberList): Member => {
  const d = m as T.MemberDetail;
  const subs = (d.subscriptions ?? []).map(membershipFromApi);
  const active = (d.active_subscription ?? null) as { membership_status?: string } | null;
  const held = active?.membership_status;
  const trainer = (d.assigned_trainer ?? null) as { id?: string; staff_id?: string; user_id?: string } | null;
  return {
    id: str(d.id),
    userId: str(d.user_id) || undefined,
    // The API exposes no human-facing member number, so the UI shows a short form of the id.
    memberNo: str(d.id).replace(/-/g, "").slice(0, 8).toUpperCase(),
    firstName: str(d.first_name),
    lastName: str(d.last_name),
    email: str(d.email),
    phone: str(d.phone),
    address: str(d.address),
    city: str(d.city),
    country: str(d.country),
    dob: str(d.date_of_birth),
    sex: str(d.sex),
    nationality: str(d.nationality),
    emergency: {
      name: str(d.emergency_contact_name),
      phone: str(d.emergency_contact_phone),
      relationship: str(d.emergency_contact_relationship),
    },
    memberships: subs,
    trainerId: str(trainer?.id ?? trainer?.staff_id),
    trainerUserId: str(trainer?.user_id) || undefined,
    routine: null, // loaded on demand from /members/{id}/routines/
    joiningStatus: d.joining_status === "sent_invitation" ? "sent_invitation" : "joined",
    notes: str(d.internal_notes),
    joinedAt: str(d.created_at).slice(0, 10),
    invitationSentAt: str(d.invitation_sent_at) || undefined,
    hold: held === "paused" ? "paused" : held === "cancelled" ? "cancelled" : "",
    photo: str(d.profile_photo_url),
    derived: {
      status: LIST_STATUS[str((m as T.MemberList).membership_status)],
      payment: LIST_PAYMENT[str((m as T.MemberList).payment_status)],
      planName: str((m as T.MemberList).current_plan_name) || undefined,
      expiry: str((m as T.MemberList).expiry_date) || undefined,
    },
  };
};

export const memberToApi = (m: Member): T.MemberCreateRequest => ({
  first_name: m.firstName,
  last_name: m.lastName,
  email: m.email,
  phone: m.phone || undefined,
  address: m.address || undefined,
  city: m.city || undefined,
  country: m.country || undefined,
  date_of_birth: m.dob || undefined,
  sex: m.sex || undefined,
  nationality: m.nationality || undefined,
  emergency_contact_name: m.emergency.name || undefined,
  emergency_contact_phone: m.emergency.phone || undefined,
  emergency_contact_relationship: m.emergency.relationship || undefined,
  assigned_trainer_id: m.trainerId || undefined,
  internal_notes: m.notes || undefined,
  profile_photo_url: m.photo && !m.photo.startsWith("data:") ? m.photo : undefined,
});

/**
 * `POST /members/` can onboard a member *and* attach their first subscription and payment in one call, so the
 * create body carries them. `PATCH /members/{id}/` accepts none of it — those fields live on the subscription
 * endpoints instead — which is why create and update build different bodies.
 */
export const memberCreateToApi = (m: Member, amenityIds: string[] = []): T.MemberCreateRequest => {
  const first = m.memberships[0];
  const payment = first?.payments[0];
  return {
    ...memberToApi(m),
    plan_id: first?.planId || undefined,
    start_date: first?.start || undefined,
    end_date: first?.end || undefined,
    extra_amenity_ids: amenityIds.length ? amenityIds : undefined,
    initial_payment_amount: payment ? payment.amount.toFixed(2) : undefined,
    initial_payment_method: payment ? (PAYMENT_METHOD_OUT[payment.method] ?? "other") : undefined,
    initial_payment_date: payment?.date || undefined,
  };
};

/** UI payment labels → the API's enum. */
const PAYMENT_METHOD_OUT: Record<string, T.InitialPaymentMethodEnum> = {
  Cash: "cash", Card: "credit_card", "Bank transfer": "bank_transfer", "Direct debit": "bank_transfer", Other: "other",
};

export const members = {
  list: async (): Promise<Member[]> => asArray<T.MemberList>(await api.membersList(G())).map(memberFromApi),
  get: async (id: string): Promise<Member> => {
    const [detail, routineRows] = await Promise.all([
      api.membersRetrieve(id),
      api.membersRoutinesList(id, G()).catch(() => [] as T.MemberRoutineDetail[]),
    ]);
    const member = memberFromApi(detail);
    const first = asArray<T.MemberRoutineDetail>(routineRows)[0];
    return first ? { ...member, routine: memberRoutineFromApi(first) } : member;
  },
  create: async (m: Member, amenityIds?: string[]): Promise<Member> =>
    memberFromApi(await api.membersCreate(memberCreateToApi(m, amenityIds))),
  update: async (m: Member): Promise<Member> => memberFromApi(await api.membersPartialUpdate(m.id, memberToApi(m))),
  remove: (id: string) => api.membersDestroy(id),
  metrics: () => api.membersMetricsRetrieve(),
  resendInvite: (id: string) => api.membersResendInvitationCreate(id),
  addSubscription: (id: string, body: T.MemberSubscriptionCreateRequest) => api.membersSubscriptionsCreate(id, body),
  logPayment: (subscriptionId: string, body: T.MemberPaymentCreateRequest) =>
    api.membersSubscriptionsPaymentsCreate(subscriptionId, body),
  setSubscriptionStatus: (subscriptionId: string, membership_status: T.MembershipStatusEnum) =>
    api.membersSubscriptionsStatusPartialUpdate(subscriptionId, { membership_status }),
  routines: (id: string) => api.membersRoutinesList(id, G()),
  /** `GET /members/{id}/routines/{routineId}/` — the full dossier for one assigned routine. */
  routine: async (memberId: string, routineId: string): Promise<Routine> =>
    memberRoutineFromApi(await api.membersRoutinesRetrieve(memberId, routineId, G())),
  assignRoutine: (id: string, body: T.MemberRoutineAssignRequest) => api.membersRoutinesAssignCreate(id, body, G()),
  /** Assign a template to a member, or save a routine edited just for them. */
  assignTemplate: (memberId: string, templateId: string, name: string) =>
    api.membersRoutinesAssignCreate(memberId, { source_template_id: templateId, routine_name: name }, G()),
  saveRoutine: (memberId: string, routineId: string, r: Routine) =>
    api.membersRoutinesPartialUpdate(memberId, routineId, routineToApi(r) as T.PatchedMemberRoutineUpdateRequest, G()),
};

// ============================================================ leads

const STAGE_IN: Record<string, Stage> = {
  new: "new", contacted: "contacted", visit_trial_booked: "trial", joined: "joined", not_joining: "not_joining",
};
const STAGE_OUT: Record<Stage, T.StageEnum> = {
  new: "new", contacted: "contacted", trial: "visit_trial_booked", joined: "joined", not_joining: "not_joining",
};
const GOAL_OUT: Record<string, T.FitnessGoalsEnum> = {
  "General Fitness": "general_fitness", Strength: "strength", "Muscle Gain": "muscle_gain", "Weight Loss": "weight_loss", Other: "other",
};
const GOAL_IN = Object.fromEntries(Object.entries(GOAL_OUT).map(([k, v]) => [v, k]));
const REASON_OUT: Record<string, T.NotJoiningReasonStandardEnum> = {
  Price: "price", Location: "location", Timing: "timing", "Chose Another Gym": "chose_another_gym", Other: "other",
};
const REASON_IN = Object.fromEntries(Object.entries(REASON_OUT).map(([k, v]) => [v, k]));
const SOURCE_OUT: Record<string, T.SourceEnum> = {
  "Walk-in": "walk_in", Phone: "phone", "Social Media": "social_media", Referral: "referral", Website: "website", Other: "other",
};
const SOURCE_IN = Object.fromEntries(Object.entries(SOURCE_OUT).map(([k, v]) => [v, k]));

export const leadFromApi = (l: T.LeadDetail | T.LeadList): Lead => {
  const d = l as T.LeadDetail;
  const plan = (d.interested_plan ?? null) as unknown as { id?: string } | string | null;
  const staff = (d.assigned_staff ?? null) as unknown as { id?: string } | string | null;
  return {
    id: str(d.id),
    firstName: str(d.first_name),
    lastName: str(d.last_name),
    phone: str(d.phone),
    email: str(d.email),
    planId: typeof plan === "string" ? plan : str(plan?.id),
    stage: STAGE_IN[str(d.stage)] ?? "new",
    reason: REASON_IN[str(d.not_joining_reason_standard)] ?? "",
    customReason: str(d.not_joining_custom_reason),
    goals: (d.fitness_goals ?? []).map((g) => GOAL_IN[str(g)] ?? titleCase(str(g))),
    expectedStart: str(d.expected_start_date),
    source: SOURCE_IN[str(d.source)] ?? "Other",
    assignedTo: typeof staff === "string" ? staff : str(staff?.id),
    nextMoves: (d.next_moves ?? []).map(
      (m): NextMove => ({ id: str(m.id), date: str(m.scheduled_date), description: str(m.short_description) }),
    ),
    trialBooked: str(d.trial_booked_at),
    notes: (d.notes ?? []).map((n) => str(n.note_text)),
    // Set once a lead has been converted, so the UI can link through to the member.
    convertedMemberId: (() => {
      const c = d.converted_member as unknown;
      return typeof c === "string" ? c : str((c as { id?: string } | null)?.id) || undefined;
    })(),
  };
};

export const leadToApi = (l: Lead): T.LeadCreateRequest => ({
  first_name: l.firstName,
  last_name: l.lastName || undefined,
  phone: l.phone || undefined,
  email: l.email || undefined,
  interested_plan_id: l.planId || undefined,
  assigned_staff_id: l.assignedTo || undefined,
  source: SOURCE_OUT[l.source] ?? "other",
  stage: STAGE_OUT[l.stage],
  expected_start_date: l.expectedStart || undefined,
  trial_booked_at: l.trialBooked || undefined,
  not_joining_reason_standard: l.reason ? REASON_OUT[l.reason] : undefined,
  fitness_goals: l.goals.length ? l.goals.map((g) => GOAL_OUT[g] ?? "other") : undefined,
});

export const leads = {
  list: async (): Promise<Lead[]> => asArray<T.LeadList>(await api.leadsList(G())).map(leadFromApi),
  get: async (id: string): Promise<Lead> => leadFromApi(await api.leadsRetrieve(id, G())),
  create: async (l: Lead): Promise<Lead> => leadFromApi(await api.leadsCreate(leadToApi(l), G())),
  update: async (l: Lead): Promise<Lead> => leadFromApi(await api.leadsPartialUpdate(l.id, leadToApi(l), G())),
  remove: (id: string) => api.leadsDestroy(id, G()),
  metrics: () => api.leadsMetricsRetrieve(G()),
  reasons: () => api.leadsReasonsRetrieve(G()),
  addReason: (reason_name: string) => api.leadsReasonsCreate({ reason_name }, G()),
  addNote: (id: string, note_text: string) => api.leadsNotesCreate(id, { note_text }, G()),
  addNextMove: (id: string, scheduled_date: string, short_description: string) =>
    api.leadsNextMovesCreate(id, { scheduled_date, short_description }, G()),
  updateNextMove: (id: string, moveId: string, body: T.PatchedLeadNextMoveUpdateRequest) =>
    api.leadsNextMovesPartialUpdate(id, moveId, body, G()),
  convert: (id: string, body: T.LeadConvertToMemberRequest) => api.leadsConvertCreate(id, body, G()),
};

// ============================================================ routine templates

const LEVEL_IN: Record<string, Routine["level"]> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const LEVEL_OUT: Record<Routine["level"], T.LevelEnum> = { Beginner: "beginner", Intermediate: "intermediate", Advanced: "advanced" };
/**
 * The API uses **two different day numberings**, verified against the live server:
 *
 *   opening hours      0-based, 0=Sunday … 6=Saturday   (`GET /gyms/opening-hours/` returns 0=Sunday)
 *   routine templates  1-based, 1=Monday … 7=Sunday     (0 → "must be >= 1", 8 → "must be <= 7")
 *
 * `DayOfWeekEnum` in the schema documents only the first; `DayInputRequest.day_of_week` is an undocumented
 * plain integer. Using one map for both meant every weekly routine was rejected, because its Sunday was 0.
 */
const HOURS_DAY: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
const ROUTINE_DAY: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

const exerciseFromApi = (e: T.RoutineTemplateExercise): Exercise => ({
  id: str(e.id),
  name: str(e.exercise_name),
  sets: e.sets == null ? "" : String(e.sets),
  reps: str(e.reps_or_duration),
  rest: e.rest_seconds == null ? "" : String(e.rest_seconds),
  notes: str(e.notes),
});

const exerciseToApi = (e: Exercise, i: number): T.ExerciseInputRequest => ({
  exercise_name: e.name,
  sets: parseInt(e.sets, 10) || undefined,
  reps_or_duration: e.reps || "—",
  rest_seconds: parseInt(e.rest, 10) || undefined,
  notes: e.notes || undefined,
  sort_order: i,
});

export const routineFromApi = (t: T.RoutineTemplateDetail | T.RoutineTemplateList): Routine => {
  const d = t as T.RoutineTemplateDetail;
  const format: Routine["format"] = d.routine_format === "session_based" ? "session" : "weekly";
  const apiDays = d.days ?? [];
  return {
    id: str(d.id),
    name: str(d.template_name),
    format,
    goals: (d.goals ?? []).map((g) => GOAL_IN[str(g)] ?? titleCase(str(g))),
    level: LEVEL_IN[str(d.level)] ?? "Beginner",
    notes: str(d.notes),
    exerciseCount: d.total_exercises_count ?? undefined,
    createdByName: str(d.created_by_staff_name) || undefined,
    days:
      format === "weekly"
        ? [...DAYS].map((name) => {
            const row = apiDays.find((x) => x.day_of_week === ROUTINE_DAY[name]);
            return {
              day: name,
              rest: row ? !!row.is_rest_day : true,
              title: str(row?.workout_title),
              note: str(row?.workday_note),
              exercises: (row?.exercises ?? []).map(exerciseFromApi),
            } satisfies Day;
          })
        : [],
    sessions:
      format === "session"
        ? [...apiDays]
            .sort((a, b) => (a.session_number ?? 0) - (b.session_number ?? 0))
            .map(
              (row): Session => ({
                id: str(row.id),
                title: str(row.workout_title),
                note: str(row.workday_note),
                exercises: (row.exercises ?? []).map(exerciseFromApi),
              }),
            )
        : [],
  };
};

export const routineToApi = (r: Routine): T.RoutineTemplateCreateRequest => ({
  template_name: r.name,
  routine_format: r.format === "session" ? "session_based" : "weekly",
  level: LEVEL_OUT[r.level],
  goals: r.goals.map((g) => GOAL_OUT[g] ?? "other"),
  notes: r.notes || undefined,
  days:
    r.format === "weekly"
      ? r.days.map((d, i) => ({
          day_of_week: ROUTINE_DAY[d.day] ?? i + 1,
          is_rest_day: d.rest,
          workout_title: d.title || undefined,
          workday_note: d.note || undefined,
          sort_order: i,
          exercises: d.rest ? [] : d.exercises.map(exerciseToApi),
        }))
      : r.sessions.map((s, i) => ({
          session_number: i + 1,
          is_rest_day: false,
          workout_title: s.title || undefined,
          workday_note: s.note || undefined,
          sort_order: i,
          exercises: s.exercises.map(exerciseToApi),
        })),
});

/**
 * A member's own routine is the template shape under different key names (`routine_name`, and no `goals`),
 * so it reuses the template mapping rather than repeating the day/exercise walk.
 */
export const memberRoutineFromApi = (r: T.MemberRoutineDetail): Routine =>
  routineFromApi({ ...r, template_name: r.routine_name } as unknown as T.RoutineTemplateDetail);

export const routines = {
  /** The request body for a routine, shared with the member-routine endpoints. */
  toRequest: routineToApi,
  list: async (): Promise<Routine[]> =>
    asArray<T.RoutineTemplateList>(await api.routineTemplatesList(G())).map(routineFromApi),
  get: async (id: string): Promise<Routine> => routineFromApi(await api.routineTemplatesRetrieve(id, G())),
  create: async (r: Routine): Promise<Routine> => routineFromApi(await api.routineTemplatesCreate(routineToApi(r), G())),
  /** Full replace — use when the days/exercises changed. */
  update: async (r: Routine): Promise<Routine> =>
    routineFromApi(await api.routineTemplatesUpdate(r.id, routineToApi(r), G())),
  /**
   * Metadata-only edit (name, level, goals, notes) via PATCH, so renaming a template doesn't resend — and
   * risk rewriting — every day and exercise it contains.
   */
  patchMeta: async (r: Routine): Promise<Routine> => {
    const body = routineToApi(r);
    return routineFromApi(
      await api.routineTemplatesPartialUpdate(
        r.id,
        { template_name: body.template_name, level: body.level, goals: body.goals, notes: body.notes },
        G(),
      ),
    );
  },
  remove: (id: string) => api.routineTemplatesDestroy(id, G()),
};

// ============================================================ people (staff + roles)

export const personFromApi = (s: T.StaffAssignment): Person => {
  const u = s.user ?? ({} as T.User);
  return {
    id: str(s.id),
    name: `${str(u.first_name)} ${str(u.last_name)}`.trim(),
    email: str(u.email),
    roleId: str(s.role?.id),
    roleName: str(s.role?.name),
    roleSlug: str(s.role?.slug) || undefined,
    // The API has three states (invited / active / inactive); the UI models only the first two,
    // so an inactive assignment reads as "invited" until the UI grows a third state.
    status: s.status === "active" ? "active" : "invited",
    invitedAt: str(s.invited_at) || undefined,
    joinedAt: str(s.joined_at) || undefined,
  };
};

export const roleFromApi = (r: T.Role): Role => {
  const permissions: Permissions = {};
  for (const p of r.permissions ?? []) {
    const group = str(p.topic) ? titleCase(str(p.topic)) : "Other";
    (permissions[group] ??= []).push(str(p.name));
  }
  return {
    id: str(r.id),
    name: str(r.name),
    slug: str(r.slug) || undefined,
    description: str(r.description) || undefined,
    builtIn: !r.is_custom,
    permissions,
  };
};

export const people = {
  list: async (): Promise<Person[]> => asArray<T.StaffAssignment>(await api.accessControlStaffList()).map(personFromApi),
  invite: (email: string, role_id: string) => api.accessControlStaffCreate({ email, role_id }),
  setStatus: (assignmentId: string, status: T.PatchedUpdateStaffStatusRequest["status"]) =>
    api.accessControlStaffPartialUpdate(assignmentId, { status }),
  revoke: (assignmentId: string) => api.accessControlStaffDestroy(assignmentId),
};

export const roles = {
  list: async (): Promise<Role[]> => asArray<T.Role>(await api.accessControlRolesRetrieve(G())).map(roleFromApi),
  get: async (id: string): Promise<Role> => roleFromApi(await api.accessControlRolesRetrieve2(id)),
  permissions: () => api.accessControlPermissionsRetrieve(),
  create: (name: string, description: string, permission_ids: string[]) =>
    api.accessControlRolesCreate({ name, description, permission_ids }),
  update: (id: string, body: T.PatchedUpdateCustomRoleRequest) => api.accessControlRolesPartialUpdate(id, body),
  remove: (id: string) => api.accessControlRolesDestroy(id),
};

// ============================================================ community feed (studio posts)

export const postFromApi = (p: T.GymPostDetail | T.GymPostList): Post => {
  const d = p as T.GymPostDetail;
  return {
    id: str(d.id),
    text: str(d.content_text),
    author: { name: str(d.author_name), avatarUrl: str(d.author_avatar_url), userId: str(d.author_user_id) },
    media: (d.media_attachments ?? []).map((raw): PostMedia => {
      const m = raw as unknown as Record<string, string | undefined>;
      return {
        id: str(m.id),
        // Same URL preference as the gallery — post media is optimised the same way.
        url: str(m.resolved_media_url || m.optimized_url || m.media_url || m.original_url),
        thumbnailUrl: str(m.resolved_thumbnail_url || m.thumbnail_url) || undefined,
        kind: m.media_type === "video" ? "video" : "image",
      };
    }),
    members: d.privacy !== "public",
    // The API has no pin, like or comment concept for gym posts, so these stay local to this browser.
    pinned: false,
    createdAt: str(d.published_at ?? d.created_at),
    likes: 0,
    likedBy: [],
    comments: [],
  };
};

export const postToApi = (p: Post): T.GymPostCreateRequest => ({
  content_text: p.text || undefined,
  privacy: p.members ? "members_only" : "public",
  media_items: p.media.length
    ? p.media
        .filter((m) => !m.url.startsWith("data:") && !m.url.startsWith("blob:"))
        .map((m, i) => ({ media_url: m.url, media_type: m.kind === "video" ? "video" : "picture", order_index: i }))
    : undefined,
});

export const posts = {
  list: async (): Promise<Post[]> => {
    const g = gym();
    if (!g) return [];
    return asArray<T.GymPostList>(await api.postsList({ gym_id: g })).map(postFromApi);
  },
  create: async (p: Post): Promise<Post> => postFromApi(await api.postsCreate(postToApi(p), G())),
  update: async (p: Post): Promise<Post> =>
    postFromApi(await api.postsPartialUpdate(p.id, { content_text: p.text, privacy: p.members ? "members_only" : "public" }, G())),
  remove: (id: string) => api.postsDestroy(id, G()),
};

// ============================================================ gym profile (composite)

const TYPE_IN: Record<string, string> = {
  general_fitness_gym: "general", strength_bodybuilding_gym: "strength", functional_fitness_gym: "functional",
  personal_training_studio: "pt", boutique_fitness_studio: "boutique", boxing_martial_arts_gym: "martial",
  yoga_pilates_studio: "yoga", indoor_cycling_studio: "cycling", sports_performance_centre: "performance", other: "other",
};
const TYPE_OUT = Object.fromEntries(Object.entries(TYPE_IN).map(([k, v]) => [v, k])) as Record<string, T.PrimaryTypeEnum>;
const GENDER_IN: Record<string, string> = { everyone: "everyone", women_only: "women", men_only: "men" };
const GENDER_OUT: Record<string, T.GenderRequiredEnum> = { everyone: "everyone", women: "women_only", men: "men_only" };
const CATEGORY_IN: Record<string, string> = {
  general: "General", equipment: "Equipment", workout_areas: "Workout Areas", studios_class_spaces: "Studios & Class Spaces",
  changing_rooms_showers: "Changing Rooms & Showers", wellness_facilities: "Wellness Facilities — sauna, steam room, pool",
  reception_lounge: "Reception & Lounge", interior_decor: "Interior & Decor", exterior_entrance: "Exterior & Entrance", other: "Other",
};
const CATEGORY_OUT = Object.fromEntries(Object.entries(CATEGORY_IN).map(([k, v]) => [v, k])) as Record<string, T.CategoryEnum>;

/** The UI's single gym record is five API resources: profile, location, hours, amenities, gallery. */
export async function loadGym(): Promise<GymProfile | null> {
  const g = gym();
  if (!g) return null;
  const q = { gym_id: g };
  const [detail, hours, amenities, gallery] = await Promise.all([
    // The overview is published at both /gyms/profile/ and /gyms/profile/overview/ with the same contract.
    firstAvailable("gym-profile", [
      { path: "GET /gyms/profile/", call: () => api.gymsProfileRetrieve(q) },
      { path: "GET /gyms/profile/overview/", call: () => api.gymsProfileOverviewRetrieve(q) },
    ]),
    api.gymsOpeningHoursRetrieve(q).catch(() => [] as T.GymOpeningHoursItem[]),
    api.amenitiesGymAmenitiesRetrieve(q).catch(() => null),
    api.gymsGalleryRetrieve(q).catch(() => [] as T.GymGalleryItem[]),
  ]);

  const hourRows = asArray<T.GymOpeningHoursItem>(hours);
  const byDay: GymProfile["hours"] = {};
  for (const name of DAYS) {
    const row = hourRows.find((h) => h.day_of_week === HOURS_DAY[name]);
    byDay[name] = {
      open: row ? !row.is_closed : false,
      start: str(row?.start_time).slice(0, 5) || "06:00",
      end: str(row?.end_time).slice(0, 5) || "22:00",
    };
  }

  /*
   * `GET /gyms/profile/` already embeds the whole location object, so the dedicated location endpoint is only
   * a fallback. The schema types `GymDetail.location` as a plain string, which is wrong — it is an object with
   * address, city, country, postal_code and coordinates. See docs/api/known-issues.md #24.
   */
  const embedded = (detail as unknown as { location?: unknown }).location;
  const loc = (
    embedded && typeof embedded === "object"
      ? embedded
      : ((await api.gymsProfileLocationRetrieve(q).catch(() => null)) ?? {})
  ) as T.GymLocation;
  const am = (amenities ?? {}) as T.GymAmenitiesConfigured;
  return {
    id: "gym",
    // The API has no tagline or website field on the gym profile.
    tagline: "",
    website: "",
    timezone: str((detail as unknown as { timezone?: string }).timezone),
    ownerEmail: str((detail as unknown as { owner_email?: string }).owner_email),
    overview: {
      name: str(detail.name),
      description: str(detail.short_description),
      primaryType: TYPE_IN[str(detail.primary_type)] ?? "general",
      secondaryType: TYPE_IN[str(detail.secondary_type)] ?? "",
      gender: GENDER_IN[str(detail.gender_required)] ?? "everyone",
      minAge: detail.min_age == null ? "" : String(detail.min_age),
      profileUrl: str(detail.profile_picture_url),
      coverUrl: str(detail.cover_photo_url),
    },
    location: {
      address: str(loc.address),
      city: str(loc.city),
      postcode: str(loc.postal_code),
      country: str(loc.country),
      // The UI pin is a 0–1 fraction of its map image; the API stores real coordinates.
      pin: { x: Number(loc.longitude ?? 0), y: Number(loc.latitude ?? 0) },
    },
    hours: byDay,
    amenities: {
      free: (am.free_amenities ?? []).map((a) => str(a.name)),
      paid: (am.paid_amenities ?? []).map((a) => str(a.name)),
    },
    gallery: asArray<T.GymGalleryItem>(gallery).map((raw): GalleryItem => {
      /*
       * The API stores several URLs per asset and optimises uploads in the background:
       * resolved_media_url (ready to render) > optimized_url (processed) > media_url > original_url.
       * Rendering media_url directly skips the optimised copy and breaks when the stored value needs
       * resolving. thumbnail_url matters for video, which has no inline poster otherwise.
       */
      const i = raw as unknown as Record<string, string | undefined>;
      return {
        id: str(i.id),
        url: str(i.resolved_media_url || i.optimized_url || i.media_url || i.original_url),
        thumbnailUrl: str(i.resolved_thumbnail_url || i.thumbnail_url) || undefined,
        kind: i.media_type === "video" ? "video" : "image",
        category: CATEGORY_IN[str(i.category)] ?? "General",
        caption: str(i.caption),
        processing: str(i.processing_status) || undefined,
      };
    }),
  };
}

export const gymProfile = {
  saveOverview: (p: GymProfile) => {
    const body = {
        name: p.overview.name || undefined,
        short_description: p.overview.description || undefined,
        primary_type: TYPE_OUT[p.overview.primaryType],
        secondary_type: p.overview.secondaryType ? TYPE_OUT[p.overview.secondaryType] : undefined,
        gender_required: GENDER_OUT[p.overview.gender] ?? "everyone",
        min_age: parseInt(p.overview.minAge, 10) || undefined,
        profile_picture_url: p.overview.profileUrl && !p.overview.profileUrl.startsWith("data:") ? p.overview.profileUrl : undefined,
        cover_photo_url: p.overview.coverUrl && !p.overview.coverUrl.startsWith("data:") ? p.overview.coverUrl : undefined,
    };
    // Same pair of paths on the write side.
    return firstAvailable("gym-profile-save", [
      { path: "PATCH /gyms/profile/overview/", call: () => api.gymsProfileOverviewPartialUpdate(body, G()) },
      { path: "PATCH /gyms/profile/", call: () => api.gymsProfilePartialUpdate(body, G()) },
    ]);
  },
  saveLocation: (p: GymProfile) =>
    api.gymsProfileLocationPartialUpdate(
      {
        address: p.location.address || undefined,
        city: p.location.city || undefined,
        country: p.location.country || undefined,
        postal_code: p.location.postcode || undefined,
        latitude: String(p.location.pin.y),
        longitude: String(p.location.pin.x),
      },
      G(),
    ),
  saveHours: (p: GymProfile) =>
    api.gymsOpeningHoursUpdate(
      {
        hours: [...DAYS].map((name) => ({
          day_of_week: HOURS_DAY[name],
          is_closed: !p.hours[name]?.open,
          start_time: p.hours[name]?.open ? `${p.hours[name].start}:00` : null,
          end_time: p.hours[name]?.open ? `${p.hours[name].end}:00` : null,
        })),
      },
      G(),
    ),
  catalog: () => api.amenitiesCatalogRetrieve(),
  syncAmenities: (free_amenity_ids: string[], paid: { amenity_id: string; default_price: string }[]) =>
    api.amenitiesGymAmenitiesSyncUpdate({ free_amenity_ids, paid_amenities: paid }, G()),
  addGalleryItem: (item: GalleryItem) =>
    api.gymsGalleryCreate(
      {
        media_url: item.url,
        media_type: item.kind === "video" ? "video" : "picture",
        category: CATEGORY_OUT[item.category] ?? "general",
        caption: item.caption || undefined,
      },
      G(),
    ),
  removeGalleryItem: (id: string) => api.gymsGalleryDestroy(id, G()),
  reorderGallery: (ids: string[]) =>
    api.gymsGalleryReorderPartialUpdate({ items: ids.map((id, i) => ({ id, order_index: i })) }, G()),
  settings: () => api.gymsSettingsRetrieve(G()),
  saveSettings: (body: T.PatchedGymSettingUpdateRequest) => api.gymsSettingsPartialUpdate(body, G()),
};

// ============================================================ amenities

/**
 * Amenities live in two different id spaces, and sending the wrong one is a 400:
 *
 *   `GymAmenityItem.amenity_id` — the master catalog id. What `PUT /amenities/gym-amenities/sync/` wants.
 *   `GymAmenityItem.id`         — the gym's own configured row. What `PUT /plans/{id}/amenities/` and
 *                                 `POST /members/subscriptions/{id}/extra-amenities/` want.
 *
 * Verified against the live API: passing a catalog id to the plan endpoint returns
 * "The following amenity IDs do not belong to this gym or do not exist"; the row id returns 200.
 */
type AmenityIndex = { byNameToRow: Map<string, string>; byNameToCatalog: Map<string, string> };
let amenityIndex: AmenityIndex | null = null;

async function loadAmenityIndex(): Promise<AmenityIndex> {
  if (amenityIndex) return amenityIndex;
  const byNameToRow = new Map<string, string>();
  const byNameToCatalog = new Map<string, string>();

  const [configured, catalog] = await Promise.all([
    api.amenitiesGymAmenitiesRetrieve(G()).catch(() => null),
    api.amenitiesCatalogRetrieve().catch(() => null),
  ]);

  // The catalog gives name → catalog id.
  const absorbCatalog = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(absorbCatalog);
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.name === "string" && typeof o.id === "string") byNameToCatalog.set(o.name, o.id);
    Object.values(o).forEach(absorbCatalog);
  };
  absorbCatalog(catalog);

  // The gym's configured rows give name → row id (and a better catalog id, via amenity_id).
  for (const row of [
    ...((configured as T.GymAmenitiesConfigured | null)?.free_amenities ?? []),
    ...((configured as T.GymAmenitiesConfigured | null)?.paid_amenities ?? []),
  ]) {
    const name = str(row.name);
    if (!name) continue;
    if (row.id) byNameToRow.set(name, str(row.id));
    if (row.amenity_id) byNameToCatalog.set(name, str(row.amenity_id));
  }

  return (amenityIndex = { byNameToRow, byNameToCatalog });
}

/**
 * Names → the gym's configured row ids, for plan inclusions and member extras.
 * A name the gym hasn't configured yet is dropped: it cannot be attached to a plan until it is synced.
 */
export async function resolveAmenityIds(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const { byNameToRow } = await loadAmenityIndex();
  return names.map((n) => byNameToRow.get(n)).filter((v): v is string => !!v);
}

/** Names → master catalog ids, for `PUT /amenities/gym-amenities/sync/`. */
export async function resolveCatalogIds(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const { byNameToCatalog } = await loadAmenityIndex();
  return names.map((n) => byNameToCatalog.get(n)).filter((v): v is string => !!v);
}

/** Forget the cached index (after the gym's amenities are re-synced, which mints new row ids). */
export const clearAmenityIndex = () => {
  amenityIndex = null;
};

// ============================================================ reports

export const reports = {
  dashboard: () => api.dashboardSummaryRetrieve({ gym_id: gym()! }),
  revenue: (start_date?: string, end_date?: string) =>
    api.reportsRevenueRetrieve({ gym_id: gym()!, start_date, end_date }),
  leadsFunnel: (start_date?: string, end_date?: string) =>
    api.reportsLeadsFunnelRetrieve({ gym_id: gym()!, start_date, end_date }),
  membershipGrowth: (start_date?: string, end_date?: string) =>
    api.reportsMembershipGrowthRetrieve({ gym_id: gym()!, start_date, end_date }),
  trainerWorkload: () => api.reportsTrainerWorkloadRetrieve({ gym_id: gym()! }),
};

// ============================================================ helpers

/**
 * List endpoints are documented as bare arrays but some return a paginated envelope
 * (`{count, results}`) or a wrapped object. Accept all three rather than crashing the screen.
 */
export function asArray<X>(payload: unknown): X[] {
  if (Array.isArray(payload)) return payload as X[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(o[key])) return o[key] as X[];
    }
  }
  return [];
}
