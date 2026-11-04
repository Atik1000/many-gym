"use client";

/**
 * Sign-in against the Many Gym API.
 *
 * The server issues a JWT pair that carries the *context* it was minted in: `personal`, or `gym` with a gym id
 * and the permission scopes that gym grants this user. The admin panel needs a gym-context token, so signing in
 * is two calls — `POST /auth/login/`, then `POST /auth/switch-context/` for the first gym the account can reach.
 *
 * Known gap: the API has no refresh endpoint. When the access token expires the only route back is a fresh
 * sign-in, which `setUnauthorizedHandler` turns into a redirect to /login.
 */
import * as api from "./api/endpoints";
import type * as T from "./api/types";
import { ApiError, getTokens, setTokens, type Tokens } from "./api/http";
import { firstAvailable } from "./api/fallback";
import { invalidateAll } from "./api";

export const MIN_PASSWORD = 8;

/**
 * Identity, password and OTP are published twice — once under `/auth/*` and once under `/users/*` — with
 * identical contracts and no stated canonical. Each call tries `/auth/*` first and falls back to `/users/*`,
 * so the app works whichever a deployment actually serves.
 */
const either = <X,>(feature: string, authCall: () => Promise<X>, usersCall: () => Promise<X>) =>
  firstAvailable(feature, [
    { path: `/auth/${feature}`, call: authCall },
    { path: `/users/${feature}`, call: usersCall },
  ]);
/** Kept for the "which account am I" lookups the UI does; the real session lives in the token store. */
export const SESSION_KEY = "manygym.session.v1";
const KNOWN_KEY = "manygym.accounts.v1";
const ME_KEY = "manygym.me.v1";
/** The gym that last opened successfully, tried first on the next sign-in. */
const LAST_GYM_KEY = "manygym.lastgym.v1";
/** Gyms that returned 404/403 on switch-context, so sign-in stops paying for them again. */
const DEAD_GYMS_KEY = "manygym.deadgyms.v1";

const read = <X,>(key: string, fallback: X): X => {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as X) ?? fallback;
  } catch {
    return fallback;
  }
};
const notifySession = () => window.dispatchEvent(new Event("manygym:session"));

export type Me = {
  userId: string;
  email: string;
  name: string;
  gymId: string | null;
  gymName: string | null;
  /** Permission scopes from the gym-context token, e.g. "members:read". */
  scopes: string[];
  isOwner: boolean;
  roleName: string;
  accessibleGyms: { id: string; name: string; role: string; isOwner: boolean }[];
};

export const cachedMe = (): Me | null => read<Me | null>(ME_KEY, null);

// Accounts that have signed in on this device, so the account switcher can list them.
export const knownAccountIds = () => read<string[]>(KNOWN_KEY, []);
export function rememberAccount(id: string) {
  const ids = knownAccountIds();
  if (!ids.includes(id)) localStorage.setItem(KNOWN_KEY, JSON.stringify([...ids, id]));
}

/** Loads `/auth/me/` and folds in whatever context the current token carries. */
export async function loadMe(): Promise<Me | null> {
  const tokens = getTokens();
  if (!tokens) return null;
  let profile: T.UserProfileMeResponse;
  try {
    profile = await either("me", () => api.authMeRetrieve(), () => api.usersMeRetrieve());
  } catch {
    return null;
  }
  const user = profile.user ?? ({} as T.User);
  const gyms = (profile.accessible_gyms ?? []).map((g) => ({
    id: String(g.gym_id ?? ""),
    name: String(g.name ?? ""),
    role: String(g.role ?? ""),
    isOwner: !!g.is_owner,
  }));
  const active = gyms.find((g) => g.id === tokens.gym_id);
  const me: Me = {
    userId: String(user.id ?? ""),
    email: String(user.email ?? ""),
    name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || String(user.email ?? ""),
    gymId: tokens.gym_id,
    gymName: tokens.gym_name ?? active?.name ?? null,
    scopes: tokens.scopes ?? [],
    isOwner: active?.isOwner ?? false,
    roleName: active?.role ?? (active?.isOwner ? "Owner" : ""),
    accessibleGyms: gyms,
  };
  localStorage.setItem(ME_KEY, JSON.stringify(me));
  localStorage.setItem(SESSION_KEY, me.userId);
  rememberAccount(me.userId);
  return me;
}

const deadGyms = (): string[] => read<string[]>(DEAD_GYMS_KEY, []);
const markDead = (gymId: string) => {
  try {
    const ids = deadGyms();
    if (!ids.includes(gymId)) localStorage.setItem(DEAD_GYMS_KEY, JSON.stringify([...ids, gymId]));
  } catch {
    /* storage unavailable — it will simply be retried next time */
  }
};

