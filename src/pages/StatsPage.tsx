import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, CupSoda } from 'lucide-react';
import type { Soda } from '../types/stash';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useTasteSodas } from '../hooks/useTasteSodas';
import { useMyRatings } from '../hooks/useMyRatings';
import { ratingDistribution, ratingComparison } from '../lib/ratingVisibility';
import { RatingDistribution } from '../components/RatingDistribution';
import { TasteProfile } from '../components/TasteProfile';
import { RateActions } from '../components/RateActions';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { Button } from '../components/ui';
import { Skeleton } from '../components/Skeleton';

interface Props {
  stashes: Stash[];
  loading: boolean;
}

/**
 * Ratings — what you do, then how you are doing.
 *
 * The page opens with `RateActions`: look a soda up, add one, rate one that is waiting.
 * Those were a tab of their own, which for a two-person household that has rated
 * everything was a screen with nothing on it. Below them are the numbers, which are
 * genuinely interesting and not what anybody opens the app for — they used to sit on top
 * of the collection page, between the filters and the first soda.
 */
export function StatsPage({ stashes, loading }: Props) {
  const navigate = useNavigate();
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

  // Sodas live in a collection, so every action on this page needs one to exist first.
  if (!loading && stashes.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <CupSoda size={32} className="text-gray-300 dark:text-gray-700" />
          <FloatingBubbles size={32} className="absolute inset-0" />
        </div>
        <h1 className="font-display text-lg font-bold text-gray-800 dark:text-gray-200 mb-1.5">
          Start a collection first
        </h1>
        <p className="font-sans text-sm text-gray-400 dark:text-gray-500 mb-5">
          Sodas live in a collection. Make one and you can start rating.
        </p>
        <Button onClick={() => navigate('/')} className="w-full py-2.5">
          Go to collections
        </Button>
      </div>
    );
  }

  const summaryTiles = (loading || sodasLoading) ? (
    <div className="mt-5 grid grid-cols-2 gap-2">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  ) : rated.length === 0 ? null : (
    <>
      <p className="mt-5 mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        Your numbers
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
          />
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
        Ratings
      </h1>
      <p className="mt-0.5 mb-4 font-sans text-xs text-gray-500 dark:text-gray-400">
        Across every collection you are in.
      </p>

      {/* The tiles ride inside the actions block, above the waiting list: five rows is
          deeper than a phone, so underneath it they were off the bottom of the screen.
          The chart and the palate stay below — those are what you came to look at once
          the summary has told you whether it is worth it. */}
      <RateActions stashes={stashes} loading={loading} numbers={summaryTiles} />

      {(loading || sodasLoading) ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      ) : rated.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center">
          <Star size={26} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
          <p className="font-display text-gray-500 dark:text-gray-400 mb-1">Nothing rated yet.</p>
          <p className="font-sans text-xs text-gray-400 dark:text-gray-500">
            Rate a soda and your numbers fill in here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
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
        </>
      )}
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
