"use client";

/** An on/off switch row: label and hint on the left, the control on the right. */
export default function Switch({ id, checked, onChange, title, hint, disabled }: {
  id: string; checked: boolean; onChange: (next: boolean) => void; title: string; hint?: string; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
      <button
        id={id} type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-line"}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[#fff] shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
