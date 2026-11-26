"use client";

/**
 * Search results — `GET /api/v1/search/`, with an All · Gyms · People tab strip.
 *
 * The term, the tab, the page and every filter live in the URL (`/search?q=titan&tab=gyms&category=…`), so a
 * results page can be reloaded, shared and stepped through with Back. The one exception is "Near me": the
 * coordinates are requested only when the person presses it, used for that search, and never written to the URL.
 *
 * Filters belong to a tab. Switching tab keeps the term and the city (which narrows both gyms and people) and
 * drops the rest, so the counts on the tabs always describe the search that is on screen.
 */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuArrowRight, LuBuilding2, LuLocateFixed, LuLock, LuMapPin, LuMessageSquare, LuSearch, LuUsers, LuX } from "react-icons/lu";
import { Avatar, EmptyState, Pagination, Select } from "@/components/ui/parts";
import { MotionButton } from "@/components/ui/Motion";
import { GymCard, LOCATION_MESSAGE, locate, type LocationProblem } from "@/components/gyms/FindGyms";
import FollowButton from "@/components/users/FollowButton";
import { ApiError, mediaUrl } from "@/lib/api/http";
import { GYM_CATEGORIES, NEARBY_RADIUS_KM, type GymCategory } from "@/lib/api/discover";
import {
  GENDER_REQUIRED, PERSON_GENDERS, SEARCH_MAX_LENGTH, personFollowState, searchAll, searchPage,
  type GenderRequired, type PersonGender, type SearchCounts, type SearchGym, type SearchOverview, type SearchPage, type SearchPerson, type SearchQuery,
} from "@/lib/api/search";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";

type Tab = "all" | "gyms" | "people";
const TABS: { key: Tab; label: string; count: (c: SearchCounts) => number }[] = [
  { key: "all", label: "All", count: (c) => c.gyms + c.people },
  { key: "gyms", label: "Gyms", count: (c) => c.gyms },
  { key: "people", label: "People", count: (c) => c.people },
];
const PAGE_SIZE = 20;
const PREVIEW = 5;
const RADII = [5, 10, 20, 50, 100];

/** URL keys, and which tab owns each. `q`, `tab`, `page` and `city` are shared. */
const GYM_KEYS = ["category", "gender_required"] as const;
const PEOPLE_KEYS = ["gender", "following"] as const;

type Coords = { latitude: number; longitude: number };
type Result =
  | { tab: "all"; data: SearchOverview }
  | { tab: "gyms"; data: SearchPage<SearchGym> }
  | { tab: "people"; data: SearchPage<SearchPerson> };

const oneOf = <T extends string>(v: string | null, allowed: readonly (readonly [T, string])[]): T | "" =>
  allowed.some(([k]) => k === v) ? (v as T) : "";

function readableError(e: unknown): string {
  if (!(e instanceof ApiError)) return "Couldn't search right now.";
  if (e.status === 401) return "Your session has ended. Sign in again to search.";
  const f = e.fieldErrors();
  if (f.latitude || f.longitude || f.coordinates) return "We couldn't use your location for this search. Try again, or search by city.";
  const first = Object.entries(f)[0];
  return first ? `${first[0].replace(/_/g, " ")}: ${first[1]}` : e.message;
}

