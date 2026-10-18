import { Guard } from "@/components/AuthProvider";
import PlansList from "@/components/plans/PlansList";

export const metadata = { title: "Membership Plans · manygym" };

function Inner() {
  return <PlansList />;
}

// the page needs the "View plans" permission
export default function Page() {
  return (
    <Guard perm="View plans">
      <Inner />
    </Guard>
  );
}
