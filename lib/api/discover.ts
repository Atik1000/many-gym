"use client";

/**
 * Gym discovery — `GET /gyms/nearby/` (alias `/gyms/search/`) and `GET /gyms/{id}/public/` (alias
 * `/gyms/{id}/detail/`).
 *
 * Hand-written rather than generated: these routes postdate the committed OpenAPI document that
 * `endpoints.ts` is generated from and checked against. Both are public (auth optional); a signed-in caller
 * additionally gets `is_following` filled in.
 */
import { firstAvailable } from "./fallback";
import { request } from "./http";

/** The API's gym categories, in the order the gym profile lists them. */
export const GYM_CATEGORIES = [
  ["general_fitness_gym", "General Fitness Gym"],
  ["strength_bodybuilding_gym", "Strength & Bodybuilding Gym"],
  ["functional_fitness_gym", "Functional Fitness Gym"],
  ["personal_training_studio", "Personal Training Studio"],
  ["boutique_fitness_studio", "Boutique Fitness Studio"],
  ["boxing_martial_arts_gym", "Boxing & Martial Arts Gym"],
  ["yoga_pilates_studio", "Yoga & Pilates Studio"],
  ["indoor_cycling_studio", "Indoor Cycling Studio"],
  ["sports_performance_centre", "Sports Performance Centre"],
  ["other", "Other"],
] as const;
export type GymCategory = (typeof GYM_CATEGORIES)[number][0];

/** The live-location search radius the product asks for, in kilometres. */
export const NEARBY_RADIUS_KM = 20;

export type PublicGymLocation = {
  id: string;
  address: string;
  /** Decimal strings, 8 places. A gym that never set a location reports "0.00000000" for both. */
  latitude: string;
  longitude: string;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  is_primary: boolean;
  updated_at: string;
};

type GymCore = {
  id: string;
  name: string;
  profile_picture_url: string | null;
  cover_photo_url: string | null;
  short_description: string | null;
  primary_type: string;
  primary_type_display: string;
  secondary_type: string | null;
  secondary_type_display: string | null;
  gender_required: string;
  gender_required_display: string;
  min_age: number;
  timezone: string;
  location: PublicGymLocation | null;
  created_at: string;
};

export type GymSearchItem = GymCore & {
  /** Kilometres from the coordinates searched with; null when the search had none (a city search). */
  distance_km: number | null;
  is_open_now: boolean;
  today_opening_hours: string;
  amenities_preview: string[];
  followers_count: number;
  is_following: boolean;
};

export type GymSearchPage = {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: GymSearchItem[];
};

export type GymSearchQuery = {
  /** Sent together or not at all — the API rejects one without the other. */
  coords?: { latitude: number; longitude: number };
  radius?: number;
  category?: GymCategory | "";
  city?: string;
  search?: string;
  page?: number;
  page_size?: number;
};

export type PublicAmenity = {
  id: string;
  amenity_id: string;
  name: string;
  group_name: string;
  group_display: string;
  is_paid: boolean;
  default_price: string;
};

export type PublicGalleryItem = {
  id: string;
  media_url: string;
  media_type: string;
  category: string;
  category_display: string;
  caption: string | null;
  order_index: number;
  original_url: string | null;
  optimized_url: string | null;
  thumbnail_url: string | null;
  processing_status: string;
};

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  plan_type_display: string;
  price: string;
  duration_value: number;
  duration_unit: string;
  duration_unit_display: string;
  joining_fee: string;
};

export type PublicHours = {
  id: string;
  /** 0 = Sunday … 6 = Saturday. */
  day_of_week: number;
  /** In the guide, but not sent by the live API — derive it from `day_of_week`. */
  day_name?: string;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
};

export type GymPublicDetail = GymCore & {
  owner_public: { id: string; name: string } | null;
  locations: PublicGymLocation[];
  today_status: { is_open_now: boolean; today_hours: string } | null;
  operating_hours: PublicHours[];
  amenities: { free_amenities: PublicAmenity[]; paid_amenities: PublicAmenity[]; total_count: number } | null;
  gallery: PublicGalleryItem[];
  membership_plans: PublicPlan[];
  social: { followers_count: number; members_count: number; is_following: boolean } | null;
};

export function searchGyms(q: GymSearchQuery): Promise<GymSearchPage> {
  const query = {
    latitude: q.coords?.latitude,
    longitude: q.coords?.longitude,
    // A radius only means something alongside coordinates.
    radius: q.coords ? (q.radius ?? NEARBY_RADIUS_KM) : undefined,
    category: q.category || undefined,
    city: q.city?.trim() || undefined,
    search: q.search?.trim() || undefined,
    page: q.page,
    page_size: q.page_size,
  };
  return firstAvailable("gyms:nearby", [
    { path: "GET /gyms/nearby/", call: () => request<GymSearchPage>("GET", `/api/v1/gyms/nearby/`, { query }) },
    { path: "GET /gyms/search/", call: () => request<GymSearchPage>("GET", `/api/v1/gyms/search/`, { query }) },
  ]);
}

export function publicGym(gymId: string): Promise<GymPublicDetail> {
  const id = encodeURIComponent(gymId);
  return firstAvailable("gyms:public", [
    { path: "GET /gyms/{gym_id}/public/", call: () => request<GymPublicDetail>("GET", `/api/v1/gyms/${id}/public/`) },
    { path: "GET /gyms/{gym_id}/detail/", call: () => request<GymPublicDetail>("GET", `/api/v1/gyms/${id}/detail/`) },
  ]);
}

/** True when a location carries real coordinates rather than the "never set" 0,0 placeholder. */
export const hasCoordinates = (l: Pick<PublicGymLocation, "latitude" | "longitude"> | null | undefined) => {
  if (!l) return false;
  const lat = Number(l.latitude);
  const lon = Number(l.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0);
};

/** A plain maps link for a location — no SDK, just a URL the browser or phone opens in its maps app. */
export const mapsLink = (l: Pick<PublicGymLocation, "latitude" | "longitude">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(l.latitude)},${Number(l.longitude)}`)}`;

/** "House 12, Dhanmondi, Dhaka" — skipping the placeholder the API stores for a gym with no address. */
export function placeLine(l: PublicGymLocation | null | undefined): string {
  if (!l) return "";
  const address = /^unspecified location$/i.test((l.address ?? "").trim()) ? "" : l.address;
  return [address, l.city, l.country].map((s) => (s ?? "").trim()).filter(Boolean).join(", ");
}