export default function SearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ---- state that lives in the URL
  const q = (sp.get("q") ?? "").slice(0, SEARCH_MAX_LENGTH);
  const tab: Tab = sp.get("tab") === "gyms" ? "gyms" : sp.get("tab") === "people" ? "people" : "all";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const city = sp.get("city") ?? "";
  const category = oneOf<GymCategory>(sp.get("category"), GYM_CATEGORIES);
  const genderRequired = oneOf<GenderRequired>(sp.get("gender_required"), GENDER_REQUIRED);
  const gender = oneOf<PersonGender>(sp.get("gender"), PERSON_GENDERS);
  const following = sp.get("following") === "true" ? true : sp.get("following") === "false" ? false : null;

  /** Writes a change into the URL; anything but a page change goes back to page 1. */
  const setParams = useCallback((patch: Record<string, string | null>, opts: { push?: boolean } = {}) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    const s = next.toString();
    const url = s ? `${pathname}?${s}` : pathname;
    if (opts.push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  }, [sp, pathname, router]);

  const goTab = (t: Tab) => {
    const drop = Object.fromEntries([...GYM_KEYS, ...PEOPLE_KEYS].map((k) => [k, null]));
    setParams({ ...drop, tab: t === "all" ? null : t }, { push: true });
    setCoords(null);
  };

  // ---- the search box and the city box are typed locally and committed to the URL
  // When the URL changes underneath them (Back, a tab switch, the ⌘K palette), the boxes follow it.
  const [draft, setDraft] = useState(q);
  const [cityDraft, setCityDraft] = useState(city);
  const [synced, setSynced] = useState({ q, city });
  if (synced.q !== q || synced.city !== city) {
    setSynced({ q, city });
    setDraft(q);
    setCityDraft(city);
  }
  useEffect(() => {
    if (cityDraft.trim() === city.trim()) return;
    const t = setTimeout(() => setParams({ city: cityDraft.trim() || null }), 450);
    return () => clearTimeout(t);
  }, [cityDraft, city, setParams]);

  // ---- "Near me" (gyms tab only; never in the URL)
  const [coords, setCoords] = useState<Coords | null>(null);
  const [radius, setRadius] = useState(NEARBY_RADIUS_KM);
  const [locating, setLocating] = useState(false);
  const [locationProblem, setLocationProblem] = useState<LocationProblem | null>(null);
  const nearMe = async () => {
    if (coords) { setCoords(null); return; }
    setLocationProblem(null);
    setLocating(true);
    try { setCoords(await locate()); }
    catch (p) { setLocationProblem(p as LocationProblem); }
    finally { setLocating(false); }
  };

  // ---- fetch
  const query = useMemo<SearchQuery>(() => ({
    q, city,
    ...(tab === "gyms" ? { gym_category: category, gender_required: genderRequired, coords, radius } : {}),
    ...(tab === "people" ? { gender, is_following: following } : {}),
  }), [q, city, tab, category, genderRequired, coords, radius, gender, following]);
  const hasCriteria = !!(q.trim() || city.trim() || (tab === "gyms" && (category || genderRequired || coords)) || (tab === "people" && (gender || following !== null)));

  const [attempt, setAttempt] = useState(0);
  /** The last answer, tagged with the request it answers; loading = the newest answer is for an older request. */
  const [answer, setAnswer] = useState<{ key: string; result: Result | null; error: string } | null>(null);
  const requestKey = JSON.stringify([query, tab, page, attempt]);
  const loading = hasCriteria && answer?.key !== requestKey;
  const error = !loading && answer?.error ? answer.error : "";
  const result = answer?.result ?? null;

  useEffect(() => {
    if (!hasCriteria) return;
    const ctl = new AbortController();
    const run: Promise<Result> =
      tab === "all" ? searchAll(query, PREVIEW, ctl.signal).then((data) => ({ tab, data }))
        : tab === "gyms" ? searchPage("gym", query, page, PAGE_SIZE, ctl.signal).then((data) => ({ tab, data }))
          : searchPage("people", query, page, PAGE_SIZE, ctl.signal).then((data) => ({ tab, data }));
    run.then((r) => { if (!ctl.signal.aborted) setAnswer({ key: requestKey, result: r, error: "" }); })
      .catch((e) => {
        if (ctl.signal.aborted || (e as Error)?.name === "AbortError") return;
        setAnswer({ key: requestKey, result: null, error: readableError(e) });
      });
    return () => ctl.abort();
    // requestKey covers query, tab, page and attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, hasCriteria]);

  // Keep a gym's follow button and follower count in step with what the button did.
  const patchGym = (id: string, now: boolean) => setAnswer((a) => {
    if (!a?.result) return a;
    return { ...a, result: patchResult(a.result, id, now) };
  });
  const patchResult = (r: Result, id: string, now: boolean): Result => {
    const fix = (g: SearchGym) => (g.id !== id || g.is_following === now ? g : { ...g, is_following: now, followers_count: Math.max(0, g.followers_count + (now ? 1 : -1)) });
    if (r.tab === "all") return { ...r, data: { ...r.data, results: { ...r.data.results, gyms: r.data.results.gyms.map(fix) } } };
    if (r.tab === "gyms") return { ...r, data: { ...r.data, results: r.data.results.map(fix) } };
    return r;
  };

  const counts = result?.data.counts;
  const shown = result && result.tab === tab ? result : null;
  const termLabel = q.trim() ? `“${q.trim()}”` : "your filters";

  return (
    <div className="mx-auto grid max-w-[920px] gap-5">
      {/* ---- search box + tabs */}
      <section className={`${card} p-4 sm:p-5`}>
        <form role="search" onSubmit={(e) => { e.preventDefault(); setParams({ q: draft.trim() || null }, { push: true }); }} className="flex gap-2">
          <div className="relative flex-1">
            <LuSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" aria-label="Search manygym" autoComplete="off" maxLength={SEARCH_MAX_LENGTH} placeholder="Search gyms and people"
              className={`${input} pl-10`} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
          <MotionButton type="submit" className={btnPrimary}><LuSearch size={17} /><span className="hidden sm:inline">Search</span></MotionButton>
        </form>

        <div role="tablist" aria-label="Result type" className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-background p-1">
          {TABS.map((t) => {
            const n = counts ? t.count(counts) : null;
            return (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => tab !== t.key && goTab(t.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold ${tab === t.key ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"}`}>
                {t.label}
                {n !== null && hasCriteria && <span className={`rounded-full px-1.5 text-xs ${tab === t.key ? "bg-primary-50" : "bg-surface"}`}>{n}</span>}
              </button>
            );
          })}
        </div>

        {/* ---- filters for the active tab */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <LuBuilding2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="City" maxLength={100} placeholder="Any city" className={`${input} pl-9`} value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} />
          </div>
          {tab === "gyms" && (<>
            <Select aria-label="Gym category" value={category} onChange={(e) => setParams({ category: e.target.value || null })}>
              <option value="">Any category</option>
              {GYM_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select aria-label="Who the gym is for" value={genderRequired} onChange={(e) => setParams({ gender_required: e.target.value || null })}>
              <option value="">Open to anyone</option>
              {GENDER_REQUIRED.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <div className="flex gap-2">
              <button type="button" onClick={() => void nearMe()} disabled={locating} aria-pressed={!!coords}
                className={`${btnGhost} flex-1 justify-center ${coords ? "!border-primary/40 !bg-primary-50 !text-primary" : ""}`}>
                <LuLocateFixed size={16} />{locating ? "Locating…" : "Near me"}
              </button>
              {coords && (
                <Select aria-label="Distance" className="!w-auto" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                  {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
                </Select>
              )}
            </div>
          </>)}
          {tab === "people" && (<>
            <Select aria-label="Gender" value={gender} onChange={(e) => setParams({ gender: e.target.value || null })}>
              <option value="">Any gender</option>
              {PERSON_GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select aria-label="Following" value={following === null ? "" : String(following)} onChange={(e) => setParams({ following: e.target.value || null })}>
              <option value="">Everyone</option>
              <option value="true">People I follow</option>
              <option value="false">People I don&apos;t follow</option>
            </Select>
          </>)}
        </div>
        {locationProblem && (
          <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-warn-bg px-4 py-3 text-warn">
            <p>{LOCATION_MESSAGE[locationProblem]}</p>
            <button aria-label="Dismiss" onClick={() => setLocationProblem(null)}><LuX size={18} /></button>
          </div>
        )}
      </section>

      {/* ---- results */}
      <section aria-live="polite" aria-busy={loading}>
        {!hasCriteria ? (
          <div className={`${card} p-10`}><EmptyState icon={LuSearch} title="Search manygym" hint="Find gyms by name, type or city, and people by name." /></div>
        ) : error ? (
          <div role="alert" className={`${card} p-6 text-center`}>
            <p className="text-bad">{error}</p>
            <button className="mt-2 font-semibold text-primary" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          </div>
        ) : !shown ? (
          <Skeleton />
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            {shown.tab === "all" && <AllResults data={shown.data} termLabel={termLabel} onTab={goTab} onFollowGym={patchGym} />}
            {shown.tab === "gyms" && (
              <Paged page={shown.data} noun="gyms" onPage={(n) => setParams({ page: String(n) }, { push: true })}
                empty={<EmptyState icon={LuMapPin} title={`No gyms match ${termLabel}`} hint={coords ? "Try a wider distance, or turn off Near me." : "Check the spelling, or loosen a filter."} />}>
                <ul className="grid gap-3">{shown.data.results.map((g) => <GymCard key={g.id} gym={g} onFollow={(f) => patchGym(g.id, f)} />)}</ul>
              </Paged>
            )}
            {shown.tab === "people" && (
              <Paged page={shown.data} noun="people" onPage={(n) => setParams({ page: String(n) }, { push: true })}
                empty={<EmptyState icon={LuUsers} title={`No one matches ${termLabel}`} hint="Search by first or last name, or loosen a filter." />}>
                <ul className={`${card} grid gap-2 p-3`}>{shown.data.results.map((p) => <PersonRow key={p.id} person={p} />)}</ul>
              </Paged>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Skeleton() {
  return <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className={`${card} h-[110px] animate-pulse`} />)}</div>;
}

function Paged<T>({ page, noun, onPage, empty, children }: { page: SearchPage<T>; noun: string; onPage: (n: number) => void; empty: React.ReactNode; children: React.ReactNode }) {
  if (page.results.length === 0) return <div className={`${card} p-10`}>{empty}</div>;
  return (
    <>
      {children}
      <div className={`${card} mt-3`}>
        <Pagination page={page.current_page} pages={Math.max(1, page.total_pages)} total={page.count} size={PAGE_SIZE} shown={page.results.length} noun={noun} onPage={onPage} />
      </div>
    </>
  );
}

function AllResults({ data, termLabel, onTab, onFollowGym }: { data: SearchOverview; termLabel: string; onTab: (t: Tab) => void; onFollowGym: (id: string, now: boolean) => void }) {
  const { gyms, people } = data.results;
  if (gyms.length === 0 && people.length === 0) {
    return <div className={`${card} p-10`}><EmptyState icon={LuSearch} title={`Nothing found for ${termLabel}`} hint="Check the spelling, or try a gym name, a gym type or a person's name." /></div>;
  }
  const head = (title: string, n: number, t: Tab) => (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title} <span className="font-semibold text-muted">· {n}</span></h2>
      {n > 0 && <button onClick={() => onTab(t)} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">See all<LuArrowRight size={16} /></button>}
    </div>
  );
  return (
    <div className="grid gap-6">
      {gyms.length > 0 && (
        <section>
          {head("Gyms", data.counts.gyms, "gyms")}
          <ul className="grid gap-3">{gyms.map((g) => <GymCard key={g.id} gym={g} onFollow={(f) => onFollowGym(g.id, f)} />)}</ul>
        </section>
      )}
      {people.length > 0 && (
        <section>
          {head("People", data.counts.people, "people")}
          <ul className={`${card} grid gap-2 p-3`}>{people.map((p) => <PersonRow key={p.id} person={p} />)}</ul>
        </section>
      )}
    </div>
  );
}

function PersonRow({ person: p }: { person: SearchPerson }) {
  const name = p.full_name || `${p.first_name} ${p.last_name}`.trim() || "manygym member";
  const sub = [p.city, `${p.followers_count} follower${p.followers_count === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl bg-background px-3 py-2.5">
      <Link href={`/users/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${name}'s profile`}>
        <Avatar name={name} size={44} src={mediaUrl(p.avatar_url)} />
        <span className="min-w-0">
          <b className="flex items-center gap-1.5 hover:underline"><span className="truncate">{name}</span>{p.is_private && <LuLock size={13} className="shrink-0 text-muted" aria-label="Private account" />}</b>
          <span className="block truncate text-[13px] text-muted">{sub}</span>
          {p.about_you && <span className="block truncate text-[13px] text-muted">{p.about_you}</span>}
        </span>
      </Link>
      <span className="flex flex-wrap items-center gap-2">
        <Link href={`/messages?user=${encodeURIComponent(p.id)}`} className={btnGhost}><LuMessageSquare size={17} />Message</Link>
        <FollowButton key={`${p.id}:${personFollowState(p)}`} userId={p.id} name={name} initial={personFollowState(p)} />
      </span>
    </li>
  );
}
