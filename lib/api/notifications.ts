"use client";

/**
 * In-app notifications and push device tokens — `/api/v1/notifications/…`.
 *
 * The list is newest first and paginated; `unread-count/` feeds the bell's badge. A notification is read one
 * at a time (`PATCH {id}/read/`), several at once (`batch-read/`) or all together (`mark-all-read/`), and is
 * removed one at a time (`DELETE {id}/`) or, for everything already read, with `clear-read/`.
 *
 * Whose notifications these are — the person's, or the gym's while the session is in gym context — comes from
 * the token. The spec also offers an optional `X-Gym-Context` header for that; it is not sent, because this app
 * always holds a token minted for the context it is showing (known-issues #42).
 *
 * `batch-read/` and `clear-read/` were missing from the deployment this was first written against (they are
 * served now), so each keeps a fallback built from the per-notification routes.
 *
 * New notifications also arrive live on the chat WebSocket as `notification.alert`; the socket re-broadcasts
 * them as a `NOTIFICATION_EVENT` window event so the bell does not need a connection of its own.
 */
import { firstAvailable } from "./fallback";
import { mediaUrl, request } from "./http";

export const NOTIFICATION_TYPES = [
  "reaction", "comment", "comment_reply", "member_request", "member_request_accepted", "member_request_rejected",
  "gym_invite", "follow", "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationParty = { id: string; name: string; avatarUrl: string };

export type Notification = {
  id: string;
  /** One of `NOTIFICATION_TYPES`; anything the server adds later is shown as "system". */
  type: NotificationType;
  title: string;
  body: string;
  targetType: string;
  targetId: string;
  /** The server's own deep link (`/posts/{id}`, `/gyms/{id}/requests`). Not an app route — see `notificationHref`. */
  actionUrl: string;
  read: boolean;
  createdAt: string;
  /** The person who caused it, when there is one. */
  actor: NotificationParty | null;
  /** The gym page that caused it, when it was done as a gym. */
  actorGym: NotificationParty | null;
  /** The gym it is about. */
  gym: NotificationParty | null;
  /** The extra ids the server attaches (`comment_id`, `post_id`, `gym_id`, …). */
  data: Record<string, string>;
};

export type NotificationPage = { rows: Notification[]; count: number; hasMore: boolean };

/** Fired on `window` with the raw `notification.alert` payload as `detail`. */
export const NOTIFICATION_EVENT = "manygym:notification";

// ---------------------------------------------------------------- mapping

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const party = (raw: unknown, nameKey: string, photoKey: string): NotificationParty | null => {
  const o = obj(raw);
  const id = str(o.id);
  return id ? { id, name: str(o[nameKey]), avatarUrl: mediaUrl(str(o[photoKey])) } : null;
};

/** Reads a REST row and a `notification.alert` socket event alike (the event has no actor or gym). */
export function notificationFromApi(raw: unknown): Notification {
  const o = obj(raw);
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(o.data))) if (typeof v === "string" || typeof v === "number") data[k] = String(v);
  const type = str(o.notification_type) || data.notification_type;
  return {
    id: str(o.id),
    type: (NOTIFICATION_TYPES as readonly string[]).includes(type) ? (type as NotificationType) : "system",
    title: str(o.title),
    body: str(o.body),
    targetType: str(o.target_type) || data.target_type || "",
    targetId: str(o.target_id) || data.target_id || "",
    actionUrl: str(o.action_url) || data.action_url || "",
    read: o.is_read === true,
    createdAt: str(o.created_at),
    actor: party(o.actor, "full_name", "profile_photo"),
    actorGym: party(o.actor_gym, "name", "logo_url"),
    gym: party(o.gym, "name", "logo_url"),
    data,
  };
}

// ---------------------------------------------------------------- reads

const ROOT = "/api/v1/notifications/";
const one = (id: string, tail = "") => `${ROOT}${encodeURIComponent(id)}/${tail}`;

export type NotificationFilter = {
  unread?: boolean;
  type?: NotificationType;
  /** Only notifications about one kind of thing (`post`, `comment`, `member_request`, …) … */
  targetType?: string;
  /** … or about one particular thing. */
  targetId?: string;
  page?: number;
  /** The server caps this at 100. */
  pageSize?: number;
};

/** Newest first. `unread` narrows to what hasn't been read; `type` to one kind. */
export async function listNotifications(o: NotificationFilter = {}): Promise<NotificationPage> {
  const page = o.page ?? 1;
  const raw = await request<unknown>("GET", ROOT, {
    query: {
      is_read: o.unread ? false : undefined, notification_type: o.type,
      target_type: o.targetType || undefined, target_id: o.targetId || undefined,
      page, page_size: Math.min(o.pageSize ?? 20, 100),
    },
  });
  // The envelope is what is documented and served; an early schema said a bare array, so take either.
  const env = obj(raw);
  const results = Array.isArray(raw) ? raw : Array.isArray(env.results) ? env.results : [];
  const rows = results.map(notificationFromApi).filter((n) => n.id);
  return {
    rows,
    count: typeof env.count === "number" ? env.count : rows.length,
    hasMore: env.next != null ? !!env.next : num(env.total_pages) > (num(env.current_page) || page),
  };
}

/** One notification by id — e.g. to fill in the actor and gym a push or socket alert leaves out. */
export const getNotification = async (id: string): Promise<Notification> =>
  notificationFromApi(await request<unknown>("GET", one(id)));

export const unreadNotificationCount = async (): Promise<number> =>
  num(obj(await request<unknown>("GET", `${ROOT}unread-count/`)).unread_count);

// ---------------------------------------------------------------- writes

export const markNotificationRead = async (id: string): Promise<Notification> =>
  notificationFromApi(await request<unknown>("PATCH", one(id, "read/"), { body: {} }));

