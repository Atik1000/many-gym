"use client";

import { MotionLink } from "@/components/ui/Motion";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { LuLock as Lock } from "react-icons/lu";
import { PEOPLE_KEY, ROLES_KEY, type Person, type Role } from "@/lib/people";
import { useResource } from "@/lib/api";
import { SESSION_KEY, signOut } from "@/lib/auth";
import { NAV } from "@/lib/nav";
import { btnPrimary, card } from "@/lib/ui";

// "Who am I" is the person remembered by lib/auth.ts. The checks below decide what to show and block in the UI;
// a real backend must enforce the same permissions on every request.
type Auth = {
  ready: boolean;
  user: Person | null;
  role: Role | null;
  can: (permission: string) => boolean;
  /** Trainers only see members assigned to them (spec). */
  trainerOnly: boolean;
  logout: () => void;
};
const AuthCtx = createContext<Auth | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};

const subscribeSession = (cb: () => void) => {
  window.addEventListener("manygym:session", cb); window.addEventListener("storage", cb);
  return () => { window.removeEventListener("manygym:session", cb); window.removeEventListener("storage", cb); };
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [people, , pReady] = useResource<Person>(PEOPLE_KEY);
  const [roles] = useResource<Role>(ROLES_KEY);
  const sessionId = useSyncExternalStore(subscribeSession, () => localStorage.getItem(SESSION_KEY), () => null);

  const user = useMemo(() => people.find((p) => p.id === sessionId && p.status === "active") ?? null, [people, sessionId]);
  const role = useMemo(() => roles.find((r) => r.id === user?.roleId) ?? null, [roles, user]);
  const signedOut = pReady && !user; // no session, or that person was removed
  useEffect(() => { if (signedOut) router.replace("/login"); }, [signedOut, router]);

  const value = useMemo<Auth>(() => {
    const granted = new Set(Object.values(role?.permissions ?? {}).flat());
    return {
      ready: pReady && !!user && !!role, user, role,
      can: (perm) => granted.has(perm), trainerOnly: role?.id === "trainer",
      logout: () => { signOut(); router.replace("/login"); },
    };
  }, [pReady, user, role, router]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/** Page-level gate: shows a "no access" card instead of the page when the role lacks the permission. */
export function Guard({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { ready, can, role } = useAuth();
  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  if (can(perm)) return <>{children}</>;
  const home = NAV.find((n) => n.ready && (!n.perm || can(n.perm))); // first page this role can actually open
  return (
    <div className={`${card} mx-auto mt-10 max-w-md p-10 text-center`}>
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bad-bg text-bad"><Lock size={22} /></span>
      <h2 className="text-xl font-bold">You don&apos;t have access</h2>
      <p className="mb-5 mt-1 text-muted">Your role ({role?.name ?? "none"}) doesn&apos;t include “{perm}”. Ask an Administrator to update your role.</p>
      {home && <MotionLink href={home.href} className={btnPrimary}>Go to {home.label}</MotionLink>}
    </div>
  );
}

/** Small banner for read-only views. */
export function ViewOnly({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mb-4 flex items-center gap-2 rounded-xl bg-warn-bg px-4 py-2.5 text-warn"><Lock size={16} />View only — your role can&apos;t make changes here.</p>;
}

/** Renders children only if the role has the permission. */
export function Can({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { ready, can } = useAuth();
  return ready && can(perm) ? <>{children}</> : null;
}

/** Disables every field/button inside (and blocks pointer events) unless the role has the permission. */
export function EditableIf({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { ready, can } = useAuth();
  const allowed = !ready || can(perm);
  return (
    <>
      <ViewOnly show={!allowed} />
      <fieldset disabled={!allowed} className="m-0 min-w-0 border-0 p-0 disabled:pointer-events-none disabled:opacity-75">{children}</fieldset>
    </>
  );
}
