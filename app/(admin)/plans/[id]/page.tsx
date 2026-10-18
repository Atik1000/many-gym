import { Guard } from "@/components/AuthProvider";
import { Suspense } from "react";
import PlanDetail from "@/components/plans/PlanDetail";
import { card } from "@/lib/ui";

export const metadata = { title: "Plan details · manygym" };

function Inner() {
  return (
    <Suspense fallback={<div className={`${card} h-[300px] animate-pulse`} />}>
      <PlanDetail />
    </Suspense>
  );
}

// the page needs the "View plans" permission
export default function Page() {
  return (
    <Guard perm="View plans">
      <Inner />
    </Guard>
  );
}
