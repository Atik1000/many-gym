"use client";

import { motion } from "framer-motion";

// A template remounts on every navigation, so each page eases in instead of snapping.
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}
