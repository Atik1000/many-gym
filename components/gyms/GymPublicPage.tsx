"use client";

/** A gym's public page — `GET /gyms/{id}/public/`. Read-only apart from the Follow button. */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LuArrowLeft, LuClock, LuExternalLink, LuMapPin, LuPlay, LuSearchX, LuUsers } from "react-icons/lu";
import { MotionLink } from "@/components/ui/Motion";
import { Avatar, Pill } from "@/components/ui/parts";
import { ApiError, currentGymId, mediaUrl } from "@/lib/api/http";
import { hasCoordinates, mapsLink, placeLine, publicGym, type GymPublicDetail, type PublicAmenity, type PublicPlan } from "@/lib/api/discover";
import { btnGhost, btnPrimary, card } from "@/lib/ui";
import FollowGymButton from "./FollowGymButton";
import JoinRequestButton from "./JoinRequestButton";

type Loaded = { id: string; gym: GymPublicDetail | null; missing: boolean; error: string };

const hhmm = (t: string | null) => (t ?? "").slice(0, 5);
const amount = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;
};
const isFree = (v: string) => !(Number(v) > 0);

/** The weekday name where the gym is, so "today" is highlighted for its timezone rather than the viewer's. */
function todayAt(timezone: string): string {
  try {
    return new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: timezone || undefined });
  } catch {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  }
}

function duration(p: PublicPlan): string {
  const unit = (p.duration_unit_display || p.duration_unit || "").toLowerCase();
  if (!p.duration_value || !unit) return p.plan_type_display;
  return `${p.duration_value} ${unit}${p.duration_value === 1 ? "" : "s"}`;
}

