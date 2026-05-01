import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Layers, Users, CupSoda } from 'lucide-react';
import { motion } from 'framer-motion';
import { StashIcon } from '../components/StashIcon';
import { Skeleton } from '../components/Skeleton';
import { ScoreBadge } from '../components/ScoreBadge';
import type { Stash, RecentRatingActivity } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface Props {
  stashes: Stash[];
  loading: boolean;
  recentActivity: RecentRatingActivity[];
  onCreate: (name: string) => Promise<{ stash: Stash | null; error: string | null }>;
  onJoin: (code: string) => Promise<{ stashId: string | null; error: string | null }>;
}

export function StashesPage({ stashes, loading, recentActivity, onCreate, onJoin }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const { stash, error: err } = await onCreate(newName.trim());
    setBusy(false);
    if (err) { setError(err); return; }
    setNewName('');
    setCreating(false);
    if (stash) navigate(`/stash/${stash.id}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(null);
    const { stashId, error: err } = await onJoin(joinCode.trim());
    setBusy(false);
    if (err) { setError(err); return; }
    setJoinCode('');
    setJoining(false);
    if (stashId) navigate(`/stash/${stashId}`);
  }

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0];

  // Build a stashId → stash name lookup for the Recently Tasted section
  const stashNameMap = new Map(stashes.map((s) => [s.id, s.name]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Page masthead */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-3xl font-black italic text-gray-900 dark:text-white tracking-tight">
            My Collections
          </h1>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setJoining(true); setCreating(false); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-700 dark:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogIn size={13} />
              Join
            </button>
            <button
              type="button"
              onClick={() => { setCreating(true); setJoining(false); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Plus size={13} />
              New
            </button>
          </div>
        </div>
        {firstName && (
          <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-0.5 italic">
            {firstName}'s soda records
          </p>
        )}
        <div className="border-b border-gray-400 dark:border-gray-600 mt-1.5" />
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-5">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
            — New Collection —
          </p>
          <form onSubmit={handleCreate}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 mb-3 font-sans text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !newName.trim()}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {joining && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-5">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
            — Join a Collection —
          </p>
          <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mb-3 italic">
            Enter the 6-character invite code
          </p>
          <form onSubmit={handleJoin}>
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 mb-3 font-mono tracking-[0.4em] text-center text-xl uppercase"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJoining(false)}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || joinCode.length < 4}
                className="flex-1 py-2 font-sans text-xs font-medium uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 font-sans italic">{error}</p>
      )}

      {/* Stash list */}
      {loading ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3 bg-white dark:bg-gray-800">
              <Skeleton className="w-10 h-10 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : stashes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-300 dark:border-gray-700">
          <Layers size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          <p className="font-display italic text-gray-500 dark:text-gray-400">No collections yet</p>
          <p className="text-xs font-sans text-gray-400 dark:text-gray-500 mt-1">Create one to begin tracking sodas</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
          {stashes.map((stash) => (
            <motion.button
              key={stash.id}
              type="button"
              onClick={() => navigate(`/stash/${stash.id}`)}
              whileTap={{ scale: 0.985, opacity: 0.85 }}
              transition={{ duration: 0.1 }}
              style={{ borderLeftColor: stash.accentColor ?? 'transparent' }}
              className="w-full text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 flex items-center gap-3 border-l-4"
            >
              {stash.icon ? (
                <span
                  className={stash.accentColor
                    ? 'w-10 h-10 border-2 flex items-center justify-center shrink-0'
                    : 'w-10 h-10 border-2 border-gray-700 dark:border-gray-300 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0'}
                  style={stash.accentColor ? { borderColor: stash.accentColor, color: stash.accentColor } : undefined}
                >
                  <StashIcon name={stash.icon} size={20} />
                </span>
              ) : (
                <span
                  className={stash.accentColor
                    ? 'w-10 h-10 border-2 flex items-center justify-center shrink-0 text-base font-black font-display'
                    : 'w-10 h-10 border-2 border-gray-700 dark:border-gray-300 flex items-center justify-center text-gray-700 dark:text-gray-200 text-base font-black shrink-0 font-display'}
                  style={stash.accentColor ? { borderColor: stash.accentColor, color: stash.accentColor } : undefined}
                >
                  {stash.name[0]?.toUpperCase() ?? '?'}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-gray-900 dark:text-white truncate">{stash.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-sans text-gray-400 dark:text-gray-500 uppercase tracking-wide flex-wrap">
                  <Users size={9} />
                  <span>{stash.ownerId === user?.id ? 'Proprietor' : 'Member'}</span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>{stash.sodaCount} {stash.sodaCount === 1 ? 'soda' : 'sodas'}</span>
                  {stash.lastTastedAt && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{relativeTime(stash.lastTastedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {stash.newActivityCount > 0 && (
                <span className="shrink-0 font-sans text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60">
                  {stash.newActivityCount} new
                </span>
              )}

              <span className="text-gray-300 dark:text-gray-600 font-sans shrink-0">›</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Recently Tasted supplemental section */}
      {!loading && recentActivity.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="font-display text-sm font-bold italic text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Recently Tasted
            </h2>
            <div className="flex-1 border-b border-gray-300 dark:border-gray-700" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
            {recentActivity.map((entry, i) => {
              const stashName = stashNameMap.get(entry.stashId) ?? 'Unknown collection';
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3"
                >
                  {entry.score !== null ? (
                    <ScoreBadge score={entry.score} size="sm" />
                  ) : (
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                      <CupSoda size={14} className="text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                      {entry.sodaName}
                    </p>
                    <p className="text-[10px] font-sans text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-0.5 truncate">
                      {stashName}
                      <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                      {entry.displayName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-sans text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {relativeTime(entry.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
