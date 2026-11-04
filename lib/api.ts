"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { GymProfile } from "./gym-data";
import { IMAGE_TYPES, VIDEO_TYPES } from "./media";
import { ApiError, currentGymId } from "./api/http";
import { clearAmenityIndex, gymProfile, leads, loadGym, members, people, plans, posts, resolveCatalogIds, roles, routines } from "./api/adapters";
import * as endpoints from "./api/endpoints";
import { asArray } from "./api/adapters";

/**
 * Front-end data layer, backed by the Many Gym API (https://v0.manygym.com/api/v1).
 *
 * Screens keep the setState-style API they were written against — `const [members, setMembers] = useResource("members")` —
 * but reads now come from the server and writes are diffed into REST calls. Everything a screen renders is a
 * cached server response; a failed write is rolled back and surfaced through `reportError`.
 */

type Rec = { id: string };

/** What each resource name maps to on the server. `readOnly` resources have no create/update/delete path. */
type Entity<X extends Rec = Rec> = {
  list: () => Promise<X[]>;
  /** Full record from the detail endpoint. List rows are summaries, so detail screens need this. */
  get?: (id: string) => Promise<X>;
  create?: (item: X) => Promise<unknown>;
  update?: (item: X) => Promise<unknown>;
  remove?: (id: string) => Promise<unknown>;
  /** A resource that needs a gym-context token; skipped while the token is personal-context. */
  gymScoped?: boolean;
  /**
   * The part of a record the server actually stores. Used to decide whether an edit is worth a request:
   * without it, changing a field the API has no concept of (liking a post, say) would fire a pointless
   * PATCH — which a non-owner gets a 403 on.
   */
  signature?: (x: Rec) => string;
};

const REGISTRY: Record<string, Entity> = {
  plans: { list: plans.list, get: plans.get, create: (p) => plans.create(p as never), update: (p) => plans.update(p as never), remove: plans.remove, gymScoped: true },
  members: { list: members.list, get: members.get, create: (m) => members.create(m as never), update: (m) => members.update(m as never), remove: members.remove, gymScoped: true },
  leads: { list: leads.list, get: leads.get, create: (l) => leads.create(l as never), update: (l) => leads.update(l as never), remove: leads.remove, gymScoped: true },
  routines: { list: routines.list, get: routines.get, create: (r) => routines.create(r as never), update: (r) => routines.update(r as never), remove: routines.remove, gymScoped: true },
  posts: {
    list: posts.list,
    create: (p) => posts.create(p as never),
    update: (p) => posts.update(p as never),
    remove: posts.remove,
    gymScoped: true,
    // Likes, comments and pinning don't exist server-side, so they must not count as a change.
    signature: (p) => {
      const post = p as unknown as { text?: string; members?: boolean; media?: { id: string }[] };
      return `${post.text ?? ""}|${post.members ?? false}|${(post.media ?? []).map((m) => m.id).join(",")}`;
    },
  },
  people: {
    list: people.list,
    // Staff are invited by email against a role, never created wholesale.
    create: (p) => people.invite((p as unknown as { email: string }).email, (p as unknown as { roleId: string }).roleId),
    remove: people.revoke,
    gymScoped: true,
  },
  roles: {
    list: roles.list,
    create: (r) => {
      const role = r as unknown as { name: string; description?: string };
      return roles.create(role.name, role.description ?? "", []);
    },
    update: (r) => {
      const role = r as unknown as { id: string; name: string; description?: string };
      return roles.update(role.id, { name: role.name, description: role.description });
    },
    remove: roles.remove,
    gymScoped: true,
  },
  leadReasons: {
    list: async () => {
      const dir = (await leads.reasons()) as { custom_reasons?: unknown } | null;
      // The leads screen reads `label`; the API calls it `reason_name`.
      return asArray<{ id?: string; reason_name?: string }>(dir?.custom_reasons).map((r) => ({
        id: String(r.id ?? ""),
        label: String(r.reason_name ?? ""),
      })) as unknown as Rec[];
    },
    create: (r) => leads.addReason((r as unknown as { label: string }).label),
    gymScoped: true,
  },
};

export type Resource = keyof typeof REGISTRY;

