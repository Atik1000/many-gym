"use client";

/**
 * The public "About" profile of a person — `GET/PATCH /users/profile/about/` for the signed-in user,
 * `GET /users/{user_id}/profile/about/` for anyone else, and the two sub-collections that have their own
 * routes: `/users/profile/about/educations/` and `/users/profile/about/social-links/`.
 *
 * Hand-written on purpose: these operations are served by the live API but are newer than the committed
 * OpenAPI document that `endpoints.ts` is generated from and checked against, so they call `request()` directly.
 *
 * Two things about the contract worth knowing:
 *  - `PUT /users/profile/about/` is the same resource as PATCH and is not used; PATCH sends only what changed.
 *  - PATCH also accepts `education_list` and `social_links` wholesale, but each has per-record routes, and a
 *    per-record call can't clobber a row someone added from another device — so those are used instead.
 */
import { postFromApi } from "./adapters";
import { request } from "./http";
import type { Post } from "../posts";
import type * as T from "./types";

export const GENDERS = [
  ["male", "Male"],
  ["female", "Female"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;
export type Gender = (typeof GENDERS)[number][0];

export const PLATFORMS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["twitter_x", "Twitter / X"],
  ["linkedin", "LinkedIn"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["github", "GitHub"],
  ["website", "Website"],
  ["other", "Other"],
] as const;
export type Platform = (typeof PLATFORMS)[number][0];
export const platformLabel = (p: string) => PLATFORMS.find(([v]) => v === p)?.[1] ?? "Link";

/** Limits the API enforces; mirrored in the forms so the server is not the first to say so. */
export const LIMITS = { address: 500, homeTown: 255, about: 320, quote: 160, university: 255, subject: 255, link: 1000 } as const;

export interface Education {
  id: string;
  university_name: string;
  /** ISO date (YYYY-MM-DD). */
  from_year: string;
  /** ISO date, or null while still studying. */
  till_year: string | null;
  subject: string;
  graduated: boolean;
}
export type EducationInput = Omit<Education, "id">;

export interface SocialLink {
  id: string;
  platform: Platform;
  link: string;
}
export type SocialLinkInput = Omit<SocialLink, "id">;

export interface PersonalDetails {
  current_address: string | null;
  home_town: string | null;
  date_of_birth: string | null;
  gender: Gender | "" | null;
}

export interface DetailsAboutYou {
  about_you: string | null;
  favourite_quote: string | null;
}

export interface About {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  is_private: boolean;
  personal_details: PersonalDetails;
  education_list: Education[];
  hobbies: string[];
  contact_info: {
    social_links: SocialLink[];
    phone_number: string | null;
    /** The registered account email. Read-only everywhere. */
    email: string;
  };
  details_about_you: DetailsAboutYou;
}

/** What `PATCH /users/profile/about/` is sent from this app: whole sections, never the email. */
export type AboutPatch = {
  personal_details?: Partial<PersonalDetails>;
  details_about_you?: Partial<DetailsAboutYou>;
  hobbies?: string[];
};

const BASE = "/api/v1/users/profile/about";
const enc = encodeURIComponent;

/**
 * The server may omit a section it won't show a visitor, so every section is given a safe empty shape —
 * screens can then test "is there anything here" instead of "does this key exist".
 */
function normalise(raw: unknown): About {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  const list = <X,>(v: unknown) => (Array.isArray(v) ? (v as X[]) : []);
  const personal = obj(o.personal_details);
  const contact = obj(o.contact_info);
  const details = obj(o.details_about_you);
  return {
    user_id: String(o.user_id ?? ""),
    first_name: String(o.first_name ?? ""),
    last_name: String(o.last_name ?? ""),
    avatar_url: text(o.avatar_url),
    is_private: o.is_private === true,
    personal_details: {
      current_address: text(personal.current_address),
      home_town: text(personal.home_town),
      date_of_birth: text(personal.date_of_birth),
      gender: (text(personal.gender) as Gender | null) ?? null,
    },
    education_list: list<Education>(o.education_list),
    hobbies: list<unknown>(o.hobbies).filter((h): h is string => typeof h === "string" && !!h.trim()),
    contact_info: {
      social_links: list<SocialLink>(contact.social_links),
      phone_number: text(contact.phone_number),
      email: String(contact.email ?? ""),
    },
    details_about_you: { about_you: text(details.about_you), favourite_quote: text(details.favourite_quote) },
  };
}

// ---------------------------------------------------------------- about

export const myAbout = async () => normalise(await request<unknown>("GET", `${BASE}/`));

/** Send only the sections that changed; the response is the whole profile. */
export const patchMyAbout = async (patch: AboutPatch) => normalise(await request<unknown>("PATCH", `${BASE}/`, { body: patch }));

/**
 * Someone else's profile. 403 → private (and you don't follow them) or they have blocked you;
 * 404 → no such account; 400 → the account is deactivated.
 */
export const userAbout = async (userId: string, signal?: AbortSignal) =>
  normalise(await request<unknown>("GET", `/api/v1/users/${enc(userId)}/profile/about/`, { signal }));

// ---------------------------------------------------------------- education

export const listEducation = () => request<Education[]>("GET", `${BASE}/educations/`);
export const addEducation = (body: EducationInput) => request<Education>("POST", `${BASE}/educations/`, { body });
export const updateEducation = (id: string, body: Partial<EducationInput>) =>
  request<Education>("PATCH", `${BASE}/educations/${enc(id)}/`, { body });
export const removeEducation = (id: string) => request<unknown>("DELETE", `${BASE}/educations/${enc(id)}/`);

// ---------------------------------------------------------------- social links

export const listSocialLinks = () => request<SocialLink[]>("GET", `${BASE}/social-links/`);
export const addSocialLink = (body: SocialLinkInput) => request<SocialLink>("POST", `${BASE}/social-links/`, { body });
export const updateSocialLink = (id: string, body: Partial<SocialLinkInput>) =>
  request<SocialLink>("PATCH", `${BASE}/social-links/${enc(id)}/`, { body });
export const removeSocialLink = (id: string) => request<unknown>("DELETE", `${BASE}/social-links/${enc(id)}/`);

/** A link people can safely be sent to: http(s) only, so a stored `javascript:` URL can never be rendered as one. */
export function safeLink(link: string): string | null {
  try {
    const url = new URL(link.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- a person's posts

type Envelope = { count?: number; next?: string | null; total_pages?: number; current_page?: number; results?: unknown[] };

/** One page of what a person has posted on their own profile, as far as the viewer is allowed to see it. */
export async function userPosts(userId: string, page = 1): Promise<{ posts: Post[]; hasMore: boolean }> {
  const raw = await request<Envelope | unknown[]>("GET", "/api/v1/posts/", {
    query: { user_id: userId, owner_type: "user", page, page_size: 10 },
  });
  const env: Envelope = Array.isArray(raw) ? { results: raw } : (raw ?? {});
  const posts = (env.results ?? []).map((r) => postFromApi(r as T.GymPostList));
  const hasMore = env.next != null ? !!env.next : (env.total_pages ?? 1) > (env.current_page ?? page);
  return { posts, hasMore: hasMore && posts.length > 0 };
}
