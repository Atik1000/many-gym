import { Guard } from "@/components/AuthProvider";
import TrainersPage from "@/components/people/TrainersPage";

export const metadata = { title: "Trainers · manygym" };

function Inner() {
  return <TrainersPage />;
}

// the page needs the "View people" permission
export default function Page() {
  return (
    <Guard perm="View people">
      <Inner />
    </Guard>
  );
}
