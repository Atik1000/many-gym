"use client";

import { LuLogIn } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

// The seeded accounts all share one dummy password — shown here only because this is demo data.
const DEMO = [
  { name: "Olivia Parker", role: "Administrator", email: "olivia.parker@example.com" },
  { name: "Sarah Collins", role: "Staff", email: "sarah.collins@example.com" },
  { name: "Alex Morgan", role: "Trainer", email: "alex.morgan@example.com" },
  { name: "Ines Duarte", role: "Membership Manager", email: "ines.duarte@example.com" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = signIn(email, password);
    if (problem) return setError(problem);
    router.replace("/");
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
          <input id="email" type="email" autoComplete="username" required autoFocus className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password" className={`${label} mt-4`}>Password</label>
          <input id="password" type="password" autoComplete="current-password" required className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{error}</p>}
          <MotionButton type="submit" className={`${btnPrimary} mt-5 w-full`}><LuLogIn size={17} />Sign in</MotionButton>
        </form>
        <div className={`${card} mt-4 p-5`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts · password <code className="rounded bg-background px-1 normal-case">manygym123</code></p>
          <div className="grid gap-1">
            {DEMO.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword("manygym123"); setError(""); }}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-background">
                <span><b className="font-semibold">{d.name}</b><span className="block text-xs text-muted">{d.email}</span></span>
                <span className="text-xs text-muted">{d.role}</span>
              </button>
            ))}
          </div>
          <p className={hint}>Click one to fill the form, then press Sign in.</p>
        </div>
      </div>
    </main>
  );
}
