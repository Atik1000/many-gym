/*
 * Service worker for web push (see lib/push.ts).
 *
 * Every push lands here. FCM delivers each one as a push event whose JSON is `{ notification: { title, body }, data: { … } }` — the shapes in section 5 of the
 * notifications spec. It deliberately does not load the Firebase SDK: showing a notification and opening a
 * page needs none of it, and that keeps the Firebase config out of this file.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const appWindows = () => self.clients.matchAll({ type: "window", includeUncontrolled: true });

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  const note = payload.notification || {};
  const data = payload.data || {};
  const title = note.title || data.title;
  if (!title) return;

  event.waitUntil(
    appWindows().then((wins) => {
      // With the app in front a system notification would only repeat what is on screen: tell the page
      // instead, and its bell updates.
      const front = wins.filter((w) => w.visibilityState === "visible" && w.focused);
      if (front.length) {
        front.forEach((w) => w.postMessage({ type: "manygym:push-received", data }));
        return undefined;
      }
      return self.registration.showNotification(title, {
        body: note.body || data.body || "",
        icon: note.icon || "/favicon.ico",
        // One per conversation or target, so a burst replaces itself instead of stacking.
        tag: data.conversation_id || data.target_id || payload.fcmMessageId || undefined,
        data,
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  // Chat pushes carry `type: "chat_message"`; everything else is an in-app notification.
  const fallback = data.type === "chat_message" ? "/messages" : "/";

  event.waitUntil(
    appWindows().then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        // The page knows the app's routes; let it decide where this notification leads.
        open.postMessage({ type: "manygym:push-click", data });
        return open.focus();
      }
      return self.clients.openWindow(fallback);
    }),
  );
});
