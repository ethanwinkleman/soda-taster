import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, CupSoda } from 'lucide-react';
import type { Soda } from '../types/stash';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useTasteSodas } from '../hooks/useTasteSodas';
import { ratingDistribution, ratingComparison } from '../lib/ratingVisibility';
import { RatingDistribution } from '../components/RatingDistribution';
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
 * "Your Palate" is deliberately *not* here. It rendered on this page and on the
 * collections page at once — the same component against the same `useMyRatings` read —
 * which is the "two screens asking for the same thing" problem this codebase keeps
 * running into. It belongs with the shelf, where it was asked for; this page keeps the
 * numbers and the spread, which have no other home.
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

  /**
   * The same tiles, placed differently by width.
   *
   * On a phone they ride inside the actions block, above the waiting list. In the
   * two-column desktop layout they head the reading column instead. Rendering the
   * markup twice and hiding one is deliberate: a flex/grid reorder cannot move a child
   * between two independent columns, and `display:none` keeps the hidden copy out of
   * the accessibility tree, so nothing is announced twice.
   */
  const renderNumbers = (className: string) => (loading || sodasLoading) ? (
    <div className={className}>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    </div>
  ) : rated.length === 0 ? null : (
    <div className={className}>
      <p className="mt-5 xl:mt-0 mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
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
    </div>
  );

  return (
    <div className="mx-auto px-4 py-6 max-w-md lg:max-w-2xl xl:max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
        Ratings
      </h1>
      <p className="mt-0.5 mb-4 font-sans text-xs text-gray-500 dark:text-gray-400">
        Across every collection you are in.
      </p>

      {/* One column on a phone, two once there is room for them.
          Stacked, this page is 1700px tall on a 900px screen while 736px of the
          viewport sits empty beside it — the whole complaint about the desktop build in
          one measurement. What you *do* goes left, what you *read* goes right.
          `items-start` so the short column does not stretch to the tall one. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-8 xl:items-start">
        <div>
          {/* On a phone the tiles ride above the waiting list: five rows is deeper than
              a phone, so underneath it they were off the bottom of the screen. Wide,
              they head the reading column instead. */}
          <RateActions stashes={stashes} loading={loading} numbers={renderNumbers('xl:hidden')} />
        </div>

        <div className="xl:min-w-0">
          {renderNumbers('hidden xl:block')}

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
              <div className="mt-8 xl:mt-4">
                <RatingDistribution
                  buckets={distribution}
                  comparison={comparison}
                  selected={scoreFilter}
                  onSelect={setScoreFilter}
                />
              </div>

            </>
          )}
        </div>
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
