import { Guard } from "@/components/AuthProvider";
import About from "@/components/studio/About";
import Feed from "@/components/studio/Feed";
import StudioHeader from "@/components/studio/StudioHeader";
import Audience from "@/components/studio/Audience";
import Stories from "@/components/studio/Stories";

export const metadata = { title: "Studio · manygym" };

// the page needs the "View studio information" permission
export default function Page() {
  return (
    <Guard perm="View studio information">
      <StudioHeader />
      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Narrow column: what the gym is and who follows it. Wide column: stories and the feed. */}
        <div className="grid min-w-0 gap-5">
          <About />
          <Audience />
        </div>
        <div className="grid min-w-0 gap-4">
          <Stories />
          <Feed />
        </div>
      </div>
    </Guard>
  );
}
