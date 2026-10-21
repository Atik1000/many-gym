"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LuArrowLeft, LuImage, LuPlay } from "react-icons/lu";
import { EmptyState } from "@/components/ui/parts";
import { useGym, useResource } from "@/lib/api";
import { accountSlug, mediaPath, type Post, type PostMedia } from "@/lib/posts";
import { card } from "@/lib/ui";

export type HistoryItem = PostMedia & { postId: string; text: string; createdAt: string };

/** Every photo and video from every post, newest first. */
export function useHistoryMedia(): [HistoryItem[], boolean] {
  const [posts, , ready] = useResource<Post>("posts");
  const items = useMemo(
    () => [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).flatMap((p) => p.media.map((m) => ({ ...m, postId: p.id, text: p.text, createdAt: p.createdAt }))),
    [posts],
  );
  return [items, ready];
}

export function Thumb({ m, className = "" }: { m: HistoryItem; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {m.kind === "image" ? <img src={m.url} alt={m.text} className={`h-full w-full object-cover ${className}`} /> : <video src={m.url} muted preload="metadata" className={`h-full w-full object-cover ${className}`} />}
      {m.kind === "video" && <span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white"><LuPlay size={18} fill="currentColor" /></span></span>}
    </>
  );
}

const FILTERS = [["all", "All"], ["image", "Photos"], ["video", "Videos"]] as const;

export default function HistoryPage() {
  const [all, ready] = useHistoryMedia();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const items = filter === "all" ? all : all.filter((m) => m.kind === filter);
  const [gym] = useGym();
  const account = accountSlug(gym?.overview.name ?? "");

  return (
    <>
      <Link href="/studio" className="mb-3 inline-flex items-center gap-1.5 font-semibold text-primary"><LuArrowLeft size={16} />Back to Studio</Link>
      <section className={`${card} p-6`}>
        <h2 className="mb-3 text-2xl font-bold">History</h2>
        <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
          {FILTERS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={`border-b-2 px-4 py-2.5 font-semibold ${filter === id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{label}</button>
          ))}
        </div>
        {!ready ? <div className="h-48 animate-pulse rounded-xl bg-background" />
          : items.length === 0 ? <EmptyState icon={LuImage} title="Nothing here yet" hint="Photos and videos from your posts will show up here." />
          : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((m) => (
                <Link key={m.id} href={mediaPath(account, m.postId, m.id)} aria-label={m.kind === "video" ? "Play video" : "View photo"} className="group relative block aspect-square overflow-hidden rounded-[10px] bg-black">
                  <Thumb m={m} className="transition-transform duration-200 group-hover:scale-105" />
                </Link>
              ))}
            </div>
          )}
      </section>
    </>
  );
}