/** Removes a gym from the cached profile, so the switcher stops offering one that cannot be opened. */
function forgetGym(gymId: string) {
  const me = cachedMe();
  if (!me) return;
  const accessibleGyms = me.accessibleGyms.filter((g) => g.id !== gymId);
  if (accessibleGyms.length === me.accessibleGyms.length) return;
  try {
    localStorage.setItem(ME_KEY, JSON.stringify({ ...me, accessibleGyms }));
  } catch {
    /* storage unavailable — the switcher will simply show it again next load */
  }
  notifySession();
}

/** Swaps the personal token for one scoped to `gymId`. */
export async function enterGym(gymId: string): Promise<string | null> {
  try {
    const res = await api.authSwitchContextCreate({ context_type: "gym", gym_id: gymId });
    if (!res.tokens?.access) return "The server didn't return a token for that gym.";
    setTokens(res.tokens as Tokens);
    try {
      localStorage.setItem(LAST_GYM_KEY, gymId);
    } catch {
      /* storage unavailable — sign-in just probes in list order next time */
    }
    invalidateAll();
    await loadMe();
    notifySession();
    return null;
  } catch (e) {
    /*
     * A deleted gym keeps appearing in `/auth/me/`'s accessible_gyms but 404s on switch-context, so the
     * switcher would go on offering something that can never open. Drop it on the first failure.
     */
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
      markDead(gymId);
      forgetGym(gymId);
    }
    return e instanceof ApiError ? e.message : "Couldn't open that gym.";
  }
}

/** Returns an error message, or null when signed in. */
export async function signIn(emailRaw: string, password: string): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  try {
    const res = await api.authLoginCreate({ email, password });
    if (!res.tokens?.access) return "The server didn't return a session token.";
    setTokens(res.tokens as Tokens);
    invalidateAll();

    const me = await loadMe();
    /*
     * The admin panel is gym-scoped, so land in a gym straight away. Try them in order rather than trusting
     * the first: `/auth/me/` keeps listing gyms that have been deleted, and switching into one of those
     * returns 404 "Gym not found." Treating that as a login failure locks the account out of the app
     * entirely, even though its other gyms are fine.
     */
    if (!getTokens()?.gym_id) {
      /*
       * Order matters for how long sign-in feels. The gym that worked last time goes first, and gyms already
       * known to 404 go last — otherwise every sign-in pays for a failed round-trip per dead gym before
       * reaching a live one, which reads as the button doing nothing.
       */
      const dead = new Set(deadGyms());
      const lastUsed = read<string | null>(LAST_GYM_KEY, null);
      const candidates = [...(me?.accessibleGyms ?? [])].sort((a, b) => {
        const rank = (id: string) => (id === lastUsed ? 0 : dead.has(id) ? 2 : 1);
        return rank(a.id) - rank(b.id);
      });

      let lastProblem: string | null = null;
      for (const candidate of candidates) {
        lastProblem = await enterGym(candidate.id);
        if (!lastProblem) break;
      }
      // Every gym failed, or the account has none: stay signed in on the personal token and let the app
      // offer gym creation. Being signed in with no gym is a state the UI already handles.
      if (lastProblem) await loadMe();
    }
    notifySession();
    return null;
  } catch (e) {
    if (e instanceof ApiError) return e.message;
    return "Couldn't sign in. Check your connection and try again.";
  }
}

export async function signOut() {
  const refresh = getTokens()?.refresh;
  try {
    if (refresh) await api.authLogoutCreate({ refresh });
  } catch {
    // Revoking server-side is best-effort; the local session goes either way.
  }
  const me = cachedMe();
  if (me) localStorage.setItem(KNOWN_KEY, JSON.stringify(knownAccountIds().filter((id) => id !== me.userId)));
  setTokens(null);
  localStorage.removeItem(ME_KEY);
  localStorage.removeItem(SESSION_KEY);
  // LAST_GYM_KEY and DEAD_GYMS_KEY survive sign-out on purpose: they make the next sign-in fast.
  invalidateAll();
  notifySession();
}

/**
 * Switches which gym the admin panel is pointed at. (The old demo switched *people*; with real auth a session
 * belongs to one account, and what can change is the gym context.)
 */
export async function switchAccount(gymId: string): Promise<boolean> {
  return (await enterGym(gymId)) === null;
}