// ---------------------------------------------------------------- store

type State = "idle" | "loading" | "ready" | "error";
const cache = new Map<string, Rec[]>();
const state = new Map<string, State>();
const inflight = new Map<string, Promise<void>>();
let gymCache: GymProfile | null = null;
let gymState: State = "idle";

/**
 * Bumped whenever every cache is dropped (signing in, switching gym). The fetch effects below depend on it, so
 * an invalidation re-runs them — without it, `invalidateAll()` would empty the caches and nothing would ask for
 * the data again until the component happened to remount.
 */
let epoch = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const reportError = (message: string) =>
  typeof window !== "undefined" && window.dispatchEvent(new CustomEvent("manygym:api-error", { detail: message }));

const say = (e: unknown, fallback: string) =>
  reportError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback);

const EMPTY: never[] = [];

function fetchResource(name: string): Promise<void> {
  const running = inflight.get(name);
  if (running) return running;
  const entity = REGISTRY[name];
  if (!entity) return Promise.resolve();
  if (entity.gymScoped && !currentGymId()) {
    // No gym selected yet — present an empty list rather than firing a call that must 400.
    cache.set(name, []);
    state.set(name, "ready");
    notify();
    return Promise.resolve();
  }
  state.set(name, "loading");
  const p = entity
    .list()
    .then((rows) => {
      cache.set(name, rows);
      state.set(name, "ready");
    })
    .catch((e) => {
      state.set(name, "error");
      if (!cache.has(name)) cache.set(name, []);
      say(e, `Couldn't load ${name}.`);
    })
    .finally(() => {
      inflight.delete(name);
      notify();
    });
  inflight.set(name, p);
  return p;
}

/** Refetch one resource from the server now (after an action that changed it through its own endpoint). */
export async function refreshResource(name: string): Promise<void> {
  state.delete(name);
  await fetchResource(name);
}

/** Drop every cached list so the next render refetches (used after switching gym context). */
export function invalidateAll() {
  epoch += 1;
  cache.clear();
  state.clear();
  recordCache.clear();
  recordState.clear();
  gymCache = null;
  gymState = "idle";
  notify();
}

/** A list resource: `const [members, setMembers, ready] = useResource<Member>("members")`. */
export function useResource<T extends Rec>(name: string): [T[], (u: T[] | ((p: T[]) => T[])) => void, boolean] {
  const data = useSyncExternalStore(
    subscribe,
    () => (cache.get(name) ?? EMPTY) as unknown as T[],
    () => EMPTY as unknown as T[],
  );
  // "error" counts as settled: the fetch finished, it just failed. Treating it as pending would leave the
  // screen on a loading skeleton for good.
  const ready = useSyncExternalStore(subscribe, () => {
    const s = state.get(name);
    return s === "ready" || s === "error";
  }, () => false);

  const era = useSyncExternalStore(subscribe, () => epoch, () => 0);
  useEffect(() => {
    if (!state.get(name)) void fetchResource(name);
  }, [name, era]);

  const set = useCallback((u: T[] | ((p: T[]) => T[])) => void writeResource<T>(name, u), [name]);
  return [data, set, ready];
}

/**
 * Applies a setState-style change by diffing it against the cached list and sending the matching
 * create / update / delete calls, then refetching so server-assigned ids and derived fields land.
 */
