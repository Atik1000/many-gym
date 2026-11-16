/**
 * HTTP core for the Many Gym API (https://v0.manygym.com/api/v1).
 *
 * Every error the API returns shares one envelope — `{ code, message, details }` — so this layer turns any
 * non-2xx into an `ApiError` carrying all three, and the UI can show `err.message` without unwrapping anything.
 *
 * Tokens: login and verify-signup both return an access/refresh pair plus the context the token was minted in
 * (`personal`, or `gym` with a gym id and permission scopes). When the access token expires, `request()`
 * exchanges the refresh token for a new pair (`POST /auth/refresh/`) and retries, so an expired access token
 * is invisible to the screens. Only when the refresh itself is refused does `onUnauthorized` fire and the
 * app send the person back to sign-in.
 */

export const API_BASE = process.env.NEXT_PUBLIC_MANYGYM_API_BASE ?? "https://v0.manygym.com";

/**
 * Resolves a media path the API returns into something a browser can load.
 *
 * Uploads come back as server-relative paths like `/media/gyms/gallery/original/<file>.png`. Rendered as-is
 * they resolve against the *app's* origin, so on any host other than the API they 404. Absolute URLs and
 * data:/blob: previews are passed through untouched.
 */
export function mediaUrl(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

export type Tokens = {
  access: string;
  refresh: string;
  context_type: string;
  gym_id: string | null;
  gym_name: string | null;
  scopes: string[];
};

const TOKEN_KEY = "manygym.tokens.v1";

/** A non-2xx response, or a transport failure. `code` is the API's machine-readable string. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** Flattens DRF-style `details` into "field: first error" lines, for form-level display. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.details ?? {})) {
      if (Array.isArray(v) && v.length) out[k] = String(v[0]);
      else if (typeof v === "string") out[k] = v;
    }
    return out;
  }
}

// ---------------------------------------------------------------- token store

let memoryTokens: Tokens | null = null;

/** What is in storage right now — another tab may have rotated the pair since this one last looked. */
function storedTokens(): Tokens | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return undefined; // storage blocked: the in-memory copy is all there is
  }
}

export function getTokens(): Tokens | null {
  if (memoryTokens) return memoryTokens;
  return (memoryTokens = storedTokens() ?? null);
}

// Tabs share one token pair. Refreshing rotates it and revokes the old refresh token, so a tab holding a stale
// copy must pick up the new one (or the sign-out) rather than present a token the server has already retired.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== TOKEN_KEY && e.key !== null) return;
    const now = storedTokens();
    if (now !== undefined) memoryTokens = now;
  });
}

export function setTokens(t: Tokens | null) {
  memoryTokens = t;
  if (typeof window === "undefined") return;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage full or blocked — the in-memory copy still carries this session */
  }
}

/** The gym the current token is scoped to, or null in personal context. */
export const currentGymId = () => getTokens()?.gym_id ?? null;
/** Permission scopes carried by a gym-context token, e.g. "members:read". Empty in personal context. */
export const currentScopes = () => getTokens()?.scopes ?? [];
export const hasScope = (scope: string) => currentScopes().includes(scope);

let onUnauthorized: (() => void) | null = null;
/** Called once whenever the API rejects our token, so the app can send the person back to sign-in. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

// ---------------------------------------------------------------- request options

export type RequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skip the Authorization header (public endpoints: login, register, health, …). */
  anonymous?: boolean;
  /** Use this access token instead of the stored one (server components, tests). */
  token?: string;
  signal?: AbortSignal;
  /** Send as multipart instead of JSON — required by the media upload endpoints. */
  form?: FormData;
};

export function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

// ---------------------------------------------------------------- token refresh

/**
 * `POST /auth/refresh/` exchanges the refresh token for a new access/refresh pair, **preserving the context
 * claims** (`context_type`, `gym_id`, `scopes`), and rotates: the refresh token that was sent is revoked. It is
 * published at three paths; the first that exists is used.
 */
const REFRESH_PATHS = ["/api/v1/auth/refresh/", "/api/v1/auth/token/refresh/", "/api/v1/token/refresh/"];
let refreshPath = 0;

/** Paths whose 401 is an answer about credentials being offered, not about an expired session. */
const NO_REFRESH = /\/(auth|users)\/(login|register|verify-2fa|resend-2fa|logout)\/|\/(token\/)?refresh\//;

/** `ok` — new tokens are stored. `dead` — the session is over. `later` — couldn't tell (offline, 5xx, 429). */
type RefreshOutcome = "ok" | "dead" | "later";

async function exchange(refresh: string): Promise<{ outcome: RefreshOutcome; tokens?: Partial<Tokens> }> {
  for (let i = refreshPath; i < REFRESH_PATHS.length; i += 1) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${REFRESH_PATHS[i]}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    } catch {
      return { outcome: "later" };
    }
    let body: { code?: string; tokens?: Partial<Tokens>; access?: string; refresh?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    if (res.ok) {
      refreshPath = i;
      // Documented as `{message, tokens}`; a bare pair is tolerated.
      const tokens = body?.tokens ?? (body?.access ? { access: body.access, refresh: body.refresh } : undefined);
      return tokens?.access ? { outcome: "ok", tokens } : { outcome: "dead" };
    }
    // A routing miss carries no envelope code — this deployment serves the endpoint elsewhere.
    if ((res.status === 404 || res.status === 405) && !body?.code) continue;
    if (res.status === 400 || res.status === 401 || res.status === 403) return { outcome: "dead" };
    return { outcome: "later" };
  }
  return { outcome: "dead" }; // no refresh endpoint at all: an expired token means signing in again
}

