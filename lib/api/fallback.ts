"use client";

/**
 * Alias fallback.
 *
 * This API publishes several features at more than one path — the follow feature at six prefixes, and the whole
 * of profile/password/OTP under both `/auth/*` and `/users/*` — and documents no canonical choice. Nothing in
 * the schema says which a given deployment actually serves, so picking one and hoping is a guess.
 *
 * `firstAvailable` tries them in order and moves on only when a route looks *absent*, not when the server has
 * genuinely rejected the request. Once one answers, that choice is remembered for the session so later calls go
 * straight to it.
 *
 * Telling "route missing" from "request refused" matters: retrying a validation failure down a chain of six
 * aliases would turn one bad request into six. The signal used here is that this API wraps every real error in
 * `{code, message, details}`, so a response carrying an envelope `code` is the server answering — whatever the
 * status. A bare 404 or 405 with no envelope (nginx, or Django's router) is a route that isn't there.
 */
import { ApiError } from "./http";

export type Attempt<T> = { path: string; call: () => Promise<T> };

/** Which alias answered for a feature, so the rest of the session skips the dead ones. */
const winner = new Map<string, number>();

/** True when the failure looks like "this route does not exist here". */
function routeMissing(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false;
  if (e.status === 405 || e.status === 501) return true;
  // A 404 the API itself produced carries its envelope code (RESOURCE_NOT_FOUND); a routing miss doesn't.
  return e.status === 404 && e.code.startsWith("HTTP_");
}

export async function firstAvailable<T>(feature: string, attempts: Attempt<T>[]): Promise<T> {
  if (!attempts.length) throw new Error(`No routes configured for ${feature}`);

  const known = winner.get(feature);
  if (known !== undefined && attempts[known]) {
    try {
      return await attempts[known].call();
    } catch (e) {
      if (!routeMissing(e)) throw e; // a real rejection is the answer; don't retry the chain
      winner.delete(feature); // the route went away — fall through and re-probe
    }
  }

  let lastMissing: unknown = null;
  for (let i = 0; i < attempts.length; i += 1) {
    if (i === known) continue; // already tried above
    try {
      const result = await attempts[i].call();
      winner.set(feature, i);
      return result;
    } catch (e) {
      if (!routeMissing(e)) throw e;
      lastMissing = e;
    }
  }
  throw lastMissing ?? new ApiError(404, "NO_ROUTE", `The server doesn't serve ${feature} at any known path.`);
}

/** Which path a feature settled on — useful when reporting what a deployment supports. */
export const resolvedPath = (feature: string, attempts: Attempt<unknown>[]) => {
  const i = winner.get(feature);
  return i === undefined ? null : (attempts[i]?.path ?? null);
};

/** Forget every resolution (after switching server or signing out). */
export const resetResolutions = () => winner.clear();
