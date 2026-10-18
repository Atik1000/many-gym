"use client";

import { useState } from "react";
import type { Exercise, Routine } from "@/lib/routines";
import { card } from "@/lib/ui";

function Table({ items }: { items: Exercise[] }) {
  if (items.length === 0) return <p className="rounded-xl bg-background px-4 py-6 text-center text-muted">No exercises added.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] text-left">
        <thead className="bg-background text-muted"><tr>{["Exercise", "Sets", "Reps / Duration", "Rest", "Notes"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} className="border-t border-line">
              <td className="px-4 py-2">{e.name}</td><td className="px-4">{e.sets || "—"}</td><td className="px-4">{e.reps || "—"}</td><td className="px-4">{e.rest || "—"}</td><td className="px-4">{e.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RoutineViewer({ routine }: { routine: Routine }) {
  const [i, setI] = useState(0);
  const items = routine.format === "weekly" ? routine.days : routine.sessions;
  const idx = Math.min(i, items.length - 1);
  const current = items[idx];
  const isDay = routine.format === "weekly";
  const day = isDay ? routine.days[idx] : null;
  const tab = (on: boolean) => `rounded-xl border px-3 py-2.5 text-center ${on ? "border-primary bg-primary text-white" : "border-line bg-surface hover:bg-background"}`;
  return (
    <div>
      <div className={`mb-5 grid gap-2 ${isDay ? "grid-cols-7" : "grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"}`}>
        {isDay
          ? routine.days.map((d, n) => <button key={d.day} onClick={() => setI(n)} className={tab(n === idx)}><b className="block">{d.day}</b><span className={n === idx ? "text-white/85" : "text-muted"}>{d.rest ? "Rest" : "Workout"}</span></button>)
          : routine.sessions.map((s, n) => <button key={s.id} onClick={() => setI(n)} className={tab(n === idx)}><b>Session {n + 1}</b></button>)}
      </div>
      {current && (
        <>
          <h4 className="mb-3 text-xl font-bold">
            {isDay ? `${day!.day}${day!.title ? ` · ${day!.title}` : ""}` : `Session ${idx + 1}${(current as { title: string }).title ? ` · ${(current as { title: string }).title}` : ""}`}
            {!(isDay && day!.rest) && <span className="ml-3 text-sm font-normal text-muted">{current.exercises.length} exercises</span>}
          </h4>
          {isDay && day!.rest ? <p className="rounded-xl bg-background px-4 py-8 text-center text-muted">Rest day</p> : <Table items={current.exercises} />}
          {current.note && <p className={`${card} mt-3 px-4 py-3 text-muted`}>{current.note}</p>}
        </>
      )}
    </div>
  );
}
