"use client";

/**
 * First-run screen: `POST /gyms/` creates a gym workspace.
 *
 * A freshly registered account belongs to no gym, and almost every endpoint in this API is gym-scoped — so
 * without this the panel has nothing to show and no way forward. After creating, the session swaps its
 * personal-context token for a gym-context one so the rest of the app can load.
 */
import { useState } from "react";
import { LuBuilding2, LuArrowRight } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/http";
import { enterGym } from "@/lib/auth";
import { GYM_TYPES } from "@/lib/gym-data";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

/** The UI's short type codes map onto the API's `primary_type` enum. */
const API_TYPE: Record<string, string> = {
  general: "general_fitness_gym", strength: "strength_bodybuilding_gym", functional: "functional_fitness_gym",
  pt: "personal_training_studio", boutique: "boutique_fitness_studio", martial: "boxing_martial_arts_gym",
  yoga: "yoga_pilates_studio", cycling: "indoor_cycling_studio", performance: "sports_performance_centre", other: "other",
};

export default function CreateGym({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("general");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Give your gym a name");
    setBusy(true);
    try {
      const gym = await api.gymsCreate({
        name: name.trim(),
        primary_type: API_TYPE[type] as never,
        gender_required: "everyone",
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      });
      const id = String((gym as unknown as { id?: string; gym_id?: string }).id ?? (gym as unknown as { gym_id?: string }).gym_id ?? "");
      if (!id) throw new Error("The server didn't return the new gym's id.");
      const problem = await enterGym(id); // swap to a gym-context token
      if (problem) throw new Error(problem);
      toast(`${name.trim()} is ready`);
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : e2 instanceof Error ? e2.message : "Couldn't create that gym.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <form onSubmit={submit} className={`${card} w-full max-w-[460px] p-7`}>
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuBuilding2 size={24} /></span>
        <h1 className="text-xl font-bold">Set up your gym</h1>
        <p className="mb-5 mt-1 text-muted">Your account isn&apos;t attached to a gym yet. Create one to open the admin panel.</p>

        <label htmlFor="gname" className={label}>Gym name</label>
        <input id="gname" autoFocus className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Northside Strength" />

        <label htmlFor="gtype" className={`${label} mt-4`}>What kind of gym is it?</label>
        <Select id="gtype" value={type} onChange={(e) => setType(e.target.value)}>
          {GYM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gcity" className={label}>City</label>
            <input id="gcity" className={input} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label htmlFor="gcountry" className={label}>Country</label>
            <input id="gcountry" className={input} value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        {err && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{err}</p>}
        <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
          {busy ? "Creating…" : "Create gym"}<LuArrowRight size={17} />
        </MotionButton>
        <p className={hint}>You can change all of this later in Gym Profile.</p>
      </form>
    </main>
  );
}
