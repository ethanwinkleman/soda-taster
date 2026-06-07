import { motion } from 'framer-motion';
import { CupSoda } from 'lucide-react';
import { PTR_VISUAL_MAX } from '../hooks/usePullToRefresh';

interface Props {
  pullDistance: number;
  refreshing: boolean;
}

const TRIGGER_DISTANCE = PTR_VISUAL_MAX * 0.8;

const bubbles = [
  { dx: -7, delay: 0 },
  { dx: 0, delay: 0.15 },
  { dx: 7, delay: 0.3 },
];

export function PullToRefreshIndicator({ pullDistance, refreshing }: Props) {
  const height = refreshing ? PTR_VISUAL_MAX : pullDistance;
  const progress = Math.min(pullDistance / TRIGGER_DISTANCE, 1);
  const isSnapping = !refreshing && pullDistance === 0;

  return (
    <div
      style={{
        height,
        overflow: 'hidden',
        transition: isSnapping ? 'height 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
      }}
      className="flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center" style={{ opacity: Math.max(0.3, progress) }}>
        {/* Rising bubbles — only animate while actively refreshing */}
        {refreshing && bubbles.map((b, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"
            style={{ left: '50%', marginLeft: b.dx }}
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: -16, opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.1, delay: b.delay, ease: 'easeOut' }}
          />
        ))}

        {/* Soda cup — tilts to "pour" as you pull, gentle bob while refreshing */}
        <motion.div
          className="text-gray-400 dark:text-gray-500"
          animate={
            refreshing
              ? { y: [0, -2, 0], rotate: [-12, 12, -12] }
              : { rotate: progress * -28 }
          }
          transition={
            refreshing
              ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
              : { duration: 0 }
          }
        >
          <CupSoda size={16} strokeWidth={2} />
        </motion.div>
      </div>
    </div>
  );
}
