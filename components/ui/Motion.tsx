"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Buttons and button-styled links share one gentle spring: they lift on hover and press in on click.
const spring = { type: "spring", stiffness: 520, damping: 30 } as const;
const feel = { whileHover: { y: -1.5 }, whileTap: { scale: 0.965, y: 0 }, transition: spring } as const;

export const MotionButton = ({ children, ...p }: React.ComponentProps<typeof motion.button>) => (
  <motion.button {...feel} {...p}>{children}</motion.button>
);

const MLink = motion.create(Link);
export const MotionLink = ({ children, ...p }: React.ComponentProps<typeof MLink>) => <MLink {...feel} {...p}>{children}</MLink>;

/** Fades and lifts its children in; `index` staggers siblings in a list. */
export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.045, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
