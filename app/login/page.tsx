"use client";

import { LuLogIn } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import PasswordInput from "@/components/ui/PasswordInput";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOME } from "@/lib/nav";
import { signIn } from "@/lib/auth";
import { btnPrimary, card, errorText, input, label } from "@/lib/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const problem = await signIn(email, password);
    setBusy(false);
    if (problem) return setError(problem);
    router.replace(HOME); // straight to the destination: routing via "/" relies on a server redirect
                          // that a client-side replace does not follow in the production build
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 text-[26px] font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#7a5cff] to-primary-600 text-xl text-white">m</span>manygym
        </div>
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
      </div>
    </main>
  );
}
