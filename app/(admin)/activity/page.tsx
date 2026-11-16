import { Guard } from "@/components/AuthProvider";
import ActivityLog from "@/components/activity/ActivityLog";

export const metadata = { title: "Activity Log · manygym" };

function Inner() {
  return <ActivityLog />;
}

// the page needs the "View activity log" permission
export default function Page() {
  return (
    <Guard perm="View activity log">
      <Inner />
    </Guard>
  );
}
