import { Guard } from "@/components/AuthProvider";
import About from "@/components/studio/About";
import Feed from "@/components/studio/Feed";
import StudioHeader from "@/components/studio/StudioHeader";

export const metadata = { title: "Studio · manygym" };

// the page needs the "View studio information" permission
export default function Page() {
  return (
    <Guard perm="View studio information">
      <StudioHeader />
      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <About />
        <Feed />
      </div>
    </Guard>
  );
}
