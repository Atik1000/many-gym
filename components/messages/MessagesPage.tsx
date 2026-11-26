"use client";

/**
 * Messages — the full-size chat: conversations on the left, the open thread on the right. On small screens
 * the two take turns. The engine is `useMessaging`; the same thread also runs in the floating chat box
 * (`ChatDock`) on every other page.
 *
 * `/messages?user=<id>` opens — or starts — the personal conversation with that person, which is how profiles
 * and search results link here. "New message" finds someone among the person's follows and followers.
 */
import { useState } from "react";
import { LuKeyRound, LuLock, LuMessageCircle, LuRefreshCw } from "react-icons/lu";
import { Select } from "@/components/ui/parts";
import { useResource } from "@/lib/api";
import { MEMBERS_KEY, fullName, type Member } from "@/lib/members";
import { card } from "@/lib/ui";
import { ConversationList, NewMessageButton, Thread } from "./ChatParts";
import RecoveryCodeModal from "./RecoveryCode";
import { useMessaging } from "./useMessaging";

const iconBtn = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-foreground outline-none transition-colors hover:bg-primary-50 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40";

export default function MessagesPage() {
  const m = useMessaging({ readQuery: true });
  const [memberRows] = useResource<Member>(MEMBERS_KEY);
  // Only members linked to a user account can be messaged; the directory row carries that id.
  const [changingCode, setChangingCode] = useState(false);
  const members = memberRows.filter((x) => x.userId).map((x) => ({ id: x.id, name: fullName(x), userId: x.userId! }));

  return (
    <div className={`${card} grid h-[calc(100dvh-132px)] min-h-[460px] overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]`}>
      <aside className={`${m.active ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-line lg:border-r`}>
        <div className="flex items-center gap-2 px-4 pb-3 pt-4">
          <h1 className="flex-1 text-2xl font-extrabold">Chats</h1>
          {m.keyState === "ready" && <button aria-label="Change recovery code" title="Change recovery code" onClick={() => setChangingCode(true)} className={iconBtn}><LuKeyRound size={16} /></button>}
          <NewMessageButton m={m} className={iconBtn} />
          <button aria-label="Refresh" title="Refresh" disabled={m.loading} onClick={() => void m.refresh()} className={iconBtn}><LuRefreshCw size={16} /></button>
        </div>
        {/* Members can only be picked from the gym's inbox — the list is the gym's, and so is the conversation. */}
        {m.scope === "gym" && members.length > 0 && (
          <div className="px-3 pb-2">
            <Select aria-label="Start a conversation with a member" value="" disabled={m.starting}
              onChange={(e) => { if (e.target.value) void m.startWith(e.target.value); }}>
              <option value="">Message a member…</option>
              {members.map((x) => <option key={x.id} value={x.userId}>{x.name}</option>)}
            </Select>
          </div>
        )}
        {m.startProblem && <p role="alert" className="mx-3 mb-2 rounded-xl bg-warn-bg px-3 py-2 text-[13px] text-warn">{m.startProblem}</p>}
        {!m.registered && !m.loading && (
          <p className="mx-3 mb-2 rounded-xl bg-background px-3 py-2 text-[13px] text-muted">
            This browser isn&apos;t set up to receive messages yet.{" "}
            <button onClick={() => void m.registerDevice()} disabled={m.busy} className="font-semibold text-primary">Set it up</button>
          </p>
        )}
        <ConversationList m={m} />
        <RecoveryCodeModal key={changingCode ? "change" : "none"} m={m} mode={changingCode ? "change" : null} onClose={() => setChangingCode(false)} />
      </aside>

      <section className={`${m.active ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
        {m.active ? (
          <Thread m={m} onBack={m.closeConversation} />
        ) : (
          <div className="m-auto grid max-w-xs place-items-center gap-2 p-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary"><LuMessageCircle size={30} /></span>
            <b className="text-lg">Your messages</b>
            <p className="text-muted">Pick a conversation to read it, or start a new one.</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><LuLock size={12} />End-to-end encrypted — only the two of you can read them.</p>
          </div>
        )}
      </section>
    </div>
  );
}
