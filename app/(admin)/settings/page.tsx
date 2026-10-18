"use client";

import { LuKeyRound, LuSave } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { writeResource } from "@/lib/api";
import { changePassword } from "@/lib/auth";
import type { Person } from "@/lib/people";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Pill } from "@/components/ui/parts";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

// Account settings for the signed-in person: their display name and password.
export default function SettingsPage() {
  const { ready, user, role } = useAuth();
  const toast = useToast();
  const [name, setNameDraft] = useState<string | null>(null);
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [again, setAgain] = useState("");
  const [nameErr, setNameErr] = useState(""); const [pwErr, setPwErr] = useState("");
  if (!ready || !user) return <div className={`${card} h-[300px] animate-pulse`} />;
  const shownName = name ?? user.name;

  const saveName = (e: React.FormEvent) => {
    e.preventDefault(); setNameErr("");
    const n = shownName.trim();
    if (!n || n.length > 80) return setNameErr("Enter a name (up to 80 characters)");
    writeResource<Person>("people", (l) => l.map((p) => (p.id === user.id ? { ...p, name: n } : p)));
    setNameDraft(null); toast("Name updated");
  };
  const savePassword = (e: React.FormEvent) => {
    e.preventDefault(); setPwErr("");
    if (next !== again) return setPwErr("The new passwords don't match");
    const problem = changePassword(user.id, current, next);
    if (problem) return setPwErr(problem);
    setCurrent(""); setNext(""); setAgain(""); toast("Password changed");
  };

  return (
    <div className="mx-auto grid max-w-[640px] gap-5">
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Account</h2>
        <p className="mb-4 mt-1 flex items-center gap-2 text-muted">{user.email}{role && <Pill tone="gray">{role.name}</Pill>}</p>
        <form onSubmit={saveName}>
          <label htmlFor="n" className={label}>Display name</label>
          <input id="n" className={input} maxLength={80} value={shownName} onChange={(e) => setNameDraft(e.target.value)} />
          {nameErr && <p className={errorText}>{nameErr}</p>}
          <MotionButton className={`${btnPrimary} mt-4`} disabled={!shownName.trim() || shownName.trim() === user.name}><LuSave size={17} />Save name</MotionButton>
        </form>
      </section>
      <section className={`${card} p-6`}>
        <h2 className="mb-4 text-lg font-bold">Change password</h2>
        <form onSubmit={savePassword}>
          <label htmlFor="cp" className={label}>Current password</label>
          <input id="cp" type="password" autoComplete="current-password" required className={input} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <label htmlFor="np" className={`${label} mt-4`}>New password</label>
          <input id="np" type="password" autoComplete="new-password" required className={input} value={next} onChange={(e) => setNext(e.target.value)} />
          <p className={hint}>At least 8 characters.</p>
          <label htmlFor="rp" className={`${label} mt-4`}>Repeat new password</label>
          <input id="rp" type="password" autoComplete="new-password" required className={input} value={again} onChange={(e) => setAgain(e.target.value)} />
          {pwErr && <p role="alert" className={errorText}>{pwErr}</p>}
          <MotionButton className={`${btnPrimary} mt-4`} ><LuKeyRound size={17} />Change password</MotionButton>
        </form>
      </section>
    </div>
  );
}
