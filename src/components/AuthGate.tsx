import { useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Layers, Users, Refrigerator, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

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

const FEATURES = [
  {
    icon: Star,
    title: 'Rate Every Sip',
    desc: 'Score each soda 1–5 and build a permanent, searchable record of everything you\'ve tasted.',
  },
  {
    icon: Layers,
    title: 'Unlimited Collections',
    desc: 'Organise sodas into as many collections as you like — by style, region, occasion, or anything else.',
  },
  {
    icon: Users,
    title: 'Shared Verdicts',
    desc: 'Invite friends or family to a collection. Everyone\'s scores are pooled into a single averaged rating.',
  },
  {
    icon: Refrigerator,
    title: 'Fridge Inventory',
    desc: 'Mark sodas as in stock and track quantities so you always know what\'s waiting in the fridge.',
  },
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <FillingCup />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-gray-950 text-gray-100 overflow-y-auto">
        <div className="max-w-sm mx-auto px-6 pt-14 pb-12 flex flex-col gap-10">

          {/* Masthead */}
          <div>
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white leading-tight mb-3">
                The soda journal for the serious enthusiast.
              </h1>
              <p className="font-sans text-sm text-gray-400 leading-relaxed">
                Rate every soda you try, build shared collections, and never forget what's in your fridge.
              </p>
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400">
                  <Icon size={15} />
                </div>
                <div>
                  <p className="font-display font-bold text-white text-sm leading-snug">{title}</p>
                  <p className="font-sans text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div>
            <motion.button
              type="button"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-900 font-sans text-sm font-semibold hover:bg-gray-100 transition-colors shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]"
              whileTap={{ scale: 0.98 }}
            >
              <GoogleIcon />
              Continue with Google
            </motion.button>
            <p className="text-center font-sans text-[11px] text-gray-600 mt-3 tracking-wide">
              FREE · NO CREDIT CARD REQUIRED
            </p>
          </div>

        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
