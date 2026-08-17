import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, CupSoda, Star, Layers, TrendingUp, Repeat, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminMetrics, useIsAdmin } from '../hooks/useAdminMetrics';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { MetricChart } from '../components/MetricChart';
import { Skeleton } from '../components/Skeleton';
import { PageHeader } from '../components/ui';

function Tile({ icon: Icon, label, value, sub }: {
  icon: typeof Users; label: string; value: number; sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4">
      <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
        <Icon size={12} />
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums leading-none">
        {/* Counts up from the previous figure, so a refresh that changes something is
            visible rather than a silent swap. */}
        <AnimatedNumber value={value} decimals={0} />
      </p>
      {sub && <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}

/** A percentage that may legitimately be null — retention has nothing to compare against
 *  until the app has been live two weeks. Showing "—" beats showing 0%. */
function RateTile({ icon: Icon, label, pct, explain }: {
  icon: typeof Users; label: string; pct: number | null; explain: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] p-4">
      <div className="flex items-center gap-1.5 mb-2 text-gray-500 dark:text-gray-400">
        <Icon size={12} />
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-sky-500 dark:text-sky-400 tabular-nums leading-none">
        {pct === null ? '—' : `${pct}%`}
      </p>
      <p className="font-sans text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-snug">
        {pct === null ? 'Not enough history yet' : explain}
      </p>
    </div>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin(user);
  const { daily, summary, topSodas, loading, refreshing, error, timezone, refetch } = useAdminMetrics(isAdmin);
  const [justUpdated, setJustUpdated] = useState(false);

  async function handleRefresh() {
    await refetch();
    // The numbers often come back identical, so a spinner alone can leave you unsure
    // anything happened. This confirms it did.
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2000);
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display text-gray-500 dark:text-gray-400 mb-4">Nothing to see here.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-sans font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
        >
          Back to Collections
        </button>
      </div>
    );
  }

  const series = (key: keyof (typeof daily)[number]) =>
    daily.map((d) => ({ bucket: d.bucket, value: Number(d[key]) }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PageHeader title="Analytics" onBack={() => navigate('/')} />

      <div className="flex items-center justify-between mb-5 -mt-2">
        <p className="font-sans text-xs text-gray-400 dark:text-gray-500">
          Last 30 days · days break at midnight {timezone}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-60 transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            {justUpdated ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400"
              >
                <Check size={11} />
                Updated
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : undefined} />
                {refreshing ? 'Refreshing' : 'Refresh'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {error && (
        <p className="mb-5 font-sans text-sm text-red-600 dark:text-red-400">
          Couldn't load metrics: {error.message}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Tile icon={Users}    label="Users"       value={summary.total_users}       sub={`+${summary.users_7d} this week`} />
            <Tile icon={Layers}   label="Collections" value={summary.total_collections} />
            <Tile icon={CupSoda}  label="Sodas"       value={summary.total_sodas}       sub={`+${summary.sodas_7d} this week`} />
            <Tile icon={Star}     label="Ratings"     value={summary.total_ratings}     sub={`+${summary.ratings_7d} this week`} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <RateTile
              icon={TrendingUp}
              label="Activation"
              pct={summary.activation_pct}
              explain="of signups have rated something"
            />
            <RateTile
              icon={Repeat}
              label="Retention"
              pct={summary.retention_pct}
              explain="of last week's users came back"
            />
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          <MetricChart label="New users"    values={series('new_users')}    color="var(--color-sky-500)" />
          <MetricChart label="Active users" values={series('active_users')} color="var(--color-cyan-500)" />
          <MetricChart label="Sodas added"  values={series('new_sodas')}    color="var(--color-sky-400)" />
          <MetricChart label="Ratings"      values={series('new_ratings')}  color="var(--color-amber-500)" />
        </div>
      )}

      {topSodas.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Most rated
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {topSodas.map((s, i) => (
              <div key={`${s.soda_name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-4 font-sans text-xs text-gray-400 dark:text-gray-500 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{s.soda_name}</p>
                  {s.soda_brand && (
                    <p className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate">{s.soda_brand}</p>
                  )}
                </div>
                <span className="font-sans text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
                  {s.ratings} {s.ratings === 1 ? 'rating' : 'ratings'}
                </span>
                <span className="font-display text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums w-8 text-right shrink-0">
                  {s.avg_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
