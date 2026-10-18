import { Guard } from "@/components/AuthProvider";
import { Suspense } from "react";
import MemberDetail from "@/components/members/MemberDetail";
import { card } from "@/lib/ui";

export const metadata = { title: "Member · manygym" };

function Inner() {
  return (
    <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
      <MemberDetail />
    </Suspense>
  );
}

// the page needs the "View members" permission
export default function Page() {
  return (
    <Guard perm="View members">
      <Inner />
    </Guard>
  );
}
