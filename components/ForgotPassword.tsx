"use client";

/**
 * Password reset, the API's three-step flow:
 * `POST /auth/forgot-password/` → emails a 6-digit code,
 * `POST /auth/verify-reset-otp/` → checks it without consuming it,
 * `POST /auth/reset-password/` → sets the new password with the same code.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuMail } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import PasswordInput from "@/components/ui/PasswordInput";
import { forgotPassword, resetPassword, verifyResetOtp, MIN_PASSWORD } from "@/lib/auth";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (step === 1) {
        const problem = await forgotPassword(email);
        if (problem) return setErr(problem);
        setStep(2);
        return;
      }
      if (step === 2) {
        const problem = await verifyResetOtp(email, code);
        if (problem) return setErr(problem);
        setStep(3);
        return;
      }
      if (pw !== again) return setErr("Those passwords don't match");
      const problem = await resetPassword(email, code, pw);
      if (problem) return setErr(problem);
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <form onSubmit={go} className={`${card} w-full max-w-[420px] p-7`}>
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuMail size={22} /></span>
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="mb-5 mt-1 text-muted">
          {step === 1 ? "We'll email you a 6-digit code." : step === 2 ? `Enter the code sent to ${email}.` : "Choose a new password."}
        </p>

        {step === 1 && (<>
          <label htmlFor="e" className={label}>Email</label>
          <input id="e" type="email" required autoFocus className={input} value={email} onChange={(ev) => setEmail(ev.target.value)} />
        </>)}

        {step === 2 && (<>
          <label htmlFor="c" className={label}>Verification code</label>
          <input id="c" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus className={input} value={code} onChange={(ev) => setCode(ev.target.value)} />
          <p className={hint}>The code expires 15 minutes after it was sent.</p>
        </>)}

        {step === 3 && (<>
          <label htmlFor="p" className={label}>New password</label>
          <PasswordInput id="p" autoComplete="new-password" autoFocus value={pw} onChange={setPw} />
          <label htmlFor="p2" className={`${label} mt-4`}>Confirm new password</label>
          <PasswordInput id="p2" autoComplete="new-password" value={again} onChange={setAgain} />
          <p className={hint}>At least {MIN_PASSWORD} characters.</p>
        </>)}

        {err && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{err}</p>}
        <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
          {busy ? "Working…" : step === 3 ? "Set new password" : "Continue"}<LuArrowRight size={17} />
        </MotionButton>
        <p className="mt-4 text-center"><Link href="/login" className="font-semibold text-primary">Back to sign in</Link></p>
      </form>
    </main>
  );
}
