"use client";

import { LuSave } from "react-icons/lu";
import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { updateMyName } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Pill } from "@/components/ui/parts";
import { btnPrimary, card, errorText, input, label } from "@/lib/ui";

// The signed-in person's account: who they are and their display name. Password lives under Login & Security.
export default function AccountSettings() {
  const { ready, user, role } = useAuth();
  const toast = useToast();
  const [name, setNameDraft] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState("");
  if (!ready || !user) return <div className={`${card} h-[220px] animate-pulse`} />;
  const shownName = name ?? user.name;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault(); setNameErr("");
    const n = shownName.trim();
    if (!n || n.length > 80) return setNameErr("Enter a name (up to 80 characters)");
    const problem = await updateMyName(n);
    if (problem) return setNameErr(problem);
    setNameDraft(null); toast("Name updated");
  };

  return (
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
  );
}
