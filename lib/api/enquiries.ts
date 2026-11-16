"use client";

/**
 * The Enquiry CRM — `/api/v1/enquiries/`.
 *
 * Hand-written on purpose. `endpoints.ts` and `types.ts` are generated from the committed OpenAPI document,
 * which predates this module; the live server already serves it. Until the spec is regenerated these calls go
 * through `request()` directly, and the wire types below are transcribed from the live schema
 * (`EnquiryDetail`, `EnquiryCreateRequest`, `PatchedEnquiryUpdateRequest`, `EnquiryAddNoteRequest`).
 */
import { ApiError, currentGymId, mediaUrl, request } from "./http";
import { collect } from "./adapters";
import {
  ENQUIRY_STATUSES, ENQUIRY_TYPES,
  type Enquiry, type EnquiryStatus, type EnquiryType, type EnquiryUser,
} from "../enquiries";

// ---------------------------------------------------------------- wire format

type WireUser = {
  user_id?: string; email?: string; first_name?: string; last_name?: string; full_name?: string;
  avatar_url?: string | null; phone?: string | null;
};

/** `EnquiryList` and `EnquiryDetail` differ only by `gym_name`, so one type covers both. */
type WireEnquiry = {
  id: string;
  gym_id: string;
  gym_name?: string;
  manygym_user: WireUser | null;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  type: string;
  status: string;
  summary?: string | null;
  /** Declared without an item type; observed as plain strings, but tolerate `{text|note}` objects. */
  notes?: unknown[];
  notes_count?: number;
  created_at: string;
  updated_at: string;
};

type WireWrite = {
  gym_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  type?: EnquiryType;
  status?: EnquiryStatus;
  summary?: string;
  /** On PATCH this is a full replacement of the list. */
  notes?: string[];
};

// ---------------------------------------------------------------- mapping

const str = (v: unknown) => (v == null ? "" : String(v));

const noteText = (n: unknown): string => {
  if (typeof n === "string") return n;
  const o = (n ?? {}) as Record<string, unknown>;
  return str(o.text ?? o.note ?? o.note_text ?? o.content);
};

const userFromApi = (u: WireUser | null | undefined): EnquiryUser | null =>
  u && u.user_id
    ? {
        id: str(u.user_id),
        name: str(u.full_name) || `${str(u.first_name)} ${str(u.last_name)}`.trim(),
        email: str(u.email),
        phone: str(u.phone),
        avatar: u.avatar_url ? mediaUrl(u.avatar_url) : "",
      }
    : null;

const oneOf = <X extends string>(all: readonly X[], v: unknown, fallback: X): X =>
  (all as readonly string[]).includes(str(v)) ? (v as X) : fallback;

export const enquiryFromApi = (e: WireEnquiry): Enquiry => ({
  id: str(e.id),
  firstName: str(e.first_name),
  lastName: str(e.last_name),
  email: str(e.email),
  phone: str(e.phone),
  type: oneOf(ENQUIRY_TYPES, e.type, "GENERAL_INQUIRY"),
  status: oneOf(ENQUIRY_STATUSES, e.status, "NEW"),
  summary: str(e.summary),
  notes: (e.notes ?? []).map(noteText).filter(Boolean),
  user: userFromApi(e.manygym_user),
  gymName: str(e.gym_name),
  createdAt: str(e.created_at),
  updatedAt: str(e.updated_at),
});

const fields = (e: Enquiry): WireWrite => ({
  first_name: e.firstName.trim(),
  last_name: e.lastName.trim(),
  type: e.type,
  status: e.status,
  summary: e.summary.trim(),
});

// ---------------------------------------------------------------- calls

const BASE = "/api/v1/enquiries/";
const one = (id: string) => `${BASE}${encodeURIComponent(id)}/`;

export const enquiries = {
  /** Every enquiry of the gym the token is scoped to. Filtering and search happen client-side, like leads. */
  list: async (): Promise<Enquiry[]> =>
    (await collect<WireEnquiry>((q) => request("GET", BASE, { query: { gym_id: currentGymId(), ...q } }))).map(enquiryFromApi),

  get: async (id: string): Promise<Enquiry> => enquiryFromApi(await request<WireEnquiry>("GET", one(id))),

  /** `gym_id` is mandatory in the body — unlike most create routes here, the token's gym context isn't enough. */
  create: async (e: Enquiry): Promise<Enquiry> => {
    const gym_id = currentGymId();
    if (!gym_id) throw new ApiError(400, "NO_GYM", "Choose a gym before adding an enquiry.");
    const body: WireWrite = {
      gym_id,
      ...fields(e),
      // Omitted rather than sent empty: the server treats "" as a value and fails the email format check.
      ...(e.email.trim() ? { email: e.email.trim() } : {}),
      ...(e.phone.trim() ? { phone: e.phone.trim() } : {}),
      ...(e.notes.length ? { notes: e.notes } : {}),
    };
    return enquiryFromApi(await request<WireEnquiry>("POST", BASE, { body }));
  },

  /**
   * PATCH. `notes` is a full replacement, so it is only sent when the list actually changed — otherwise a note
   * a colleague added since this record was loaded would be silently dropped.
   */
  update: async (e: Enquiry, before?: Enquiry): Promise<Enquiry> => {
    const body: WireWrite = {
      ...fields(e),
      email: e.email.trim() || null, // null clears it; the server still insists one of the two remains
      phone: e.phone.trim() || null,
      ...(!before || JSON.stringify(before.notes) !== JSON.stringify(e.notes) ? { notes: e.notes } : {}),
    };
    return enquiryFromApi(await request<WireEnquiry>("PATCH", one(e.id), { body }));
  },

  remove: (id: string) => request<{ message?: string }>("DELETE", one(id)),

  /** `POST /enquiries/{id}/notes/` — appends one note and returns the whole enquiry. */
  addNote: async (id: string, note: string): Promise<Enquiry> =>
    enquiryFromApi(await request<WireEnquiry>("POST", `${one(id)}notes/`, { body: { note } })),
};

// ---------------------------------------------------------------- errors

const FORM_FIELD: Record<string, string> = {
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  phone: "phone",
  type: "type",
  status: "status",
  summary: "summary",
  notes: "notes",
};

/**
 * Turns a failed save into the form's error map: the API's field names become the form's, and anything that
 * isn't about one field (`non_field_errors`, `gym_id`, a 403) lands on `form`.
 */
export function enquiryErrors(err: unknown, fallback: string): Record<string, string> {
  if (!(err instanceof ApiError)) return { form: fallback };
  const out: Record<string, string> = {};
  for (const [k, msg] of Object.entries(err.fieldErrors())) {
    if (FORM_FIELD[k]) out[FORM_FIELD[k]] = msg;
    else if (k === "non_field_errors" && /email|phone/i.test(msg)) out.contact = msg;
    else out.form = out.form ? `${out.form} ${msg}` : msg;
  }
  return Object.keys(out).length ? out : { form: err.message || fallback };
}
