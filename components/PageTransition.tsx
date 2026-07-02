"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CanaryLogoIcon } from "./CanaryIcon";

// Flies the canary across the screen on every client-side route change.
// Fixed overlay, pointer-events disabled — never affects layout or clicks.
export default function PageTransition() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const prevPath = useRef(pathname);
  const [flight, setFlight] = useState<{ key: number; vw: number } | null>(
    null
  );

  useEffect(() => {
    if (prevPath.current === pathname) return; // skip initial mount
    prevPath.current = pathname;
    if (reduce) return;
    // Capture viewport width now — framer can't interpolate px ↔ vw keyframes
    setFlight((f) => ({ key: (f?.key ?? 0) + 1, vw: window.innerWidth }));
  }, [pathname, reduce]);

  if (!flight || reduce) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-hidden="true">
      <motion.div
        key={flight.key}
        className="absolute"
        style={{ top: "50vh", left: 0 }}
        initial={{ x: -80, y: 0, opacity: 0, scale: 0.8 }}
        animate={{
          x: [-80, flight.vw * 0.55, flight.vw * 1.1],
          y: [0, -40, 0],
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 0.7,
          ease: "easeInOut",
          // Fade in over the first 0.15s, out over the last 0.15s
          opacity: { duration: 0.7, times: [0, 0.214, 0.786, 1] },
        }}
        onAnimationComplete={() => setFlight(null)}
      >
        <CanaryLogoIcon size={48} />
      </motion.div>
    </div>
  );
}
