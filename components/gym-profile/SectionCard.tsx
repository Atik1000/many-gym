"use client";

import { LuPencil, LuX } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useAuth } from "@/components/AuthProvider";
import { btnGhost } from "@/lib/ui";

/** A profile section: read-only by default, with an Edit button that becomes Cancel while the form is open. */
export default function SectionCard({ title, editing, onToggle, children }: { title: string; editing: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { can } = useAuth();
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{title}</h3>
        {can("Edit gym profile") && (
          <MotionButton type="button" className={btnGhost} onClick={onToggle}>{editing ? <><LuX size={17} />Cancel</> : <><LuPencil size={17} />Edit</>}</MotionButton>
        )}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-[13px] text-muted">{label}</dt><dd className="font-semibold">{children || "—"}</dd></div>;
}
