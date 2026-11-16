"use client";

/**
 * Audience — who can follow, see and message the signed-in person.
 * `PATCH /users/settings/` with `who_can_follow`, `who_can_see_followers`, `who_can_see_following`,
 * `who_can_message` and `require_follow_approval`. Each control saves on change.
 */
import { LuUsers } from "react-icons/lu";
import { Select } from "@/components/ui/parts";
import type { UserSettingPatch } from "@/lib/api/user-settings";
import { card, hint, label } from "@/lib/ui";
import FollowRequests from "./FollowRequests";
import Switch from "./Switch";
import { useUserSettings } from "./useUserSettings";

const SEE: [string, string][] = [["everyone", "Everyone"], ["followers", "Followers"], ["private", "Private"]];

const FIELDS = [
  { key: "who_can_follow", title: "Who can follow me?", options: [["everyone", "Everyone"], ["friends_of_friends", "Friends of friends"]] },
  { key: "who_can_see_followers", title: "Who can see my follower list?", options: SEE },
  { key: "who_can_see_following", title: "Who can see my followed list?", options: SEE },
  { key: "who_can_message", title: "Who can send you a message?", options: [["everyone", "Everyone"], ["followers", "Followers"]] },
] as const satisfies readonly { key: keyof UserSettingPatch; title: string; options: readonly (readonly [string, string])[] }[];

export default function AudienceSettings() {
  const { settings, loading, put } = useUserSettings();

  if (loading) return <section className={`${card} h-[300px] animate-pulse`} />;
  if (!settings) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Audience</h2>
        <p className="mt-1 text-muted">Couldn&apos;t load your audience settings.</p>
      </section>
    );
  }

  return (
    <>
      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuUsers size={18} />Audience</h2>
        <p className={hint}>Who can follow you, see your lists and message you. Changes save as you make them.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => {
            const value = String(settings[f.key] ?? f.options[0][0]);
            return (
              <div key={f.key}>
                <label htmlFor={f.key} className={label}>{f.title}</label>
                <Select id={f.key} value={value} onChange={(e) => void put({ [f.key]: e.target.value } as UserSettingPatch, f.title.replace(/\?$/, ""))}>
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  {/* "No one" is a value the API accepts but this screen doesn't offer; keep it visible if it's what's saved. */}
                  {f.key === "who_can_message" && value === "no_one" && <option value="no_one">No one</option>}
                </Select>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-line">
          <Switch id="require_follow_approval" title="Require approval for new followers"
            hint="People who follow you send a request first, and only follow you once you confirm it."
            checked={!!settings.require_follow_approval}
            onChange={(v) => void put({ require_follow_approval: v }, "Follow approval")} />
        </div>
      </section>

      <FollowRequests />
    </>
  );
}
