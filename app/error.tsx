"use client";

/**
 * Catches any render or effect error inside the app shell.
 *
 * Without this file a thrown error unmounts the whole tree and Next's production build shows a bare
 * "Application error" page with no way back — which is exactly what a null-guard slip on one member row
 * used to produce. The boundary keeps the person on a real page and gives them a retry that re-renders
 * the segment without a full reload.
 */
import { useEffect } from "react";
import Link from "next/link";
import { LuRotateCw, LuTriangleAlert } from "react-icons/lu";
import { HOME } from "@/lib/nav";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[manygym] unhandled render error:", error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-10">
      <div className={`${card} w-full max-w-[460px] p-7 text-center`}>
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bad-bg text-bad"><LuTriangleAlert size={22} /></span>
        <h1 className="text-xl font-bold">This screen hit an error</h1>
        <p className="mb-5 mt-1 text-muted">
          Nothing was lost — the rest of the admin panel is still working. Try again, and if it keeps
          happening the message below is what to report.
        </p>
        <p className="mb-5 break-words rounded-lg bg-background px-3 py-2 text-left text-[13px] text-muted">
          {error.message || "Unknown error"}
          {error.digest && <span className="block opacity-70">digest: {error.digest}</span>}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className={`${btnPrimary} flex-1`}><LuRotateCw size={16} />Try again</button>
          <Link href={HOME} className={`${btnGhost} flex-1`}>Go to Studio</Link>
        </div>
      </div>
    </main>
  );
}
