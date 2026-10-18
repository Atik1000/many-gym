import { Guard } from "@/components/AuthProvider";
import PeoplePage from "@/components/people/PeoplePage";

export const metadata = { title: "People & Roles · manygym" };

function Inner() {
  return <PeoplePage />;
}

// the page needs the "View people" permission
export default function Page() {
  return (
    <Guard perm="View people">
      <Inner />
    </Guard>
  );
}
