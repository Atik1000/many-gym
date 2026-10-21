"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Right-hand slide-over panel. Closes on backdrop click or Escape. */
export default function Offcanvas({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[35] bg-foreground/40" onClick={onClose} />
          <motion.aside key="panel" role="dialog" aria-modal="true" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.22 }}
            className="fixed inset-y-0 right-0 z-[36] w-full overflow-y-auto bg-surface p-6 shadow-2xl sm:w-[min(920px,92vw)]">
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
