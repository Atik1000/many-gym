"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GymProfile } from "./gym-data";
import { IMAGE_TYPES, VIDEO_TYPES } from "./media";
import { buildDataset, type Dataset } from "./seed";

/**
 * Front-end data layer. There is no backend: the whole dataset lives in this browser (localStorage), seeded with
 * dummy data on first visit. Pages keep a setState-style API — `const [members, setMembers] = useResource("members")` —
 * and every page sharing a resource updates together. To connect a real API later, only this file needs to change.
 */
const KEY = "manygym.db.v1";
const VERSION = 3; // bump when the seed shape changes so stale browser data is rebuilt

const RESOURCES = ["plans", "members", "leads", "people", "roles", "routines", "leadReasons", "posts"] as const;
export type Resource = Exclude<keyof Dataset, "gym">;
let db: Dataset | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const reportError = (message: string) => window.dispatchEvent(new CustomEvent("manygym:api-error", { detail: message }));

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, data: db })); }
  catch { reportError("Your browser storage is full, so this change won't survive a refresh. Try “Reset demo data”."); }
}
function load(): Dataset {
  if (db) return db;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as { version: number; data: Dataset } | null;
    // only trust stored data that has every resource (guards against a partial or hand-edited save)
    if (parsed?.version === VERSION && [...RESOURCES, "gym"].every((k) => parsed.data?.[k as keyof Dataset])) return (db = parsed.data);
  } catch { /* unreadable → reseed */ }
  db = buildDataset(); persist();
  return db;
}

// another tab changed the data → pick it up
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === KEY) { db = null; notify(); } });

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const EMPTY: never[] = [];
const hydrated = () => true, serverHydrated = () => false;

type Rec = { id: string };
/** A list resource: `const [members, setMembers, ready] = useResource<Member>("members")`. */
export function useResource<T extends Rec>(name: string): [T[], (u: T[] | ((p: T[]) => T[])) => void, boolean] {
  const ready = useSyncExternalStore(subscribe, hydrated, serverHydrated);
  const data = useSyncExternalStore(subscribe, () => load()[name as Resource] as unknown as T[], () => EMPTY as T[]);
  const set = useCallback((u: T[] | ((p: T[]) => T[])) => writeResource<T>(name, u), [name]);
  return [data, set, ready];
}

/** Change a resource without a hook (used by login/invite code). */
export function writeResource<T extends Rec>(name: string, u: T[] | ((p: T[]) => T[])) {
  const d = load(); const prev = d[name as Resource] as unknown as T[];
  const next = typeof u === "function" ? u(prev) : u;
  if (next === prev) return;
  db = { ...d, [name]: next }; persist(); notify();
}
export const readResource = <T extends Rec>(name: string) => load()[name as Resource] as unknown as T[];

/** The single gym-profile record. */
export function useGym(): [GymProfile | null, (u: GymProfile | ((p: GymProfile) => GymProfile)) => void, boolean] {
  const ready = useSyncExternalStore(subscribe, hydrated, serverHydrated);
  const data = useSyncExternalStore(subscribe, () => load().gym, () => null);
  const set = useCallback((u: GymProfile | ((p: GymProfile) => GymProfile)) => {
    const d = load(); const next = typeof u === "function" ? u(d.gym) : u;
    if (next === d.gym) return;
    db = { ...d, gym: next }; persist(); notify();
  }, []);
  return [data, set, ready];
}

export type Uploaded = { url: string; kind: "image" | "video"; name: string; size: number };
const MB = 1024 * 1024;

const readAsDataUrl = (blob: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(new Error("Couldn't read the file")); r.readAsDataURL(blob); });

/** Shrinks a photo to ≤1600px JPEG so many photos fit in browser storage. */
async function shrinkImage(file: File): Promise<string> {
  const src = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Couldn't read the image")); i.src = src; });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/** "Uploads" a file: there's no server, so photos are stored (shrunk) in the browser; videos last for this session only. */
export async function uploadFile(file: File): Promise<Uploaded> {
  const isImg = IMAGE_TYPES.includes(file.type), isVid = VIDEO_TYPES.includes(file.type);
  if (!isImg && !isVid) throw new Error(`${file.name}: unsupported format`);
  if (isImg && file.size > 10 * MB) throw new Error(`${file.name}: photo exceeds 10 MB`);
  if (isVid && file.size > 200 * MB) throw new Error(`${file.name}: video exceeds 200 MB`);
  if (isImg) return { url: await shrinkImage(file), kind: "image", name: file.name, size: file.size };
  return { url: URL.createObjectURL(file), kind: "video", name: file.name, size: file.size };
}

/** Restore the original dummy data. */
export async function resetDemoData() {
  db = buildDataset(); persist();
  try { localStorage.removeItem("manygym.passwords.v1"); } catch { /* ignore */ }
  notify();
}