let refreshing: Promise<RefreshOutcome> | null = null;

/**
 * Makes sure a usable token pair is stored, given that `staleAccess` was just rejected.
 *
 * One refresh at a time: every request that hits a 401 while one is running waits for the same promise, and
 * a Web Lock extends that across tabs — the refresh token is single-use, so two tabs spending it at once would
 * leave one of them holding a revoked pair. Whoever gets the lock second finds new tokens already stored and
 * skips the network call.
 */
function refreshTokens(staleAccess: string): Promise<RefreshOutcome> {
  if (refreshing) return refreshing;
  const run = async (): Promise<RefreshOutcome> => {
    const stored = storedTokens();
    if (stored === null) {
      memoryTokens = null; // signed out in another tab
      return "dead";
    }
    if (stored && stored.access !== staleAccess) {
      memoryTokens = stored; // another tab already rotated the pair
      return "ok";
    }
    const current = stored ?? memoryTokens;
    if (!current?.refresh) return "dead";
    const { outcome, tokens } = await exchange(current.refresh);
    if (outcome === "ok" && tokens?.access) {
      // Keep whatever the response doesn't restate, so a gym-context session stays in its gym.
      setTokens({
        ...current,
        ...tokens,
        access: tokens.access,
        refresh: tokens.refresh ?? current.refresh,
        gym_id: tokens.gym_id !== undefined ? tokens.gym_id : current.gym_id,
        gym_name: tokens.gym_name !== undefined ? tokens.gym_name : current.gym_name,
        scopes: Array.isArray(tokens.scopes) ? tokens.scopes : current.scopes,
      });
    }
    return outcome;
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  const started: Promise<RefreshOutcome> = locks
    ? new Promise<RefreshOutcome>((resolve, reject) => {
        locks.request("manygym.token-refresh", () => run().then(resolve, reject)).catch(reject);
      })
    : run();
  const shared = started
    .catch((): RefreshOutcome => "later")
    .finally(() => {
      refreshing = null;
    });
  refreshing = shared;
  return shared;
}

// ---------------------------------------------------------------- request

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  // The stored session's token is the only kind that can be refreshed: not an anonymous call, and not one
  // made with a caller-supplied token.
  const sessionAuth = !opts.anonymous && opts.token === undefined;

  const send = async (): Promise<{ res: Response; sent?: string }> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = opts.token ?? (opts.anonymous ? undefined : getTokens()?.access);
    if (token) headers.Authorization = `Bearer ${token}`;

    // Built per attempt, so a retry sends a fresh body (a FormData can be sent again as-is).
    let payload: BodyInit | undefined;
    if (opts.form) {
      payload = opts.form; // let fetch set the multipart boundary
    } else if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(opts.body);
    }

    try {
      const res = await fetch(buildUrl(path, opts.query), {
        method,
        headers,
        body: payload,
        signal: opts.signal,
        cache: "no-store",
      });
      return { res, sent: token };
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
    }
  };

  let { res, sent } = await send();
  let sessionOver = res.status === 401;
  if (res.status === 401 && sessionAuth && sent && !NO_REFRESH.test(path)) {
    const outcome = await refreshTokens(sent);
    if (outcome === "ok") {
      ({ res, sent } = await send());
      sessionOver = res.status === 401; // still refused with a brand-new token: genuinely not allowed in
    } else if (outcome === "later") {
      // The session may well be fine — the refresh just couldn't be attempted. Don't sign anyone out for it.
      throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
    }
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // HTML error page from nginx, or an empty 200 — fall through to the status-based message
    }
  }

  if (!res.ok) {
    const env = (parsed ?? {}) as { code?: string; message?: string; detail?: string; details?: Record<string, unknown> };
    // Some endpoints answer a 400 with a bare DRF field map — `{"gym_id": ["This field is required."]}` —
    // instead of the `{code, message, details}` envelope. Treat that map as the details so forms can still
    // place each message under its field, and lead with the first one rather than a bare status.
    const bare =
      !env.code && !env.message && !env.detail && parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    const firstBare = bare
      ? Object.values(bare).map((v) => (Array.isArray(v) ? v[0] : v)).find((v): v is string => typeof v === "string")
      : undefined;
    const message =
      env.message ??
      env.detail ??
      firstBare ??
      (res.status >= 500
        ? "The server hit an error. Try again in a moment."
        : `Request failed (HTTP ${res.status}).`);
    if (sessionOver) onUnauthorized?.();
    throw new ApiError(res.status, env.code ?? `HTTP_${res.status}`, message, env.details ?? bare ?? {});
  }

  return parsed as T;
}
