"use client";

/**
 * Find Gyms — `GET /gyms/nearby/`.
 *
 * Two ways to say where: the browser's live location (a 20 km radius around it) or a city name. The location
 * is only ever requested when the person presses Search with "Near me" chosen — never on page load — and the
 * coordinates are used for that search and not stored.
 */
import Link from "next/link";
import { useState } from "react";
import { LuBuilding2, LuChevronRight, LuLocateFixed, LuMapPin, LuSearch, LuUsers } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, EmptyState, Pagination, Pill, Select } from "@/components/ui/parts";
import { ApiError, mediaUrl } from "@/lib/api/http";
import { GYM_CATEGORIES, NEARBY_RADIUS_KM, placeLine, searchGyms, type GymCategory, type GymSearchItem, type GymSearchPage, type GymSearchQuery } from "@/lib/api/discover";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";
import FollowGymButton from "./FollowGymButton";

const PAGE_SIZE = 10;
type Area = "near" | "city";
export type LocationProblem = "denied" | "unavailable" | "timeout" | "unsupported";

export const LOCATION_MESSAGE: Record<LocationProblem, string> = {
  denied: "Location access was declined, so we can't search around you. You can allow it in your browser's site settings, or search by city instead.",
  unavailable: "Your device couldn't work out where you are right now. Try again in a moment, or search by city instead.",
  timeout: "Finding your location took too long. Try again, or search by city instead.",
  unsupported: "This browser can't share a location here (it needs a secure https page and location support). Search by city instead.",
};

