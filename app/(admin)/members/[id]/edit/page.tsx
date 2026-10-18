import { Guard } from "@/components/AuthProvider";
import { Suspense } from "react";
import MemberForm from "@/components/members/MemberForm";
import { card } from "@/lib/ui";

export const metadata = { title: "Edit member · manygym" };

function Inner() {
  return (
    <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
      <MemberForm editing />
    </Suspense>
  );
}

// the page needs the "Edit members" permission
export default function Page() {
  return (
    <Guard perm="Edit members">
      <Inner />
    </Guard>
  );
}
