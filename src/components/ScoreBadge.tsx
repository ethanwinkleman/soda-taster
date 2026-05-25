import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  layoutId?: string;
}

export function ScoreBadge({ score, size = 'md', layoutId }: Props) {
  const sizeClass =
    size === 'sm' ? 'w-10 h-10 text-xs border-2' :
    size === 'lg' ? 'w-20 h-20 text-2xl border-4' :
                   'w-14 h-14 text-lg border-[3px]';

  return (
    <motion.div
      layoutId={layoutId}
      initial={layoutId ? false : { scale: 0.6, opacity: 0 }}
      animate={layoutId ? undefined : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`${sizeClass} bg-gray-900 text-gray-100 border-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-300 rounded-full flex items-center justify-center font-display font-black shrink-0 shadow-md tabular-nums`}
      title={`Overall score: ${score.toFixed(1)}`}
    >
      <AnimatedNumber value={score} decimals={1} />
    </motion.div>
  );
}
