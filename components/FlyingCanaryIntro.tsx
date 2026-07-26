"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CanaryLogoIcon } from "./CanaryIcon";

const INTRO_KEY = "canary-intro-played";

// ─── Flying canary intro overlay ────────────────────────────────────────────
// A self-contained fixed overlay that flies the canary across the screen once,
// then unmounts. It sits ON TOP of the page (which renders normally beneath it)
// and never affects layout — pointer-events are disabled so it can't block UI.

function FlyingCanaryOverlay({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute top-1/2"
        initial={{ x: "-15vw", opacity: 0, rotate: -8 }}
        animate={{
          x: ["-15vw", "55vw", "115vw"],
          opacity: [0, 1, 1, 0],
          rotate: [-8, 6, -4],
          y: [0, -24, 0],
        }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        onAnimationComplete={onDone}
      >
        <CanaryLogoIcon size={88} />
      </motion.div>
    </motion.div>
  );
}

// Client island for the intro. Lives in its own component so the page that
// hosts it can stay a server component and keep its `metadata` export.
// Plays once per session, and never when reduced motion is requested.
export default function FlyingCanaryIntro() {
  const reduce = useReducedMotion();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasPlayed = sessionStorage.getItem(INTRO_KEY) === "1";
    if (!hasPlayed && !reduce) {
      setShowIntro(true);
    }
    sessionStorage.setItem(INTRO_KEY, "1");
  }, [reduce]);

  function handleIntroDone() {
    setShowIntro(false);
  }

  return (
    <AnimatePresence>
      {showIntro && <FlyingCanaryOverlay onDone={handleIntroDone} />}
    </AnimatePresence>
  );
}
