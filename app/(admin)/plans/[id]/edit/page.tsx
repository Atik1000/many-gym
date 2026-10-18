import { Guard } from "@/components/AuthProvider";
import { Suspense } from "react";
import PlanWizard from "@/components/plans/PlanWizard";
import { card } from "@/lib/ui";

export const metadata = { title: "Edit plan · manygym" };

function Inner() {
  return (
    <Suspense fallback={<div className={`${card} h-[300px] animate-pulse`} />}>
      <PlanWizard editing />
    </Suspense>
  );
}

// the page needs the "Edit plans" permission
export default function Page() {
  return (
    <Guard perm="Edit plans">
      <Inner />
    </Guard>
  );
}
