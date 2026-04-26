import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, History, RefreshCw } from 'lucide-react';
import { useStashActivity, type ActivityEntry } from '../hooks/useStashActivity';
import { Skeleton } from '../components/Skeleton';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function describeAction(entry: ActivityEntry): string {
  const soda = entry.sodaName ? `"${entry.sodaName}"` : 'a soda';
  const scoreStr = entry.score != null ? ` — ★ ${entry.score.toFixed(1)}` : '';
  switch (entry.action) {
    case 'soda_added':     return `added ${soda}`;
    case 'soda_edited':    return `edited ${soda}`;
    case 'soda_removed':   return `removed ${soda}`;
    case 'rating_added':   return `rated ${soda}${scoreStr}`;
    case 'rating_updated': return `updated rating for ${soda}${scoreStr}`;
    case 'rating_removed': return `removed rating for ${soda}`;
    case 'member_joined':  return 'joined the collection';
    case 'member_removed': return 'was removed from the collection';
    default:               return entry.action;
  }
}

export function StashActivityPage() {
  const { id: stashId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entries, loading, fetch } = useStashActivity(stashId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="border-t border-gray-800 dark:border-gray-200 mb-1.5" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
              <h1 className="font-display text-xl font-black italic text-gray-900 dark:text-white">
                Activity
              </h1>
            </div>
            <motion.button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 0.6, ease: 'linear', repeat: refreshing ? Infinity : 0 }}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              aria-label="Refresh activity"
            >
              <RefreshCw size={14} />
            </motion.button>
          </div>
          <div className="border-b border-gray-400 dark:border-gray-600 mt-1.5" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3 bg-white dark:bg-gray-800">
              <Skeleton className="w-7 h-7 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-2.5 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-gray-300 dark:border-gray-700">
          <History size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="font-display italic text-gray-500 dark:text-gray-400">No activity yet.</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">
            {entries.length} event{entries.length !== 1 ? 's' : ''}
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3 bg-white dark:bg-gray-800">
                <div className="w-7 h-7 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] font-bold font-sans shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mt-0.5">
                  {entry.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-bold">{entry.displayName.split(' ')[0]}</span>
                    {' '}
                    <span className="text-gray-600 dark:text-gray-400">{describeAction(entry)}</span>
                  </p>
                  <p className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wide">
                    {relativeTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
