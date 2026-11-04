"use client";

/**
 * Invitation link: /accept?code=<token>
 *
 * `POST /members/accept-invitation/` redeems an onboarding token for a member. The endpoint requires a signed-in
 * session, so someone arriving without one is sent to sign in (or register) first and returned here.
 *
 * Staff invitations are different: `POST /access-control/staff/` emails them, but no endpoint redeems a staff
 * invite code — see docs/api/known-issues.md.
 */
import { LuUserPlus } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HOME } from "@/lib/nav";
import * as api from "@/lib/api/endpoints";
import { ApiError, getTokens } from "@/lib/api/http";
import { btnPrimary, card, errorText, hint } from "@/lib/ui";

export default function AcceptPage() {
  const router = useRouter();
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    const tokens = getTokens();
    void Promise.resolve().then(() => { setCode(c); setSignedIn(!!tokens); });
  }, []);

  const accept = async () => {
    if (!code) return;
    setBusy(true);
    setError("");
    try {
      await api.membersAcceptInvitationCreate({ token: code, invitation_token: code });
      router.replace(HOME);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't accept that invitation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className={`${card} w-full max-w-[420px] p-7`}>
        {code === undefined ? (
          <div className="h-40 animate-pulse rounded-lg bg-background" />
        ) : !code ? (
          <>
            <h1 className="text-xl font-bold">Invitation not valid</h1>
            <p className="mt-1 text-muted">This link is missing its invitation code. Ask whoever invited you to send a new one.</p>
          </>
        ) : !signedIn ? (
          <>
            <h1 className="text-xl font-bold">Sign in to accept</h1>
            <p className="mb-5 mt-1 text-muted">Accepting an invitation needs a manygym account. Sign in or create one, then open this link again.</p>
            <MotionLinkRow href={`/login?next=${encodeURIComponent(`/accept?code=${code}`)}`} />
          </>
        ) : (
          <>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuUserPlus size={22} /></span>
            <h1 className="text-xl font-bold">Accept your invitation</h1>
            <p className="mb-5 mt-1 text-muted">You&apos;ve been invited to join a gym on manygym.</p>
            {error && <p role="alert" className={`${errorText} mb-3 text-[13px]`}>{error}</p>}
            <MotionButton className={`${btnPrimary} w-full`} disabled={busy} onClick={accept}>
              {busy ? "Accepting…" : "Accept invitation"}
            </MotionButton>
            <p className={hint}>Invitation links can only be used once.</p>
          </>
        )}
      </div>
    </main>
  );
}

function MotionLinkRow({ href }: { href: string }) {
  return <Link href={href} className={`${btnPrimary} w-full justify-center`}>Go to sign in</Link>;
}
