"use client";

// Front-end-only sign-in. There's no server, so "login" checks the dummy people stored in this browser and remembers
// the person in localStorage. Replace signIn/… with calls to a real login API later; the rest of the app only uses
// `useAuth()` (components/AuthProvider.tsx).
import { readResource, writeResource } from "./api";
import { PEOPLE_KEY, type Person } from "./people";

export const SESSION_KEY = "manygym.session.v1";
const PASS_KEY = "manygym.passwords.v1";
/** Every seeded person signs in with this until they set their own. */
export const DEMO_PASSWORD = "manygym123";
export const MIN_PASSWORD = 8;

const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; } };
const passwords = () => read<Record<string, string>>(PASS_KEY, {});
const people = () => readResource<Person>(PEOPLE_KEY);
const notifySession = () => window.dispatchEvent(new Event("manygym:session"));

// Accounts that have signed in on this device (like Facebook's saved profiles). Only these can be switched to without a password.
const KNOWN_KEY = "manygym.accounts.v1";
export const knownAccountIds = () => read<string[]>(KNOWN_KEY, []);
export function rememberAccount(personId: string) {
  const ids = knownAccountIds();
  if (!ids.includes(personId)) localStorage.setItem(KNOWN_KEY, JSON.stringify([...ids, personId]));
}

function startSession(personId: string) { rememberAccount(personId); localStorage.setItem(SESSION_KEY, personId); notifySession(); }
/** Signing out forgets this account on the device, so signing back in needs the password again. */
export function signOut() {
  const me = localStorage.getItem(SESSION_KEY);
  if (me) localStorage.setItem(KNOWN_KEY, JSON.stringify(knownAccountIds().filter((id) => id !== me)));
  localStorage.removeItem(SESSION_KEY); notifySession();
}
/** Switch to another account that is already signed in on this device. Returns false if it isn't. */
export function switchAccount(personId: string): boolean {
  if (!knownAccountIds().includes(personId) || !people().some((p) => p.id === personId && p.status === "active")) return false;
  localStorage.setItem(SESSION_KEY, personId); notifySession();
  return true;
}

// brute-force brake: 5 wrong passwords lock that email for a minute
const tries = new Map<string, { n: number; until: number }>();

/** Returns an error message, or null when signed in. */
export function signIn(emailRaw: string, password: string): string | null {
  const email = emailRaw.trim().toLowerCase();
  const t = tries.get(email) ?? { n: 0, until: 0 };
  if (t.until > Date.now()) return `Too many attempts. Try again in ${Math.ceil((t.until - Date.now()) / 1000)} seconds.`;
  const person = people().find((p) => p.email.toLowerCase() === email && p.status === "active");
  if (person && password === (passwords()[person.id] ?? DEMO_PASSWORD)) { tries.delete(email); startSession(person.id); return null; }
  t.n += 1; if (t.n >= 5) { t.n = 0; t.until = Date.now() + 60_000; }
  tries.set(email, t);
  return "Wrong email or password";
}

export function changePassword(personId: string, current: string, next: string): string | null {
  if ((passwords()[personId] ?? DEMO_PASSWORD) !== current) return "Your current password is wrong";
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  localStorage.setItem(PASS_KEY, JSON.stringify({ ...passwords(), [personId]: next }));
  return null;
}

/** The invited person for an invitation link (the link's code is their id in this front-end demo). */
export const invitedPerson = (code: string) => people().find((p) => p.id === code && p.status === "invited") ?? null;

export function acceptInvite(code: string, name: string, password: string): string | null {
  const p = invitedPerson(code);
  if (!p) return "This invitation link is invalid or has already been used";
  if (!name.trim()) return "Enter your name";
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  localStorage.setItem(PASS_KEY, JSON.stringify({ ...passwords(), [p.id]: password }));
  writeResource<Person>(PEOPLE_KEY, (l) => l.map((x) => (x.id === p.id ? { ...x, name: name.trim(), status: "active" as const } : x)));
  startSession(p.id);
  return null;
}
