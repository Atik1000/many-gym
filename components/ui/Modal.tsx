"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuX as X } from "react-icons/lu";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="fixed inset-0 z-40 grid place-items-center bg-foreground/50 p-5 backdrop-blur-[2px]"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog" aria-modal aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="max-h-[92vh] w-[600px] max-w-full overflow-auto rounded-2xl bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4 text-[17px] font-bold">
              {title}
              <motion.button whileHover={{ rotate: 90 }} whileTap={{ scale: 0.88 }} onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-background"><X size={20} /></motion.button>
            </div>
            <div className="flex flex-col gap-3.5 px-5 py-[18px]">{children}</div>
            {footer && <div className="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
