/**
 * HTTP core for the Many Gym API (https://v0.manygym.com/api/v1).
 *
 * Every error the API returns shares one envelope — `{ code, message, details }` — so this layer turns any
 * non-2xx into an `ApiError` carrying all three, and the UI can show `err.message` without unwrapping anything.
 *
 * Tokens: login and verify-signup both return an access/refresh pair plus the context the token was minted in
 * (`personal`, or `gym` with a gym id and permission scopes). The API has **no refresh endpoint** — nothing in
 * the published schema exchanges a refresh token for a new access token — so an expired access token means a
 * fresh sign-in. `onUnauthorized` lets the app react to that once, centrally.
 */

export const API_BASE = process.env.NEXT_PUBLIC_MANYGYM_API_BASE ?? "https://v0.manygym.com";

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

export function getTokens(): Tokens | null {
  if (memoryTokens) return memoryTokens;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return (memoryTokens = raw ? (JSON.parse(raw) as Tokens) : null);
  } catch {
    return null;
  }
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

// ---------------------------------------------------------------- request

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

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = opts.token ?? (opts.anonymous ? undefined : getTokens()?.access);
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (opts.form) {
    payload = opts.form; // let fetch set the multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: payload,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
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
    const message =
      env.message ??
      env.detail ??
      (res.status >= 500
        ? "The server hit an error. Try again in a moment."
        : `Request failed (HTTP ${res.status}).`);
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, env.code ?? `HTTP_${res.status}`, message, env.details ?? {});
  }

  return parsed as T;
}