/** Asks the browser for the current position. Rejects with a `LocationProblem`. */
export function locate(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) {
      reject("unsupported" satisfies LocationProblem);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject((e.code === e.PERMISSION_DENIED ? "denied" : e.code === e.TIMEOUT ? "timeout" : "unavailable") satisfies LocationProblem),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** The API's validation message for a bad coordinate pair, in words a person can act on. */
function readableError(e: unknown): string {
  if (!(e instanceof ApiError)) return "Couldn't search for gyms. Try again.";
  const fields = e.fieldErrors();
  if (fields.coordinates || fields.latitude || fields.longitude) return "We couldn't use that location for the search. Try again, or search by city instead.";
  if (fields.radius) return "That search distance isn't allowed.";
  if (fields.city) return `City: ${fields.city}`;
  if (fields.category) return `Category: ${fields.category}`;
  return e.message;
}

const distance = (km: number) => (km < 1 ? `${Math.max(Math.round(km * 1000 / 50) * 50, 50)} m away` : `${km.toFixed(km < 10 ? 1 : 0)} km away`);

export function GymCard({ gym, onFollow }: { gym: GymSearchItem; onFollow: (following: boolean) => void }) {
  const href = `/gyms/${gym.id}`;
  const place = placeLine(gym.location);
  return (
    <li className={`${card} flex flex-col gap-4 p-4 sm:flex-row sm:items-start`}>
      <Link href={href} className="shrink-0" aria-hidden tabIndex={-1}><Avatar name={gym.name} size={64} src={mediaUrl(gym.profile_picture_url)} /></Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="group inline-flex max-w-full items-center gap-1 text-lg font-bold hover:text-primary">
          <span className="truncate">{gym.name}</span><LuChevronRight size={18} className="shrink-0 text-muted group-hover:text-primary" />
        </Link>
        <p className="text-muted">{[gym.primary_type_display, gym.secondary_type_display].filter(Boolean).join(" · ")}</p>
        {(place || gym.distance_km !== null) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-muted">
            <LuMapPin size={15} className="shrink-0" />
            {place && <span>{place}</span>}
            {gym.distance_km !== null && <b className="font-semibold text-foreground">{place && "· "}{distance(gym.distance_km)}</b>}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Pill tone={gym.is_open_now ? "green" : "gray"}>{gym.is_open_now ? "Open now" : "Closed now"}</Pill>
          {gym.today_opening_hours && <span className="text-[13px] text-muted">Today: {gym.today_opening_hours}</span>}
          <span className="inline-flex items-center gap-1 text-[13px] text-muted"><LuUsers size={14} />{gym.followers_count} follower{gym.followers_count === 1 ? "" : "s"}</span>
        </div>
        {gym.amenities_preview.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Amenities">
            {gym.amenities_preview.slice(0, 5).map((a) => <li key={a} className="rounded-full bg-background px-2.5 py-0.5 text-[13px] text-muted">{a}</li>)}
          </ul>
        )}
      </div>
      <div className="shrink-0"><FollowGymButton gymId={gym.id} name={gym.name} following={gym.is_following} onChange={onFollow} /></div>
    </li>
  );
}

export default function FindGyms() {
  const [category, setCategory] = useState<GymCategory | "">("");
  const [area, setArea] = useState<Area>("near");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [formError, setFormError] = useState("");
  const [locationProblem, setLocationProblem] = useState<LocationProblem | null>(null);
  const [busy, setBusy] = useState<"locating" | "searching" | null>(null);
  const [error, setError] = useState("");
  /** The search that produced `page` — paging re-runs exactly this, so it keeps the same coordinates. */
  const [ran, setRan] = useState<{ query: GymSearchQuery; area: Area; city: string } | null>(null);
  const [page, setPage] = useState<GymSearchPage | null>(null);

  const run = async (query: GymSearchQuery, meta: { area: Area; city: string }) => {
    setBusy("searching");
    setError("");
    try {
      const result = await searchGyms(query);
      setPage({ ...result, results: result.results ?? [] });
      setRan({ query, ...meta });
    } catch (e) {
      setError(readableError(e));
      setPage(null);
      setRan(null);
    } finally {
      setBusy(null);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLocationProblem(null);
    const base = { category, search: keyword, page: 1, page_size: PAGE_SIZE };
    if (area === "city") {
      const c = city.trim();
      // A gym with no city on file can only be found by name, so a keyword alone is a valid search.
      if (!c && !keyword.trim()) return setFormError("Enter a city or a keyword");
      return run({ ...base, ...(c ? { city: c } : {}) }, { area, city: c });
    }
    setBusy("locating");
    let coords: { latitude: number; longitude: number };
    try {
      coords = await locate();
    } catch (problem) {
      setBusy(null);
      setLocationProblem(problem as LocationProblem);
      return;
    }
    return run({ ...base, coords, radius: NEARBY_RADIUS_KM }, { area, city: "" });
  };

  const useCityInstead = () => { setArea("city"); setLocationProblem(null); };
  const setFollowing = (id: string, following: boolean) =>
    setPage((p) => p && { ...p, results: p.results.map((g) => (g.id === id ? { ...g, is_following: following, followers_count: Math.max(0, g.followers_count + (following === g.is_following ? 0 : following ? 1 : -1)) } : g)) });

  const areaBtn = (a: Area, text: string, Icon: typeof LuMapPin) => (
    <button type="button" role="radio" aria-checked={area === a} onClick={() => { setArea(a); setFormError(""); setLocationProblem(null); }}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold ${area === a ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"}`}>
      <Icon size={17} />{text}
    </button>
  );

  return (
    <div className="mx-auto grid max-w-[920px] gap-5">
      <form onSubmit={search} className={`${card} p-5`} noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="gcat" className={label}>Gym category</label>
            <Select id="gcat" value={category} onChange={(e) => setCategory(e.target.value as GymCategory | "")}>
              <option value="">Any category</option>
              {GYM_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="gkw" className={label}>Keyword <span className="font-normal text-muted">(optional)</span></label>
            <input id="gkw" className={input} maxLength={255} placeholder="Gym name, address…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <span id="garea" className={label}>Area</span>
            <div role="radiogroup" aria-labelledby="garea" className="flex gap-1 rounded-xl border border-line bg-background p-1">
              {areaBtn("near", "Near me", LuLocateFixed)}
              {areaBtn("city", "City", LuBuilding2)}
            </div>
            {area === "near" ? (
              <p className={hint}>When you press Search, your browser will ask to share your location. We use it once to find gyms within {NEARBY_RADIUS_KM} km of you and don&apos;t save it.</p>
            ) : (
              <div className="mt-3">
                <label htmlFor="gcity" className={label}>City <span className="font-normal text-muted">(or search by keyword alone)</span></label>
                <input id="gcity" className={input} maxLength={100} placeholder="e.g. Dhaka" value={city} onChange={(e) => { setCity(e.target.value); setFormError(""); }} aria-invalid={!!formError} />
                {formError && <p role="alert" className={errorText}>{formError}</p>}
              </div>
            )}
          </div>
        </div>
        {locationProblem && (
          <div role="alert" className="mt-4 rounded-xl bg-warn-bg px-4 py-3 text-warn">
            <p>{LOCATION_MESSAGE[locationProblem]}</p>
            <button type="button" className="mt-1.5 font-semibold underline" onClick={useCityInstead}>Search by city</button>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <MotionButton type="submit" className={btnPrimary} disabled={busy !== null}>
            <LuSearch size={17} />{busy === "locating" ? "Getting your location…" : busy === "searching" ? "Searching…" : "Search"}
          </MotionButton>
        </div>
      </form>

      <section aria-live="polite" aria-busy={busy !== null}>
        {error ? (
          <div role="alert" className={`${card} p-6 text-center`}><p className="text-bad">{error}</p></div>
        ) : busy === "searching" && !page ? (
          <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-[132px] animate-pulse`} />)}</div>
        ) : !page || !ran ? (
          <div className={`${card} p-10 text-center text-muted`}><EmptyState icon={LuMapPin} title="Find gyms near you" hint="Choose an area and press Search." /></div>
        ) : page.results.length === 0 ? (
          <div className={`${card} p-10 text-center text-muted`}>
            <EmptyState icon={LuMapPin}
              title={ran.area === "near" ? `No gyms within ${NEARBY_RADIUS_KM} km` : ran.city ? `No gyms match in ${ran.city}` : "No gyms match that keyword"}
              hint={ran.area === "near" ? "Try a different category, or search by city." : "Check the spelling, or try a different category."} />
          </div>
        ) : (
          <div className={busy === "searching" ? "opacity-60" : ""}>
            <ul className="grid gap-3">
              {page.results.map((g) => <GymCard key={g.id} gym={g} onFollow={(f) => setFollowing(g.id, f)} />)}
            </ul>
            <div className={`${card} mt-3`}>
              <Pagination page={page.current_page} pages={Math.max(1, page.total_pages)} total={page.count} size={ran.query.page_size ?? PAGE_SIZE} shown={page.results.length} noun="gyms"
                onPage={(n) => void run({ ...ran.query, page: n }, { area: ran.area, city: ran.city })} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
