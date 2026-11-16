"use client";

/**
 * A person's home when they aren't running a gym: stories, then the community feed — everyone they follow,
 * the gyms they belong to, and public posts. The Studio shows the same tabs next to a gym's own wall; this is
 * that feed without the wall, which needs a gym.
 */
import Link from "next/link";
import { useState } from "react";
import { LuMapPin, LuSearch } from "react-icons/lu";
import CommunityFeed from "@/components/studio/CommunityFeed";
import Stories from "@/components/studio/Stories";
import { useAuth } from "@/components/AuthProvider";
import { FEED_TABS, type FeedType } from "@/lib/api/feed";
import { btnGhost, card } from "@/lib/ui";

export default function PersonalFeed() {
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedType>("all");
  return (
    <div className="mx-auto grid max-w-[720px] gap-4">
      <section className={`${card} flex flex-wrap items-center gap-3 p-4`}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{user?.name ? `Hi, ${user.name.split(" ")[0]}` : "Welcome"}</h2>
          <p className="text-muted">Find a gym to join and people to follow — their posts show up here.</p>
        </div>
        <Link href="/gyms" className={btnGhost}><LuMapPin size={17} />Find gyms</Link>
        <Link href="/find-people" className={btnGhost}><LuSearch size={17} />Find people</Link>
      </section>

      <Stories />

      <section>
        <div role="tablist" aria-label="Feed" className={`${card} flex gap-1 overflow-x-auto p-1.5`}>
          {FEED_TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold ${tab === t.key ? "bg-primary-50 text-primary" : "text-muted hover:bg-background hover:text-foreground"}`}>{t.label}</button>
          ))}
        </div>
        <CommunityFeed key={tab} feedType={tab} />
      </section>
    </div>
  );
}
