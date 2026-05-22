import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
}

export function AnimatedNumber({ value, decimals = 1, duration = 0.55 }: Props) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value.toFixed(decimals));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setDisplay(value.toFixed(decimals));
      mv.set(value);
      return;
    }
    const ctl = animate(mv, value, {
      duration,
      ease: [0.34, 1.56, 0.64, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => ctl.stop();
  }, [value, decimals, duration, mv]);

  return <>{display}</>;
}
