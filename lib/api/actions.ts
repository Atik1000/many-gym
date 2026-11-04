"use client";

/**
 * Explicit domain operations.
 *
 * `writeResource` in `lib/api.ts` diffs a changed list into create/update/delete calls, which is right for
 * plain records — but a lot of this API's work happens on sub-resources with endpoints of their own: a payment
 * is `POST /members/subscriptions/{id}/payments/`, pausing a membership is a status transition, a lead note is
 * `POST /leads/{id}/notes/`. None of those fields exist on the parent's PATCH body, so routing them through the
 * diff would send a request the server quietly ignores.
 *
 * Every function here returns `null` on success or a message to show the person, and invalidates whatever
 * caches it touched so the screen refetches the server's version.
 */
import { ApiError, request } from "./http";
import { invalidateRecord, refreshResource } from "../api";
import { leads, members, people, plans, posts, roles, routines } from "./adapters";
import * as api from "./endpoints";
import type * as T from "./types";
import { MEMBERS_KEY } from "../members";
import { LEADS_KEY } from "../leads";
import { PEOPLE_KEY, ROLES_KEY } from "../people";
import type { Routine } from "../routines";

const fail = (e: unknown, fallback: string): string =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

async function run(fn: () => Promise<unknown>, fallback: string, after?: () => void): Promise<string | null> {
  try {
    await fn();
    after?.();
    return null;
  } catch (e) {
    return fail(e, fallback);
  }
}

/** The payment methods the UI offers, mapped to the API's enum. */
const PAYMENT_METHOD: Record<string, T.PaymentMethodEnum> = {
  Cash: "cash",
  Card: "credit_card",
  "Bank transfer": "bank_transfer",
  // The API's enum has no direct-debit member, so it is recorded as a bank transfer.
  "Direct debit": "bank_transfer",
  Other: "other",
};
export const apiPaymentMethod = (uiMethod: string): T.PaymentMethodEnum => PAYMENT_METHOD[uiMethod] ?? "other";

// ---------------------------------------------------------------- members

export const memberActions = {
  /** `POST /members/subscriptions/{id}/payments/` */
  logPayment: (memberId: string, subscriptionId: string, amount: number, uiMethod: string, date: string, notes?: string) =>
    run(
      () =>
        api.membersSubscriptionsPaymentsCreate(subscriptionId, {
          amount: amount.toFixed(2),
          payment_method: apiPaymentMethod(uiMethod),
          payment_date: date || undefined,
          notes: notes || undefined,
        }),
      "Couldn't record that payment.",
      () => invalidateRecord(MEMBERS_KEY, memberId),
    ),

  /** `POST /members/{id}/subscriptions/` — renewing or attaching a plan. */
  addSubscription: (
    memberId: string,
    body: { planId: string; start?: string; end?: string; amenityIds?: string[]; payAmount?: number; payMethod?: string; payDate?: string },
  ) =>
    run(
      () =>
        api.membersSubscriptionsCreate(memberId, {
          plan_id: body.planId,
          start_date: body.start || undefined,
          end_date: body.end || undefined,
          extra_amenity_ids: body.amenityIds?.length ? body.amenityIds : undefined,
          initial_payment_amount: body.payAmount ? body.payAmount.toFixed(2) : undefined,
          initial_payment_method: body.payMethod ? apiPaymentMethod(body.payMethod) : undefined,
          initial_payment_date: body.payDate || undefined,
        }),
      "Couldn't add that membership.",
      () => {
        invalidateRecord(MEMBERS_KEY, memberId);
        void refreshResource(MEMBERS_KEY);
      },
    ),

  /** `PATCH /members/subscriptions/{id}/status/` — pause, resume, cancel. */
  setSubscriptionStatus: (memberId: string, subscriptionId: string, status: T.MembershipStatusEnum) =>
    run(
      () => api.membersSubscriptionsStatusPartialUpdate(subscriptionId, { membership_status: status }),
      "Couldn't change the membership status.",
      () => {
        invalidateRecord(MEMBERS_KEY, memberId);
        void refreshResource(MEMBERS_KEY);
      },
    ),

  /** `POST /members/subscriptions/{id}/extra-amenities/` */
  addExtraAmenities: (memberId: string, subscriptionId: string, amenity_ids: string[]) =>
    run(
      () => api.membersSubscriptionsExtraAmenitiesCreate(subscriptionId, { amenity_ids }),
      "Couldn't attach those amenities.",
      () => invalidateRecord(MEMBERS_KEY, memberId),
    ),

  /** `POST /members/{id}/routines/assign/` from a template. */
  assignTemplate: (memberId: string, templateId: string, name: string) =>
    run(() => members.assignTemplate(memberId, templateId, name), "Couldn't assign that routine.", () =>
      invalidateRecord(MEMBERS_KEY, memberId),
    ),

  /** `POST /members/{id}/routines/assign/` with days written inline (a custom routine, no template). */
  assignCustomRoutine: (memberId: string, r: Routine) =>
    run(
      () => api.membersRoutinesAssignCreate(memberId, { routine_name: r.name, ...buildRoutineBody(r) }),
      "Couldn't create that routine.",
      () => invalidateRecord(MEMBERS_KEY, memberId),
    ),

  /** `PATCH /members/{id}/routines/{routineId}/` */
  saveRoutine: (memberId: string, routineId: string, r: Routine) =>
    run(() => members.saveRoutine(memberId, routineId, r), "Couldn't save that routine.", () =>
      invalidateRecord(MEMBERS_KEY, memberId),
    ),

  /** Deactivating is the closest the API offers to "remove this member's routine". */
  deactivateRoutine: (memberId: string, routineId: string) =>
    run(
      () => api.membersRoutinesPartialUpdate(memberId, routineId, { is_active: false }),
      "Couldn't remove that routine.",
      () => invalidateRecord(MEMBERS_KEY, memberId),
    ),

  setTrainer: (memberId: string, trainerId: string) =>
    run(
      () => api.membersPartialUpdate(memberId, { assigned_trainer_id: trainerId || undefined }),
      "Couldn't change the trainer.",
      () => {
        invalidateRecord(MEMBERS_KEY, memberId);
        void refreshResource(MEMBERS_KEY);
      },
    ),

  resendInvitation: (memberId: string) =>
    run(() => members.resendInvite(memberId), "Couldn't resend the invitation."),
};

