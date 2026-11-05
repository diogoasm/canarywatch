"use client";

import { motion, useReducedMotion } from "framer-motion";
import CanaryIcon from "@/components/CanaryIcon";

export default function Loading() {
  const reduce = useReducedMotion();

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-4rem)] md:min-h-screen"
    >
      <motion.div
        aria-hidden="true"
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={
          reduce
            ? undefined
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <CanaryIcon status="grey" size={40} className="pointer-events-none" />
      </motion.div>
      <p className="font-mono text-xs text-text-secondary">Loading…</p>
    </div>
  );
}