export async function writeResource<T extends Rec>(name: string, u: T[] | ((p: T[]) => T[])): Promise<void> {
  const entity = REGISTRY[name];
  const prev = (cache.get(name) ?? []) as unknown as T[];
  const next = typeof u === "function" ? (u as (p: T[]) => T[])(prev) : u;
  if (next === prev || !entity) return;

  cache.set(name, next as unknown as Rec[]); // optimistic
  notify();

  const prevById = new Map(prev.map((r) => [r.id, r]));
  const nextById = new Map(next.map((r) => [r.id, r]));
  const created = next.filter((r) => !prevById.has(r.id));
  const removed = prev.filter((r) => !nextById.has(r.id));
  const sig = entity.signature ?? ((x: Rec) => JSON.stringify(x));
  const updated = next.filter((r) => {
    const before = prevById.get(r.id);
    return before && sig(before) !== sig(r);
  });

  const problems: string[] = [];
  const run = async (what: string, fn: (() => Promise<unknown>) | undefined) => {
    if (!fn) {
      problems.push(`${what} isn't supported by the API`);
      return;
    }
    try {
      await fn();
    } catch (e) {
      problems.push(e instanceof ApiError ? e.message : `${what} failed`);
    }
  };

  for (const r of removed) await run(`Deleting this ${name} record`, entity.remove && (() => entity.remove!(r.id)));
  for (const r of created) await run(`Creating this ${name} record`, entity.create && (() => entity.create!(r)));
  for (const r of updated) await run(`Saving this ${name} record`, entity.update && (() => entity.update!(r)));

  for (const r of [...created, ...updated, ...removed]) {
    recordCache.delete(`${name}:${r.id}`);
    recordState.delete(`${name}:${r.id}`);
  }
  state.delete(name);
  await fetchResource(name); // reconcile with the server's view
  if (problems.length) reportError(problems[0]);
}

// ---------------------------------------------------------------- single records

const recordCache = new Map<string, Rec>();
const recordState = new Map<string, State>();

/**
 * One full record: `const [member, ready] = useRecord<Member>("members", id)`.
 *
 * List endpoints return trimmed summary rows (a member without their subscriptions, a plan without its
 * amenities), so any screen showing a whole record loads it from the detail endpoint instead of the list cache.
 */
export function useRecord<T extends Rec>(name: string, id: string | undefined): [T | null, boolean] {
  const key = `${name}:${id ?? ""}`;
  const data = useSyncExternalStore(subscribe, () => (recordCache.get(key) ?? null) as T | null, () => null);
  const ready = useSyncExternalStore(subscribe, () => {
    const s = recordState.get(key);
    return s === "ready" || s === "error";
  }, () => false);

  const era = useSyncExternalStore(subscribe, () => epoch, () => 0);
  useEffect(() => {
    const entity = REGISTRY[name];
    if (!id || !entity?.get || recordState.get(key)) return;
    if (entity.gymScoped && !currentGymId()) return;
    recordState.set(key, "loading");
    entity
      .get(id)
      .then((row) => {
        recordCache.set(key, row);
        recordState.set(key, "ready");
      })
      .catch((e) => {
        recordState.set(key, "error");
        say(e, `Couldn't load this ${name} record.`);
      })
      .finally(notify);
  }, [name, id, key, era]);

  return [data, ready];
}

/** Forget a cached record so the next render refetches it (after a save, for example). */
export function invalidateRecord(name: string, id: string) {
  recordCache.delete(`${name}:${id}`);
  recordState.delete(`${name}:${id}`);
  notify();
}

export const readResource = <T extends Rec>(name: string) => (cache.get(name) ?? EMPTY) as unknown as T[];

// ---------------------------------------------------------------- the gym profile

/** The single gym-profile record, assembled from five endpoints and saved back section by section. */
/** Reloads the composite gym record (the five endpoints behind it). */
async function reloadGym(): Promise<void> {
  gymState = "loading";
  notify();
  try {
    gymCache = await loadGym();
    gymState = "ready";
  } catch (e) {
    gymState = "error";
    say(e, "Couldn't reload the gym profile.");
  }
  notify();
}

export function useGym(): [GymProfile | null, (u: GymProfile | ((p: GymProfile) => GymProfile)) => void, boolean] {
  const data = useSyncExternalStore(subscribe, () => gymCache, () => null);
  const ready = useSyncExternalStore(subscribe, () => gymState === "ready" || gymState === "error", () => false);

  const era = useSyncExternalStore(subscribe, () => epoch, () => 0);
  useEffect(() => {
    if (gymState !== "idle") return;
    gymState = "loading";
    loadGym()
      .then((g) => {
        gymCache = g;
        gymState = "ready";
      })
      .catch((e) => {
        gymState = "error";
        say(e, "Couldn't load the gym profile.");
      })
      .finally(notify);
  }, [era]);

  const set = useCallback((u: GymProfile | ((p: GymProfile) => GymProfile)) => {
    const prev = gymCache;
    if (!prev) return;
    const next = typeof u === "function" ? u(prev) : u;
    if (next === prev) return;
    gymCache = next;
    notify();
    void saveGym(prev, next);
  }, []);

  return [data, set, ready];
}

