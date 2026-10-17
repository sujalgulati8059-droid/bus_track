import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 up to `target` using requestAnimationFrame.
 * Re-runs whenever `target` changes (e.g. fresh analytics data).
 */
export default function useCountUp(target = 0, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const to = Number(target) || 0;
    startRef.current = null;

    const step = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(to * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
