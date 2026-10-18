import { Guard } from "@/components/AuthProvider";
import PlanWizard from "@/components/plans/PlanWizard";

export const metadata = { title: "Create plan · manygym" };

function Inner() {
  return <PlanWizard />;
}

// the page needs the "Create plans" permission
export default function Page() {
  return (
    <Guard perm="Create plans">
      <Inner />
    </Guard>
  );
}