/** Shared by the two routine-writing endpoints. */
function buildRoutineBody(r: Routine) {
  const body = routines.toRequest(r);
  return { routine_format: body.routine_format, level: body.level, notes: body.notes, days: body.days };
}

// ---------------------------------------------------------------- leads

export const leadActions = {
  /** `POST /leads/{id}/notes/` — notes are append-only; the API has no edit or delete for them. */
  addNote: (leadId: string, text: string) =>
    run(() => leads.addNote(leadId, text), "Couldn't add that note.", () => invalidateRecord(LEADS_KEY, leadId)),

  /** `POST /leads/{id}/next-moves/` */
  addNextMove: (leadId: string, date: string, description: string) =>
    run(() => leads.addNextMove(leadId, date, description), "Couldn't schedule that next move.", () =>
      invalidateRecord(LEADS_KEY, leadId),
    ),

  /** `PATCH /leads/{id}/next-moves/{moveId}/` */
  updateNextMove: (leadId: string, moveId: string, patch: { date?: string; description?: string; done?: boolean }) =>
    run(
      () =>
        leads.updateNextMove(leadId, moveId, {
          scheduled_date: patch.date,
          short_description: patch.description,
          is_completed: patch.done,
        }),
      "Couldn't update that next move.",
      () => invalidateRecord(LEADS_KEY, leadId),
    ),

  /** `POST /leads/{id}/convert/` — creates the member and links it back to the lead. */
  convert: (
    leadId: string,
    body: { planId?: string; start?: string; end?: string; payAmount?: number; payMethod?: string },
  ) =>
    run(
      () =>
        leads.convert(leadId, {
          plan_id: body.planId || undefined,
          start_date: body.start || undefined,
          end_date: body.end || undefined,
          initial_payment_amount: body.payAmount ? body.payAmount.toFixed(2) : undefined,
          initial_payment_method: body.payMethod ? apiPaymentMethod(body.payMethod) : undefined,
        }),
      "Couldn't convert that lead.",
      () => {
        invalidateRecord(LEADS_KEY, leadId);
        void refreshResource(LEADS_KEY);
        void refreshResource(MEMBERS_KEY);
      },
    ),

  addLostReason: (reason: string) =>
    run(() => leads.addReason(reason), "Couldn't add that reason.", () => void refreshResource("leadReasons")),
};

