import { Suspense } from "react";
import GymPublicPage from "@/components/gyms/GymPublicPage";
import { card } from "@/lib/ui";

export const metadata = { title: "Gym · manygym" };

// The gym id is read with useParams inside the client component, as the member and plan detail pages do.
export default function Page() {
  return (
    <Suspense fallback={<div className={`${card} mx-auto h-[420px] max-w-[920px] animate-pulse`} />}>
      <GymPublicPage />
    </Suspense>
  );
}
