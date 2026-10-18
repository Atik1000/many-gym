import { LuClock as Clock, LuDatabase as Database } from "react-icons/lu";
import { STATUS_LABEL, type PlanStatus, type PlanType } from "@/lib/plans";

const STATUS_STYLE: Record<PlanStatus, string> = {
  active: "bg-ok-bg text-ok",
  draft: "bg-warn-bg text-warn",
  archived: "bg-bad-bg text-bad",
};

export function StatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${STATUS_STYLE[status]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />{STATUS_LABEL[status]}
    </span>
  );
}

export function TypeBadge({ type, large }: { type: PlanType; large?: boolean }) {
  const Icon = type === "time" ? Clock : Database;
  return (
    <span className={`inline-flex items-center gap-2 rounded-[10px] bg-primary-50 font-medium text-primary ${large ? "px-4 py-2.5 text-lg" : "px-3 py-1.5 text-[13px]"}`}>
      <Icon size={large ? 20 : 16} />{type === "time" ? "Time based" : "Session based"}
    </span>
  );
}
