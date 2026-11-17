import { Suspense } from "react";
import AuthProvider, { PersonalGate } from "@/components/AuthProvider";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ChatDock from "@/components/messages/ChatDock";
import TableLabels from "@/components/ui/TableLabels";
import { ToastProvider } from "@/components/ui/Toast";

// Sidebar/Topbar read the pathname, which is dynamic on [id] routes — Suspense keeps the page shell prerenderable.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
      <TableLabels />
      <div className="min-h-screen">
        <Suspense fallback={<header className="h-[60px] border-b border-line bg-surface" />}>
          <Topbar />
        </Suspense>
        <div className="flex">
          <Suspense fallback={<aside className="hidden w-[250px] shrink-0 border-r border-line bg-surface lg:block" />}>
            <Sidebar />
          </Suspense>
          <main className="mx-auto min-w-0 max-w-[1240px] flex-1 px-4 pb-12 pt-5 sm:px-8 sm:pt-6 xl:px-14">
            {/* pages read today's date / localStorage, so they render after the shell instead of blocking prerender */}
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-xl border border-line bg-surface" />}>
              {/* A person without a gym gets the personal pages; gym-management routes show a pointer instead. */}
              <PersonalGate>{children}</PersonalGate>
            </Suspense>
          </main>
        </div>
      </div>
      {/* Chat on every page; reads the pathname, hence the boundary. */}
      <Suspense fallback={null}><ChatDock /></Suspense>
      </AuthProvider>
    </ToastProvider>
  );
}
