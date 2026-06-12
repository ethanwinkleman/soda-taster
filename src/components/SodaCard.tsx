import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Refrigerator, CupSoda, MessageSquare, Flame } from 'lucide-react';
import type { Soda } from '../types/stash';
import { hapticTap } from '../lib/haptics';

interface Props {
  soda: Soda;
  stashId: string;
  scoreView?: 'group' | 'mine';
  isControversial?: boolean;
  onToggleFridge?: (soda: Soda) => void;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } },
};

export function SodaCard({
  soda,
  stashId,
  scoreView = 'group',
  isControversial = false,
}: Props) {
  const navigate = useNavigate();
  const score = scoreView === 'mine' ? (soda.myRating?.score ?? null) : soda.avgScore;

  function handleClick() {
    hapticTap();
    navigate(`/stash/${stashId}/soda/${soda.id}`);
  }

  return (
    <motion.div variants={cardVariants}>
      <motion.div
        layoutId={`soda-${soda.id}-card`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.985 }}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] hover:shadow-[0_8px_24px_-6px_rgba(255,61,120,0.15)] transition-shadow flex items-center gap-3 p-3"
        onClick={handleClick}
      >
        {/* Thumbnail */}
        {soda.imageUrl ? (
          <motion.img
            layoutId={`soda-${soda.id}-thumb`}
            src={soda.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-16 h-16 object-cover shrink-0 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700"
          />
        ) : (
          <motion.div
            layoutId={`soda-${soda.id}-thumb`}
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800"
          >
            <CupSoda size={24} className="text-sky-400 dark:text-gray-500" />
          </motion.div>
        )}

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <motion.p
            layoutId={`soda-${soda.id}-name`}
            className="font-display font-bold text-base text-gray-900 dark:text-gray-100 truncate leading-snug"
          >
            {soda.name}
          </motion.p>
          <div className="flex items-center gap-2 mt-0.5">
            {soda.brand && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-sans">
                {soda.brand}
              </p>
            )}
            {soda.inFridge && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 shrink-0 font-sans uppercase tracking-wide">
                <Refrigerator size={10} />
                {soda.quantity > 0 ? `×${soda.quantity}` : 'stocked'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 font-sans uppercase tracking-wide">
            <span>{scoreView === 'mine' ? (soda.myRating ? 'My rating' : 'Not rated') : `${soda.ratings.length} rating${soda.ratings.length !== 1 ? 's' : ''}`}</span>
            {soda.commentCount > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-0.5">
                  <MessageSquare size={9} />
                  {soda.commentCount}
                </span>
              </>
            )}
            {isControversial && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400 font-bold">
                  <Flame size={9} />
                  Most Controversial
                </span>
              </>
            )}
          </div>
        </div>

        {/* Score */}
        {score !== null ? (
          <span className="shrink-0 w-11 h-11 rounded-full border-2 border-sky-500 dark:border-sky-400 bg-white dark:bg-gray-800 flex items-center justify-center font-display font-bold text-sm tabular-nums text-gray-900 dark:text-gray-50">
            {score.toFixed(1)}
          </span>
        ) : (
          <span className="shrink-0 w-11 h-11 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center font-display text-sm text-gray-300 dark:text-gray-600">
            —
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
