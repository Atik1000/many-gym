// Shared Tailwind class recipes so every page's buttons, inputs and cards match.
export const card = "rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,20,43,.04),0_8px_24px_-12px_rgba(20,20,43,.08)]";
const btn = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2 font-semibold outline-none transition-[background-color,border-color,box-shadow,color] duration-200 focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none";
export const btnGhost = `${btn} border border-line bg-surface text-foreground shadow-[0_1px_2px_rgba(20,20,43,.05)] hover:border-primary/40 hover:bg-primary-50/60 hover:text-primary-600 hover:shadow-[0_4px_12px_-4px_rgba(91,61,245,.25)]`;
export const btnPrimary = `${btn} border border-primary-600 bg-gradient-to-b from-[#6f55ff] to-primary text-white shadow-[0_6px_14px_-4px_rgba(91,61,245,.55),inset_0_1px_0_rgba(255,255,255,.22)] hover:from-[#7b63ff] hover:to-primary-600 hover:shadow-[0_10px_20px_-6px_rgba(91,61,245,.6),inset_0_1px_0_rgba(255,255,255,.25)]`;
export const input =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50 disabled:bg-background disabled:text-muted";
export const label = "mb-1.5 block text-[13px] font-semibold";
export const hint = "mt-1 text-xs text-muted";
export const errorText = "mt-1 text-xs text-bad";
