"use client";

/**
 * Sign-up, the API's two-step onboarding:
 *   1. `POST /auth/register/`           — creates the account, emails a 6-digit code, 15-minute expiry
 *   2. `POST /auth/verify-signup-otp/`  — verifies the code and returns a token pair directly
 *
 * Step 2 signs the person straight in, so there's no separate login afterwards. A new account belongs to no
 * gym, so `AuthProvider` sends them to the create-a-gym screen next.
 *
 * `POST /auth/resend-otp/` re-sends the code; the server replaces the previous one, so only the newest works.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOME } from "@/lib/nav";
import { LuArrowRight, LuMailCheck, LuUserPlus } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import PasswordInput from "@/components/ui/PasswordInput";
import { MIN_PASSWORD, register, resendOtp, verifySignup } from "@/lib/auth";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!first.trim() || !last.trim()) return setErr("Enter your first and last name");
    if (password.length < MIN_PASSWORD) return setErr(`Use at least ${MIN_PASSWORD} characters for your password`);
    setBusy(true);
    const { error, needsVerification } = await register({ email, password, firstName: first.trim(), lastName: last.trim(), phone: phone.trim() || undefined });
    setBusy(false);

    if (error && !needsVerification) return setErr(error);
    if (needsVerification) {
      // The account is already there and just needs its code — go straight to the verify step.
      setErr("");
      await resendOtp(email);
      setNote(`That email is already registered but not yet verified. We've sent a fresh code to ${email.trim().toLowerCase()}.`);
      setStep("code");
      return;
    }
    setNote(`We emailed a 6-digit code to ${email.trim().toLowerCase()}.`);
    setStep("code");
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (code.trim().length !== 6) return setErr("Enter the 6-digit code from your email");
    setBusy(true);
    const problem = await verifySignup(email, code);
    setBusy(false);
    if (problem) return setErr(problem);
    router.replace(HOME); // verification returns tokens, so this lands signed in
  };

  const resend = async () => {
    setErr("");
    setBusy(true);
    const problem = await resendOtp(email);
    setBusy(false);
    setNote(problem ? "" : "A new code is on its way — use the newest one.");
    if (problem) setErr(problem);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[26px] font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#7a5cff] to-primary-600 text-xl text-white">m</span>manygym
        </div>

        {step === "details" ? (
          <form onSubmit={submitDetails} className={`${card} p-7`}>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuUserPlus size={22} /></span>
            <h1 className="text-xl font-bold">Create your account</h1>
            <p className="mb-5 mt-1 text-muted">You&apos;ll set up your gym in the next step.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="first" className={label}>First name</label>
                <input id="first" autoFocus required className={input} value={first} onChange={(e) => setFirst(e.target.value)} />
              </div>
              <div>
                <label htmlFor="last" className={label}>Last name</label>
                <input id="last" required className={input} value={last} onChange={(e) => setLast(e.target.value)} />
              </div>
            </div>

            <label htmlFor="email" className={`${label} mt-4`}>Email</label>
            <input id="email" type="email" autoComplete="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />

            <label htmlFor="phone" className={`${label} mt-4`}>Phone <span className="font-normal text-muted">(optional)</span></label>
            <input id="phone" type="tel" autoComplete="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label htmlFor="password" className={`${label} mt-4`}>Password</label>
            <PasswordInput id="password" autoComplete="new-password" value={password} onChange={setPassword} />
            <p className={hint}>At least {MIN_PASSWORD} characters.</p>

            {err && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{err}</p>}
            <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
              {busy ? "Creating…" : "Create account"}<LuArrowRight size={17} />
            </MotionButton>
            <p className="mt-4 text-center text-muted">
              Already have an account? <Link href="/login" className="font-semibold text-primary">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={submitCode} className={`${card} p-7`}>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuMailCheck size={22} /></span>
            <h1 className="text-xl font-bold">Confirm your email</h1>
            <p className="mb-5 mt-1 text-muted">{note || `Enter the code sent to ${email}.`}</p>

            <label htmlFor="code" className={label}>Verification code</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required className={input} value={code} onChange={(e) => setCode(e.target.value)} />
            <p className={hint}>The code expires 15 minutes after it was sent.</p>

            {err && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{err}</p>}
            <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
              {busy ? "Checking…" : "Confirm and continue"}<LuArrowRight size={17} />
            </MotionButton>
            <div className="mt-3 flex gap-2">
              <MotionButton type="button" disabled={busy} className={`${btnGhost} flex-1`} onClick={resend}>Resend code</MotionButton>
              <MotionButton type="button" disabled={busy} className={`${btnGhost} flex-1`} onClick={() => { setStep("details"); setErr(""); setNote(""); }}>Change details</MotionButton>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
