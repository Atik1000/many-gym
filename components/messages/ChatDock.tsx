"use client";

/**
 * The floating chat box: a round button in the bottom-right corner of every signed-in page that opens a
 * small window with the conversations and, one tap further, a thread with the same composer as the Messages
 * page — so a reply never needs a trip away from what you were doing.
 *
 * It steps aside on `/messages`, which is the same chat at full size and owns the connection there.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuMaximize2, LuMessageCircle, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import { ConversationList, Thread } from "./ChatParts";
import { useMessaging } from "./useMessaging";

const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40";

export default function ChatDock() {
  const { ready, me } = useAuth();
  const pathname = usePathname();
  if (!ready || !me || pathname.startsWith("/messages")) return null;
  return <Dock />;
}

function Dock() {
  const m = useMessaging();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    m.closeConversation(); // nothing should be marked read while the window is shut
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); m.closeConversation(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `m.closeConversation` is recreated every render; it only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label={m.unread ? `Open chat — ${m.unread} unread` : "Open chat"}
        className="fixed bottom-4 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[#6f55ff] to-primary text-white shadow-[0_10px_24px_-6px_rgba(91,61,245,.6)] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-primary/30 motion-reduce:transition-none sm:bottom-6 sm:right-6">
        <LuMessageCircle size={26} />
        {m.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] font-bold text-white ring-2 ring-surface">{m.unread > 99 ? "99+" : m.unread}</span>
        )}
      </button>
    );
  }

  return (
    <section role="dialog" aria-label="Chat"
      className="fixed inset-x-2 bottom-2 z-40 flex h-[min(540px,calc(100dvh-76px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[360px]">
      {m.active ? (
        <Thread m={m} compact onBack={m.closeConversation} onClose={close} fullHref="/messages" />
      ) : (
        <>
          <header className="flex items-center gap-1 px-4 pb-2 pt-3">
            <h2 className="flex-1 text-xl font-extrabold">Chats</h2>
            <Link href="/messages" aria-label="Open Messages" title="Open Messages" className={iconBtn}><LuMaximize2 size={16} /></Link>
            <button aria-label="Close chat" onClick={close} className={iconBtn}><LuX size={18} /></button>
          </header>
          {m.startProblem && <p role="alert" className="mx-3 mb-2 rounded-xl bg-warn-bg px-3 py-2 text-[13px] text-warn">{m.startProblem}</p>}
          <ConversationList m={m} compact />
        </>
      )}
    </section>
  );
}
