import { useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { LandingPage } from './LandingPage';

// The cup body from lucide's CupSoda, closed into a fillable shape.
const CUP_BODY = 'M6 8 L7.75 20.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8 Z';

// Bubbles rise inside the cup once it is mostly full.
const FIZZ = [
  { cx: 9.5,  r: 0.7, delay: 0 },
  { cx: 12,   r: 0.9, delay: 0.25 },
  { cx: 14.5, r: 0.6, delay: 0.5 },
];

function FillingCup() {
  const fillLevel = useMotionValue(0);
  const liquidRef  = useRef<SVGRectElement>(null);
  const bubblesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    return fillLevel.on('change', v => {
      if (liquidRef.current) {
        // The cup interior runs from y=8 (rim) to y=22 (base) — 14 units tall.
        const h = v * 14;
        liquidRef.current.setAttribute('y',      String(22 - h));
        liquidRef.current.setAttribute('height', String(h));
      }
      if (bubblesRef.current) {
        const o = v < 0.6 ? 0 : Math.min(1, (v - 0.6) / 0.25);
        bubblesRef.current.setAttribute('opacity', String(o));
      }
    });
  }, [fillLevel]);

  useEffect(() => {
    animate(fillLevel, 1, { duration: 1.2, ease: [0.4, 0, 0.2, 1] });
  }, [fillLevel]);

  return (
    <div className="flex flex-col items-center gap-8">
      <motion.svg
        width="96" height="96"
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-800 dark:text-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <defs>
          <clipPath id="cup-fill-clip">
            <path d={CUP_BODY} />
          </clipPath>
        </defs>

        {/* Cherry soda rising up the cup */}
        <rect
          ref={liquidRef}
          x="5" y="22" width="14" height="0"
          fill="#ff3d78"
          clipPath="url(#cup-fill-clip)"
        />

        {/* Fizz */}
        <g ref={bubblesRef} opacity="0" clipPath="url(#cup-fill-clip)">
          {FIZZ.map((b, i) => (
            <motion.circle
              key={i}
              cx={b.cx}
              r={b.r}
              fill="#fffbf7"
              initial={{ cy: 20, opacity: 0 }}
              animate={{ cy: 10, opacity: [0, 0.9, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, delay: b.delay, ease: 'easeOut' }}
            />
          ))}
        </g>

        {/* Cup outline */}
        <g stroke="currentColor" strokeWidth="1.5">
          <path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" />
          <path d="M5 8h14" />
          <path d="m12 8 1-6h2" />
        </g>
      </motion.svg>
      <Logo size="md" />
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <FillingCup />
      </div>
    );
  }

  if (!user) return <LandingPage onSignIn={signInWithGoogle} />;

  return <>{children}</>;
}
