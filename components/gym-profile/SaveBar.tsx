"use client";

import { LuRotateCcw, LuSave } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { btnGhost, btnPrimary } from "@/lib/ui";

export default function SaveBar({ onSave, onReset, dirty, alwaysDiscard }: { onSave: () => void; onReset: () => void; dirty: boolean; alwaysDiscard?: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-line pt-4">
      {dirty && <span className="mr-auto text-[13px] text-warn">Unsaved changes</span>}
      <MotionButton type="button" className={btnGhost} onClick={onReset} disabled={!dirty && !alwaysDiscard}><LuRotateCcw size={17} />Discard</MotionButton>
      <MotionButton type="button" className={btnPrimary} onClick={onSave} disabled={!dirty}><LuSave size={17} />Save Changes</MotionButton>
    </div>
  );
}
