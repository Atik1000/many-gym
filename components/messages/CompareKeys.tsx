"use client";

/**
 * Compare keys — a Signal / WhatsApp-style safety number for a person-to-person chat.
 *
 * The number is computed from both people's *backup* public keys, not a device key: with history on every
 * device, the backup key is what every message is ultimately readable by, so it is the key that has to be
 * the right one. If both people see the same 60 digits (in person, or over a call), nobody has slipped a key
 * of their own in between. See docs/e2ee-compare-keys.md for why, and what is still to do.
 */
import { useEffect, useState } from "react";
import { LuShieldCheck, LuShieldQuestion } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { safetyNumber } from "@/lib/api/e2ee";
import type { Messaging } from "./useMessaging";

export default function CompareKeys({ m, open, onClose }: { m: Messaging; open: boolean; onClose: () => void }) {
  const peerId = m.active?.targetUserId ?? "";
  const mine = m.keyState === "ready" ? m.master?.publicKey ?? null : null;
  const theirs = m.peerBackupKey;
  const key = open && mine && theirs && peerId ? `${m.meId}:${mine}:${peerId}:${theirs}` : "";
  const [result, setResult] = useState<{ key: string; groups: string[] } | null>(null);

  useEffect(() => {
    if (!key || !mine || !theirs) return;
    let live = true;
    void safetyNumber({ userId: m.meId, publicKey: mine }, { userId: peerId, publicKey: theirs }).then((groups) => { if (live) setResult({ key, groups }); });
    return () => { live = false; };
  }, [key, mine, theirs, peerId, m.meId]);

  const groups = result?.key === key ? result.groups : null;
  const name = m.active?.title ?? "them";
  const missing = !mine ? "You need a recovery code on this device before there is a key to compare." : !theirs ? `${name} hasn't set a recovery code yet, so there is no key of theirs to compare.` : "";

  return (
    <Modal open={open} title="Compare keys" onClose={onClose}>
      <div className="grid justify-items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary">{missing ? <LuShieldQuestion size={26} /> : <LuShieldCheck size={26} />}</span>
        {missing ? (
          <p className="max-w-sm text-muted">{missing}</p>
        ) : (
          <>
            <p className="max-w-sm text-muted">Compare this number with the one {name} sees on their device. If they match, your messages are encrypted to the right keys and nobody is in between.</p>
            {groups ? (
              <div aria-label="Safety number" className="grid grid-cols-4 gap-x-4 gap-y-2 rounded-2xl bg-background px-5 py-4 font-mono text-lg font-semibold tracking-wider">
                {groups.map((g, i) => <span key={i}>{g}</span>)}
              </div>
            ) : (
              <div aria-hidden className="h-[132px] w-[300px] animate-pulse rounded-2xl bg-background" />
            )}
            <p className="max-w-sm text-xs text-muted">The number changes if either of you starts over with a new recovery code. Check it again if that happens.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
