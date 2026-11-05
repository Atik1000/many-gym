import Link from "next/link";
import { LuCompass } from "react-icons/lu";
import { HOME } from "@/lib/nav";
import { btnPrimary, card } from "@/lib/ui";

/** Replaces Next's unstyled default 404, which arrived with no app chrome and no way back. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className={`${card} w-full max-w-[420px] p-7 text-center`}>
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuCompass size={22} /></span>
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="mb-5 mt-1 text-muted">That address doesn&apos;t match anything in the admin panel.</p>
        <Link href={HOME} className={`${btnPrimary} w-full`}>Go to Studio</Link>
      </div>
    </main>
  );
}
