import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  Plus, Settings, Copy, Check, Trash2, UserMinus, LogOut,
  ChevronLeft, Search, CupSoda, X, Refrigerator, Trophy, Star, ListFilter,
} from 'lucide-react';
import type { Stash, StashMember, SortOption } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { SodaCard } from '../components/SodaCard';
import { ScoreBadge } from '../components/ScoreBadge';

const STASH_ICONS = [
  '🥤', '🍺', '🍻', '🍹', '🍾', '🥂',
  '🧃', '☕', '🍵', '🧋', '🫗', '🫙',
  '🌟', '⭐', '🏆', '❤️', '🔥', '🎯',
  '❄️', '🧊', '🫧', '🌊', '🎪', '🎲',
];

interface Props {
  stashes: Stash[];
  onRename: (id: string, name: string) => Promise<string | null>;
  onUpdateIcon: (id: string, icon: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<string | null>;
  onLeave: (id: string) => void;
  getMembers: (stashId: string) => Promise<StashMember[]>;
  removeMember: (stashId: string, userId: string) => Promise<void>;
}

export function StashPage({ stashes, onRename, onUpdateIcon, onDelete, onLeave, getMembers, removeMember }: Props) {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stash = stashes.find((s) => s.id === stashId);
  const isOwner = stash?.ownerId === user?.id;

  const { sodas, loading } = useStashSodas(stashId, user?.id);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [restockFilter, setRestockFilter] = useState(false);
  const [members, setMembers] = useState<StashMember[]>([]);
  const [renameVal, setRenameVal] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (stash) setRenameVal(stash.name);
  }, [stash?.name]);

  useEffect(() => {
    if (settingsOpen && stashId) {
      getMembers(stashId).then(setMembers);
    }
  }, [settingsOpen, stashId]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!stashId || !renameVal.trim()) return;
    setRenaming(true);
    const err = await onRename(stashId, renameVal.trim());
    setRenaming(false);
    if (err) setSettingsError(err);
  }

  async function handleDelete() {
    if (!stashId || !confirm(`Delete "${stash?.name}"? This cannot be undone.`)) return;
    const err = await onDelete(stashId);
    if (err) { setSettingsError(err); return; }
    navigate('/', { replace: true });
  }

  function handleLeave() {
    if (!stashId || !confirm(`Leave "${stash?.name}"?`)) return;
    onLeave(stashId);
    navigate('/', { replace: true });
  }

  async function handleRemoveMember(memberId: string) {
    if (!stashId || !confirm('Remove this member from the stash?')) return;
    await removeMember(stashId, memberId);
    setMembers((prev) => prev.filter((m) => m.userId !== memberId));
  }

  function copyCode() {
    if (!stash) return;
    navigator.clipboard.writeText(stash.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    if (!stash) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${stash.joinCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fridgeSodas = sodas.filter((s) => s.inFridge);
  const ratedSodas = sodas.filter((s) => s.avgScore !== null);
  const overallAvg = ratedSodas.length
    ? Math.round(ratedSodas.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / ratedSodas.length * 10) / 10
    : null;
  const topThree = [...ratedSodas]
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 3);

  const filtered = sodas.filter((s) => {
    if (restockFilter && s.inFridge) return false;
    if (!search) return true;
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.brand.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (restockFilter) {
      // Personal rating first, fall back to avg, unrated last
      const aScore = a.myRating?.score ?? a.avgScore ?? -1;
      const bScore = b.myRating?.score ?? b.avgScore ?? -1;
      return bScore - aScore;
    }
    if (sort === 'highest') return (b.avgScore ?? -1) - (a.avgScore ?? -1);
    if (sort === 'lowest') return (a.avgScore ?? 999) - (b.avgScore ?? 999);
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (!stash) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="font-sans italic text-gray-400 dark:text-gray-500">Collection not found.</p>
        <NavLink to="/" className="mt-4 inline-block font-sans text-sm underline text-gray-600 dark:text-gray-400">← Back to collections</NavLink>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Section masthead */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="border-t border-gray-800 dark:border-gray-200 mb-1" />
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="font-display text-2xl font-black italic text-gray-900 dark:text-white truncate flex items-center gap-2">
                {stash.icon && <span className="not-italic">{stash.icon}</span>}
                {stash.name}
              </h1>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/stash/${stashId}/add`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors shrink-0"
                >
                  <Plus size={12} />
                  <span className="hidden sm:inline">Record Soda</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsOpen(true); setSettingsError(null); }}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 border border-gray-300 dark:border-gray-600"
                  aria-label="Collection settings"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
            <div className="border-b border-gray-400 dark:border-gray-600 mt-1" />
          </div>
        </div>
      </div>

      {/* Metrics row */}
      {!loading && sodas.length > 0 && (
        <div className="grid grid-cols-3 gap-0 mb-5 border border-gray-300 dark:border-gray-600 divide-x divide-gray-300 dark:divide-gray-600">
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Refrigerator size={12} className="text-gray-600 dark:text-gray-400 shrink-0" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">In Stock</span>
            </div>
            <span className="font-display text-2xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
              {fridgeSodas.length}
            </span>
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {fridgeSodas.length === 1 ? 'soda' : 'sodas'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTopOpen(true)}
            className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy size={12} className="text-amber-600 dark:text-amber-500 shrink-0" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">Top Rated</span>
            </div>
            {topThree.length > 0 ? (
              <>
                <span className="font-display text-2xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
                  {topThree[0].avgScore?.toFixed(1)}
                </span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {topThree[0].name}
                </span>
              </>
            ) : (
              <>
                <span className="font-display text-2xl font-black text-gray-300 dark:text-gray-600 leading-none">—</span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">no ratings</span>
              </>
            )}
          </button>

          <div className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={12} className="text-amber-500 shrink-0" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">Avg Score</span>
            </div>
            <span className="font-display text-2xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
              {overallAvg !== null ? overallAvg.toFixed(1) : '—'}
            </span>
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {ratedSodas.length} rated
            </span>
          </div>
        </div>
      )}

      {/* Search + sort + filter */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          disabled={restockFilter}
          className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300 uppercase tracking-wide disabled:opacity-40"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
          <option value="name">Name A–Z</option>
        </select>
        <button
          type="button"
          onClick={() => setRestockFilter((v) => !v)}
          title="Show sodas not in stock, sorted by your rating"
          className={`flex items-center gap-1.5 px-3 py-2.5 border font-sans text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
            restockFilter
              ? 'bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-gray-50 dark:text-gray-900'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-700 dark:hover:border-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <ListFilter size={13} />
          <span className="hidden sm:inline">Restock</span>
        </button>
      </div>

      {/* Active filter banner */}
      {restockFilter && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 border border-gray-700 dark:border-gray-300 bg-gray-100 dark:bg-gray-800">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:text-gray-300">
            Not in stock · sorted by your rating
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              ({sorted.length} result{sorted.length !== 1 ? 's' : ''})
            </span>
          </p>
          <button
            type="button"
            onClick={() => setRestockFilter(false)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            aria-label="Clear filter"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {!restockFilter && <div className="mb-3" />}

      {/* Soda list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700">
          <CupSoda size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
          {restockFilter ? (
            <>
              <p className="font-display italic text-gray-500 dark:text-gray-400 mb-1">
                Larder fully supplied!
              </p>
              <p className="font-sans text-xs text-gray-400 dark:text-gray-500 italic">
                All your rated sodas are currently in stock.
              </p>
            </>
          ) : search ? (
            <p className="font-sans italic text-gray-500 dark:text-gray-400">No records match "{search}"</p>
          ) : (
            <>
              <p className="font-display italic text-gray-500 dark:text-gray-400 mb-2">No sodas recorded yet</p>
              <button
                type="button"
                onClick={() => navigate(`/stash/${stashId}/add`)}
                className="mt-1 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
              >
                File the first record
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-300 dark:border-gray-600">
          {sorted.map((soda) => (
            <SodaCard key={soda.id} soda={soda} stashId={stashId!} />
          ))}
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 overflow-y-auto"
          onClick={() => setSettingsOpen(false)}
        >
          <div className="flex min-h-full items-center justify-center p-6">
            <div
              className="w-full max-w-sm bg-gray-50 dark:bg-gray-900 border-2 border-gray-800 dark:border-gray-200 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-double border-gray-800 dark:border-gray-200">
                <h2 className="font-display font-bold text-gray-900 dark:text-white">Collection Settings</h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Icon picker — any member can set the icon */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-6 gap-1 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => stashId && onUpdateIcon(stashId, null)}
                      className={`h-9 flex items-center justify-center font-sans text-[10px] uppercase tracking-wide border transition-colors ${
                        !stash.icon
                          ? 'border-gray-700 dark:border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'border-transparent text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      None
                    </button>
                    {STASH_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => stashId && onUpdateIcon(stashId, emoji)}
                        className={`h-9 flex items-center justify-center text-xl border transition-colors ${
                          stash.icon === emoji
                            ? 'border-gray-700 dark:border-gray-300 bg-gray-100 dark:bg-gray-700'
                            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {isOwner && (
                  <form onSubmit={handleRename}>
                    <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1.5">
                      Collection Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-700 dark:focus:border-gray-300"
                      />
                      <button
                        type="submit"
                        disabled={renaming || !renameVal.trim()}
                        className="px-3 py-2 font-sans text-xs font-bold uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        {renaming ? '…' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1.5">
                    Invite Code
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-4 py-2.5">
                    <span className="flex-1 font-mono text-xl tracking-[0.3em] text-gray-900 dark:text-gray-100">
                      {stash.joinCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-1.5 font-sans text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
                  >
                    Copy invite link
                  </button>
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                    Correspondents
                  </label>
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2 py-1.5">
                        <div className="w-7 h-7 border border-gray-500 dark:border-gray-400 text-gray-700 dark:text-gray-300 text-xs font-bold flex items-center justify-center shrink-0 font-sans">
                          {(m.displayName ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="flex-1 font-sans text-sm text-gray-900 dark:text-gray-100 truncate">
                          {m.displayName ?? 'Unknown'}
                          {m.userId === stash.ownerId && (
                            <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wide text-gray-400 italic">proprietor</span>
                          )}
                        </span>
                        {isOwner && m.userId !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Remove member"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="font-sans text-xs italic text-gray-400 dark:text-gray-500">Loading correspondents…</p>
                    )}
                  </div>
                </div>

                {settingsError && (
                  <p className="font-sans text-sm text-red-600 dark:text-red-400 italic">{settingsError}</p>
                )}

                <div className="border-t border-gray-300 dark:border-gray-700 pt-4">
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-2 py-2.5 font-sans text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40 transition-colors"
                    >
                      <Trash2 size={13} />
                      Dissolve Collection
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeave}
                      className="w-full flex items-center justify-center gap-2 py-2.5 font-sans text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <LogOut size={13} />
                      Resign from Collection
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory panel */}
      {inventoryOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setInventoryOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-gray-50 dark:bg-gray-900 border-t-2 sm:border-2 border-gray-800 dark:border-gray-200 max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-double border-gray-800 dark:border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <Refrigerator size={16} className="text-gray-700 dark:text-gray-300" />
                <h2 className="font-display font-bold text-gray-900 dark:text-white">Stock Inventory</h2>
                <span className="font-sans text-xs text-gray-400 dark:text-gray-500">({fridgeSodas.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setInventoryOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {fridgeSodas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <Refrigerator size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-display italic text-gray-500 dark:text-gray-400 text-sm">Larder is bare.</p>
                  <p className="font-sans text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                    Open a soda record and toggle "In Stock" to track your supply.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {fridgeSodas.map((soda) => (
                    <button
                      key={soda.id}
                      type="button"
                      onClick={() => { setInventoryOpen(false); navigate(`/stash/${stashId}/soda/${soda.id}`); }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      {soda.imageUrl ? (
                        <img src={soda.imageUrl} alt="" className="w-10 h-10 object-cover shrink-0 border border-gray-200 dark:border-gray-600" />
                      ) : (
                        <div className="w-10 h-10 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                          <CupSoda size={16} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{soda.name}</p>
                        {soda.brand && (
                          <p className="font-sans text-xs italic text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display text-sm font-black text-gray-700 dark:text-gray-300 tabular-nums">
                          ×{soda.quantity}
                        </span>
                        {soda.avgScore !== null && <ScoreBadge score={soda.avgScore} size="sm" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top rated panel */}
      {topOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setTopOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-gray-50 dark:bg-gray-900 border-t-2 sm:border-2 border-gray-800 dark:border-gray-200 max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-double border-gray-800 dark:border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-amber-600 dark:text-amber-500" />
                <h2 className="font-display font-bold text-gray-900 dark:text-white">Distinguished Sodas</h2>
              </div>
              <button
                type="button"
                onClick={() => setTopOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {topThree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <Trophy size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-display italic text-gray-500 dark:text-gray-400 text-sm">No verdicts rendered yet.</p>
                  <p className="font-sans text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                    Rate some sodas to see the most distinguished ones here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {topThree.map((soda, i) => (
                    <button
                      key={soda.id}
                      type="button"
                      onClick={() => { setTopOpen(false); navigate(`/stash/${stashId}/soda/${soda.id}`); }}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className={`w-7 h-7 border flex items-center justify-center font-display text-xs font-black shrink-0 ${
                        i === 0 ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' :
                        i === 1 ? 'border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' :
                                  'border-orange-400 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      }`}>
                        {i + 1}
                      </span>
                      {soda.imageUrl ? (
                        <img src={soda.imageUrl} alt="" className="w-10 h-10 object-cover shrink-0 border border-gray-200 dark:border-gray-600" />
                      ) : (
                        <div className="w-10 h-10 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                          <CupSoda size={16} className="text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{soda.name}</p>
                        {soda.brand && (
                          <p className="font-sans text-xs italic text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
                        )}
                      </div>
                      {soda.avgScore !== null && <ScoreBadge score={soda.avgScore} size="sm" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
