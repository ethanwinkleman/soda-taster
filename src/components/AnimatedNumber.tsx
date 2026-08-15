import { useEffect, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
}

export function AnimatedNumber({ value, decimals = 1, duration = 0.55 }: Props) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value.toFixed(decimals));

  useEffect(() => {
    // No first-render special case: useState already seeded display, and mv already
    // holds value, so animating on mount is a no-op that settles on the same number.
    // The old guard re-set state that was already correct, which cost a second render.
    const ctl = animate(mv, value, {
      duration,
      ease: [0.34, 1.56, 0.64, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => ctl.stop();
  }, [value, decimals, duration, mv]);

  return <>{display}</>;
}
