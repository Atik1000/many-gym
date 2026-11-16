import { Suspense } from "react";
import UserProfile from "@/components/users/UserProfile";
import { card } from "@/lib/ui";

export const metadata = { title: "Profile · manygym" };

// A person's public profile. No permission gate: it is a personal-context page, like Find Gyms and Messages —
// what a viewer may see is decided by the server (private profiles and blocks answer 403).
export default function Page() {
  return (
    <Suspense fallback={<div className={`${card} h-[400px] animate-pulse`} />}>
      <UserProfile />
    </Suspense>
  );
}
