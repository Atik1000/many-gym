"use client";

/**
 * "New message" — find someone to write to, without leaving the inbox.
 *
 * `GET /messaging/people/search/` only returns the person's follows and followers, so this is not a directory
 * of everyone: finding strangers is the central search's job (`/search?tab=people`). Each row says whether a
 * message can actually go: their "who can message me" setting (`can_message`) and whether they have a key yet
 * (`has_e2ee_keys`). Picking someone opens the existing conversation, or starts one.
 */
import { useEffect, useState } from "react";
import { LuLock, LuSearch } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/parts";
import { ApiError, mediaUrl } from "@/lib/api/http";
import { searchPeopleToMessage, type MessagePerson } from "@/lib/api/messaging-keys";
import type { Messaging } from "./useMessaging";

const RELATIONSHIP: Record<MessagePerson["relationship"], string> = { mutual: "You follow each other", following: "You follow them", follower: "Follows you" };

export default function NewMessage({ m, open, onClose }: { m: Messaging; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ q: string; rows: MessagePerson[]; error: string } | null>(null);
  const term = q.trim();
  const loading = open && answer?.q !== term;

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchPeopleToMessage(term, 20, ctl.signal)
        .then((rows) => { if (!ctl.signal.aborted) setAnswer({ q: term, rows, error: "" }); })
        .catch((e) => {
          if (ctl.signal.aborted || (e as Error)?.name === "AbortError") return;
          setAnswer({ q: term, rows: [], error: e instanceof ApiError ? e.message : "Couldn't load people." });
        });
    }, term ? 250 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [open, term]);

  const close = () => { setQ(""); onClose(); };

  const pick = async (p: MessagePerson) => {
    close();
    const existing = (p.conversation_id && m.list.find((c) => c.id === p.conversation_id)) || m.list.find((c) => c.targetUserId === p.user_id && !c.targetGymId);
    if (existing) await m.openConversation(existing);
    else await m.startWith(p.user_id);
  };

  const rows = answer?.rows ?? [];

  return (
    <Modal open={open} title="New message" onClose={close}>
      <label className="flex items-center gap-2 rounded-full bg-background px-3.5 py-2.5 text-muted focus-within:ring-2 focus-within:ring-primary/30">
        <LuSearch size={17} className="shrink-0" />
        <input autoFocus type="search" aria-label="Search people you follow or who follow you" placeholder="Search people you follow or who follow you"
          value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted" />
      </label>

      <div aria-live="polite" aria-busy={loading} className="-mx-2 max-h-[55vh] min-h-[200px] overflow-y-auto">
        {answer?.error && !loading ? (
          <p className="px-4 py-10 text-center text-bad">{answer.error}</p>
        ) : loading && rows.length === 0 ? (
          <ul aria-hidden className="grid gap-1">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2">
                <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-background" />
                <span className="grid flex-1 gap-1.5"><span className="h-3 w-1/2 animate-pulse rounded bg-background" /><span className="h-2.5 w-1/3 animate-pulse rounded bg-background" /></span>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted">
            {term ? `No one you follow, or who follows you, matches “${term}”.` : "Follow people, or wait for them to follow you, and they'll show up here."}
          </p>
        ) : (
          <ul className={`grid gap-0.5 ${loading ? "opacity-60" : ""}`}>
            {rows.map((p) => {
              const name = p.full_name || `${p.first_name} ${p.last_name}`.trim() || p.email;
              const why = !p.can_message ? "Isn't accepting messages from you" : !p.has_e2ee_keys ? "Hasn't set up messaging yet" : "";
              return (
                <li key={p.user_id}>
                  <button disabled={!!why || m.starting} onClick={() => void pick(p)} title={why || `Message ${name}`}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <span className={why ? "opacity-50" : ""}><Avatar name={name} size={44} src={mediaUrl(p.avatar_url)} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-1.5 font-semibold ${why ? "text-muted" : ""}`}><span className="truncate">{name}</span>{p.is_private && <LuLock size={12} className="shrink-0 text-muted" aria-label="Private account" />}</span>
                      <span className="block truncate text-[13px] text-muted">{why || RELATIONSHIP[p.relationship] || ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
