import { Guard } from "@/components/AuthProvider";
import ReportsPage from "@/components/reports/ReportsPage";

export const metadata = { title: "Reports · manygym" };

// the page needs the "View reports" permission
export default function Page() {
  return (
    <Guard perm="View reports">
      <ReportsPage />
    </Guard>
  );
}
