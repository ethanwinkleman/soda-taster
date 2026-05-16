import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { PTR_VISUAL_MAX } from '../hooks/usePullToRefresh';

interface Props {
  pullDistance: number;
  refreshing: boolean;
}

const TRIGGER_DISTANCE = PTR_VISUAL_MAX * 0.8;

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
      <motion.div
        animate={{ rotate: refreshing ? 360 : progress * 200 }}
        transition={
          refreshing
            ? { repeat: Infinity, duration: 0.7, ease: 'linear' }
            : { duration: 0 }
        }
        className="text-gray-400 dark:text-gray-500"
        style={{ opacity: Math.max(0.3, progress) }}
      >
        <RotateCcw size={15} strokeWidth={2} />
      </motion.div>
    </div>
  );
}
