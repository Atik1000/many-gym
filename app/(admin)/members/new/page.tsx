import { Guard } from "@/components/AuthProvider";
import MemberForm from "@/components/members/MemberForm";

export const metadata = { title: "Add member · manygym" };

function Inner() {
  return <MemberForm />;
}

// the page needs the "Create members" permission
export default function Page() {
  return (
    <Guard perm="Create members">
      <Inner />
    </Guard>
  );
}
