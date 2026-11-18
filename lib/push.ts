"use client";

/**
 * Web push through Firebase Cloud Messaging.
 *
 * The browser asks FCM for a registration token; that token is handed to the API (`POST
 * /notifications/devices/`, platform `web`), and the backend pushes to it. Pushes that arrive while the app is
 * closed or in the background are shown by the service worker in `public/firebase-messaging-sw.js`; while the
 * app is in front the worker passes them to the page instead, where they simply nudge the bell.
 *
 * Everything is driven by `NEXT_PUBLIC_FIREBASE_*` (see `.env.example`). Until those are set `pushConfigured`
 * is false and nothing here does anything — no SDK is loaded, no permission is asked for.
 *
 * The Firebase project must be the one the backend sends from: a token is only valid inside the project that
 * issued it.
 */
import { NOTIFICATION_EVENT, registerDevice, unregisterDevice } from "./api/notifications";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** True once the deployment has been given a Firebase web app and its Web Push certificate. */
export const pushConfigured = !!(config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey);

export type PushState =
  /** No Firebase config, or a browser without service workers / push / notifications. */
  | "unavailable"
  /** Could be turned on; the person hasn't been asked (or dismissed the prompt). */
  | "off"
  /** Notifications are blocked for this site in the browser's settings. */
  | "blocked"
  | "on";

const SW_PATH = "/firebase-messaging-sw.js";
const TOKEN_KEY = "manygym.push.token";
const DEVICE_KEY = "manygym.push.device";
/** Fired on `window` whenever the answer of `pushState()` may have changed. */
export const PUSH_EVENT = "manygym:push";
/** What the service worker posts to an open tab: a push that arrived, and a click on one it had shown. */
const SW_RECEIVED = "manygym:push-received";
const SW_CLICK = "manygym:push-click";

const read = (k: string) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };
const write = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};
const changed = () => window.dispatchEvent(new Event(PUSH_EVENT));

const browserCan = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function pushState(): PushState {
  if (!pushConfigured || !browserCan()) return "unavailable";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && read(TOKEN_KEY) ? "on" : "off";
}

/** A stable id for this browser, so re-registering updates one device row instead of adding another. */
function deviceId(): string {
  let id = read(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(DEVICE_KEY, id);
  }
  return id;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

type Messaging = import("firebase/messaging").Messaging;
let messagingReady: Promise<Messaging | null> | null = null;

/** The SDK is loaded on demand — only for people who have push on, or are turning it on. */
function messaging(): Promise<Messaging | null> {
  messagingReady ??= (async () => {
    const [{ getApps, initializeApp }, fcm] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
    if (!(await fcm.isSupported())) return null;
    return fcm.getMessaging(getApps()[0] ?? initializeApp(config));
  })().catch(() => {
    messagingReady = null;
    return null;
  });
  return messagingReady;
}

/** Asks FCM for this browser's token and makes sure the API has it. Permission must already be granted. */
async function sync(): Promise<boolean> {
  const m = await messaging();
  if (!m) return false;
  const { getToken } = await import("firebase/messaging");
  const serviceWorkerRegistration = await navigator.serviceWorker.register(SW_PATH);
  const token = await getToken(m, { vapidKey, serviceWorkerRegistration });
  if (!token) return false;
  const previous = read(TOKEN_KEY);
  await registerDevice({ token, deviceId: deviceId(), name: deviceName(), platform: "web" });
  // FCM rotated the token: the old one is dead weight on the server.
  if (previous && previous !== token) await unregisterDevice(previous).catch(() => undefined);
  write(TOKEN_KEY, token);
  changed();
  return true;
}

/**
 * Listen to the service worker for the lifetime of the calling component. A push that arrives with the app in
 * front becomes a `NOTIFICATION_EVENT` (the bell re-reads on it); a click on a system notification is handed
 * to `onClick` with the push's `data`, for the page to navigate. Returns the cleanup.
 */
export function listenForPush(onClick: (data: Record<string, string>) => void): () => void {
  if (!pushConfigured || !browserCan()) return () => undefined;
  const onMessage = (e: MessageEvent) => {
    const msg = e.data as { type?: string; data?: Record<string, string> } | null;
    if (msg?.type === SW_RECEIVED) window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: msg.data ?? {} }));
    else if (msg?.type === SW_CLICK) onClick(msg.data ?? {});
  };
  navigator.serviceWorker.addEventListener("message", onMessage);
  return () => navigator.serviceWorker.removeEventListener("message", onMessage);
}

/**
 * Turn push on for this browser. Shows the browser's permission prompt, so call it from a click.
 * Resolves to the state afterwards; rejects only when the server refused the token.
 */
export async function enablePush(): Promise<PushState> {
  if (!pushConfigured || !browserCan()) return "unavailable";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") {
    changed();
    return pushState();
  }
  await sync();
  return pushState();
}

/**
 * On app start, for a signed-in person who already allowed notifications: refresh the token and tell the API
 * this device is still alive (`last_seen_at`). Never prompts.
 */
export async function resumePush(): Promise<void> {
  if (!pushConfigured || !browserCan() || Notification.permission !== "granted" || !read(TOKEN_KEY)) return;
  await sync().catch(() => undefined);
}

/**
 * Stop pushes to this browser. Call *before* the session is cleared on sign-out — unregistering needs the
 * access token — so the next person to use this browser doesn't get the last one's notifications.
 */
export async function disablePush(): Promise<void> {
  const token = read(TOKEN_KEY);
  if (!token) return;
  write(TOKEN_KEY, null);
  changed();
  await unregisterDevice(token).catch(() => undefined);
  try {
    const m = await messaging();
    if (m) await (await import("firebase/messaging")).deleteToken(m);
  } catch {
    // The server no longer sends to it; a token FCM still knows about is harmless.
  }
}
