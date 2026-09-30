"use client";

import { useEffect, useRef, useState } from "react";

/** Animates from the previous value (0 on mount) to `value` with an ease-out. */
export default function CountUp({
  value,
  duration = 900,
  delay = 0,
}: {
  value: number;
  duration?: number;
  /** Seconds to hold before counting, e.g. to sync with a reveal animation. */
  delay?: number;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() + (reduce ? 0 : delay * 1000);
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = reduce ? 1 : Math.max(0, Math.min(1, (t - start) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration, delay]);

  return <>{shown}</>;
}