export async function changePassword(current: string, next: string): Promise<string | null> {
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  try {
    await either("change-password", () => api.authChangePasswordCreate({ current_password: current, new_password: next }), () => api.usersChangePasswordCreate({ current_password: current, new_password: next }));
    return null;
  } catch (e) {
    if (e instanceof ApiError) {
      const fields = e.fieldErrors();
      return fields.current_password ?? fields.new_password ?? e.message;
    }
    return "Couldn't change your password.";
  }
}

// ---------------------------------------------------------------- registration

export type RegisterOutcome = {
  /** A message to show, or null when the account was created. */
  error: string | null;
  /** True when the email is already registered but still awaiting OTP verification. */
  needsVerification?: boolean;
};

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<RegisterOutcome> {
  try {
    const payload = {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || undefined,
    };
    await either("register", () => api.authRegisterCreate(payload), () => api.usersRegisterCreate(payload));
    return { error: null };
  } catch (e) {
    if (e instanceof ApiError) {
      const f = e.fieldErrors();
      const message = f.email ?? f.password ?? f.first_name ?? f.last_name ?? e.message;
      // 409 on an account that exists but hasn't verified: the next step is the code, not a new account.
      // The API says as much in its own message ("Please verify your OTP or request a new one").
      const needsVerification = e.status === 409 && /unverified|verify/i.test(`${message} ${e.code}`);
      return { error: message, needsVerification };
    }
    return { error: "Couldn't create that account." };
  }
}

/** Verifies the 6-digit signup code and signs the person straight in. */
export async function verifySignup(email: string, otp: string): Promise<string | null> {
  try {
    const payload = { email: email.trim().toLowerCase(), otp_code: otp.trim() };
    const res = await either("verify-signup-otp", () => api.authVerifySignupOtpCreate(payload), () => api.usersVerifySignupOtpCreate(payload));
    const tokens = (res as { tokens?: Tokens }).tokens;
    if (tokens?.access) {
      setTokens(tokens);
      invalidateAll();
      await loadMe();
      notifySession();
    }
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "Couldn't verify that code.";
  }
}

export const resendOtp = async (email: string): Promise<string | null> => {
  try {
    const payload = { email: email.trim().toLowerCase() };
    await either("resend-otp", () => api.authResendOtpCreate(payload), () => api.usersResendOtpCreate(payload));
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "Couldn't resend the code.";
  }
};

export const forgotPassword = async (email: string): Promise<string | null> => {
  try {
    const payload = { email: email.trim().toLowerCase() };
    await either("forgot-password", () => api.authForgotPasswordCreate(payload), () => api.usersForgotPasswordCreate(payload));
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "Couldn't send a reset code.";
  }
};

/** Checks a reset code without consuming it, so the UI can fail fast before asking for a new password. */
export const verifyResetOtp = async (email: string, otp: string): Promise<string | null> => {
  try {
    const payload = { email: email.trim().toLowerCase(), otp_code: otp.trim() };
    await either("verify-reset-otp", () => api.authVerifyResetOtpCreate(payload), () => api.usersVerifyResetOtpCreate(payload));
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "That code isn't valid.";
  }
};

export const resetPassword = async (email: string, otp: string, next: string): Promise<string | null> => {
  if (next.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  try {
    const payload = { email: email.trim().toLowerCase(), otp_code: otp.trim(), new_password: next };
    await either("reset-password", () => api.authResetPasswordCreate(payload), () => api.usersResetPasswordCreate(payload));
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "Couldn't reset that password.";
  }
};

// ---------------------------------------------------------------- staff invitations

/**
 * Staff invitations. The API's own flow is: an owner invites by email
 * (`POST /access-control/staff/`), the person registers normally, and the assignment activates — there is
 * **no endpoint that redeems an invitation code**, so the old /accept?code=… screen has nothing to call.
 * `acceptInvite` therefore registers the account and reports anything the server rejects.
 */
export async function acceptInvite(email: string, name: string, password: string): Promise<string | null> {
  if (!name.trim()) return "Enter your name";
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const { error } = await register({ email, password, firstName, lastName: rest.join(" ") || firstName });
  return error;
}

/** Renames the signed-in account (`PATCH /auth/me/`). */
export async function updateMyName(name: string): Promise<string | null> {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  try {
    const payload = { first_name: firstName, last_name: rest.join(" ") || "" };
    await either("me-update", () => api.authMePartialUpdate(payload), () => api.usersMePartialUpdate(payload));
    await loadMe();
    notifySession();
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.message : "Couldn't update your name.";
  }
}
