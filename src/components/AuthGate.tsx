import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

function FillingBeer() {
  const fillLevel = useMotionValue(0);
  const liquidRef = useRef<SVGRectElement>(null);
  const foamRef   = useRef<SVGGElement>(null);

  useEffect(() => {
    return fillLevel.on('change', v => {
      if (liquidRef.current) {
        const h = v * 11.5;
        liquidRef.current.setAttribute('y',      String(19 - h));
        liquidRef.current.setAttribute('height', String(h));
      }
      if (foamRef.current) {
        const fo = v < 0.85 ? 0 : Math.min(1, (v - 0.85) / 0.1);
        foamRef.current.setAttribute('opacity', String(fo));
      }
    });
  }, [fillLevel]);

  useEffect(() => {
    animate(fillLevel, 1, { duration: 1.6, ease: [0.4, 0, 0.2, 1] });
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
          <clipPath id="mug-fill-clip">
            <path d="M3 7.5V17a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5Z" />
          </clipPath>
        </defs>

        {/* Liquid */}
        <rect
          ref={liquidRef}
          x="2" y="19" width="14" height="0"
          fill="#b45309"
          clipPath="url(#mug-fill-clip)"
        />

        {/* Foam — 3 rounded bubbles that extend above the mug rim */}
        <g ref={foamRef} opacity="0">
          {/* White fill for the foam body */}
          <path
            d="M3 10 V7.5 C3 4.5 7 4.5 7 7.5 C7 4 11 4 11 7.5 C11 4.5 15 4.5 15 7.5 V10 Z"
            fill="white"
          />
          {/* Stroke outline on the bubble tops only */}
          <path
            d="M3 7.5 C3 4.5 7 4.5 7 7.5 C7 4 11 4 11 7.5 C11 4.5 15 4.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </g>

        {/* Handle */}
        <path d="M17 11h1a3 3 0 0 1 0 6h-1" stroke="currentColor" strokeWidth="1.5" />
        {/* Body */}
        <path d="M3 7.5V17a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5" stroke="currentColor" strokeWidth="1.5" />
      </motion.svg>

      <Logo size="md" />
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (loading || !minElapsed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <FillingBeer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Rate and track every soda you try. Sign in to save your ratings to the cloud.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-100 font-medium shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
          >
            <GoogleIcon />
            Continue with Google
          </button>
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
