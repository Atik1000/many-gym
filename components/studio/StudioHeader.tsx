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
      <div className="relative h-[200px] overflow-hidden rounded-t-xl bg-[#1b1b25]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.coverUrl && <img src={o.coverUrl} alt="" className="h-full w-full object-cover" />}
        <Can perm="Edit studio information">
          <Link href="/gym-profile" className="absolute right-3.5 top-3.5 inline-flex items-center gap-2 rounded-[10px] bg-foreground/85 px-4 py-2 font-semibold text-white"><Camera size={17} />Edit cover</Link>
        </Can>
      </div>
      <div className="relative -mt-12 flex flex-wrap items-end gap-[22px] px-7 pb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.profileUrl ? <img src={o.profileUrl} alt="" className="h-[140px] w-[140px] shrink-0 rounded-full border-[5px] border-white bg-[#0e0e14] object-cover shadow" />
          : <div className="grid h-[140px] w-[140px] shrink-0 place-items-center rounded-full border-[5px] border-white bg-[#0e0e14] text-center font-extrabold text-white shadow">{o.name}</div>}
        <div className="min-w-0 flex-1 pb-1.5">
          <h2 className="text-3xl font-bold tracking-tight">{o.name}</h2>
          <div className="text-[17px] text-muted">{gym.tagline}</div>
          <div className="mt-1 flex items-center gap-1.5 text-muted"><MapPin size={16} />{gym.location.city}, {gym.location.country}</div>
        </div>
        <div className="flex gap-2.5 pb-2">
          <Can perm="Edit gym profile"><MotionLink href="/gym-profile" className={btnGhost}><Pencil size={17} />Edit Gym Profile</MotionLink></Can>
          <a href="#" className={btnPrimary}><ExternalLink size={17} />View Public Profile</a>
        </div>
      </div>
      <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        <Link href="/plans" className={quick}><CreditCard className="text-primary" size={24} />Membership Plans<ChevronRight className="ml-auto text-muted" /></Link>
        <Link href="/gym-profile?tab=gallery" className={quick}><ImageIcon className="text-primary" size={24} />Gym Gallery<ChevronRight className="ml-auto text-muted" /></Link>
      </div>
    </section>
  );
}
