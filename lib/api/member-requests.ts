"use client";

/**
 * Member joining requests, the public member roster, and blocking a gym follower.
 *
 * Two sides share these routes:
 *
 *  - **The applicant** (any signed-in person) asks a gym to take them on:
 *    `GET /gyms/{gym_id}/join-request/` reports whether they may ask and whether a request is already
 *    pending, `POST /gyms/{gym_id}/join-request/` submits one, and `POST /members/requests/{id}/cancel/`
 *    withdraws it. Whether a gym accepts requests at all is its `who_can_send_joining_request` setting.
 *
 *  - **The gym's staff** review them: list / detail need `members:read`, accept / reject need `members:edit`.
 *    These are published twice — `/members/requests/…` (gym from the token, or `?gym_id=`) and
 *    `/gyms/{gym_id}/member-requests/…` (gym in the path) — with identical bodies and responses, so each call
 *    lists both and `firstAvailable` settles on whichever the deployment serves.
 *
 * `POST /members/requests/` and `POST /gyms/{gym_id}/member-requests/` are a second way to *submit*; the first
 * has nowhere to name the gym, so the gym-in-path routes are used for submitting.
 *
 * All of this postdates the committed OpenAPI document, so it goes through `request()` directly rather than
 * the generated client.
 */
import { firstAvailable } from "./fallback";
import { currentGymId, mediaUrl, request } from "./http";

const enc = encodeURIComponent;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// ---------------------------------------------------------------- types

