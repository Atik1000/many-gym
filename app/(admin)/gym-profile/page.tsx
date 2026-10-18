import { EditableIf, Guard } from "@/components/AuthProvider";
import Link from "next/link";
import { Suspense } from "react";
import AmenitiesTab from "@/components/gym-profile/AmenitiesTab";
import GalleryTab from "@/components/gym-profile/GalleryTab";
import HoursTab from "@/components/gym-profile/HoursTab";
import LocationTab from "@/components/gym-profile/LocationTab";
import OverviewTab from "@/components/gym-profile/OverviewTab";
import { card } from "@/lib/ui";

export const metadata = { title: "Gym Profile · manygym" };

const TABS = [
  { id: "overview", label: "Overview", View: OverviewTab },
  { id: "location", label: "Location", View: LocationTab },
  { id: "hours", label: "Opening hours", View: HoursTab },
  { id: "gallery", label: "Gallery", View: GalleryTab },
  { id: "amenities", label: "Amenities", View: AmenitiesTab },
];

async function TabsCard({ searchParams }: { searchParams: PageProps<"/gym-profile">["searchParams"] }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <div className={card}>
      <nav className="flex gap-1 overflow-x-auto border-b border-line px-3">
        {TABS.map((t) => (
          <Link
            key={t.id} href={`/gym-profile?tab=${t.id}`} scroll={false}
            className={`whitespace-nowrap border-b-2 px-4 py-3.5 font-semibold ${t.id === active.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {/* key resets a tab's draft state when switching tabs */}
      <div className="p-6" key={active.id}><EditableIf perm="Edit gym profile"><active.View /></EditableIf></div>
    </div>
  );
}

function Inner({ searchParams }: PageProps<"/gym-profile">) {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-[28px] font-bold tracking-tight">Gym Profile</h2>
        <p className="text-muted">This is what members and visitors see on your public profile.</p>
      </div>
      <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
        <TabsCard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// the page needs the "View gym profile" permission
export default function Page(props: PageProps<"/gym-profile">) {
  return (
    <Guard perm="View gym profile">
      <Inner {...props} />
    </Guard>
  );
}
