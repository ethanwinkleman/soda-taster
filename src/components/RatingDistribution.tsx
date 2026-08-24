import { motion } from 'framer-motion';
import type { DistributionBucket, RatingComparison } from '../lib/ratingVisibility';

interface Props {
  buckets: DistributionBucket[];
  comparison: RatingComparison;
  /** Currently filtered score, or null for "no filter". */
  selected: number | null;
  onSelect: (score: number | null) => void;
}

/**
 * How often each score gets awarded, yours against everyone else's.
 *
 * The two series are disjoint — you are not counted in "everyone else" — and that is
 * what makes this readable. The previous version compared you against a group that
 * included you, so the two averages converged toward each other and the bars had to
 * be drawn nested to stay truthful. Nested bars do not say "compare these two".
 *
 * The headline carries the answer as numbers. Reading a difference out of the shape
 * of two distributions is not something anyone should have to do; the bars are here
 * to show *where* the difference sits, not to be measured by eye.
 *
 * Drawn with plain elements rather than SVG or a chart library — same reasoning as
 * MetricChart, plus each column has to be a real focusable control, since clicking
 * one filters the list below.
 */
export function RatingDistribution({ buckets, comparison, selected, onSelect }: Props) {
  const total = buckets.reduce((sum, b) => sum + b.mine + b.others, 0);
  if (total === 0) return null;

  // Scaled by the column total, since a column is now one bar made of two parts.
  const max = Math.max(1, ...buckets.map((b) => b.mine + b.others));
  const { mine, shared } = comparison;
  // The headline only appears when there is a like-for-like comparison to make.
  const hasBoth = shared.sodas > 0 && shared.myAvg !== null && shared.othersAvg !== null;

  // Stated as a direction rather than a signed number: "+0.3" needs a key to read,
  // "you rate higher" does not.
  const gap = shared.avgGap;
  const verdict =
    gap === null ? null
    : Math.abs(gap) < 0.25 ? 'You and the group agree, near enough.'
    : gap > 0 ? `You rate ${Math.abs(gap).toFixed(1)} higher than the group.`
    : `You rate ${Math.abs(gap).toFixed(1)} lower than the group.`;

  /** Column height as a share of the tallest. A single rating still has to be hittable. */
  const barHeight = (n: number) => (n === 0 ? 0 : Math.max(8, (n / max) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4 mb-3"
    >
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-3">
        Rating spread
      </p>

      {hasBoth ? (
        <div className="mb-4">
          <div className="flex items-stretch gap-4">
            <div className="flex-1">
              <p className="font-sans text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                You
              </p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                {shared.myAvg?.toFixed(1)}
              </p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <p className="font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Everyone else
              </p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                {shared.othersAvg?.toFixed(1)}
              </p>
            </div>
          </div>
          <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            across the {shared.sodas} soda{shared.sodas !== 1 ? 's' : ''} you have both rated
          </p>

          {verdict && (
            <p className="font-sans text-xs text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
              {verdict}{' '}
              <span className="text-gray-400 dark:text-gray-500">
                Same sodas on both sides, so the difference is you and not what you
                happened to drink.
                {mine.count > shared.sodas && (
                  <> You have rated {mine.count} in all, averaging {mine.avg?.toFixed(1)}.</>
                )}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 tabular-nums">
          {total} rating{total !== 1 ? 's' : ''}
          {mine.avg !== null && ` · ${mine.avg.toFixed(1)} avg`}
        </p>
      )}

      {/*
        One bar per score, both series stacked in it — yours at the bottom, everyone
        else's on top of you.

        Two earlier attempts split them: nested, which reads as one shape not two, and
        side by side, which put twenty narrow bars in a row where the gap inside a pair
        was barely wider than the gap between pairs. Both made the reader do work. A
        single bar per score means the column heights are the distribution, and the
        colour split is who it came from — and yours sits on the baseline, so its
        height can be compared across columns without measuring from a moving start.

        The exact comparison is the two averages above; this shows where the ratings
        fell. The counts sit above each bar in their own colour so the split is
        readable without measuring anything.
      */}
      <div className="flex items-end gap-1.5 h-40" role="group" aria-label="Rating distribution">
        {buckets.map((b) => {
          const isSelected = selected === b.score;
          const isDimmed = selected !== null && !isSelected;
          const columnTotal = b.mine + b.others;
          const empty = columnTotal === 0;

          return (
            <button
              key={b.score}
              type="button"
              disabled={empty}
              onClick={() => onSelect(isSelected ? null : b.score)}
              aria-pressed={isSelected}
              aria-label={`${b.label} stars — you ${b.mine}, everyone else ${b.others}${
                empty ? '' : isSelected ? '. Filtering by this score' : '. Filter by this score'
              }`}
              className={`group flex-1 min-w-0 h-full flex flex-col justify-end items-center rounded-sm transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                empty ? 'cursor-default' : 'cursor-pointer'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Both counts, coloured to match their segment. */}
              <span className="flex items-baseline justify-center gap-1 mb-1 leading-none h-3">
                {b.mine > 0 && (
                  <span className="font-sans text-[10px] tabular-nums text-sky-600 dark:text-sky-400">
                    {b.mine}
                  </span>
                )}
                {b.others > 0 && (
                  <span className="font-sans text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                    {b.others}
                  </span>
                )}
              </span>

              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${barHeight(columnTotal)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full flex flex-col justify-end overflow-hidden rounded-t-sm"
              >
                {/* Everyone else, stacked on top of you. */}
                {b.others > 0 && (
                  <span
                    style={{ height: `${(b.others / columnTotal) * 100}%` }}
                    className={`w-full shrink-0 ${
                      isSelected
                        ? 'bg-gray-500 dark:bg-gray-400'
                        : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-500'
                    }`}
                  />
                )}
                {/* Yours, on the baseline so its height is comparable across columns. */}
                {b.mine > 0 && (
                  <span
                    style={{ height: `${(b.mine / columnTotal) * 100}%` }}
                    className={`w-full shrink-0 ${
                      isSelected ? 'bg-sky-600' : 'bg-sky-500 group-hover:bg-sky-600'
                    }`}
                  />
                )}
              </motion.span>

              <span
                className={`w-full border-t pt-1 font-sans text-[10px] tabular-nums leading-none text-center ${
                  isSelected
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {b.label}
              </span>
            </button>
          );
        })}
      </div>

      {hasBoth && (
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> You
          </span>
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /> Everyone else
          </span>
        </div>
      )}
    </motion.div>
  );
}
