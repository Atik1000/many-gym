import { Guard } from "@/components/AuthProvider";
import HistoryPage from "@/components/studio/HistoryPage";

export const metadata = { title: "History · manygym" };

// the page needs the "View studio information" permission
export default function Page() {
  return (
    <Guard perm="View studio information">
      <HistoryPage />
    </Guard>
  );
}
