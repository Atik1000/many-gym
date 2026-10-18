"use client";

import { MotionLink } from "@/components/ui/Motion";
import Link from "next/link";
import { LuCamera as Camera, LuChevronRight as ChevronRight, LuCreditCard as CreditCard, LuExternalLink as ExternalLink, LuImage as ImageIcon, LuMapPin as MapPin, LuPencil as Pencil } from "react-icons/lu";
import { Can } from "@/components/AuthProvider";
import { useGym } from "@/lib/api";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

export default function StudioHeader() {
  const [gym, , ready] = useGym();
  const quick = "flex items-center gap-3.5 rounded-xl border border-line px-[18px] py-4 text-base font-semibold hover:border-primary";
  if (!ready || !gym) return <div className={`${card} h-[420px] animate-pulse`} />;
  const o = gym.overview;
  return (
    <section className={card}>
      <div className="relative h-[130px] overflow-hidden sm:h-[200px] rounded-t-xl bg-[#1b1b25]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.coverUrl && <img src={o.coverUrl} alt="" className="h-full w-full object-cover" />}
        <Can perm="Edit studio information">
          <Link href="/gym-profile" className="absolute right-2.5 top-2.5 inline-flex text-[13px] sm:right-3.5 sm:top-3.5 sm:text-sm items-center gap-2 rounded-[10px] bg-foreground/85 px-4 py-2 font-semibold text-white"><Camera size={17} />Edit cover</Link>
        </Can>
      </div>
      <div className="relative -mt-10 flex flex-col gap-3 px-4 pb-5 sm:-mt-12 sm:flex-row sm:flex-wrap sm:items-end sm:gap-[22px] sm:px-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.profileUrl ? <img src={o.profileUrl} alt="" className="h-24 w-24 shrink-0 rounded-full border-[4px] border-white bg-[#0e0e14] object-cover shadow sm:h-[140px] sm:w-[140px] sm:border-[5px]" />
          : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[4px] sm:h-[140px] sm:w-[140px] sm:border-[5px] border-white bg-[#0e0e14] text-center font-extrabold text-white shadow">{o.name}</div>}
        <div className="min-w-0 flex-1 pb-1.5">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{o.name}</h2>
          <div className="text-base text-muted sm:text-[17px]">{gym.tagline}</div>
          <div className="mt-1 flex items-center gap-1.5 text-muted"><MapPin size={16} />{gym.location.city}, {gym.location.country}</div>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:pb-2">
          <Can perm="Edit gym profile"><MotionLink href="/gym-profile" className={btnGhost}><Pencil size={17} />Edit Gym Profile</MotionLink></Can>
          <a href="#" className={btnPrimary}><ExternalLink size={17} />View Public Profile</a>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 pb-5 sm:grid-cols-2 sm:gap-4 sm:px-5">
        <Link href="/plans" className={quick}><CreditCard className="text-primary" size={24} />Membership Plans<ChevronRight className="ml-auto text-muted" /></Link>
        <Link href="/gym-profile?tab=gallery" className={quick}><ImageIcon className="text-primary" size={24} />Gym Gallery<ChevronRight className="ml-auto text-muted" /></Link>
      </div>
    </section>
  );
}
