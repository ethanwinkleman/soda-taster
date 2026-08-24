import { motion } from 'framer-motion';
import type { DistributionBucket } from '../lib/ratingVisibility';

interface Props {
  buckets: DistributionBucket[];
  /** Currently filtered score, or null for "no filter". */
  selected: number | null;
  onSelect: (score: number | null) => void;
}

/**
 * How often each score gets awarded, and how your own scoring compares.
 *
 * Two series, drawn inset rather than side by side. Yours is a subset of everyone's
 * — your rating is one of the visible ones — so `mine` can never exceed `count`, and
 * a narrower bar drawn in front of the wider one reads as "your share of this bar"
 * with no ambiguity about which is which. Side-by-side would mean twenty bars across
 * a phone, each about fourteen pixels wide.
 *
 * Drawn with plain elements rather than SVG or a chart library — same reasoning as
 * MetricChart, plus each bar has to be a real focusable control, since clicking one
 * filters the list below.
 *
 * Ten bars, always all ten: an empty bucket is the interesting part of a
 * distribution, so 0.5 and 5.0 stay on the axis even when nobody has awarded them.
 */
export function RatingDistribution({ buckets, selected, onSelect }: Props) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return null;

  const mineTotal = buckets.reduce((sum, b) => sum + b.mine, 0);
  const max = Math.max(...buckets.map((b) => b.count));

  // Averaged over ratings, not over sodas — this is "what score do people give",
  // which is the question the chart exists to answer.
  const mean = buckets.reduce((sum, b) => sum + b.score * b.count, 0) / total;
  const myMean = mineTotal
    ? buckets.reduce((sum, b) => sum + b.score * b.mine, 0) / mineTotal
    : null;

  // Only worth drawing a second series once it says something the first does not.
  const showMine = mineTotal > 0 && mineTotal < total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4 mb-3"
    >
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
          Rating spread
        </p>
        <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 tabular-nums">
          {total} rating{total !== 1 ? 's' : ''} · {mean.toFixed(1)} avg
        </p>
      </div>

      {showMine && (
        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-200 dark:bg-sky-800" />
            Everyone
          </span>
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
            You
            {myMean !== null && (
              <span className="tabular-nums text-gray-400 dark:text-gray-500">
                · {mineTotal} · {myMean.toFixed(1)} avg
              </span>
            )}
          </span>
        </div>
      )}
      {!showMine && <div className="mb-3" />}

      <div className="flex items-end gap-1 h-24" role="group" aria-label="Rating distribution">
        {buckets.map((b) => {
          const isSelected = selected === b.score;
          const isDimmed = selected !== null && !isSelected;
          // Every non-zero bucket keeps a visible stub, so a lone rating at 0.5 is
          // still clickable rather than a one-pixel sliver.
          const heightPct = b.count === 0 ? 0 : Math.max(8, (b.count / max) * 100);
          const minePct = b.mine === 0 ? 0 : Math.max(8, (b.mine / max) * 100);

          const label =
            `${b.label} stars, ${b.count} rating${b.count !== 1 ? 's' : ''}` +
            (showMine ? `, ${b.mine} of them yours` : '') +
            (b.count === 0 ? '' : isSelected ? ' — filtering by this score' : ' — filter by this score');

          return (
            <button
              key={b.score}
              type="button"
              disabled={b.count === 0}
              onClick={() => onSelect(isSelected ? null : b.score)}
              aria-pressed={isSelected}
              aria-label={label}
              className={`group flex-1 flex flex-col items-center justify-end h-full min-w-0 rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                b.count === 0 ? 'cursor-default' : 'cursor-pointer'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              <span
                className={`font-sans text-[10px] tabular-nums mb-1 transition-colors ${
                  isSelected
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {b.count || ''}
              </span>

              {/* Everyone's bar, with yours drawn inside it. */}
              <span className="relative w-full flex justify-center" style={{ height: `${heightPct}%` }}>
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`absolute bottom-0 w-full rounded-t-md transition-colors ${
                    isSelected
                      ? 'bg-sky-400'
                      : b.count === 0
                        ? 'bg-transparent'
                        : 'bg-sky-200 dark:bg-sky-800 group-hover:bg-sky-300 dark:group-hover:bg-sky-700'
                  }`}
                />
                {showMine && b.mine > 0 && (
                  <motion.span
                    initial={{ height: 0 }}
                    animate={{ height: `${(minePct / heightPct) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
                    className="absolute bottom-0 w-1/2 rounded-t-md bg-sky-500 dark:bg-sky-400"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-1 mt-1.5">
        {buckets.map((b) => (
          <span
            key={b.score}
            className={`flex-1 text-center font-sans text-[9px] tabular-nums min-w-0 ${
              selected === b.score
                ? 'text-sky-600 dark:text-sky-400 font-bold'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