/** Returns how many were marked. */
export const markAllNotificationsRead = async (): Promise<number> =>
  num(obj(await request<unknown>("POST", `${ROOT}mark-all-read/`, { body: {} })).marked_read_count);

/** `batch-read/` takes at most this many ids per request. */
const BATCH_MAX = 100;

/** Marks these as read through `batch-read/` (100 at a time) where the server has it, one by one where it doesn't. */
export function markNotificationsRead(ids: string[]): Promise<number> {
  if (!ids.length) return Promise.resolve(0);
  return firstAvailable<number>("notifications:batch-read", [
    {
      path: "POST /notifications/batch-read/",
      call: async () => {
        let marked = 0;
        for (let i = 0; i < ids.length; i += BATCH_MAX) {
          marked += num(obj(await request<unknown>("POST", `${ROOT}batch-read/`, { body: { notification_ids: ids.slice(i, i + BATCH_MAX) } })).marked_read_count);
        }
        return marked;
      },
    },
    {
      path: "PATCH /notifications/{notification_id}/read/",
      call: async () => (await Promise.allSettled(ids.map(markNotificationRead))).filter((r) => r.status === "fulfilled").length,
    },
  ]);
}

export const deleteNotification = (id: string): Promise<void> => request<void>("DELETE", one(id));

/** Permanently removes every notification that has been read. Returns how many went. */
export function clearReadNotifications(): Promise<number> {
  return firstAvailable<number>("notifications:clear-read", [
    {
      path: "DELETE /notifications/clear-read/",
      call: async () => num(obj(await request<unknown>("DELETE", `${ROOT}clear-read/`)).deleted_count),
    },
    {
      // No bulk route here: find the read ones and remove each. Deleting shifts the pages, so re-read page 1.
      path: "DELETE /notifications/{notification_id}/",
      call: async () => {
        let deleted = 0;
        for (let round = 0; round < 20; round += 1) {
          const { rows } = await listNotifications({ pageSize: 100 });
          const read = rows.filter((n) => n.read);
          if (!read.length) break;
          const done = (await Promise.allSettled(read.map((n) => deleteNotification(n.id)))).filter((r) => r.status === "fulfilled").length;
          deleted += done;
          if (done < read.length || rows.length < 100) break;
        }
        return deleted;
      },
    },
  ]);
}

// ---------------------------------------------------------------- where a notification leads

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * The page in this app a notification opens, or null when there is nowhere useful to go.
 *
 * The server's `action_url` names routes this app doesn't have, so the destination is worked out from the
 * notification's type and target instead. `postHref` builds the link to one of the viewer's own posts (the
 * gym's post page in gym context) and may return null when it can't.
 */
export function notificationHref(n: Notification, ctx: { userId?: string; postHref?: (postId: string) => string | null }): string | null {
  const gymId = n.gym?.id || n.data.gym_id || "";
  switch (n.type) {
    case "member_request":
      return "/members?view=requests";
    case "member_request_accepted":
    case "member_request_rejected":
    case "gym_invite":
      return gymId ? `/gyms/${gymId}` : n.actorGym ? `/gyms/${n.actorGym.id}` : null;
    case "follow":
      // A push or socket alert carries no actor object, only `actor_id`.
      return n.actorGym ? `/gyms/${n.actorGym.id}` : n.actor ? `/users/${n.actor.id}` : n.data.actor_id ? `/users/${n.data.actor_id}` : null;
    default:
  }
  const postId = n.targetType === "post" ? n.targetId : n.data.post_id || (/\/posts\//.test(n.actionUrl) ? (n.actionUrl.match(UUID)?.[0] ?? "") : "");
  if (postId) return ctx.postHref?.(postId) ?? (ctx.userId ? `/users/${ctx.userId}` : null);
  if (n.targetType === "user" && n.targetId) return `/users/${n.targetId}`;
  if (n.targetType === "gym" && n.targetId) return `/gyms/${n.targetId}`;
  return null;
}

// ---------------------------------------------------------------- push device tokens

export type DevicePlatform = "android" | "ios" | "web";

export type Device = { id: string; deviceId: string; name: string; platform: DevicePlatform; active: boolean; lastSeenAt: string; createdAt: string };

const deviceOf = (raw: unknown): Device => {
  const o = obj(raw);
  const platform = str(o.platform);
  return {
    id: str(o.id),
    deviceId: str(o.device_id),
    name: str(o.device_name),
    platform: platform === "ios" || platform === "web" ? platform : "android",
    active: o.is_active !== false,
    lastSeenAt: str(o.last_seen_at),
    createdAt: str(o.created_at),
  };
};

/** The push tokens registered to the signed-in person (never the gym: devices belong to people). */
export async function listDevices(): Promise<Device[]> {
  const raw = await request<unknown>("GET", `${ROOT}devices/`);
  const rows = Array.isArray(raw) ? raw : Array.isArray(obj(raw).results) ? (obj(raw).results as unknown[]) : [];
  return rows.map(deviceOf).filter((d) => d.id);
}

/** Register an FCM token, or refresh one already known. Call on launch and whenever FCM rotates the token. */
export const registerDevice = async (d: { token: string; deviceId?: string; name?: string; platform?: DevicePlatform }): Promise<Device> =>
  deviceOf(await request<unknown>("POST", `${ROOT}devices/`, {
    body: { token: d.token, device_id: d.deviceId ?? "", device_name: d.name ?? "", platform: d.platform ?? "web" },
  }));

/** Stop pushes to this token — call before signing out, while the session can still authenticate. */
export const unregisterDevice = async (token: string): Promise<boolean> =>
  obj(await request<unknown>("POST", `${ROOT}devices/unregister/`, { body: { token } })).unregistered !== false;
