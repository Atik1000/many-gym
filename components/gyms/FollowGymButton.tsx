"use client";

import { useEffect, useRef, useState } from "react";
import { LuCheck, LuPlus } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { follow, onFollowChange, unfollow } from "@/lib/api/social";
import { FOLLOWING, btnGhost, btnPrimary } from "@/lib/ui";

/**
 * Follow ⇄ Following for a gym. Following a gym is always automatic, so there is no "Requested" state.
 * `onChange` is driven by `FOLLOW_EVENT`, so it fires once per change wherever on screen the change was made.
 */
export default function FollowGymButton({ gymId, name, following, onChange }: {
  gymId: string; name: string; following: boolean; onChange: (following: boolean) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const live = useRef({ following, onChange });
  useEffect(() => { live.current = { following, onChange }; });
  useEffect(() => onFollowChange((c) => {
    if (c.target.kind !== "gym" || c.target.id !== gymId) return;
    const now = c.state === "following";
    if (now !== live.current.following) live.current.onChange(now);
  }), [gymId]);

  const toggle = async () => {
    setBusy(true);
    try {
      const target = { id: gymId, kind: "gym" as const };
      const result = following ? await unfollow(target) : await follow(target);
      const now = result.following ?? !following;
      toast(now ? `Following ${name}` : `Unfollowed ${name}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionButton className={following ? `${btnGhost} ${FOLLOWING}` : btnPrimary} disabled={busy} aria-pressed={following} onClick={toggle}>
      {following ? <><LuCheck size={17} />Following</> : <><LuPlus size={17} />Follow</>}
    </MotionButton>
  );
}
