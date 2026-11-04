"use client";

import { createContext, useCallback, useContext } from "react";
import { refreshResource, useResource } from "@/lib/api";
import { planActions } from "@/lib/api/actions";
import { plans as plansApi, resolveAmenityIds } from "@/lib/api/adapters";
import type { Plan } from "@/lib/plans";

// Plans come from the API. This context keeps the save/remove/patch helpers the plan pages already use.
type Ctx = {
  plans: Plan[];
  ready: boolean;
  /** Resolves to the id the server assigned, or null if the save failed. */
  save: (p: Plan) => Promise<string | null>;
  remove: (id: string) => Promise<void>;
  patch: (id: string, p: Partial<Plan>) => Promise<void>;
};
const PlansCtx = createContext<Ctx | null>(null);
export const usePlans = () => {
  const c = useContext(PlansCtx);
  if (!c) throw new Error("usePlans must be used inside PlansProvider");
  return c;
};

export default function PlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, , ready] = useResource<Plan>("plans");

  /**
   * Creates or updates a plan and returns the id the **server** assigned — ids are UUIDs minted on POST, so they
   * can't be guessed locally. Amenities go through their own PUT, since the plan body can't carry them.
   */
  const save = useCallback(async (p: Plan): Promise<string | null> => {
    try {
      const amenityIds = await resolveAmenityIds([...p.freeAmenities, ...p.paidAmenities]);
      const saved = p.id ? await plansApi.update(p, amenityIds) : await plansApi.create(p, amenityIds);
      if (amenityIds.length) await plansApi.syncAmenities(saved.id, amenityIds);
      await refreshResource("plans");
      return saved.id;
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await plansApi.remove(id).catch(() => null);
    await refreshResource("plans");
  }, []);

  /** A status change is its own transition endpoint; anything else is a normal field update. */
  const patch = useCallback(async (id: string, p: Partial<Plan>) => {
    if (p.status) return void (await planActions.setStatus(id, p.status));
    const current = plans.find((x) => x.id === id);
    if (!current) return;
    await plansApi.update({ ...current, ...p }).catch(() => null);
    await refreshResource("plans");
  }, [plans]);

  return <PlansCtx.Provider value={{ plans, ready, save, remove, patch }}>{children}</PlansCtx.Provider>;
}
