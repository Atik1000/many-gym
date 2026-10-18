"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useResource } from "@/lib/api";
import { acceptInvite } from "@/lib/auth";
import type { Person } from "@/lib/people";
import { btnPrimary, card, errorText, input, label } from "@/lib/ui";

// Opened from an invitation link: /accept?code=…  (read on the client so the page itself stays static)
export default function AcceptPage() {
  const router = useRouter();
  const [people, , ready] = useResource<Person>("people");
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { const c = new URLSearchParams(window.location.search).get("code"); void Promise.resolve().then(() => setCode(c)); }, []);
  const person = people.find((p) => p.id === code && p.status === "invited");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = acceptInvite(code ?? "", name, password);
    if (problem) return setError(problem);
    router.replace("/");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className={`${card} w-full max-w-[420px] p-7`}>
        {!ready || code === undefined ? (
          <div className="h-40 animate-pulse rounded-lg bg-background" />
        ) : !person ? (
          <>
            <h1 className="text-xl font-bold">Invitation not valid</h1>
            <p className="mt-1 text-muted">This link is invalid or was already used. Ask an Administrator to send a new one.</p>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="text-xl font-bold">Join manygym</h1>
            <p className="mb-5 mt-1 text-muted">Set up your account for <b className="text-foreground">{person.email}</b>.</p>
            <label htmlFor="name" className={label}>Your name</label>
            <input id="name" required autoFocus maxLength={80} className={input} value={name} onChange={(e) => setName(e.target.value)} />
            <label htmlFor="pw" className={`${label} mt-4`}>Choose a password</label>
            <input id="pw" type="password" required minLength={8} autoComplete="new-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
            {error && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{error}</p>}
            <MotionButton type="submit" className={`${btnPrimary} mt-5 w-full`}>Create account &amp; sign in</MotionButton>
          </form>
        )}
      </div>
    </main>
  );
}
