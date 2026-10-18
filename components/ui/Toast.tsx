"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LuCircleCheck as CheckCircle2 } from "react-icons/lu";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  // API failures (lib/api.ts) surface as toasts so a rejected save is never silent
  useEffect(() => {
    const onError = (e: Event) => show((e as CustomEvent<string>).detail);
    window.addEventListener("manygym:api-error", onError);
    return () => window.removeEventListener("manygym:api-error", onError);
  }, [show]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <AnimatePresence mode="wait">
          {msg && (
            <motion.div key={msg} initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 460, damping: 30 }}
              className="flex items-center gap-2.5 rounded-xl bg-foreground px-4 py-2.5 text-white shadow-[0_12px_30px_-8px_rgba(20,20,43,.55)]">
              <CheckCircle2 size={18} className="shrink-0 text-[#7ee0a6]" />{msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
