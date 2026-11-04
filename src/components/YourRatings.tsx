import { useMemo } from 'react';
import { Star, Trophy } from 'lucide-react';
import type { Soda, Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useTasteSodas } from '../hooks/useTasteSodas';
import { ratingDistribution, ratingComparison } from '../lib/ratingVisibility';
import { RatingDistribution } from './RatingDistribution';
import { Skeleton } from './Skeleton';

interface Props {
  stashes: Stash[];
}

/**
 * How you are doing, across every collection you are in.
 *
 * This was the lower half of a `/stats` tab. The tab is gone — the act of rating moved
 * into the collection page, where the sodas are — but these two do not belong there:
 * they are *your* numbers across everything, and a collection page describes one
 * collection. They sit here beside Your Palate, which already answers the same
 * question, so "how am I doing" has exactly one address.
 */
export function YourRatings({ stashes }: Props) {
  const { user } = useAuth();
  const stashIds = useMemo(() => stashes.map((s) => s.id), [stashes]);
  const { sodas, loading } = useTasteSodas(stashIds, user?.id);

  // The chart and the comparison are written against the collection page's shape and
  // carry the blind-rating rule with them. Adapting is one map; rewriting them here
  // would be a second copy of that rule.
  const asSodas = useMemo(
    () => sodas.map((s) => ({
      myRating: s.myScore === null ? null : { score: s.myScore },
      otherScores: s.others.map((o) => o.score),
      ratingCount: (s.myScore === null ? 0 : 1) + s.others.length,
    })) as unknown as Soda[],
    [sodas],
  );

  const distribution = useMemo(() => ratingDistribution(asSodas), [asSodas]);
  const comparison = useMemo(() => ratingComparison(asSodas), [asSodas]);

  const rated = useMemo(() => sodas.filter((s) => s.myScore !== null), [sodas]);
  const myAvg = rated.length
    ? Math.round((rated.reduce((n, s) => n + (s.myScore ?? 0), 0) / rated.length) * 10) / 10
    : null;
  const top = useMemo(
    () => [...rated].sort((a, b) => (b.myScore ?? 0) - (a.myScore ?? 0))[0] ?? null,
    [rated],
  );

  if (loading) {
    return (
      <div className="mt-10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  // Nothing rated means nothing to say. The collections page already asks for the
  // first rating in its own empty state, and two panels making the same request is
  // worse than one.
  if (rated.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-display text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Your Ratings
        </h2>
        <div className="flex-1 border-b border-gray-200 dark:border-gray-700" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Rated" value={String(rated.length)} caption="sodas" />
        <Tile
          label="Your average"
          value={myAvg === null ? '—' : myAvg.toFixed(1)}
          caption={`of ${rated.length}`}
          icon={<Star size={11} className="text-amber-500" />}
        />
      </div>
      {top && (
        <div className="mt-2">
          <Tile
            label="Your top rated"
            value={(top.myScore ?? 0).toFixed(1)}
            caption={top.name}
            icon={<Trophy size={11} className="text-amber-500" />}
          />
        </div>
      )}

      <div className="mt-4">
        <RatingDistribution buckets={distribution} comparison={comparison} />
      </div>
    </div>
  );
}

function Tile({ label, value, caption, icon }: {
  label: string; value: string; caption: string; icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">
          {label}
        </span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 truncate">{caption}</p>
    </div>
  );
}
