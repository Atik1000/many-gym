"use client";

import { createContext, useCallback, useContext } from "react";
import { useResource } from "@/lib/api";
import type { Plan } from "@/lib/plans";

// Plans come from the API. This context keeps the save/remove/patch helpers the plan pages already use.
type Ctx = {
  plans: Plan[];
  ready: boolean;
  save: (p: Plan) => string;
  remove: (id: string) => void;
  patch: (id: string, p: Partial<Plan>) => void;
};
const PlansCtx = createContext<Ctx | null>(null);
export const usePlans = () => {
  const c = useContext(PlansCtx);
  if (!c) throw new Error("usePlans must be used inside PlansProvider");
  return c;
};

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function PlansProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans, ready] = useResource<Plan>("plans");

  const save = useCallback((p: Plan) => {
    let id = p.id;
    if (!id) { // new plan: a readable, unique id from its name
      const base = slug(p.name) || "plan";
      id = base; let n = 2;
      while (plans.some((x) => x.id === id)) id = `${base}-${n++}`;
    }
    const saved = { ...p, id };
    setPlans((l) => (l.some((x) => x.id === id) ? l.map((x) => (x.id === id ? saved : x)) : [saved, ...l]));
    return id;
  }, [plans, setPlans]);

  const remove = useCallback((id: string) => setPlans((l) => l.filter((p) => p.id !== id)), [setPlans]);
  const patch = useCallback((id: string, p: Partial<Plan>) => setPlans((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x))), [setPlans]);

  return <PlansCtx.Provider value={{ plans, ready, save, remove, patch }}>{children}</PlansCtx.Provider>;
}
