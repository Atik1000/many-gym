"use client";

import { LuCopy } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { useGym } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { DAYS, type DayHours } from "@/lib/gym-data";
import { btnGhost, errorText, input } from "@/lib/ui";
import SaveBar from "./SaveBar";
import TabSkeleton from "./Skeleton";

type Hours = Record<string, DayHours>;

function Form({ initial, onSave }: { initial: Hours; onSave: (h: Hours) => void }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [hours, setHours] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(hours) !== JSON.stringify(saved);
  const patch = (d: string, p: Partial<DayHours>) => setHours((h) => ({ ...h, [d]: { ...h[d], ...p } }));

  const save = () => {
    const e: Record<string, string> = {};
    for (const d of DAYS) if (hours[d].open && hours[d].end <= hours[d].start) e[d] = "Closing time must be after opening time";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave(hours); setSaved(hours); toast("Opening hours saved");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted">Set the opening and closing time for each day. Switch a day off if the gym is closed.</p>
        <MotionButton className={btnGhost} onClick={() => setHours((h) => Object.fromEntries(DAYS.map((d) => [d, { ...h.Monday }])))}><LuCopy size={17} />Copy Monday to all</MotionButton>
      </div>
      <div className="divide-y divide-line rounded-xl border border-line">
        {DAYS.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <span className="w-28 font-semibold">{d}</span>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={hours[d].open} onChange={(e) => patch(d, { open: e.target.checked })} />
              <span className={hours[d].open ? "text-ok" : "text-muted"}>{hours[d].open ? "Open" : "Closed"}</span>
            </label>
            {hours[d].open ? (
              <div className="ml-auto flex items-center gap-2">
                <input type="time" aria-label={`${d} start`} className={`${input} w-[130px]`} value={hours[d].start} onChange={(e) => patch(d, { start: e.target.value })} />
                <span className="text-muted">to</span>
                <input type="time" aria-label={`${d} end`} className={`${input} w-[130px]`} value={hours[d].end} onChange={(e) => patch(d, { end: e.target.value })} />
              </div>
            ) : <span className="ml-auto text-muted">—</span>}
            {errors[d] && <p className={`${errorText} w-full`}>{errors[d]}</p>}
          </div>
        ))}
      </div>
      <SaveBar dirty={dirty} onSave={save} onReset={() => { setHours(saved); setErrors({}); }} />
    </div>
  );
}

export default function HoursTab() {
  const [gym, setGym, ready] = useGym();
  if (!ready || !gym) return <TabSkeleton />;
  return <Form initial={gym.hours} onSave={(hours) => setGym((g) => ({ ...g, hours }))} />;
}
