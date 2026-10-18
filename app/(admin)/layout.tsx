import { Suspense } from "react";
import AuthProvider from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TableLabels from "@/components/ui/TableLabels";
import { ToastProvider } from "@/components/ui/Toast";

// Sidebar/Topbar read the pathname, which is dynamic on [id] routes — Suspense keeps the page shell prerenderable.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
      <TableLabels />
      <div className="flex min-h-screen">
        <Suspense fallback={<aside className="hidden w-[250px] shrink-0 border-r border-line bg-surface lg:block" />}>
          <Sidebar />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<header className="h-[60px] border-b border-line bg-surface" />}>
            <Topbar />
          </Suspense>
          <main className="mx-auto max-w-[1320px] px-4 pb-12 pt-5 sm:px-7 sm:pt-6">
            {/* pages read today's date / localStorage, so they render after the shell instead of blocking prerender */}
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-xl border border-line bg-surface" />}>{children}</Suspense>
          </main>
        </div>
      </div>
      </AuthProvider>
    </ToastProvider>
  );
}
