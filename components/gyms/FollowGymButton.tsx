"use client";

import { useState } from "react";
import { LuCheck, LuPlus } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { follow, unfollow } from "@/lib/api/social";
import { btnGhost, btnPrimary } from "@/lib/ui";

/** Follow ⇄ Following for a gym. Following a gym is always automatic, so there is no "Requested" state. */
export default function FollowGymButton({ gymId, name, following, onChange }: {
  gymId: string; name: string; following: boolean; onChange: (following: boolean) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const target = { id: gymId, kind: "gym" as const };
      const result = following ? await unfollow(target) : await follow(target);
      const now = result.following ?? !following;
      onChange(now);
      toast(now ? `Following ${name}` : `Unfollowed ${name}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't change that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MotionButton className={following ? btnGhost : btnPrimary} disabled={busy} aria-pressed={following} onClick={toggle}>
      {following ? <><LuCheck size={17} />Following</> : <><LuPlus size={17} />Follow</>}
    </MotionButton>
  );
}
