import { Guard } from "@/components/AuthProvider";
import EnquiriesPage from "@/components/enquiries/EnquiriesPage";

export const metadata = { title: "Enquiries · manygym" };

function Inner() {
  return <EnquiriesPage />;
}

// the page needs the "View enquiries" permission
export default function Page() {
  return (
    <Guard perm="View enquiries">
      <Inner />
    </Guard>
  );
}