function Amenities({ title, items, paid }: { title: string; items: PublicAmenity[]; paid?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-[13px] font-semibold text-muted">{title}</h4>
      <ul className="flex flex-wrap gap-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-full bg-background px-3 py-1 text-[14px]">
            {a.name}{paid && !isFree(a.default_price) && <span className="ml-1.5 font-semibold text-primary">{amount(a.default_price)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className={`${card} p-5`}><h3 className="mb-3 text-lg font-bold">{title}</h3>{children}</section>
);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function GymPublicPage() {
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let live = true;
    publicGym(id)
      .then((gym) => live && setLoaded({ id, gym, missing: false, error: "" }))
      .catch((e) => {
        if (!live) return;
        const missing = e instanceof ApiError && (e.status === 404 || e.code === "RESOURCE_NOT_FOUND");
        setLoaded({ id, gym: null, missing, error: e instanceof ApiError ? e.message : "Couldn't load this gym." });
      });
    return () => { live = false; };
  }, [id]);

  const back = <MotionLink href="/gyms" className={btnGhost}><LuArrowLeft size={17} />Back to search</MotionLink>;

  if (!loaded || loaded.id !== id) return <div className={`${card} mx-auto h-[420px] max-w-[920px] animate-pulse`} />;
  if (!loaded.gym) {
    return (
      <div className={`${card} mx-auto mt-6 max-w-md p-10 text-center`}>
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-background text-muted"><LuSearchX size={22} /></span>
        <h2 className="text-xl font-bold">{loaded.missing ? "Gym not found or currently unavailable" : "Couldn't load this gym"}</h2>
        <p className="mb-5 mt-1 text-muted">{loaded.missing ? "It may have been unpublished or removed." : loaded.error}</p>
        <MotionLink href="/gyms" className={btnPrimary}><LuArrowLeft size={17} />Back to search</MotionLink>
      </div>
    );
  }

  const g = loaded.gym;
  const cover = mediaUrl(g.cover_photo_url);
  const social = g.social ?? { followers_count: 0, members_count: 0, is_following: false };
  const locations = g.locations?.length ? g.locations : g.location ? [g.location] : [];
  const today = todayAt(g.timezone);
  // The live payload carries only `day_of_week` (0 = Sunday); the guide's `day_name` is not sent.
  const hours = [...(g.operating_hours ?? [])]
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((h) => ({ ...h, day_name: h.day_name || DAY_NAMES[h.day_of_week] || `Day ${h.day_of_week}` }));
  const free = g.amenities?.free_amenities ?? [];
  const paid = g.amenities?.paid_amenities ?? [];
  const gallery = [...(g.gallery ?? [])].sort((a, b) => a.order_index - b.order_index);
  const setFollowing = (following: boolean) =>
    setLoaded((l) => l && l.gym && { ...l, gym: { ...l.gym, social: { ...social, is_following: following, followers_count: Math.max(0, social.followers_count + (following === social.is_following ? 0 : following ? 1 : -1)) } } });

  return (
    <div className="mx-auto grid max-w-[920px] gap-5">
      <div>{back}</div>

      <section className={card}>
        <div className="h-[130px] overflow-hidden rounded-t-xl bg-[#1b1b25] sm:h-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="relative -mt-10 flex flex-col gap-3 px-4 pb-5 sm:-mt-12 sm:flex-row sm:flex-wrap sm:items-start sm:gap-5 sm:px-6">
          <span className="w-fit rounded-full border-4 border-surface bg-surface"><Avatar name={g.name} size={96} src={mediaUrl(g.profile_picture_url)} /></span>
          {/* Pushed below the cover: only the picture overlaps it, never the name. */}
          <div className="min-w-0 flex-1 sm:pt-14">
            <h2 className="text-2xl font-bold">{g.name}</h2>
            <p className="text-muted">{[g.primary_type_display, g.secondary_type_display].filter(Boolean).join(" · ")}</p>
            {placeLine(g.location) && <p className="mt-1 flex items-center gap-1.5 text-muted"><LuMapPin size={15} />{placeLine(g.location)}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:pt-16">
            {/* Asking to join the gym this session is acting as makes no sense — its staff add members directly. */}
            {g.id !== currentGymId() && <JoinRequestButton gymId={g.id} gymName={g.name} plans={g.membership_plans ?? []} />}
            <FollowGymButton gymId={g.id} name={g.name} following={social.is_following} onChange={setFollowing} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3.5 sm:px-6">
          {g.today_status && <Pill tone={g.today_status.is_open_now ? "green" : "gray"}>{g.today_status.is_open_now ? "Open now" : "Closed now"}</Pill>}
          {g.today_status?.today_hours && <span className="inline-flex items-center gap-1 text-[13px] text-muted"><LuClock size={14} />Today: {g.today_status.today_hours}</span>}
          <Pill>{g.gender_required_display}</Pill>
          <Pill>Ages {g.min_age}+</Pill>
          <span className="ml-auto inline-flex items-center gap-1.5 text-muted"><LuUsers size={16} />
            <b className="text-foreground">{social.followers_count}</b> follower{social.followers_count === 1 ? "" : "s"} · <b className="text-foreground">{social.members_count}</b> member{social.members_count === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <Section title="About">
        {g.short_description ? <p className="whitespace-pre-wrap">{g.short_description}</p> : <p className="text-muted">This gym hasn&apos;t added a description yet.</p>}
        {g.owner_public?.name && <p className="mt-3 text-muted">Owned by <b className="text-foreground">{g.owner_public.name}</b></p>}
      </Section>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <Section title="Opening hours">
          {hours.length === 0 ? <p className="text-muted">No opening hours published.</p> : (
            <table className="w-full">
              <caption className="sr-only">Opening hours for each day of the week ({g.timezone})</caption>
              <tbody>
                {hours.map((h) => {
                  const isToday = h.day_name === today;
                  const closed = h.is_closed || !h.start_time || !h.end_time;
                  return (
                    <tr key={h.id} className={isToday ? "font-semibold text-primary" : ""}>
                      <th scope="row" className="py-1.5 pr-3 text-left font-[inherit]">{h.day_name}{isToday && <span className="ml-2 text-xs font-semibold">Today</span>}</th>
                      <td className={`py-1.5 text-right ${closed && !isToday ? "text-muted" : ""}`}>{closed ? "Closed" : `${hhmm(h.start_time)} – ${hhmm(h.end_time)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {hours.length > 0 && g.timezone && <p className="mt-2 text-xs text-muted">Times are in the gym&apos;s timezone ({g.timezone}).</p>}
        </Section>

        <Section title={locations.length > 1 ? "Locations" : "Location"}>
          {locations.length === 0 ? <p className="text-muted">No address published.</p> : (
            <ul className="grid gap-3">
              {locations.map((l) => (
                <li key={l.id} className="rounded-[10px] bg-background px-3.5 py-3">
                  <p className="font-semibold">{placeLine(l) || "Address not provided"}{locations.length > 1 && l.is_primary && <span className="ml-2 align-middle"><Pill tone="purple">Main</Pill></span>}</p>
                  {l.postal_code && <p className="text-muted">{l.postal_code}</p>}
                  {hasCoordinates(l) && (
                    <a href={mapsLink(l)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                      <LuExternalLink size={15} />Open in maps<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Amenities">
        {free.length + paid.length === 0 ? <p className="text-muted">No amenities listed.</p> : (
          <div className="grid gap-4"><Amenities title="Included" items={free} /><Amenities title="Paid extras" items={paid} paid /></div>
        )}
      </Section>

      <Section title="Membership plans">
        {(g.membership_plans ?? []).length === 0 ? <p className="text-muted">No public plans yet.</p> : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.membership_plans.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <b className="text-base">{p.name}</b>
                  <span className="whitespace-nowrap text-lg font-bold text-primary">{amount(p.price)}</span>
                </div>
                <p className="text-[13px] text-muted">{p.plan_type_display} · {duration(p)}</p>
                {p.description && <p className="mt-2">{p.description}</p>}
                <p className="mt-2 text-[13px] text-muted">Joining fee: <b className="text-foreground">{isFree(p.joining_fee) ? "None" : amount(p.joining_fee)}</b></p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Gallery">
        {gallery.length === 0 ? <p className="text-muted">No photos or videos yet.</p> : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {gallery.map((m) => {
              const video = m.media_type === "video";
              const full = mediaUrl(m.optimized_url || m.media_url || m.original_url);
              const thumb = mediaUrl(m.thumbnail_url || (video ? "" : m.optimized_url || m.media_url || m.original_url));
              const what = m.caption || m.category_display || (video ? "Video" : "Photo");
              return (
                <li key={m.id}>
                  <a href={full} target="_blank" rel="noopener noreferrer" aria-label={`${video ? "Play video" : "Open photo"}: ${what} (opens in a new tab)`} className="relative block aspect-[4/3] overflow-hidden rounded-[10px] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : <video src={full} muted preload="metadata" className="h-full w-full object-cover" />}
                    {video && <span className="absolute inset-0 grid place-items-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white"><LuPlay size={18} fill="currentColor" /></span></span>}
                  </a>
                  {m.caption && <p className="mt-1 truncate text-[13px] text-muted">{m.caption}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
