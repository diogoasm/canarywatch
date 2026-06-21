"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumber(n: number, decimals: number) {
  return n.toFixed(decimals);
}

export default function CountUp({
  value,
  duration = 1200,
  decimals = 2,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(reduce ? value : 0);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }

    fromRef.current = lastValueRef.current === value ? 0 : lastValueRef.current;
    lastValueRef.current = value;
    startRef.current = null;

    function step(t: number) {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduce]);

  return (
    <span className={className}>
      {prefix}
      {formatNumber(display, decimals)}
      {suffix}
    </span>
  );
}
