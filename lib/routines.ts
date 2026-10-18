// Routine model shared by Routine Templates and a member's personal routine (a copy of a template).
import { uid } from "./id";

export type Exercise = { id: string; name: string; sets: string; reps: string; rest: string; notes: string };
export type Day = { day: string; rest: boolean; title: string; note: string; exercises: Exercise[] };
export type Session = { id: string; title: string; note: string; exercises: Exercise[] };

export const GOALS = ["General Fitness", "Muscle Gain", "Weight Loss", "Strength", "Other"];
export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type Routine = {
  id: string;
  name: string;
  format: "weekly" | "session";
  goals: string[];
  level: (typeof LEVELS)[number];
  notes: string;
  days: Day[]; // weekly format
  sessions: Session[]; // session-based format
};

export const newExercise = (p: Partial<Exercise> = {}): Exercise => ({ id: uid(), name: "", sets: "", reps: "", rest: "", notes: "", ...p });
export const newSession = (): Session => ({ id: uid(), title: "", note: "", exercises: [newExercise()] });
export const blankDays = (): Day[] => WEEKDAYS.map((day) => ({ day, rest: false, title: "", note: "", exercises: [newExercise()] }));

export const blankRoutine = (format: Routine["format"] = "weekly"): Routine => ({
  id: "", name: "", format, goals: [], level: "Beginner", notes: "",
  days: format === "weekly" ? blankDays() : [], sessions: format === "session" ? [newSession()] : [],
});

/** Assigning a template gives the member their own copy (changes never flow back to the template). */
export const copyRoutine = (r: Routine): Routine => ({
  ...structuredClone(r), id: uid(),
  days: r.days.map((d) => ({ ...structuredClone(d), exercises: d.exercises.map((e) => ({ ...e, id: uid() })) })),
  sessions: r.sessions.map((s) => ({ ...structuredClone(s), id: uid(), exercises: s.exercises.map((e) => ({ ...e, id: uid() })) })),
});

const isBlank = (e: Exercise) => !e.name.trim() && !e.sets.trim() && !e.reps.trim() && !e.rest.trim() && !e.notes.trim();

/** Returns error messages (empty = valid). A row with data but no exercise name is an error; fully blank rows are dropped on save. */
export function validateRoutine(r: Routine): string[] {
  const errs: string[] = [];
  if (!r.name.trim()) errs.push("Template name is required");
  const check = (label: string, ex: Exercise[]) => { if (ex.some((e) => !isBlank(e) && !e.name.trim())) errs.push(`${label}: every exercise needs a name`); };
  if (r.format === "weekly") r.days.forEach((d) => !d.rest && check(d.day, d.exercises));
  else r.sessions.forEach((s, i) => check(`Session ${i + 1}`, s.exercises));
  return errs;
}

export function cleanRoutine(r: Routine): Routine {
  const strip = (ex: Exercise[]) => ex.filter((e) => !isBlank(e));
  return {
    ...r, name: r.name.trim(),
    days: r.days.map((d) => ({ ...d, exercises: d.rest ? [] : strip(d.exercises) })),
    sessions: r.sessions.map((s) => ({ ...s, exercises: strip(s.exercises) })),
  };
}

const ex = (name: string, sets: string, reps: string, rest: string, notes = "") => newExercise({ name, sets, reps, rest, notes });
const week = (plan: Record<string, { title: string; note?: string; ex: Exercise[] }>): Day[] =>
  WEEKDAYS.map((day) => (plan[day] ? { day, rest: false, title: plan[day].title, note: plan[day].note ?? "", exercises: plan[day].ex } : { day, rest: true, title: "", note: "", exercises: [] }));

export const SEED_ROUTINES = (): Routine[] => [
  {
    id: "beginner-full-body", name: "Beginner Full Body", format: "weekly", goals: ["General Fitness", "Strength"], level: "Beginner",
    notes: "Repeat weekly. Adjust exercises to each member when assigning.", sessions: [],
    days: week({
      Monday: { title: "Full Body A", note: "Focus on controlled movement.", ex: [ex("Bodyweight Squat", "3", "10 reps", "60 sec", "Controlled movement"), ex("Dumbbell Row", "3", "10 reps / side", "60 sec", "Keep back neutral"), ex("Incline Push-up", "3", "8 reps", "60 sec", "Use a bench"), ex("Plank", "3", "20 sec", "45 sec"), ex("Treadmill Walk", "", "10 min", "", "Comfortable pace")] },
      Wednesday: { title: "Full Body B", ex: [ex("Goblet Squat", "3", "10 reps", "60 sec"), ex("Lat Pulldown", "3", "10 reps", "60 sec"), ex("Glute Bridge", "3", "12 reps", "45 sec")] },
      Friday: { title: "Full Body C", ex: [ex("Leg Press", "3", "12 reps", "60 sec"), ex("Seated Row", "3", "10 reps", "60 sec"), ex("Cycling", "", "15 min", "", "Easy pace")] },
    }),
  },
  {
    id: "strength-foundations", name: "Strength Foundations", format: "weekly", goals: ["Strength", "Muscle Gain"], level: "Intermediate", notes: "Add weight each week if all sets feel strong.", sessions: [],
    days: week({
      Monday: { title: "Upper Body", ex: [ex("Bench Press", "4", "6 reps", "90 sec"), ex("Barbell Row", "4", "6 reps", "90 sec"), ex("Overhead Press", "3", "8 reps", "75 sec")] },
      Tuesday: { title: "Lower Body", ex: [ex("Back Squat", "4", "6 reps", "120 sec"), ex("Romanian Deadlift", "3", "8 reps", "90 sec")] },
      Thursday: { title: "Upper Body", ex: [ex("Incline Press", "4", "8 reps", "90 sec"), ex("Pull-up", "4", "6 reps", "90 sec")] },
      Friday: { title: "Lower Body", ex: [ex("Deadlift", "3", "5 reps", "120 sec"), ex("Walking Lunge", "3", "10 reps / leg", "60 sec")] },
    }),
  },
  {
    id: "yoga-starter", name: "Yoga Starter", format: "session", goals: ["General Fitness"], level: "Beginner", notes: "Progress through sessions in order.", days: [],
    sessions: [
      { id: "ys1", title: "Introduction & Mobility", note: "Focus on comfortable movement.", exercises: [ex("Cat-Cow", "", "60 sec", "", "Gentle movement"), ex("Chair Pose", "3", "20 sec", "30 sec", "Comfortable range"), ex("Seated Stretch", "", "2 min", "")] },
      { id: "ys2", title: "Balance & Breath", note: "", exercises: [ex("Mountain Pose", "", "60 sec", ""), ex("Tree Pose", "2", "30 sec / side", "15 sec")] },
      { id: "ys3", title: "Flow Basics", note: "", exercises: [ex("Sun Salutation A", "3", "5 rounds", "30 sec")] },
    ],
  },
];
