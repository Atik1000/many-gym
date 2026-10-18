"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useRef, useState } from "react";
import { LuCopy as Copy, LuGripVertical as GripVertical, LuPlus as Plus, LuTrash2 as Trash2 } from "react-icons/lu";
import { btnGhost, input } from "@/lib/ui";
import { newExercise, newSession, type Day, type Exercise, type Routine, type Session } from "@/lib/routines";
import { uid } from "@/lib/id";

/** Exercise table with drag-to-reorder. Used for a weekday or a session. */
function ExerciseTable({ items, onChange }: { items: Exercise[]; onChange: (e: Exercise[]) => void }) {
  const from = useRef<number | null>(null);
  const patch = (id: string, p: Partial<Exercise>) => onChange(items.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const move = (to: number) => {
    const f = from.current; from.current = null;
    if (f === null || f === to) return;
    const n = [...items]; n.splice(to, 0, n.splice(f, 1)[0]); onChange(n);
  };
  const cell = `${input} !py-1.5`;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-background text-[13px] text-muted">
            <tr><th className="w-8" /><th className="px-2 py-2.5">Exercise</th><th className="w-20 px-2">Sets</th><th className="w-36 px-2">Reps / Duration</th><th className="w-28 px-2">Rest</th><th className="px-2">Notes</th><th className="w-10" /></tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={e.id} draggable onDragStart={() => (from.current = i)} onDragOver={(ev) => ev.preventDefault()} onDrop={() => move(i)} className="border-b border-line last:border-0">
                <td className="cursor-grab text-muted"><GripVertical size={18} aria-label="Drag to reorder" /></td>
                <td className="p-1.5"><input aria-label="Exercise" className={cell} value={e.name} onChange={(ev) => patch(e.id, { name: ev.target.value })} placeholder="e.g. Squat" /></td>
                <td className="p-1.5"><input aria-label="Sets" className={cell} value={e.sets} onChange={(ev) => patch(e.id, { sets: ev.target.value })} /></td>
                <td className="p-1.5"><input aria-label="Reps or duration" className={cell} value={e.reps} onChange={(ev) => patch(e.id, { reps: ev.target.value })} placeholder="10 reps" /></td>
                <td className="p-1.5"><input aria-label="Rest" className={cell} value={e.rest} onChange={(ev) => patch(e.id, { rest: ev.target.value })} placeholder="60 sec" /></td>
                <td className="p-1.5"><input aria-label="Notes" className={cell} value={e.notes} onChange={(ev) => patch(e.id, { notes: ev.target.value })} /></td>
                <td><button type="button" aria-label="Remove exercise" onClick={() => onChange(items.filter((x) => x.id !== e.id))} className="text-bad"><Trash2 size={17} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => onChange([...items, newExercise()])} className="mt-3 inline-flex items-center gap-1.5 font-semibold text-primary"><Plus size={16} />Add Exercise</button>
    </div>
  );
}

const pill = (on: boolean) => `whitespace-nowrap rounded-full px-5 py-2 font-semibold ${on ? "bg-primary text-white" : "bg-background text-foreground hover:bg-line"}`;

/** Weekly (Mon–Sun with workout/rest days) or session-based (Session 1, 2, …) body of a routine. */
export default function RoutineEditor({ routine, onChange }: { routine: Routine; onChange: (r: Routine) => void }) {
  const [dayIdx, setDayIdx] = useState(0);
  const [sessIdx, setSessIdx] = useState(0);

  if (routine.format === "weekly") {
    const d = routine.days[dayIdx];
    const setDay = (p: Partial<Day>) => onChange({ ...routine, days: routine.days.map((x, i) => (i === dayIdx ? { ...x, ...p } : x)) });
    return (
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {routine.days.map((x, i) => (
            <button key={x.day} type="button" onClick={() => setDayIdx(i)} className={pill(i === dayIdx)}>
              {x.day}{x.rest && <span className={`ml-1.5 text-xs ${i === dayIdx ? "text-white/80" : "text-muted"}`}>rest</span>}
            </button>
          ))}
        </div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xl font-bold">{d.day}</h4>
          <div className="flex gap-5">
            {([false, true] as const).map((rest) => (
              <label key={String(rest)} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name={`dtype-${d.day}`} className="h-4 w-4 accent-primary" checked={d.rest === rest} onChange={() => setDay({ rest, exercises: !rest && d.exercises.length === 0 ? [newExercise()] : d.exercises })} />
                {rest ? "Rest day" : "Workout day"}
              </label>
            ))}
          </div>
        </div>
        {d.rest ? (
          <div className="rounded-xl bg-background px-4 py-8 text-center text-muted">Rest day — no exercises. Switch to “Workout day” to add some.</div>
        ) : (
          <>
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <label><span className="mb-1.5 block text-[13px] font-semibold">Workout Title <span className="font-normal text-muted">(optional)</span></span>
                <input className={input} value={d.title} onChange={(e) => setDay({ title: e.target.value })} placeholder="e.g. Upper Body" /></label>
              <label><span className="mb-1.5 block text-[13px] font-semibold">Day Notes <span className="font-normal text-muted">(optional)</span></span>
                <input className={input} value={d.note} onChange={(e) => setDay({ note: e.target.value })} /></label>
            </div>
            <ExerciseTable items={d.exercises} onChange={(exercises) => setDay({ exercises })} />
          </>
        )}
      </div>
    );
  }

  // session-based: no workout/rest option
  const idx = Math.min(sessIdx, routine.sessions.length - 1);
  const s = routine.sessions[idx];
  const setSessions = (sessions: Session[]) => onChange({ ...routine, sessions });
  const setSess = (p: Partial<Session>) => setSessions(routine.sessions.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {routine.sessions.map((x, i) => <button key={x.id} type="button" onClick={() => setSessIdx(i)} className={pill(i === idx)}>Session {i + 1}</button>)}
        <MotionButton type="button" className={`${btnGhost} !rounded-[10px] !text-primary`} onClick={() => { setSessions([...routine.sessions, newSession()]); setSessIdx(routine.sessions.length); }}><Plus size={16} />Add Session</MotionButton>
      </div>
      {s ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xl font-bold">Session {idx + 1}</h4>
            <div className="flex gap-3 text-muted">
              <button type="button" aria-label="Duplicate session" title="Duplicate session" onClick={() => { setSessions([...routine.sessions.slice(0, idx + 1), { ...s, id: uid(), exercises: s.exercises.map((e) => ({ ...e, id: uid() })) }, ...routine.sessions.slice(idx + 1)]); setSessIdx(idx + 1); }}><Copy size={18} /></button>
              <button type="button" aria-label="Delete session" title="Delete session" disabled={routine.sessions.length === 1} className="text-bad disabled:opacity-30"
                onClick={() => { setSessions(routine.sessions.filter((_, i) => i !== idx)); setSessIdx(Math.max(0, idx - 1)); }}><Trash2 size={18} /></button>
            </div>
          </div>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <label><span className="mb-1.5 block text-[13px] font-semibold">Workout Title <span className="font-normal text-muted">(optional)</span></span>
              <input className={input} value={s.title} onChange={(e) => setSess({ title: e.target.value })} /></label>
            <label><span className="mb-1.5 block text-[13px] font-semibold">Session Notes <span className="font-normal text-muted">(optional)</span></span>
              <input className={input} value={s.note} onChange={(e) => setSess({ note: e.target.value })} /></label>
          </div>
          <ExerciseTable items={s.exercises} onChange={(exercises) => setSess({ exercises })} />
        </>
      ) : null}
    </div>
  );
}