// ---------------------------------------------------------------- plans

export const planActions = {
  /** `POST /plans/{id}/status/` — draft → active → archived. */
  setStatus: (planId: string, status: "draft" | "active" | "archived") =>
    run(() => plans.setStatus(planId, status), "Couldn't change the plan status.", () => {
      invalidateRecord("plans", planId);
      void refreshResource("plans");
    }),

  /** `PUT /plans/{id}/amenities/` — the plan PATCH body can't carry amenities. */
  syncAmenities: (planId: string, amenityIds: string[]) =>
    run(() => plans.syncAmenities(planId, amenityIds), "Couldn't save the plan's amenities.", () =>
      invalidateRecord("plans", planId),
    ),
};

// ---------------------------------------------------------------- people & roles

export const peopleActions = {
  invite: (email: string, roleId: string) =>
    run(() => people.invite(email, roleId), "Couldn't send that invitation.", () => void refreshResource(PEOPLE_KEY)),

  /** `PATCH /access-control/staff/{id}/` — active / inactive / invited. */
  setStatus: (assignmentId: string, status: T.Status684Enum) =>
    run(() => people.setStatus(assignmentId, status), "Couldn't change that person's status.", () =>
      void refreshResource(PEOPLE_KEY),
    ),

  revoke: (assignmentId: string) =>
    run(() => people.revoke(assignmentId), "Couldn't remove that person.", () => void refreshResource(PEOPLE_KEY)),
};

export const roleActions = {
  create: (name: string, description: string, permissionIds: string[]) =>
    run(() => roles.create(name, description, permissionIds), "Couldn't create that role.", () =>
      void refreshResource(ROLES_KEY),
    ),

  /** Permissions are set by id, so a role editor needs `GET /access-control/permissions/` first. */
  update: (roleId: string, patch: { name?: string; description?: string; permissionIds?: string[] }) =>
    run(
      () =>
        roles.update(roleId, {
          name: patch.name,
          description: patch.description,
          permission_ids: patch.permissionIds,
        }),
      "Couldn't save that role.",
      () => void refreshResource(ROLES_KEY),
    ),

  remove: (roleId: string) =>
    run(() => roles.remove(roleId), "Couldn't delete that role.", () => void refreshResource(ROLES_KEY)),

  permissions: () => api.accessControlPermissionsRetrieve(),
};

// ---------------------------------------------------------------- community feed

export const postActions = {
  create: (text: string, membersOnly: boolean, media: { url: string; kind: "image" | "video" }[]) =>
    run(
      () =>
        api.postsCreate(
          {
            content_text: text || undefined,
            privacy: membersOnly ? "members_only" : "public",
            media_items: media.length
              ? media
                  .filter((m) => !m.url.startsWith("data:") && !m.url.startsWith("blob:"))
                  .map((m, i) => ({ media_url: m.url, media_type: m.kind === "video" ? "video" : "picture", order_index: i }))
              : undefined,
          },
          { gym_id: undefined },
        ),
      "Couldn't publish that post.",
      () => void refreshResource("posts"),
    ),

  update: (postId: string, text: string, membersOnly: boolean) =>
    run(
      () => posts.update({ id: postId, text, members: membersOnly } as never),
      "Couldn't save that post.",
      () => void refreshResource("posts"),
    ),

  remove: (postId: string) =>
    run(() => posts.remove(postId), "Couldn't delete that post.", () => void refreshResource("posts")),

  /**
   * `PATCH /posts/{id}/media/{mediaId}/thumbnail/` — a custom poster frame for a video.
   *
   * This is the only endpoint in the API that takes a real file: it expects `thumbnail_image` as
   * multipart/form-data (≤10MB, JPEG/PNG/WebP/…), not a URL like every other media field.
   */
  setVideoThumbnail: (postId: string, mediaId: string, file: File) => {
    const form = new FormData();
    form.append("thumbnail_image", file);
    return run(
      () =>
        request<unknown>(
          "PATCH",
          `/api/v1/posts/${encodeURIComponent(postId)}/media/${encodeURIComponent(mediaId)}/thumbnail/`,
          { form },
        ),
      "Couldn't set that thumbnail.",
      () => void refreshResource("posts"),
    );
  },
};
