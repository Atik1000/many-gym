import { Guard } from "@/components/AuthProvider";
import TemplatesPage from "@/components/routines/TemplatesPage";

export const metadata = { title: "Routine Templates · manygym" };

function Inner() {
  return <TemplatesPage />;
}

// the page needs the "View templates" permission
export default function Page() {
  return (
    <Guard perm="View templates">
      <Inner />
    </Guard>
  );
}
