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

  const max = Math.max(1, ...buckets.map((b) => Math.max(b.mine, b.others)));
  const { mine, others, shared } = comparison;
  const hasBoth = mine.count > 0 && others.count > 0;

  // Stated as a direction rather than a signed number: "+0.3" needs a key to read,
  // "you rate higher" does not.
  const gap = shared.avgGap;
  const verdict =
    gap === null ? null
    : Math.abs(gap) < 0.25 ? 'You and the group agree, near enough.'
    : gap > 0 ? `You rate ${Math.abs(gap).toFixed(1)} higher than the group.`
    : `You rate ${Math.abs(gap).toFixed(1)} lower than the group.`;

  /** Bar height. A count of 1 still has to be visible and hittable. */
  const barHeight = (n: number) => (n === 0 ? 0 : Math.max(10, (n / max) * 100));

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
                {mine.avg?.toFixed(1)}
              </p>
              <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">
                {mine.count} rating{mine.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <p className="font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Everyone else
              </p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
                {others.avg?.toFixed(1)}
              </p>
              <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 tabular-nums mt-1">
                {others.count} rating{others.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {verdict && shared.sodas > 0 && (
            <p className="font-sans text-xs text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
              {verdict}{' '}
              <span className="text-gray-400 dark:text-gray-500">
                Across the {shared.sodas} soda{shared.sodas !== 1 ? 's' : ''} you have both
                rated — the same sodas, so the difference is you and not what you happened
                to drink.
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
        Mirrored on a shared axis: yours above, everyone else's below, one column per
        score. Side by side put twenty narrow bars in a row where the gap inside a
        pair was barely wider than the gap between pairs, so neighbouring columns
        merged and nothing lined up with its tick. Here each score owns a single
        column, both bars are full width, and the label sits on the axis between
        them — so comparing the two is reading up and down one column rather than
        picking pairs out of a row.

        Both halves share one scale, or the shapes would not be comparable.
      */}
      <div className="flex items-stretch gap-1 h-40" role="group" aria-label="Rating distribution">
        {buckets.map((b) => {
          const isSelected = selected === b.score;
          const isDimmed = selected !== null && !isSelected;
          const empty = b.mine === 0 && b.others === 0;

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
              className={`group flex-1 min-w-0 flex flex-col rounded-sm transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                empty ? 'cursor-default' : 'cursor-pointer'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Yours, growing up from the axis */}
              <span className="flex-1 w-full flex flex-col justify-end items-center min-w-0">
                <span className="font-sans text-[10px] tabular-nums leading-none mb-1 text-sky-600 dark:text-sky-400">
                  {b.mine || ''}
                </span>
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight(b.mine)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`w-full rounded-t-sm ${
                    isSelected ? 'bg-sky-600' : 'bg-sky-500 group-hover:bg-sky-600'
                  }`}
                />
              </span>

              {/*
                The axis. Both series have to touch this line or the mirror reads as
                two detached charts — the top one anchored, the bottom one floating.
                The score sits below the line rather than inside the gap, so the line
                itself stays the thing both bars meet at.
              */}
              <span className="w-full flex flex-col items-center">
                <span
                  className={`w-full border-t ${
                    isSelected ? 'border-sky-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                <span
                  className={`font-sans text-[10px] tabular-nums leading-none py-1 ${
                    isSelected
                      ? 'text-sky-600 dark:text-sky-400 font-bold'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {b.label}
                </span>
              </span>

              {/* Everyone else, growing down */}
              <span className="flex-1 w-full flex flex-col justify-start items-center min-w-0">
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeight(b.others)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                  className={`w-full rounded-b-sm ${
                    isSelected
                      ? 'bg-gray-500 dark:bg-gray-400'
                      : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-500'
                  }`}
                />
                <span className="font-sans text-[10px] tabular-nums leading-none mt-1 text-gray-400 dark:text-gray-500">
                  {b.others || ''}
                </span>
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
