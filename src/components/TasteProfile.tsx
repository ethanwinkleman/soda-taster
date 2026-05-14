import { motion } from 'framer-motion';
import { generateProfile, computeStats } from '../utils/tasteProfile';
import type { RatingInput } from '../utils/tasteProfile';

interface Props {
  ratings: RatingInput[];
}

export function TasteProfile({ ratings }: Props) {
  if (ratings.length < 5) return null;

  const profile = generateProfile(ratings);
  if (!profile) return null;

  const { total, uniqueBrands, avg } = computeStats(ratings);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      className="mt-10 mb-2"
    >
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-display text-sm font-bold italic text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Your Palate
        </h2>
        <div className="flex-1 border-b border-gray-300 dark:border-gray-700" />
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-5 py-4">
        <p className="font-display italic text-gray-900 dark:text-gray-100 leading-relaxed text-[15px]">
          {profile}
        </p>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-sans uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <span>{total} {total === 1 ? 'soda' : 'sodas'} rated</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{uniqueBrands} {uniqueBrands === 1 ? 'brand' : 'brands'}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>{avg} avg score</span>
        </div>
      </div>
    </motion.div>
  );
}
