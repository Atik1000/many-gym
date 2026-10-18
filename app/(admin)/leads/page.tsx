import { Guard } from "@/components/AuthProvider";
import LeadsPage from "@/components/leads/LeadsPage";

export const metadata = { title: "Leads · manygym" };

function Inner() {
  return <LeadsPage />;
}

// the page needs the "View leads" permission
export default function Page() {
  return (
    <Guard perm="View leads">
      <Inner />
    </Guard>
  );
}
