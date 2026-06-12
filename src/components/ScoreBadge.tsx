import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  layoutId?: string;
  /** Retro pop-art halftone burst behind the badge — use sparingly, once per page. */
  burst?: boolean;
}

export function ScoreBadge({ score, size = 'md', layoutId, burst = false }: Props) {
  const sizeClass =
    size === 'sm' ? 'w-10 h-10 text-xs border-2' :
    size === 'lg' ? 'w-20 h-20 text-2xl border-4' :
                   'w-14 h-14 text-lg border-[3px]';

  const badge = (
    <motion.div
      layoutId={layoutId}
      initial={layoutId ? false : { scale: 0.6, opacity: 0 }}
      animate={layoutId ? undefined : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className={`${sizeClass} relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 border-sky-500 dark:border-sky-400 rounded-full flex items-center justify-center font-display font-bold shrink-0 shadow-[0_6px_18px_-6px_rgba(255,61,120,0.4)] tabular-nums`}
      title={`Overall score: ${score.toFixed(1)}`}
    >
      <AnimatedNumber value={score} decimals={1} />
    </motion.div>
  );

  if (!burst) return badge;

  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        aria-hidden="true"
        className="absolute inset-[-45%] rounded-full opacity-30 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-cyan-500) 1.6px, transparent 1.6px)',
          backgroundSize: '13px 13px',
          maskImage: 'radial-gradient(circle, black 55%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 100%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      {badge}
    </div>
  );
}
