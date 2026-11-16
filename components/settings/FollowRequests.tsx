"use client";

/**
 * The follow-requests inbox — people waiting for this account to confirm them as a follower.
 *
 * Only relevant while "require approval for new followers" is on, but requests made while it was on stay
 * pending after it is switched off, so the list is shown whenever there is something in it.
 *
 * `GET /users/follow-requests/?type=received&status=pending`, then `POST …/{id}/accept/` or `…/reject/`.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuCheck, LuUserPlus, LuX } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { Avatar } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError, mediaUrl } from "@/lib/api/http";
import { timeAgo } from "@/lib/posts";
import * as social from "@/lib/api/social";
import { btnGhost, btnPrimary, hint } from "@/lib/ui";

export default function FollowRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState<social.FollowRequest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await social.followRequests("received"));
      setFailed(false);
    } catch {
      setRequests([]);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const answer = async (r: social.FollowRequest, accept: boolean) => {
    setBusy(r.id);
    try {
      await (accept ? social.acceptFollowRequest(r.id) : social.rejectFollowRequest(r.id));
      setRequests((list) => (list ?? []).filter((x) => x.id !== r.id));
      toast(accept ? `${r.requester.name} now follows you` : "Request deleted");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Withdrawn by the requester, or already answered from another device.
        toast("Request no longer available.");
        await load();
      } else {
        toast(e instanceof ApiError ? e.message : "Couldn\u2019t answer that request.");
      }
    } finally {
      setBusy(null);
      social.followRequestsChanged();
    }
  };

  return (
    <div id="follow-requests" className="mt-5 border-t border-line pt-4">
      <h3 className="flex items-center gap-2 font-bold">
        <LuUserPlus size={17} />Follow requests
        {!!requests?.length && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{requests.length}</span>}
      </h3>
      <p className={hint}>People who asked to follow you. They only see follower-only posts once you confirm.</p>

      {requests === null ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-background" />
      ) : failed ? (
        <p className="mt-3 text-muted">Couldn&apos;t load follow requests. <button className="font-semibold text-primary" onClick={() => void load()}>Try again</button></p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-muted">No pending requests.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          <AnimatePresence initial={false}>
            {requests.map((r) => (
              <motion.li key={r.id} layout exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.18 }} className="flex flex-wrap items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                <Avatar name={r.requester.name} size={40} src={mediaUrl(r.requester.avatarUrl) || undefined} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{r.requester.id ? <Link href={`/users/${r.requester.id}`} className="hover:underline">{r.requester.name}</Link> : r.requester.name}</b>
                  <span className="block truncate text-[13px] text-muted">{r.requester.email}{r.createdAt && ` · ${timeAgo(r.createdAt)}`}</span>
                </span>
                <span className="flex gap-2">
                  <MotionButton className={btnPrimary} disabled={busy === r.id} onClick={() => void answer(r, true)}><LuCheck size={16} />Confirm</MotionButton>
                  <MotionButton className={btnGhost} disabled={busy === r.id} onClick={() => void answer(r, false)}><LuX size={16} />Delete</MotionButton>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
