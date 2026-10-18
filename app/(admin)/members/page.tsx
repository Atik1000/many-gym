import { Guard } from "@/components/AuthProvider";
import { Suspense } from "react";
import MembersList from "@/components/members/MembersList";
import { card } from "@/lib/ui";

export const metadata = { title: "Members · manygym" };

function Inner() {
  return (
    <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
      <MembersList />
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
