import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Counts from 0 to `target` with an ease-out curve on the display clock.
 * Jumps straight to the value when the user prefers reduced motion.
 */
export function useCountUp(target: number, { duration = 900, delay = 150 } = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now + delay;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay, reduced]);

  return value;
}
