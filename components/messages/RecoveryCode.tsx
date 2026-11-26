"use client";

/**
 * The 5-digit recovery code that protects the backup key — Messenger-style.
 *
 *   setup   — first device: choose a code (twice). Until then, other devices can't read this history.
 *   restore — a new device: enter the code to read older messages here. Wrong codes count towards a lockout.
 *   change  — same keys, new code; history stays readable.
 *
 * The code never leaves the browser: it derives the key that encrypts the backup and the proof the server
 * checks before handing the backup back (`lib/api/e2ee.ts`).
 */
import { useRef, useState } from "react";
import { LuKeyRound, LuLock, LuShieldCheck } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { codeProblem } from "@/lib/api/messaging-keys";
import { btnGhost, btnPrimary } from "@/lib/ui";
import type { Messaging } from "./useMessaging";

export type CodeMode = "setup" | "restore" | "change";
const LEN = 5;

/** Five single-digit boxes that behave like one field: type, paste, backspace across boxes. */
function CodeInput({ value, onChange, label, autoFocus }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, digit: string) => {
    const chars = value.padEnd(LEN, " ").split("");
    chars[i] = digit || " ";
    onChange(chars.join("").replace(/\s+$/, "").replace(/ /g, ""));
  };
  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2">
      {Array.from({ length: LEN }, (_, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} autoFocus={autoFocus && i === 0}
          inputMode="numeric" autoComplete="one-time-code" maxLength={1} aria-label={`${label}, digit ${i + 1}`}
          type="password" value={value[i] ?? ""}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, d);
            if (d && i < LEN - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => {
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
            if (!digits) return;
            e.preventDefault();
            onChange(digits);
            refs.current[Math.min(digits.length, LEN - 1)]?.focus();
          }}
          className="h-14 w-12 rounded-xl border border-line bg-background text-center text-2xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
      ))}
    </div>
  );
}

/** Mount with `key={mode}` so each opening starts from its first step. */
export default function RecoveryCodeModal({ m, mode, onClose }: { m: Messaging; mode: CodeMode | null; onClose: () => void }) {
  const [step, setStep] = useState<"current" | "first" | "confirm" | "reset">(mode === "change" ? "current" : "first");
  const [current, setCurrent] = useState("");
  const [first, setFirst] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => { setStep(mode === "change" ? "current" : "first"); setCurrent(""); setFirst(""); setConfirm(""); setError(""); onClose(); };
  const locked = mode === "restore" && !!m.backup?.is_locked;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await fn(); close(); }
    catch (e) { setError(codeProblem(e).message); }
    finally { setBusy(false); }
  };

  const submit = () => {
    if (!mode) return;
    if (mode === "restore" && step === "first") return void run(() => m.restoreCode(first));
    if (mode === "change" && step === "current") { if (current.length === LEN) setStep("first"); return; }
    if (step === "first" || step === "reset") { if (first.length === LEN) { setStep("confirm"); setError(""); } return; }
    if (step === "confirm") {
      if (confirm !== first) { setError("Those codes don't match. Try again."); setConfirm(""); return; }
      if (mode === "change") return void run(() => m.changeCode(current, first));
      return void run(() => m.setupCode(first, { fresh: mode === "restore" }));
    }
  };

  const title = mode === "setup" ? "Set a recovery code" : mode === "restore" ? (step === "first" ? "Enter your recovery code" : "Start over with a new code") : "Change your recovery code";
  const value = step === "current" ? current : step === "confirm" ? confirm : first;
  const setValue = step === "current" ? setCurrent : step === "confirm" ? setConfirm : setFirst;
  const prompt =
    step === "current" ? "Enter your current code."
      : step === "confirm" ? "Enter the same code again to confirm it."
        : step === "reset" ? "Choose a new 5-digit code."
        : mode === "setup" ? "Choose 5 digits. You'll enter them when you sign in on a new device to see your message history there."
          : mode === "change" ? "Choose a new 5-digit code. Your message history stays readable."
            : "This browser can't read your older messages yet. Enter the 5-digit code you set on your other device.";

  return (
    <Modal open={!!mode} title={title} onClose={close}
      footer={<>
        <button className={btnGhost} onClick={close}>{mode === "setup" ? "Later" : "Cancel"}</button>
        <MotionButton className={btnPrimary} disabled={busy || locked || value.length !== LEN} onClick={submit}>
          {busy ? "Checking…" : step === "confirm" ? "Save code" : mode === "restore" && step === "first" ? "Unlock history" : "Next"}
        </MotionButton>
      </>}>
      <div className="grid justify-items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary">
          {mode === "restore" ? <LuLock size={26} /> : mode === "change" ? <LuKeyRound size={26} /> : <LuShieldCheck size={26} />}
        </span>
        {step === "reset" ? (
          <p className="rounded-xl bg-warn-bg px-3 py-2 text-[13px] text-warn">A new code makes new keys. Messages from before can&apos;t be read on any new device — only on devices that can already read them.</p>
        ) : null}
        <p className="max-w-sm text-muted">{prompt}</p>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="contents">
          <CodeInput key={step} value={value} onChange={(v) => { setValue(v); setError(""); }} label={step === "confirm" ? "Confirm code" : step === "current" ? "Current code" : "Recovery code"} autoFocus />
        </form>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        {mode === "restore" && step === "first" && m.backup && !error && (
          <p className="text-xs text-muted">{locked ? "Too many wrong codes — try again later." : `${m.backup.remaining_attempts} attempt${m.backup.remaining_attempts === 1 ? "" : "s"} before a 30-minute lockout.`}</p>
        )}
        {mode === "restore" && step === "first" && (
          <button className="text-sm font-semibold text-primary" onClick={() => { setStep("reset"); setFirst(""); setError(""); }}>Forgot your code?</button>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted"><LuLock size={12} />Your code never leaves this browser.</p>
      </div>
    </Modal>
  );
}
