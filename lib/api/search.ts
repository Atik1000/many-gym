"use client";

/**
 * Central search — `GET /api/v1/search/`.
 *
 * Hand-written: the route postdates the committed OpenAPI document. Auth is required (401 without a token).
 *
 * Two shapes from one route:
 *   filter=all             → `{ query, filter, counts, results: { gyms, people, posts, membership_plans, amenities } }`,
 *                            each list capped by `limit` (1–20, default 5). Used by the search bar preview and
 *                            the "All" tab.
 *   filter=gym | people …  → the paginated envelope (`count`, `total_pages`, `current_page`, `next`, `previous`,
 *                            `results[]`) plus the same `counts`, so a results page can label every tab from
 *                            whichever tab it is on.
 *
 * The screens only expose gyms and people for now; the other three categories are typed so the "all" payload
 * is described in full and a tab can be added without touching this file.
 */
import { request } from "./http";
import type { GymCategory, GymSearchItem } from "./discover";

export type SearchFilter = "all" | "gym" | "people" | "post" | "plan" | "amenity";
export type GenderRequired = "everyone" | "women_only" | "men_only";
export type PersonGender = "male" | "female" | "other" | "prefer_not_to_say";

export const GENDER_REQUIRED: [GenderRequired, string][] = [
  ["everyone", "Everyone"],
  ["women_only", "Women only"],
  ["men_only", "Men only"],
];
export const PERSON_GENDERS: [PersonGender, string][] = [
  ["male", "Male"],
  ["female", "Female"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
];

export type SearchCounts = { gyms: number; people: number; posts: number; membership_plans: number; amenities: number; total: number };

/** The gym row is the same one `/gyms/nearby/` returns. */
export type SearchGym = GymSearchItem;

export type SearchPerson = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  is_private: boolean;
  /** These three are null for a private account the viewer doesn't follow. */
  city: string | null;
  home_town: string | null;
  about_you: string | null;
  followers_count: number;
  is_following: boolean;
  has_pending_follow_request: boolean;
};

export type SearchPost = {
  id: string;
  owner_type: "user" | "gym";
  gym_id: string | null;
  gym_name: string | null;
  author_user_id: string;
  author_name: string;
  author_avatar_url: string | null;
  content_text: string | null;
  is_repost: boolean;
  published_at: string;
  [k: string]: unknown;
};

export type SearchPlan = {
  id: string;
  gym_id: string;
  gym_name: string;
  name: string;
  plan_type: string;
  plan_type_display: string;
  price: string;
  duration_display: string;
  city: string | null;
  [k: string]: unknown;
};

export type SearchAmenity = {
  id: string;
  amenity_id: string;
  name: string;
  group_name: string;
  group_display: string;
  is_paid: boolean;
  default_price: string;
  gym_id: string;
  gym_name: string;
  city: string | null;
  [k: string]: unknown;
};

export type SearchOverview = {
  query: string;
  filter: "all";
  counts: SearchCounts;
  results: { gyms: SearchGym[]; people: SearchPerson[]; posts: SearchPost[]; membership_plans: SearchPlan[]; amenities: SearchAmenity[] };
};

export type SearchPage<T> = {
  query: string;
  filter: Exclude<SearchFilter, "all">;
  counts: SearchCounts;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Filters that only narrow gyms. `city` applies to people too, so it lives on the shared query. */
export type GymFilters = {
  gym_category?: GymCategory | "";
  gender_required?: GenderRequired | "";
  /** Sent together or not at all — the API rejects one without the other. */
  coords?: { latitude: number; longitude: number } | null;
  radius?: number;
};
export type PeopleFilters = { gender?: PersonGender | ""; is_following?: boolean | null };

export type SearchQuery = { q: string; city?: string } & GymFilters & PeopleFilters;

export const SEARCH_MAX_LENGTH = 255;

const EMPTY_COUNTS: SearchCounts = { gyms: 0, people: 0, posts: 0, membership_plans: 0, amenities: 0, total: 0 };

/** Query parameters for the route, dropping anything unset so the server applies its own defaults. */
function params(s: SearchQuery) {
  return {
    q: s.q.trim().slice(0, SEARCH_MAX_LENGTH) || undefined,
    city: s.city?.trim() || undefined,
    gym_category: s.gym_category || undefined,
    gender_required: s.gender_required || undefined,
    latitude: s.coords?.latitude,
    longitude: s.coords?.longitude,
    radius: s.coords ? s.radius : undefined,
    gender: s.gender || undefined,
    is_following: typeof s.is_following === "boolean" ? s.is_following : undefined,
  };
}

/** Grouped top hits across every category — the search bar preview and the "All" tab. */
export async function searchAll(s: SearchQuery, limit = 5, signal?: AbortSignal): Promise<SearchOverview> {
  const r = await request<SearchOverview>("GET", "/api/v1/search/", { query: { ...params(s), filter: "all", limit }, signal });
  const g = r.results ?? ({} as Partial<SearchOverview["results"]>);
  return {
    ...r,
    counts: { ...EMPTY_COUNTS, ...r.counts },
    results: { gyms: g.gyms ?? [], people: g.people ?? [], posts: g.posts ?? [], membership_plans: g.membership_plans ?? [], amenities: g.amenities ?? [] },
  };
}

type PageFilter = "gym" | "people";
type ItemOf<F extends PageFilter> = F extends "gym" ? SearchGym : SearchPerson;

/** One page of a single category — a tab on the dedicated results page. */
export async function searchPage<F extends PageFilter>(filter: F, s: SearchQuery, page = 1, pageSize = 20, signal?: AbortSignal): Promise<SearchPage<ItemOf<F>>> {
  const r = await request<SearchPage<ItemOf<F>>>("GET", "/api/v1/search/", { query: { ...params(s), filter, page, page_size: pageSize }, signal });
  return { ...r, counts: { ...EMPTY_COUNTS, ...r.counts }, results: r.results ?? [] };
}

/** Where a person's follow button should start, from what the search row says. */
export const personFollowState = (p: Pick<SearchPerson, "is_following" | "has_pending_follow_request">) =>
  p.is_following ? ("following" as const) : p.has_pending_follow_request ? ("pending" as const) : ("none" as const);

/** The results page URL for a term (and optionally a tab). */
export function searchHref(q: string, tab?: "all" | "gyms" | "people") {
  const sp = new URLSearchParams();
  if (q.trim()) sp.set("q", q.trim());
  if (tab && tab !== "all") sp.set("tab", tab);
  const s = sp.toString();
  return s ? `/search?${s}` : "/search";
}
