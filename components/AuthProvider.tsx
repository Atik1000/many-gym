"use client";

import { MotionLink } from "@/components/ui/Motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LuLock as Lock, LuArrowRight, LuBuilding2, LuMapPin, LuUsers } from "react-icons/lu";
import { roles as rolesApi } from "@/lib/api/adapters";
import { getTokens, setUnauthorizedHandler } from "@/lib/api/http";
import { cachedMe, loadMe, signOut, type Me } from "@/lib/auth";
import { PERMISSION_SCOPES, cachePermissionCatalogue, matchScope, syncVocabulary } from "@/lib/permissions";
import type { Person, Role } from "@/lib/people";
import { HOME, NAV, PERSONAL_HOME, isPersonalPath } from "@/lib/nav";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

/**
 * "Who am I" now comes from the API: `/auth/me/` for the account, and the gym-context JWT for the gym and the
 * permission scopes that gym grants. A gym **owner** holds every permission; staff hold the scopes of their role.
 *
 * These checks only decide what the UI shows — the server enforces the same scopes on every request.
 */
type Auth = {
  ready: boolean;
  me: Me | null;
  /** The signed-in account in the shape the screens already render (name/email/role). */
  user: Person | null;
  /** The gym role this account holds, with its permissions expanded from the token's scopes. */
  role: Role | null;
  can: (permission: string) => boolean;
  /**
   * True for a signed-in person who isn't on any gym's team: no gym at all, or in a gym's context with no
   * permissions (a plain member). They get the personal menu and the personal routes only.
   */
  personal: boolean;
  /** Trainers only see members assigned to them (spec). */
  trainerOnly: boolean;
  logout: () => void;
  refresh: () => void;
};
const AuthCtx = createContext<Auth | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);

  const load = useCallback(() => {
    if (!getTokens()) {
      setMe(null);
      setChecked(true);
      return;
    }
    setMe(cachedMe()); // paint immediately from the last known profile
    loadMe()
      .then(setMe)
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  // Reached only once a silent refresh has failed (lib/api/http.ts) — the session is over, so sign in again.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMe(null);
      setChecked(true);
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  useEffect(() => {
    const onSession = () => load();
    window.addEventListener("manygym:session", onSession);
    window.addEventListener("storage", onSession);
    return () => {
      window.removeEventListener("manygym:session", onSession);
      window.removeEventListener("storage", onSession);
    };
  }, [load]);

  // Replace guessed scope strings with the server's real vocabulary, once.
  useEffect(() => {
    if (!me?.gymId) return;
    rolesApi
      .permissions()
      .then((payload) => {
        syncVocabulary(payload); // correct the guessed label→scope table
        cachePermissionCatalogue(payload); // and keep the ids the role editor needs
      })
      .catch(() => {});
  }, [me?.gymId]);

  const signedOut = checked && !me;
  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  const value = useMemo<Auth>(() => {
    const scopes = me?.scopes ?? [];
    const owner = !!me?.isOwner;
    const can = (perm: string) => owner || matchScope(perm, scopes);

    const user: Person | null = me
      ? { id: me.userId, name: me.name, email: me.email, roleId: me.gymId ?? "", roleName: me.roleName || (me.isOwner ? "Owner" : ""), roleSlug: (me.roleName || (me.isOwner ? "owner" : "")).toLowerCase().replace(/[\s_]+/g, "-"), status: "active" }
      : null;
    // Rebuild the UI's grouped permission list from whatever this token actually grants.
    const granted: Record<string, string[]> = {};
    for (const label of Object.keys(PERMISSION_SCOPES)) {
      if (!can(label)) continue;
      const group = label.replace(/^(View|Create|Edit|Delete|Manage|Remove|Invite\/add|Activate\/deactivate)\s+/, "");
      (granted[group] ??= []).push(label);
    }
    const role: Role | null = me
      ? { id: me.gymId ?? "", name: me.roleName || (owner ? "Owner" : "Member"), builtIn: !owner, permissions: granted }
      : null;

    return {
      ready: checked && !!me,
      me,
      user,
      role,
      // The owner of a gym is granted every permission across all topics (spec).
      can,
      personal: isPersonal(me),
      trainerOnly: /trainer/i.test(me?.roleName ?? ""),
      logout: () => {
        void signOut().then(() => router.replace("/login"));
      },
      refresh: load,
    };
  }, [checked, me, router, load]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/**
 * Whether this account is using manygym as a person rather than as part of a gym's team.
 *
 * The test is the gym the *token* actually carries, not the length of accessibleGyms: `/auth/me/` keeps
 * listing deleted gyms, so a non-empty list does not mean any of them can be opened. A token that is in a
 * gym's context but grants nothing (a member, not staff) is personal too — there is no screen it could open.
 */
const isPersonal = (me: Me | null) => !!me && (!me.gymId || (!me.isOwner && (me.scopes ?? []).length === 0));

/** What a person without a gym sees in place of a gym-management screen. */
function TeamsOnly() {
  return (
    <div className={`${card} mx-auto mt-10 max-w-md p-10 text-center`}>
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuUsers size={22} /></span>
      <h2 className="text-xl font-bold">This area is for gym teams</h2>
      <p className="mb-5 mt-1 text-muted">It manages a gym&apos;s members, plans and staff. You can join a gym as a member, or set up one of your own.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <MotionLink href="/gyms" className={btnPrimary}><LuMapPin size={17} />Find a gym to join</MotionLink>
        <MotionLink href="/create-gym" className={btnGhost}><LuBuilding2 size={17} />Create a gym</MotionLink>
      </div>
    </div>
  );
}

/**
 * Wraps the page area of the signed-in shell. A person without a gym gets the personal routes as they are;
 * the landing route sends them to their feed, and any other gym-management route shows `TeamsOnly` instead
 * of a page whose every request would be refused.
 */
export function PersonalGate({ children }: { children: React.ReactNode }) {
  const { personal, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const landing = personal && pathname === HOME;
  // Wait for the fresh profile before redirecting: the first paint comes from the cached one, which can
  // still say "no gym" right after a gym was created or entered in another tab.
  useEffect(() => {
    if (landing && ready) router.replace(PERSONAL_HOME);
  }, [landing, ready, router]);
  if (!personal || isPersonalPath(pathname)) return <>{children}</>;
  // On the landing route the redirect is already under way — hold a placeholder rather than flash the card.
  if (landing) return <div className={`${card} h-[300px] animate-pulse`} />;
  return <TeamsOnly />;
}

/** Page-level gate: shows a "no access" card instead of the page when the role lacks the permission. */
export function Guard({ perm, children }: { perm: string; children: React.ReactNode }) {
  const { ready, can, me, personal } = useAuth();
  if (!ready) return <div className={`${card} h-[300px] animate-pulse`} />;
  if (can(perm)) return <>{children}</>;
  // Not a role problem — this person isn't on a gym's team at all.
  if (personal) return <TeamsOnly />;
  const home = NAV.find((n) => n.ready && (!n.perm || can(n.perm))); // first page this role can actually open
  return (
    <div className={`${card} mx-auto mt-10 max-w-md p-10 text-center`}>
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bad-bg text-bad"><Lock size={22} /></span>
      <h2 className="text-xl font-bold">You don&apos;t have access</h2>
      <p className="mb-5 mt-1 text-muted">Your role ({me?.roleName || "none"}) doesn&apos;t include “{perm}”. Ask an Administrator to update your role.</p>
      {home && <MotionLink href={home.href} className={btnPrimary}>Go to {home.label}<LuArrowRight size={17} /></MotionLink>}
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
