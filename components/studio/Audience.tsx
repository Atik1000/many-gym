"use client";

/**
 * The gym's audience — `GET /gyms/{id}/followers/`, `GET /gyms/{id}/following/`, `GET /gyms/followed/`,
 * and follow/unfollow through the unified `POST|DELETE /follow/` endpoint.
 *
 * The same follow feature is published at six different prefixes (see docs/api/known-issues.md); this uses the
 * unified `/follow/` route, which is the one that handles both users and gyms in a single call.
 */
import { useCallback, useEffect, useState } from "react";
import { LuUserMinus, LuUserPlus, LuUsers } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { asArray } from "@/lib/api/adapters";
import * as social from "@/lib/api/social";
import { ApiError, currentGymId } from "@/lib/api/http";
import { card, hint } from "@/lib/ui";

type Row = { id: string; name: string; sub: string; kind: "user" | "gym"; following?: boolean };

const TABS = ["Followers", "Following", "Gyms we follow"] as const;
type Tab = (typeof TABS)[number];

/** The follow endpoints return several row shapes (user item, gym item, wrapped); normalise them all. */
function toRow(raw: unknown, kind: Row["kind"]): Row {
  const o = (raw ?? {}) as Record<string, unknown>;
  const inner = (o.user ?? o.gym ?? o.target ?? o) as Record<string, unknown>;
  const first = String(inner.first_name ?? "");
  const last = String(inner.last_name ?? "");
  const name =
    `${first} ${last}`.trim() ||
    String(inner.full_name ?? inner.name ?? inner.gym_name ?? inner.email ?? "Unknown");
  return {
    id: String(o.user_id ?? o.gym_id ?? o.target_id ?? inner.id ?? o.id ?? ""),
    name,
    sub: String(inner.email ?? inner.primary_type ?? inner.role ?? ""),
    kind,
    following: typeof o.is_following === "boolean" ? o.is_following : undefined,
  };
}

export default function Audience() {
  const toast = useToast();
  const gymId = currentGymId();
  const [tab, setTab] = useState<Tab>("Followers");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (which: Tab) => {
      if (!gymId) return;
      setLoading(true);
      try {
        const target = { id: gymId, kind: "gym" as const };
        if (which === "Followers") {
          setRows(asArray<unknown>(await social.followersOf(target)).map((r) => toRow(r, "user")));
        } else if (which === "Following") {
          setRows(asArray<unknown>(await social.followingOf(target)).map((r) => toRow(r, "user")));
        } else {
          setRows(asArray<unknown>(await social.followedGyms()).map((r) => toRow(r, "gym")));
        }
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "Couldn't load that list");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [gymId, toast],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load(tab));
  }, [tab, load]);

  const setFollow = async (row: Row, follow: boolean) => {
    setBusy(row.id);
    try {
      // The follow feature is published at six prefixes with no canonical choice, so this tries them in
      // order and settles on whichever this deployment serves (lib/api/social.ts).
      await social.setFollowing({ id: row.id, kind: row.kind }, follow);
      toast(follow ? `Following ${row.name}` : `Unfollowed ${row.name}`);
      await load(tab);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change that");
    } finally {
      setBusy(null);
    }
  };

  if (!gymId) return null;

  return (
    <section className={`${card} p-6`}>
      <h3 className="flex items-center gap-2 text-xl font-bold"><LuUsers size={19} />Audience</h3>
      <p className={hint}>Who follows this gym, and who it follows back.</p>

      <div role="tablist" className="mt-4 flex flex-wrap gap-1 rounded-xl border border-line bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 font-semibold ${tab === t ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-background" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-muted">
            {tab === "Followers" ? "No followers yet." : tab === "Following" ? "This gym doesn't follow anyone yet." : "You don't follow any gyms yet."}
          </p>
        ) : (
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                <Avatar name={r.name} size={38} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{r.name}</b>
                  {r.sub && <span className="block truncate text-muted">{r.sub}</span>}
                </span>
                {r.kind === "gym" && <Pill tone="purple">Gym</Pill>}
                <MotionButton
                  className="rounded-lg px-2.5 py-1.5 font-semibold text-primary hover:bg-surface disabled:opacity-50"
                  disabled={busy === r.id}
                  onClick={() => void setFollow(r, !(tab !== "Followers" || r.following))}
                >
                  {tab === "Followers" && !r.following ? <><LuUserPlus size={16} /> Follow back</> : <><LuUserMinus size={16} /> Unfollow</>}
                </MotionButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
