"use client";

/**
 * Follow → Requested (when the other person confirms followers first) → Following.
 *
 * Pressing "Requested" withdraws the request through the dedicated cancel routes; pressing "Following"
 * unfollows. Shared by the profile page and Find People.
 *
 * The button follows `FOLLOW_EVENT`, not just its own presses, so the same person reads the same on every
 * button on screen the moment any one of them changes.
 */
import { useEffect, useRef, useState } from "react";
import { LuCheck, LuClock, LuPlus } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import * as social from "@/lib/api/social";
import { FOLLOWING, REQUESTED, btnGhost, btnPrimary } from "@/lib/ui";

export default function FollowButton({ userId, name, initial, requestId, onState }: {
  userId: string;
  name: string;
  initial: social.FollowState;
  /** The pending request's id when it is already known (from the sent-requests list). */
  requestId?: string;
  onState?: (s: social.FollowState) => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<social.FollowState>(initial);
  const [pendingId, setPendingId] = useState(requestId);
  const [busy, setBusy] = useState(false);

  const onStateRef = useRef(onState);
  useEffect(() => { onStateRef.current = onState; });
  useEffect(() => social.onFollowChange((c) => {
    if (c.target.kind !== "user" || c.target.id !== userId) return;
    setState(c.state);
    setPendingId(c.requestId);
    onStateRef.current?.(c.state);
  }), [userId]);

  const toggle = async () => {
    setBusy(true);
    try {
      const target = { id: userId, kind: "user" as const };
      const result =
        state === "none" ? await social.follow(target)
          : state === "pending" ? await social.cancelFollowRequest(userId, pendingId)
            : await social.unfollow(target);
      toast(result.state === "pending" ? `Follow request sent to ${name}` : result.state === "following" ? `Following ${name}` : state === "pending" ? "Follow request withdrawn" : `Unfollowed ${name}`);
    } catch (e) {
      toast(social.followProblem(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionButton className={state === "none" ? btnPrimary : `${btnGhost} ${state === "following" ? FOLLOWING : REQUESTED}`} disabled={busy} onClick={toggle} aria-pressed={state !== "none"}
      title={state === "pending" ? "Waiting for them to confirm — press to withdraw" : state === "following" ? "Press to unfollow" : undefined}>
      {state === "following" ? <><LuCheck size={17} />Following</> : state === "pending" ? <><LuClock size={17} />Requested</> : <><LuPlus size={17} />Follow</>}
    </MotionButton>
  );
}
