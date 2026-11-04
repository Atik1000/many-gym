"use client";

/**
 * Gym-level settings and the blocklist — `GET/PATCH /gyms/settings/`,
 * `GET/POST /gyms/settings/blocked-users/`, `GET /gyms/settings/blocked-users/search/`,
 * `DELETE /gyms/settings/blocked-users/{user_id}/` and `POST /gyms/settings/access-control/`.
 *
 * Each control saves on change rather than behind a Save button, because every field is its own small PATCH.
 */
import { useCallback, useEffect, useState } from "react";
import { LuBan, LuGlobe, LuSearch, LuShieldAlert, LuUserX } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { ConfirmModal, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/AuthProvider";
import { gymProfile } from "@/lib/api/adapters";
import * as api from "@/lib/api/endpoints";
import { ApiError, currentGymId } from "@/lib/api/http";
import type * as T from "@/lib/api/types";
import { asArray } from "@/lib/api/adapters";
import { btnGhost, btnPrimary, card, hint, input, label } from "@/lib/ui";
import { Select } from "@/components/ui/parts";

type Blocked = { id: string; name: string; email: string };

const CHOICES = {
  who_can_message: [
    ["everyone", "Everyone"],
    ["followers_and_members", "Followers & members"],
    ["members_only", "Members only"],
  ],
  who_can_send_joining_request: [
    ["everyone", "Everyone"],
    ["no_one", "No one"],
  ],
  who_can_see_members: [
    ["everyone", "Everyone"],
    ["only_members", "Members only"],
  ],
  who_can_see_followers: [
    ["everyone", "Everyone"],
    ["only_members", "Members only"],
    ["private", "Nobody"],
  ],
  who_can_see_following: [
    ["everyone", "Everyone"],
    ["only_members", "Members only"],
    ["private", "Nobody"],
  ],
  posts_age_restriction: [
    ["any_age", "Any age"],
    ["17_plus", "17+"],
    ["18_plus", "18+"],
    ["19_plus", "19+"],
    ["20_plus", "20+"],
  ],
} as const;

const LABELS: Record<keyof typeof CHOICES, string> = {
  who_can_message: "Who can message this gym",
  who_can_send_joining_request: "Who can request to join",
  who_can_see_members: "Who can see the member list",
  who_can_see_followers: "Who can see followers",
  who_can_see_following: "Who can see who the gym follows",
  posts_age_restriction: "Minimum age for posts",
};

const person = (row: unknown): Blocked => {
  const o = (row ?? {}) as Record<string, unknown>;
  const user = (o.user ?? o) as Record<string, unknown>;
  const first = String(user.first_name ?? "");
  const last = String(user.last_name ?? "");
  return {
    id: String(o.user_id ?? user.id ?? o.id ?? ""),
    name: `${first} ${last}`.trim() || String(user.full_name ?? user.email ?? "Unknown"),
    email: String(user.email ?? ""),
  };
};

export default function GymSettings() {
  const toast = useToast();
  const { me } = useAuth();
  const gymId = currentGymId();
  const canEdit = !!me?.isOwner;

  const [settings, setSettings] = useState<T.GymSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Blocked[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [unblocking, setUnblocking] = useState<Blocked | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [health, setHealth] = useState<string | null>(null);

  const loadBlocked = useCallback(() => {
    api.gymsSettingsBlockedUsersRetrieve({ gym_id: gymId ?? undefined })
      .then((rows) => setBlocked(asArray<unknown>(rows).map(person)))
      .catch(() => setBlocked([]));
  }, [gymId]);

  useEffect(() => {
    let live = true;
    if (!gymId) {
      void Promise.resolve().then(() => live && setLoading(false));
      return () => { live = false; };
    }
    gymProfile.settings()
      .then((s) => live && setSettings(s as T.GymSetting))
      .catch(() => live && setSettings(null))
      .finally(() => live && setLoading(false));
    loadBlocked();
    // `GET /health/` is public and reports database/cache status — handy when something looks wrong.
    api.healthRetrieve()
      .then((h) => live && setHealth(String((h as Record<string, unknown>)?.status ?? "unknown")))
      .catch(() => live && setHealth("unreachable"));
    return () => { live = false; };
  }, [gymId, loadBlocked]);

  const put = async (patch: T.PatchedGymSettingUpdateRequest, what: string) => {
    const before = settings;
    setSettings((s) => (s ? { ...s, ...patch } : s)); // optimistic
    try {
      const next = await gymProfile.saveSettings(patch);
      setSettings(next as T.GymSetting);
      toast(`${what} updated`);
    } catch (e) {
      setSettings(before);
      toast(e instanceof ApiError ? e.message : `Couldn't update ${what.toLowerCase()}`);
    }
  };

  const search = async () => {
    if (!q.trim()) return setFound(null);
    setSearching(true);
    try {
      const rows = await api.gymsSettingsBlockedUsersSearchRetrieve({ gym_id: gymId ?? undefined, q: q.trim() });
      setFound(asArray<unknown>(rows).map(person));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't search for people");
      setFound([]);
    } finally {
      setSearching(false);
    }
  };

  const block = async (p: Blocked) => {
    try {
      await api.gymsSettingsBlockedUsersCreate({ user_id: p.id }, { gym_id: gymId ?? undefined });
      toast(`${p.name} blocked`);
      setFound(null); setQ("");
      loadBlocked();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't block that person");
    }
  };

  const unblock = async (p: Blocked) => {
    try {
      await api.gymsSettingsBlockedUsersDestroy(p.id, { gym_id: gymId ?? undefined });
      toast(`${p.name} unblocked`);
      loadBlocked();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't unblock that person");
    }
  };

  /** `POST /gyms/settings/access-control/` also offers deactivate/delete/restore; only publishing is exposed here. */
  const togglePublished = async () => {
    setPublishing(true);
    try {
      await api.gymsSettingsAccessControlCreate(
        { action: settings?.is_published ? "unpublish" : "publish" },
        { gym_id: gymId ?? undefined },
      );
      const next = await gymProfile.settings();
      setSettings(next as T.GymSetting);
      toast(settings?.is_published ? "Gym page hidden" : "Gym page published");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change that");
    } finally {
      setPublishing(false);
    }
  };

  if (!gymId) return null;
  if (loading) return <section className={`${card} h-[260px] animate-pulse`} />;
  if (!settings) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Gym settings</h2>
        <p className="mt-1 text-muted">Couldn&apos;t load the gym&apos;s settings.</p>
      </section>
    );
  }

  return (
    <>
      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuGlobe size={18} />Gym page &amp; privacy</h2>
        <p className={hint}>Who can reach the gym and what they can see.</p>

        <fieldset disabled={!canEdit} className="m-0 mt-4 grid gap-4 border-0 p-0 disabled:opacity-70 sm:grid-cols-2">
          {(Object.keys(CHOICES) as (keyof typeof CHOICES)[]).map((key) => (
            <div key={key}>
              <label htmlFor={key} className={label}>{LABELS[key]}</label>
              <Select
                id={key}
                value={String(settings[key] ?? CHOICES[key][0][0])}
                onChange={(e) => void put({ [key]: e.target.value } as T.PatchedGymSettingUpdateRequest, LABELS[key])}
              >
                {CHOICES[key].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
          ))}
        </fieldset>

        <div className="mt-5 grid gap-2 border-t border-line pt-4">
          {([
            ["video_autoplay", "Autoplay videos in the feed"],
            ["admin_logs_alerts", "Email me admin activity alerts"],
            ["issues_alerts", "Email me when issues are reported"],
          ] as const).map(([key, text]) => (
            <label key={key} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={!!settings[key]}
                onChange={(e) => void put({ [key]: e.target.checked }, text)}
              />
              <span>{text}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Pill tone={settings.is_published ? "green" : "amber"}>{settings.is_published ? "Published" : "Not published"}</Pill>
          <span className="flex-1 text-muted">A published gym page is visible to people outside the gym.</span>
          {canEdit && (
            <MotionButton className={btnGhost} disabled={publishing} onClick={togglePublished}>
              {settings.is_published ? "Hide gym page" : "Publish gym page"}
            </MotionButton>
          )}
        </div>
        {!canEdit && <p className="mt-3 flex items-center gap-2 text-muted"><LuShieldAlert size={16} />Only the gym owner can change these.</p>}
      </section>

      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuBan size={18} />Blocked people</h2>
        <p className={hint}>Blocked people can&apos;t message the gym or see its page.</p>

        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              aria-label="Search people to block"
              className={`${input} flex-1`}
              placeholder="Search by name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
            />
            <MotionButton className={btnPrimary} disabled={searching || !q.trim()} onClick={search}>
              <LuSearch size={16} />{searching ? "Searching…" : "Search"}
            </MotionButton>
          </div>
        )}

        {found && (
          <div className="mt-3 rounded-xl border border-line">
            {found.length === 0 ? (
              <p className="p-4 text-center text-muted">Nobody matched “{q}”.</p>
            ) : found.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-line p-3 last:border-0">
                <span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="block truncate text-muted">{p.email}</span></span>
                <MotionButton className={btnGhost} onClick={() => void block(p)}><LuUserX size={16} />Block</MotionButton>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          {blocked.length === 0 ? (
            <p className="text-muted">Nobody is blocked.</p>
          ) : (
            <ul className="grid gap-2">
              {blocked.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                  <span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="block truncate text-muted">{p.email}</span></span>
                  {canEdit && <button className="font-semibold text-primary" onClick={() => setUnblocking(p)}>Unblock</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {health && (
        <p className="flex items-center gap-2 px-1 text-muted">
          <span className={`h-2 w-2 rounded-full ${health === "healthy" ? "bg-good" : "bg-bad"}`} />
          API status: {health}
        </p>
      )}

      {unblocking && (
        <ConfirmModal
          open
          title={`Unblock ${unblocking.name}?`}
          body="They'll be able to message the gym and see its page again."
          confirmLabel="Unblock"
          danger={false}
          onClose={() => setUnblocking(null)}
          onConfirm={() => { void unblock(unblocking); setUnblocking(null); }}
        />
      )}
    </>
  );
}
