"use client";

import { useId, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { input } from "@/lib/ui";

/**
 * A password field with a show/hide toggle.
 *
 * Typing a password you cannot see is the main reason sign-in fails on a first try, so every password field
 * in the app uses this. The toggle is a real button: reachable by keyboard, labelled for screen readers, and
 * marked `tabIndex={-1}` so tabbing from the field goes to the submit button rather than the eye.
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  autoFocus = false,
  placeholder,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;

  return (
    <div className="relative">
      <input
        id={fieldId}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`${input} pr-11 ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Caps lock is the most common reason a correct password is rejected, and a masked field hides it.
        onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
        onBlur={() => setCaps(false)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-background hover:text-foreground"
      >
        {shown ? <LuEyeOff size={17} /> : <LuEye size={17} />}
      </button>
      {caps && !shown && (
        <p role="status" className="mt-1 text-[13px] text-warn">Caps Lock is on</p>
      )}
    </div>
  );
}