/** Only the sections that actually changed are sent, since each tab is a different endpoint. */
async function saveGym(prev: GymProfile, next: GymProfile) {
  const changed = (pick: (g: GymProfile) => unknown) => JSON.stringify(pick(prev)) !== JSON.stringify(pick(next));
  const jobs: Promise<unknown>[] = [];

  if (changed((g) => g.overview)) jobs.push(gymProfile.saveOverview(next));
  if (changed((g) => g.location)) jobs.push(gymProfile.saveLocation(next));
  if (changed((g) => g.hours)) jobs.push(gymProfile.saveHours(next));

  if (changed((g) => g.gallery)) {
    const before = new Map(prev.gallery.map((g) => [g.id, g]));
    const after = new Map(next.gallery.map((g) => [g.id, g]));
    for (const item of prev.gallery) if (!after.has(item.id)) jobs.push(gymProfile.removeGalleryItem(item.id));
    for (const item of next.gallery) if (!before.has(item.id)) jobs.push(gymProfile.addGalleryItem(item));
    const order = next.gallery.filter((g) => before.has(g.id)).map((g) => g.id);
    if (order.length > 1) jobs.push(gymProfile.reorderGallery(order));
  }

  if (changed((g) => g.amenities)) {
    // The sync endpoint takes master *catalog* ids (not the gym's row ids) — see resolveCatalogIds.
    try {
      const [free, paid] = await Promise.all([
        resolveCatalogIds(next.amenities.free),
        resolveCatalogIds(next.amenities.paid),
      ]);
      jobs.push(
        gymProfile
          .syncAmenities(free, paid.map((amenity_id) => ({ amenity_id, default_price: "0.00" })))
          // Syncing mints new gym-row ids, so the cached name→id index is now stale.
          .then((r) => { clearAmenityIndex(); return r; }),
      );
    } catch (e) {
      say(e, "Couldn't load the amenities catalog.");
    }
  }

  const outcomes = await Promise.allSettled(jobs);
  const failed = outcomes.find((o) => o.status === "rejected");
  if (failed && failed.status === "rejected") {
    gymCache = prev; // roll back the optimistic edit
    notify();
    say(failed.reason, "Couldn't save the gym profile.");
    return;
  }
  await reloadGym(); // pick up ids and derived fields the server assigned
}

// ---------------------------------------------------------------- media

export type Uploaded = {
  /** A local preview URL, for showing the picture before it is saved. */
  url: string;
  /** The picked file itself — what actually gets uploaded. */
  file: File;
  kind: "image" | "video";
  name: string;
  size: number;
};
const MB = 1024 * 1024;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Couldn't read the file"));
    r.readAsDataURL(blob);
  });

async function shrinkImage(file: File): Promise<string> {
  const src = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Couldn't read the image"));
    i.src = src;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/**
 * Prepares a picked file: a local preview to show immediately, plus the file itself for the upload.
 *
 * The gallery and gym-profile endpoints take a binary `multipart/form-data` field, so the **file** is what
 * gets sent. The data: URL is only for the preview — the JSON form caps `media_url` at 1000 characters and
 * rejects it. The server resizes and converts to WebP itself, so the original is uploaded untouched.
 */
export async function uploadFile(file: File): Promise<Uploaded> {
  const isImg = IMAGE_TYPES.includes(file.type);
  const isVid = VIDEO_TYPES.includes(file.type);
  if (!isImg && !isVid) throw new Error(`${file.name}: unsupported format`);
  if (isImg && file.size > 10 * MB) throw new Error(`${file.name}: photo exceeds 10 MB`);
  if (isVid && file.size > 200 * MB) throw new Error(`${file.name}: video exceeds 200 MB`);
  const url = isImg ? await shrinkImage(file) : URL.createObjectURL(file);
  return { url, file, kind: isImg ? "image" : "video", name: file.name, size: file.size };
}

/** Refetch everything from the server (replaces the old "reset demo data"). */
export async function resetDemoData() {
  invalidateAll();
  await Promise.all(Object.keys(REGISTRY).map(fetchResource));
}

export { endpoints };
