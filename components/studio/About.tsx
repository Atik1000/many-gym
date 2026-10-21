"use client";

import Link from "next/link";
import { useState } from "react";
import { LuChevronDown as ChevronDown, LuClock as Clock, LuGlobe as Globe, LuMapPin as MapPin, LuUsers as Users } from "react-icons/lu";
import { useGym, useResource } from "@/lib/api";
import { DAYS, fmtTime, openStatus } from "@/lib/gym-data";
import { card } from "@/lib/ui";
import { accountSlug, mediaPath } from "@/lib/posts";
import { Thumb, useHistoryMedia } from "./HistoryPage";

const row = "flex items-center gap-3 py-[7px] text-[#3b3e55]";

export default function About() {
  const [gym, , ready] = useGym();
  const [members] = useResource("members");
  const [history] = useHistoryMedia();
  const [showHours, setShowHours] = useState(false);
  if (!ready || !gym) return <div className={`${card} h-[420px] animate-pulse`} />;
  const today = openStatus(gym.hours);
  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const tiles = history.slice(0, 4);

  return (
    <aside className={`${card} p-5`}>
      <h3 className="mb-3.5 text-lg font-bold">About</h3>
      <div className={row}><MapPin size={20} className="text-muted" />{gym.location.city}, {gym.location.country}</div>
      <button className={`${row} w-full`} onClick={() => setShowHours((v) => !v)} aria-expanded={showHours}>
        <Clock size={20} className="text-muted" />
        <span><span className={`font-semibold ${today.open ? "text-ok" : "text-bad"}`}>{today.open ? "Open today" : "Closed today"}</span>{today.open && ` · ${today.text}`}</span>
        <ChevronDown size={18} className={`ml-auto text-muted transition-transform ${showHours ? "rotate-180" : ""}`} />
      </button>
      {showHours && (
        <div className="mb-1.5 ml-8 text-[13px] text-muted">
          {DAYS.map((d) => (
            <div key={d} className={`flex justify-between py-0.5 ${d === todayName ? "font-semibold text-foreground" : ""}`}>
              <span>{d}</span><span>{gym.hours[d]?.open ? `${fmtTime(gym.hours[d].start)} – ${fmtTime(gym.hours[d].end)}` : "Closed"}</span>
            </div>
          ))}
        </div>
      )}
      <div className={row}><Globe size={20} className="text-muted" /><a className="font-semibold text-primary" href="#">{gym.website}</a></div>
      <div className={row}><Users size={20} className="text-muted" />{members.length} members</div>
      <hr className="my-4 border-line" />
      <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">History</h3><Link href="/studio/history" className="font-semibold text-primary">View all</Link></div>
      {tiles.length === 0 ? <p className="text-muted">No photos or videos in your posts yet.</p> : (
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <Link key={t.id} href={mediaPath(accountSlug(gym.overview.name), t.postId, t.id)} aria-label={t.kind === "video" ? "Play video" : "View photo"} className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-black">
              <Thumb m={t} />
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
