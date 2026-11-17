"use client";

import { LuArrowLeft, LuLogIn, LuShieldCheck } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import PasswordInput from "@/components/ui/PasswordInput";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOME } from "@/lib/nav";
import { resendTwoFactor, signIn, verifyTwoFactor, type TwoFactorStep } from "@/lib/auth";
import type { TwoFactorChannel } from "@/lib/api/security";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

const CHANNELS: [TwoFactorChannel, string][] = [
  ["primary_email", "Primary email"],
  ["secondary_email", "Secondary email"],
  ["phone_sms", "Text message (SMS)"],
];
/**
 * Where to go after signing in: `?next=` when it is a path inside this app, otherwise the home screen.
 * Only a single leading "/" is accepted — "//host", "/\\host" and absolute URLs would leave the site.
 */
function destination(): string {
  if (typeof window === "undefined") return HOME;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return HOME;
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/login")) return HOME;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return HOME;
  }
}

const channelLabel = (c: string) => CHANNELS.find(([v]) => v === c)?.[1].toLowerCase() ?? "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  /** Set once the password is accepted but the account has two-factor on: the code step replaces the form. */
  const [challenge, setChallenge] = useState<TwoFactorStep | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [notice, setNotice] = useState("");
  const [resending, setResending] = useState(false);

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const outcome = await signIn(email, password);
    if (outcome.status === "error") { setBusy(false); return setError(outcome.error); }
    if (outcome.status === "two-factor") {
      setBusy(false);
      setChallenge(outcome.challenge); setCode(""); setCodeError(""); setNotice("");
      return;
    }
    enter();
  };

  /**
   * Leaves for the app once signed in. `busy` stays on: the route change takes a moment, and a button that
   * goes back to "Sign in" while nothing visibly happens gets pressed a second time. If the client-side
   * change hasn't landed after a few seconds, load the destination outright rather than leave them here.
   */
  const enter = () => {
    const to = destination(); // straight there: routing via "/" relies on a server redirect that a
    router.replace(to);       // client-side replace does not follow in the production build
    window.setTimeout(() => {
      if (window.location.pathname.startsWith("/login")) window.location.assign(to);
    }, 4000);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code");
    if (busy) return;
    setBusy(true);
    const problem = await verifyTwoFactor(challenge.email, code);
    if (problem) { setBusy(false); return setCodeError(problem); }
    enter();
  };

  const resend = async (channel?: TwoFactorChannel) => {
    if (!challenge || resending) return;
    setResending(true); setCodeError(""); setNotice("");
    const res = await resendTwoFactor(challenge.email, channel);
    setResending(false);
    if (res.error !== null) return setCodeError(res.error);
    setChallenge({ ...challenge, channel: res.channel || challenge.channel, destination: res.destination || challenge.destination });
    setCode("");
    setNotice(res.message || "A new code is on its way.");
  };

  const backToPassword = () => { setChallenge(null); setCode(""); setCodeError(""); setNotice(""); setPassword(""); setError(""); };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[26px] font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#7a5cff] to-primary-600 text-xl text-white">m</span>manygym
        </div>
        {challenge ? (
          <form onSubmit={verify} className={`${card} p-7`}>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuShieldCheck size={22} /></span>
            <h1 className="text-xl font-bold">Enter your verification code</h1>
            <p className="mb-5 mt-1 text-muted">
              {challenge.destination
                ? <>We sent a 6-digit code{channelLabel(challenge.channel) && <> by {channelLabel(challenge.channel)}</>} to <b className="text-foreground">{challenge.destination}</b>.</>
                : challenge.message || "We sent you a 6-digit code."}
            </p>
            <label htmlFor="otp" className={label}>Verification code</label>
            <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus
              className={`${input} text-center text-lg tracking-[0.4em]`} value={code}
              aria-invalid={!!codeError} aria-describedby={codeError ? "otp-error" : undefined}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(""); }} />
            {codeError && <p id="otp-error" role="alert" className={`${errorText} text-[13px]`}>{codeError}</p>}
            {notice && !codeError && <p role="status" className={hint}>{notice}</p>}
            <MotionButton type="submit" disabled={busy || code.length !== 6} className={`${btnPrimary} mt-5 w-full`}><LuShieldCheck size={17} />{busy ? "Verifying…" : "Verify and sign in"}</MotionButton>

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-muted">
                Didn&apos;t get it?{" "}
                <button type="button" disabled={resending} onClick={() => void resend()} className="font-semibold text-primary disabled:opacity-50">{resending ? "Sending…" : "Resend code"}</button>
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                Or send it by:
                {CHANNELS.map(([value, text]) => (
                  <button key={value} type="button" disabled={resending} onClick={() => void resend(value)} className="font-semibold text-primary disabled:opacity-50">{text}</button>
                ))}
              </p>
            </div>
            <button type="button" onClick={backToPassword} className="mt-4 inline-flex items-center gap-1.5 font-semibold text-muted hover:text-foreground"><LuArrowLeft size={16} />Back to sign in</button>
          </form>
        ) : (
          <form onSubmit={submit} className={`${card} p-7`}>
            <h1 className="text-xl font-bold">Sign in</h1>
            <p className="mb-5 mt-1 text-muted">Welcome back. Enter your details to open the admin panel.</p>
            <label htmlFor="email" className={label}>Email</label>
            <input id="email" type="email" autoComplete="username" required autoFocus className={input} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
            <label htmlFor="password" className={`${label} mt-4`}>Password</label>
            <PasswordInput id="password" value={password} onChange={(v) => { setPassword(v); setError(""); }} />
            <p className="mt-2 text-right"><Link href="/forgot" className="font-semibold text-primary">Forgot your password?</Link></p>
            {error && (
              <p role="alert" className={`${errorText} mt-3 text-[13px]`}>
                {error}
                {/* "Not verified" is a dead end without somewhere to go: send them to the code step. */}
                {/verif/i.test(error) && (
                  <>
                    {" "}
                    <Link href={`/signup?email=${encodeURIComponent(email.trim())}`} className="font-semibold underline">
                      Enter your code
                    </Link>
                  </>
                )}
              </p>
            )}
            <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}><LuLogIn size={17} />{busy ? "Signing in…" : "Sign in"}</MotionButton>
            <p className="mt-4 text-center text-muted">
              New here? <Link href="/signup" className="font-semibold text-primary">Create an account</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
