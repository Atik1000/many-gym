"use client";

import { Pagination, usePaged } from "@/components/ui/parts";
import { useRef, useState } from "react";
import { LuImagePlus as ImagePlus, LuLoaderCircle as Loader2, LuTrash2 as Trash2 } from "react-icons/lu";
import { uploadFile, useGym } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { uid } from "@/lib/id";
import { ACCEPT } from "@/lib/media";
import { GALLERY_CATEGORIES, type GalleryItem } from "@/lib/gym-data";
import { errorText, input } from "@/lib/ui";
import SaveBar from "./SaveBar";
import TabSkeleton from "./Skeleton";

const MAX_CAPTION = 200;

function Form({ initial, onSave }: { initial: GalleryItem[]; onSave: (g: GalleryItem[]) => void }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [items, setItems] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState("All");
  const ref = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(items) !== JSON.stringify(saved);

  // each file goes to the server first (it checks type and size); a failed file never blocks the others
  const add = async (files: File[]) => {
    setErrors([]); setUploading((n) => n + files.length);
    await Promise.all(files.map(async (file) => {
      try {
        const up = await uploadFile(file);
        setItems((l) => [...l, { id: uid(), url: up.url, kind: up.kind, category: "General", caption: "" }]); // category defaults to General
      } catch (e) { setErrors((l) => [...l, (e as Error).message]); }
      finally { setUploading((n) => n - 1); }
    }));
  };
  const patch = (id: string, p: Partial<GalleryItem>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const shownAll = filter === "All" ? items : items.filter((i) => i.category === filter);
  const pg = usePaged(shownAll, 6, filter);
  const shown = pg.view;

  return (
    <div className="grid gap-5">
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void add([...e.dataTransfer.files]); }}
        className={`cursor-pointer rounded-xl border-[1.5px] border-dashed p-8 text-center text-muted ${over ? "border-primary bg-primary-50" : "border-[#c6c9dc] bg-background"}`}
      >
        {uploading > 0 ? <Loader2 className="mx-auto mb-2 animate-spin" size={28} /> : <ImagePlus className="mx-auto mb-2" size={28} />}
        <b className="text-primary">{uploading > 0 ? `Uploading ${uploading} file${uploading > 1 ? "s" : ""}…` : "Upload photos / videos"}</b>{uploading === 0 && " or drag & drop"}
        <small className="mt-1 block">JPG, JPEG, PNG, WebP up to 10 MB · MP4, MOV up to 200 MB</small>
        <input ref={ref} type="file" multiple hidden accept={ACCEPT} onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {errors.length > 0 && <p className={errorText}>{errors.join(" · ")}</p>}

      {items.length > 0 && (
        <>
          <select aria-label="Filter by category" className={`${input} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {GALLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-xl border border-line">
                <div className="relative aspect-[4/3] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.kind === "image" ? <img src={m.url} alt={m.caption} className="h-full w-full object-cover" /> : <video src={m.url} controls className="h-full w-full object-cover" />}
                  <button aria-label="Remove" onClick={() => setItems((l) => l.filter((x) => x.id !== m.id))}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"><Trash2 size={15} /></button>
                </div>
                <div className="grid gap-2.5 p-3">
                  <select aria-label="Category" className={input} value={m.category} onChange={(e) => patch(m.id, { category: e.target.value })}>
                    {GALLERY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div>
                    <textarea aria-label="Caption" rows={2} maxLength={MAX_CAPTION} placeholder="Caption (optional)" className={`${input} resize-none`} value={m.caption} onChange={(e) => patch(m.id, { caption: e.target.value })} />
                    <p className="text-right text-xs text-muted">{m.caption.length} / {MAX_CAPTION}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination {...pg} noun="photos" />
        </>
      )}
      {items.length === 0 && uploading === 0 && <p className="text-center text-muted">No gallery uploads yet.</p>}
      <SaveBar dirty={dirty} onSave={() => { onSave(items); setSaved(items); toast("Gallery saved"); }} onReset={() => { setItems(saved); setErrors([]); }} />
    </div>
  );
}

export default function GalleryTab() {
  const [gym, setGym, ready] = useGym();
  if (!ready || !gym) return <TabSkeleton />;
  return <Form initial={gym.gallery} onSave={(gallery) => setGym((g) => ({ ...g, gallery }))} />;
}
