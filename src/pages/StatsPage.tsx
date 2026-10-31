import { useMemo, useState } from 'react';
import { Trophy, Star } from 'lucide-react';
import type { Soda } from '../types/stash';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useTasteSodas } from '../hooks/useTasteSodas';
import { useMyRatings } from '../hooks/useMyRatings';
import { ratingDistribution, ratingComparison } from '../lib/ratingVisibility';
import { RatingDistribution } from '../components/RatingDistribution';
import { TasteProfile } from '../components/TasteProfile';
import { Skeleton } from '../components/Skeleton';

interface Props {
  stashes: Stash[];
  loading: boolean;
}

/**
 * How you are doing — the occasional question.
 *
 * All of this used to sit on top of the collection page: three tiles and a full
 * distribution chart between you and the first soda. It is genuinely interesting and it
 * is not what anybody opens the app for, so it lives on its own screen now and spans
 * every collection rather than one.
 */
export function StatsPage({ stashes, loading }: Props) {
  const { user } = useAuth();
  const stashIds = useMemo(() => stashes.map((s) => s.id), [stashes]);
  const { sodas, loading: sodasLoading } = useTasteSodas(stashIds, user?.id);
  const { data: myRatings = [] } = useMyRatings(user?.id);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);

  // The chart and the comparison are already written against the collection page's
  // shape, and they carry the blind-rating rule with them. Adapting is one map;
  // rewriting them here would be a second copy of that rule.
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

  if (loading || sodasLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (rated.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Star size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="font-display text-gray-500 dark:text-gray-400 mb-1">Nothing rated yet.</p>
        <p className="font-sans text-xs text-gray-400 dark:text-gray-500">
          Rate a soda and this fills in.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
        Your ratings
      </h1>
      <p className="mt-0.5 mb-4 font-sans text-xs text-gray-500 dark:text-gray-400">
        Across every collection you are in.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Tile label="Rated" value={String(rated.length)} caption="sodas" />
        <Tile label="Your average" value={myAvg === null ? '—' : myAvg.toFixed(1)} caption={`of ${rated.length}`} icon={<Star size={11} className="text-amber-500" />} />
      </div>
      {top && (
        <div className="mt-2">
          <Tile
            label="Your top rated"
            value={(top.myScore ?? 0).toFixed(1)}
            caption={top.name}
            icon={<Trophy size={11} className="text-amber-500" />}
            wide
          />
        </div>
      )}

      <div className="mt-4">
        <RatingDistribution
          buckets={distribution}
          comparison={comparison}
          selected={scoreFilter}
          onSelect={setScoreFilter}
        />
      </div>

      <div className="mt-4">
        <TasteProfile ratings={myRatings} />
      </div>
    </div>
  );
}

function Tile({ label, value, caption, icon, wide }: {
  label: string; value: string; caption: string; icon?: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] ${wide ? '' : ''}`}>
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
