// Lead model (spec: "Leads" — keep required info only).
import { addDays, today } from "./dates";
import { uid } from "./id";

export const STAGES = ["new", "contacted", "trial", "joined", "not_joining"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { new: "New", contacted: "Contacted", trial: "Visit / Trial Booked", joined: "Joined", not_joining: "Not Joining" };
export const STAGE_TONE: Record<Stage, "green" | "blue" | "purple" | "red" | "amber"> = { new: "green", contacted: "blue", trial: "purple", joined: "green", not_joining: "red" };

export const BASE_REASONS = ["Price", "Location", "Timing", "Chose Another Gym", "Other"];
export const FITNESS_GOALS = ["General Fitness", "Strength", "Muscle Gain", "Weight Loss", "Other"];
export const SOURCES = ["Walk-in", "Phone", "Social Media", "Referral", "Website", "Other"];

export type NextMove = { id: string; date: string; description: string };
export type Lead = {
  id: string; firstName: string; lastName: string; phone: string; email: string; planId: string; stage: Stage;
  reason: string; customReason: string; goals: string[]; expectedStart: string; source: string; assignedTo: string;
  nextMoves: NextMove[]; trialBooked: string; notes: string[];
};

export const LEADS_KEY = "leads";
export const CUSTOM_REASONS_KEY = "leadReasons";
export const leadName = (l: Pick<Lead, "firstName" | "lastName">) => `${l.firstName} ${l.lastName}`.trim();
export const blankLead = (): Lead => ({
  id: "", firstName: "", lastName: "", phone: "", email: "", planId: "", stage: "new", reason: "", customReason: "", goals: [], expectedStart: "",
  source: "Walk-in", assignedTo: "", nextMoves: [], trialBooked: "", notes: [],
});

/** Earliest upcoming move (or the latest overdue one if none are upcoming), so the list shows what to do next. */
export function nextMoveOf(l: Lead): NextMove | undefined {
  const t = today();
  const sorted = [...l.nextMoves].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((m) => m.date >= t) ?? sorted[sorted.length - 1];
}

export function validateLead(l: Lead): Record<string, string> {
  const e: Record<string, string> = {};
  if (!l.firstName.trim()) e.firstName = "First name is required";
  if (!l.phone.trim() && !l.email.trim()) e.contact = "Phone or email is required";
  else if (l.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim())) e.email = "Enter a valid email address";
  if (l.stage === "not_joining") {
    if (!l.reason) e.reason = "Select a reason for not joining";
    else if (l.reason === "Other" && !l.customReason.trim()) e.customReason = "Describe the reason";
  }
  if (l.nextMoves.some((m) => !m.date || !m.description.trim())) e.nextMoves = "Each next move needs a date and a short description";
  return e;
}

export const SEED_LEADS = (): Lead[] => {
  const t = today();
  const mk = (p: Partial<Lead>): Lead => ({ ...blankLead(), id: uid(), ...p });
  return [
    mk({ firstName: "Maya", lastName: "Patel", email: "maya@example.com", planId: "quarterly-fitness", stage: "contacted", source: "Website", assignedTo: "p-sarah", nextMoves: [{ id: uid(), date: addDays(t, 3), description: "Confirm gym tour" }], goals: ["Weight Loss"] }),
    mk({ firstName: "Noah", lastName: "Williams", phone: "+44 7700 900234", planId: "yoga-10-sessions", stage: "trial", source: "Social Media", trialBooked: `${addDays(t, 5)}T18:00`, nextMoves: [{ id: uid(), date: addDays(t, 5), description: "Follow up after trial" }] }),
    mk({ firstName: "Emma", lastName: "Clarke", phone: "+44 7700 900456", email: "emma@example.com", planId: "monthly-unlimited", stage: "not_joining", reason: "Other", customReason: "Moving abroad", goals: ["Strength", "General Fitness"], expectedStart: addDays(t, 14), source: "Referral", assignedTo: "p-sarah", notes: ["Interested in evening access."] }),
    mk({ firstName: "Lucas", lastName: "Brown", phone: "+44 7700 900345", stage: "new", source: "Walk-in", nextMoves: [{ id: uid(), date: addDays(t, 1), description: "Discuss membership" }] }),
    mk({ firstName: "Ava", lastName: "Wilson", email: "ava@example.com", planId: "quarterly-fitness", stage: "joined", source: "Phone" }),
  ];
};