export const REQUEST_STATUSES = ["pending", "accepted", "rejected", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
export const REQUEST_STATUS_TONE: Record<RequestStatus, "amber" | "green" | "red" | "gray"> = {
  pending: "amber",
  accepted: "green",
  rejected: "red",
  cancelled: "gray",
};

export type RequestPlan = { id: string; name: string; price: string; durationValue: number; durationUnit: string; planType: string };

export type MemberRequest = {
  id: string;
  gymId: string;
  gymName: string;
  status: RequestStatus;
  /** What the applicant wrote when asking. */
  notes: string;
  user: { id: string; name: string; firstName: string; lastName: string; email: string; phone: string; avatarUrl: string };
  /** The plan they said they were interested in, if any. */
  plan: RequestPlan | null;
  rejectionReason: string;
  /** The member record created when the request was accepted. */
  createdMemberId: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
};

const asStatus = (v: unknown): RequestStatus =>
  (REQUEST_STATUSES as readonly string[]).includes(str(v).toLowerCase()) ? (str(v).toLowerCase() as RequestStatus) : "pending";

export function requestFromApi(raw: unknown): MemberRequest {
  const o = obj(raw);
  const u = obj(o.user);
  const p = o.interested_plan && typeof o.interested_plan === "object" ? obj(o.interested_plan) : null;
  const first = str(u.first_name);
  const last = str(u.last_name);
  return {
    id: str(o.id),
    gymId: str(o.gym_id),
    gymName: str(o.gym_name),
    status: asStatus(o.status),
    notes: str(o.notes),
    user: {
      id: str(u.id),
      name: `${first} ${last}`.trim() || str(u.email) || "Unknown",
      firstName: first,
      lastName: last,
      email: str(u.email),
      phone: str(u.phone),
      avatarUrl: mediaUrl(str(u.profile_photo_url)),
    },
    plan: p
      ? {
          id: str(p.id),
          name: str(p.name),
          price: str(p.price),
          durationValue: Number(p.duration_value) || 0,
          durationUnit: str(p.duration_unit),
          planType: str(p.plan_type),
        }
      : null,
    rejectionReason: str(o.rejection_reason),
    createdMemberId: str(o.created_member_id),
    reviewedBy: str(o.reviewed_by_name),
    reviewedAt: str(o.reviewed_at),
    createdAt: str(o.created_at),
  };
}

type Envelope = { count?: number; next?: string | null; total_pages?: number; current_page?: number; results?: unknown[] };
export type Page<X> = { rows: X[]; total: number; hasMore: boolean };

/** The schema documents a bare array; the server paginates like everything else. Accept both. */
function pageOf<X>(raw: unknown, page: number, map: (r: unknown) => X): Page<X> {
  const env: Envelope = Array.isArray(raw) ? { results: raw, count: raw.length } : (obj(raw) as Envelope);
  const rows = (env.results ?? []).map(map);
  const hasMore = env.next !== undefined ? !!env.next : (env.total_pages ?? 1) > (env.current_page ?? page);
  return { rows, total: env.count ?? rows.length, hasMore };
}

// ---------------------------------------------------------------- staff side

const gymOrThrow = () => {
  const g = currentGymId();
  if (!g) throw new Error("Choose a gym first.");
  return g;
};

/** Requests sent to the active gym. `status` omitted = every status. Needs `members:read`. */
export function listMemberRequests(opts: { status?: RequestStatus; search?: string; page?: number; pageSize?: number } = {}): Promise<Page<MemberRequest>> {
  const gym = gymOrThrow();
  const page = opts.page ?? 1;
  const q = { status: opts.status, search: opts.search?.trim() || undefined, page, page_size: opts.pageSize ?? 10 };
  return firstAvailable<unknown>("member-requests:list", [
    { path: "GET /members/requests/", call: () => request("GET", "/api/v1/members/requests/", { query: { gym_id: gym, ...q } }) },
    { path: "GET /gyms/{gym_id}/member-requests/", call: () => request("GET", `/api/v1/gyms/${enc(gym)}/member-requests/`, { query: q }) },
  ]).then((raw) => pageOf(raw, page, requestFromApi));
}

/** One request in full — adds the rejection reason and the gym's name to the list row. */
export function getMemberRequest(requestId: string): Promise<MemberRequest> {
  const gym = gymOrThrow();
  return firstAvailable<unknown>("member-requests:get", [
    { path: "GET /members/requests/{id}/", call: () => request("GET", `/api/v1/members/requests/${enc(requestId)}/`, { query: { gym_id: gym } }) },
    { path: "GET /gyms/{gym_id}/member-requests/{id}/", call: () => request("GET", `/api/v1/gyms/${enc(gym)}/member-requests/${enc(requestId)}/`) },
  ]).then(requestFromApi);
}

export const PAYMENT_METHODS = [
  ["cash", "Cash"],
  ["credit_card", "Credit card"],
  ["debit_card", "Debit card"],
  ["bank_transfer", "Bank transfer"],
  ["mobile_pay", "Mobile pay"],
  ["other", "Other"],
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number][0];

/**
 * What accepting may carry. Every field is optional in the schema: the applicant's own account supplies
 * their name and contact details, and the rest describes the membership they are being enrolled on.
 */
export type AcceptInput = {
  planId?: string;
  startDate?: string;
  endDate?: string;
  trainerId?: string;
  payment?: { amount: string; method: PaymentMethod; date: string; notes?: string };
  internalNotes?: string;
};

/** Enrols the applicant as a member. Answers 201 with the new member; 409 if the request is no longer pending. */
export async function acceptMemberRequest(requestId: string, input: AcceptInput): Promise<{ memberId: string }> {
  const gym = gymOrThrow();
  const body = {
    plan_id: input.planId || undefined,
    start_date: input.startDate || undefined,
    end_date: input.endDate || undefined,
    assigned_trainer_id: input.trainerId || undefined,
    initial_payment_amount: input.payment ? input.payment.amount : undefined,
    initial_payment_method: input.payment ? input.payment.method : undefined,
    initial_payment_date: input.payment ? input.payment.date : undefined,
    initial_payment_notes: input.payment?.notes?.trim() || undefined,
    internal_notes: input.internalNotes?.trim() || undefined,
  };
  const raw = await firstAvailable<unknown>("member-requests:accept", [
    { path: "POST /members/requests/{id}/accept/", call: () => request("POST", `/api/v1/members/requests/${enc(requestId)}/accept/`, { body, query: { gym_id: gym } }) },
    { path: "POST /gyms/{gym_id}/member-requests/{id}/accept/", call: () => request("POST", `/api/v1/gyms/${enc(gym)}/member-requests/${enc(requestId)}/accept/`, { body }) },
  ]);
  return { memberId: str(obj(raw).id) };
}

/** Declines a pending request. The reason is optional and is shown to staff on the request afterwards. */
export function rejectMemberRequest(requestId: string, reason?: string): Promise<MemberRequest> {
  const gym = gymOrThrow();
  const body = { rejection_reason: reason?.trim() || undefined };
  return firstAvailable<unknown>("member-requests:reject", [
    { path: "POST /members/requests/{id}/reject/", call: () => request("POST", `/api/v1/members/requests/${enc(requestId)}/reject/`, { body, query: { gym_id: gym } }) },
    { path: "POST /gyms/{gym_id}/member-requests/{id}/reject/", call: () => request("POST", `/api/v1/gyms/${enc(gym)}/member-requests/${enc(requestId)}/reject/`, { body }) },
  ]).then(requestFromApi);
}

/** How many requests are waiting on the active gym — for a badge or a notification. 0 when it can't be read. */
export async function pendingMemberRequestCount(): Promise<number> {
  if (!currentGymId()) return 0;
  try {
    return (await listMemberRequests({ status: "pending", pageSize: 1 })).total;
  } catch {
    return 0;
  }
}

/** Lets a badge elsewhere on the screen refresh when a request is answered. */
export const MEMBER_REQUESTS_EVENT = "manygym:member-requests";
export const memberRequestsChanged = () =>
  typeof window !== "undefined" && window.dispatchEvent(new Event(MEMBER_REQUESTS_EVENT));

// ---------------------------------------------------------------- applicant side

export type JoinStatus = {
  canSend: boolean;
  isMember: boolean;
  hasPending: boolean;
  pendingRequestId: string;
  isBlocked: boolean;
  /** The gym's own setting: `everyone` or `no_one`. */
  whoCanSend: string;
};

/** Where the signed-in person stands with a gym: already a member, already asked, or free to ask. */
export async function joinStatus(gymId: string): Promise<JoinStatus> {
  const o = obj(await request<unknown>("GET", `/api/v1/gyms/${enc(gymId)}/join-request/`));
  return {
    canSend: o.can_send_request === true,
    isMember: o.is_member === true,
    hasPending: o.has_pending_request === true,
    pendingRequestId: str(o.pending_request_id),
    isBlocked: o.is_blocked === true,
    whoCanSend: str(o.who_can_send_joining_request),
  };
}

/** Asks a gym to take the signed-in person on as a member. Both fields are optional. */
export async function submitJoinRequest(gymId: string, input: { planId?: string; notes?: string }): Promise<{ requestId: string; status: string; message: string }> {
  const body = { interested_plan_id: input.planId || undefined, notes: input.notes?.trim() || undefined };
  const raw = obj(
    await firstAvailable<unknown>("member-requests:submit", [
      // Preferred: its response names the new request, which the cancel route needs.
      { path: "POST /gyms/{gym_id}/join-request/", call: () => request("POST", `/api/v1/gyms/${enc(gymId)}/join-request/`, { body }) },
      { path: "POST /gyms/{gym_id}/member-requests/", call: () => request("POST", `/api/v1/gyms/${enc(gymId)}/member-requests/`, { body }) },
    ]),
  );
  return { requestId: str(raw.request_id), status: str(raw.status) || "pending", message: str(raw.message) };
}

/** Withdraws the signed-in person's own pending request. 409 if it has already been answered. */
export const cancelJoinRequest = (requestId: string) =>
  request<{ message?: string }>("POST", `/api/v1/members/requests/${enc(requestId)}/cancel/`);

// ---------------------------------------------------------------- roster & follower block

export type RosterMember = { memberId: string; userId: string; name: string; email: string; avatarUrl: string; joinedAt: string; joiningStatus: string };

/**
 * A gym's active members as its audience sees them. Whether a caller may see it is the gym's
 * `who_can_see_members` setting — a 403 means the list is private to members.
 */
export function gymRoster(gymId: string, opts: { search?: string; page?: number; pageSize?: number } = {}): Promise<Page<RosterMember>> {
  const page = opts.page ?? 1;
  return request<unknown>("GET", `/api/v1/gyms/${enc(gymId)}/members/`, {
    query: { search: opts.search?.trim() || undefined, page, page_size: opts.pageSize ?? 10 },
  }).then((raw) =>
    pageOf(raw, page, (r): RosterMember => {
      const o = obj(r);
      return {
        memberId: str(o.member_id),
        userId: str(o.user_id),
        name: str(o.full_name) || `${str(o.first_name)} ${str(o.last_name)}`.trim() || str(o.email) || "Unknown",
        email: str(o.email),
        avatarUrl: mediaUrl(str(o.avatar_url)),
        joinedAt: str(o.joined_at),
        joiningStatus: str(o.joining_status),
      };
    }),
  );
}

/**
 * Blocks one of the gym's followers: they stop following immediately and land on the gym's blocklist
 * (Settings → Gym → Blocked people, where it can be undone). Needs `gym_profile:edit`.
 */
export const blockGymFollower = (gymId: string, userId: string) =>
  request<{ message?: string }>("POST", `/api/v1/gyms/${enc(gymId)}/followers/${enc(userId)}/block/`);
