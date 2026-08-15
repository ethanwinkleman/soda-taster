import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Minus, Settings, Copy, Check, Trash2, UserMinus, LogOut,
  ChevronLeft, Search, CupSoda, X, Refrigerator, Trophy, Star, ListFilter, History, Download, Barcode, MoreHorizontal, ShoppingCart,
} from 'lucide-react';
import type { Stash, StashMember, SortOption } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { markVisited } from '../hooks/useStashes';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { SodaCard } from '../components/SodaCard';
import { ScoreBadge } from '../components/ScoreBadge';
import { StashIcon, STASH_ICON_DEFS } from '../components/StashIcon';
import { Skeleton } from '../components/Skeleton';
import { PullToRefreshIndicator } from '../components/PullToRefreshIndicator';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { Button, Input, FieldLabel, Modal } from '../components/ui';
import { ShoppingListModal } from '../components/ShoppingListModal';
import { hapticTap, hapticMedium } from '../lib/haptics';

const ACCENT_COLORS: { label: string; value: string | null }[] = [
  { label: 'None', value: null },
  { label: 'Garnet', value: '#7f1d1d' },
  { label: 'Forest', value: '#14532d' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Amber', value: '#78350f' },
  { label: 'Plum', value: '#4a1d96' },
  { label: 'Teal', value: '#134e4a' },
  { label: 'Claret', value: '#881337' },
  { label: 'Copper', value: '#7c2d12' },
  { label: 'Slate', value: '#334155' },
  { label: 'Moss', value: '#365314' },
];


interface Props {
  stashes: Stash[];
  onRename: (id: string, name: string) => Promise<string | null>;
  onUpdateIcon: (id: string, icon: string | null) => Promise<void>;
  onUpdateAccentColor: (id: string, color: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<string | null>;
  onLeave: (id: string) => void;
  getMembers: (stashId: string) => Promise<StashMember[]>;
  removeMember: (stashId: string, userId: string) => Promise<void>;
}

export function StashPage({ stashes, onRename, onUpdateIcon, onUpdateAccentColor, onDelete, onLeave, getMembers, removeMember }: Props) {
  const { id: stashId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stash = stashes.find((s) => s.id === stashId);
  const isOwner = stash?.ownerId === user?.id;
  const confirm = useConfirm();

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;
  const { sodas, loading, error, setFridgeStatus, refresh } = useStashSodas(stashId, user?.id, displayName);
  const { pullDistance, refreshing } = usePullToRefresh(refresh, !!stashId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [restockFilter, setRestockFilter] = useState(false);
  const [members, setMembers] = useState<StashMember[]>([]);
  // Layered over the stash name rather than copied into state when it loads.
  const [renameEdit, setRenameEdit] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [scoreView, setScoreView] = useState<'group' | 'mine'>('group');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (stashId) markVisited(stashId);
  }, [stashId]);

  const renameVal = renameEdit ?? stash?.name ?? '';
  const setRenameVal = setRenameEdit;

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
    if (err) { setSettingsError(err); return; }
    toast.success('Collection renamed.');
  }

  async function handleDelete() {
    if (!stashId) return;
    const ok = await confirm({
      title: `Delete "${stash?.name}"?`,
      body: 'All sodas and ratings will be permanently removed. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const err = await onDelete(stashId);
    if (err) { setSettingsError(err); return; }
    navigate('/', { replace: true });
  }

  async function handleLeave() {
    if (!stashId) return;
    const ok = await confirm({
      title: `Leave "${stash?.name}"?`,
      body: 'You will lose access to this collection and its sodas.',
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    onLeave(stashId);
    navigate('/', { replace: true });
  }

  async function handleRemoveMember(memberId: string) {
    if (!stashId) return;
    const ok = await confirm({
      title: 'Remove member?',
      body: 'They will lose access to this collection immediately.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    await removeMember(stashId, memberId);
    setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    toast.success('Member removed.');
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

  function exportCsv() {
    if (!stash || sodas.length === 0) return;
    const header = ['Name', 'Brand', 'Avg Score', 'My Score', 'In Stock', 'Quantity'];
    const rows = sodas.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.brand.replace(/"/g, '""')}"`,
      s.avgScore ?? '',
      s.myRating?.score ?? '',
      s.inFridge ? 'Yes' : 'No',
      s.quantity,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stash.name.replace(/[^a-z0-9]/gi, '_')}_sodas.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded.');
  }

  async function copyAsJson() {
    if (!stash || sodas.length === 0) return;

    // Collect unique rater display names for the summary
    const raterNames = [...new Set(
      sodas.flatMap((s) => s.ratings.map((r) => r.displayName)).filter(Boolean)
    )];

    const payload = {
      collection: stash.name,
      exported: new Date().toISOString().slice(0, 10),
      summary: {
        totalSodas: sodas.length,
        ratedSodas: sodas.filter((s) => s.avgScore !== null).length,
        overallAvgScore: overallAvg,
        raters: raterNames,
      },
      sodas: [...sodas]
        .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))
        .map((s) => ({
          name: s.name,
          ...(s.brand ? { brand: s.brand } : {}),
          avgScore: s.avgScore,
          ratings: s.ratings.map((r) => ({
            rater: r.displayName,
            score: r.score,
            ...(r.notes ? { notes: r.notes } : {}),
          })),
          ...(s.inFridge ? { inStock: true, quantity: s.quantity } : {}),
          ...(s.commentCount > 0 ? { commentCount: s.commentCount } : {}),
        })),
    };

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success('Copied — paste into any AI to analyse your collection.');
  }

  const fridgeSodas = sodas.filter((s) => s.inFridge);
  const totalUnits = fridgeSodas.reduce((sum, s) => sum + s.quantity, 0);

  // Group metrics
  const ratedSodas = sodas.filter((s) => s.avgScore !== null);
  const overallAvg = ratedSodas.length
    ? Math.round(ratedSodas.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / ratedSodas.length * 10) / 10
    : null;
  const topThree = [...ratedSodas]
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 3);

  // Most controversial: soda with highest rating variance (requires 2+ ratings, variance > 0)
  const controversialSodaId = (() => {
    const candidates = sodas.filter((s) => s.ratings.length >= 2);
    if (!candidates.length) return null;
    const variance = (s: typeof candidates[0]) => {
      const scores = s.ratings.map((r) => r.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    };
    const best = candidates.reduce((a, b) => variance(a) >= variance(b) ? a : b);
    return variance(best) > 0 ? best.id : null;
  })();

  // Mine metrics
  const myRatedSodas = sodas.filter((s) => s.myRating !== null);
  const myOverallAvg = myRatedSodas.length
    ? Math.round(myRatedSodas.reduce((sum, s) => sum + (s.myRating?.score ?? 0), 0) / myRatedSodas.length * 10) / 10
    : null;
  const myTopThree = [...myRatedSodas]
    .sort((a, b) => (b.myRating?.score ?? 0) - (a.myRating?.score ?? 0))
    .slice(0, 3);

  // Show toggle only when the stash has any soda with more than one rating (group view is meaningful)
  const showScoreToggle = sodas.some((s) => s.ratings.length > 1);

  const activeAvg = scoreView === 'mine' ? myOverallAvg : overallAvg;
  const activeTopThree = scoreView === 'mine' ? myTopThree : topThree;

  const filtered = sodas.filter((s) => {
    if (restockFilter && s.inFridge) return false;
    if (restockFilter) {
      const score = scoreView === 'mine' ? (s.myRating?.score ?? null) : s.avgScore;
      if (score === null || score < 4) return false;
    }
    if (!search) return true;
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.brand.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (restockFilter) {
      const aScore = scoreView === 'mine'
        ? (a.myRating?.score ?? -1)
        : (a.myRating?.score ?? a.avgScore ?? -1);
      const bScore = scoreView === 'mine'
        ? (b.myRating?.score ?? -1)
        : (b.myRating?.score ?? b.avgScore ?? -1);
      return bScore - aScore;
    }
    if (sort === 'highest') {
      const aScore = scoreView === 'mine' ? (a.myRating?.score ?? -1) : (a.avgScore ?? -1);
      const bScore = scoreView === 'mine' ? (b.myRating?.score ?? -1) : (b.avgScore ?? -1);
      return bScore - aScore;
    }
    if (sort === 'lowest') {
      const aScore = scoreView === 'mine' ? (a.myRating?.score ?? 999) : (a.avgScore ?? 999);
      const bScore = scoreView === 'mine' ? (b.myRating?.score ?? 999) : (b.avgScore ?? 999);
      return aScore - bScore;
    }
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (!stash) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="font-sans text-gray-400 dark:text-gray-500">Collection not found.</p>
        <NavLink to="/" className="mt-4 inline-block font-sans text-sm underline text-gray-600 dark:text-gray-400">← Back to collections</NavLink>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="font-display text-gray-500 dark:text-gray-400 mb-4">
          Failed to load collection.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="text-sm font-sans font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
      {/* Section masthead */}
      <div className="mb-6">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden shrink-0 mt-0.5"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            {/* Name row — ⋯ floats top-right, name fills remaining width */}
            <div className="relative pr-9">
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {stash.icon && <StashIcon name={stash.icon} size={22} className="shrink-0 text-gray-700 dark:text-gray-300" />}
                {stash.name}
              </h1>
              <div className="absolute right-0 top-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="More actions"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                        <motion.div
                          className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg min-w-[11rem] overflow-hidden"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                        >
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); navigate(`/stash/${stashId}/scan`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <Barcode size={14} />
                            Scan barcode
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); navigate(`/stash/${stashId}/activity`); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <History size={14} />
                            Activity
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); exportCsv(); }}
                            disabled={sodas.length === 0}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Download size={14} />
                            Export CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); copyAsJson(); }}
                            disabled={sodas.length === 0}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Copy size={14} />
                            Copy as JSON for AI
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); setShoppingListOpen(true); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <ShoppingCart size={14} />
                            Shopping List
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-700" />
                          <button
                            type="button"
                            onClick={() => { setMenuOpen(false); setSettingsOpen(true); setSettingsError(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <Settings size={14} />
                            Settings
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {/* Full-width primary CTA */}
            <Button
              onClick={() => navigate(`/stash/${stashId}/add`)}
              className="w-full mt-3 py-2.5"
            >
              <Plus size={13} />
              Add Soda
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics row — skeleton while loading, real data once ready */}
      {loading ? (
        <div className="grid grid-cols-3 gap-0 mb-5 rounded-2xl border border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-2">
              <Skeleton className="h-2 w-14" />
              <Skeleton className="h-6 w-10 mt-0.5" />
              <Skeleton className="h-2 w-12" />
            </div>
          ))}
        </div>
      ) : sodas.length > 0 && (
        <div className="grid grid-cols-3 gap-0 mb-5 rounded-2xl border border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 overflow-hidden shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]">
          <button
            type="button"
            onClick={() => setInventoryOpen(true)}
            className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Refrigerator size={12} className="text-gray-600 dark:text-gray-400 shrink-0" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">In Stock</span>
            </div>
            <span className="font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
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
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">{scoreView === 'mine' ? 'My Top' : 'Top Rated'}</span>
            </div>
            {activeTopThree.length > 0 ? (
              <>
                <span className="font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                  {scoreView === 'mine'
                    ? activeTopThree[0].myRating?.score.toFixed(1)
                    : activeTopThree[0].avgScore?.toFixed(1)}
                </span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {activeTopThree[0].name}
                </span>
              </>
            ) : (
              <>
                <span className="font-display text-2xl font-bold text-gray-300 dark:text-gray-600 leading-none">—</span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">no ratings</span>
              </>
            )}
          </button>

          <div className="bg-white dark:bg-gray-800 p-3 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={12} className="text-amber-500 shrink-0" />
              <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">{scoreView === 'mine' ? 'My Avg' : 'Avg Score'}</span>
            </div>
            <span className="font-display text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
              {activeAvg !== null ? activeAvg.toFixed(1) : '—'}
            </span>
            <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {(scoreView === 'mine' ? myRatedSodas : ratedSodas).length} rated
            </span>
          </div>
        </div>
      )}

      {/* Group / Mine score toggle — only when multiple people have rated */}
      {!loading && showScoreToggle && (
        <div className="flex mb-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => { hapticTap(); setScoreView('group'); }}
            className={`relative flex-1 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors ${
              scoreView === 'group'
                ? 'text-white dark:text-gray-950'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {scoreView === 'group' && (
              <motion.span
                layoutId="scoreview-pill"
                className="absolute inset-0 bg-sky-600 dark:bg-sky-400"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">Group</span>
          </button>
          <button
            type="button"
            onClick={() => { hapticTap(); setScoreView('mine'); }}
            className={`relative flex-1 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-gray-200 dark:border-gray-700 ${
              scoreView === 'mine'
                ? 'text-white dark:text-gray-950'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {scoreView === 'mine' && (
              <motion.span
                layoutId="scoreview-pill"
                className="absolute inset-0 bg-sky-600 dark:bg-sky-400"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">Mine</span>
          </button>
        </div>
      )}

      {/* Search + sort + filter — sticky below the mobile header so it's always reachable */}
      {!loading && <div className="flex gap-2 mb-2 sticky top-[calc(3rem+5px+env(safe-area-inset-top))] md:top-0 z-(--z-sticky) bg-gray-50 dark:bg-gray-950 py-2 -my-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sodas…"
            className="pl-9 pr-4"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          disabled={restockFilter}
          className="px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 uppercase tracking-wide disabled:opacity-40"
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
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-sans text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
            restockFilter
              ? 'bg-sky-600 dark:bg-sky-400 border-sky-600 dark:border-sky-400 text-white dark:text-gray-950'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-sky-500 dark:hover:border-sky-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <ListFilter size={13} />
          <span>Restock</span>
        </button>
      </div>}

      {/* Active filter banner */}
      {!loading && restockFilter && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:text-gray-300">
            Worth buying again — top-rated sodas you're out of
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

      {!loading && !restockFilter && <div className="mb-3" />}

      {/* Soda list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 p-3">
              <Skeleton className="w-12 h-12 shrink-0 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
              <Skeleton className="w-8 h-8 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          {restockFilter ? (
            <div className="text-center py-12">
              <CupSoda size={28} className="mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="font-display text-gray-500 dark:text-gray-400 mb-1">Fridge fully stocked!</p>
              <p className="font-sans text-xs text-gray-400 dark:text-gray-500">All your rated sodas are currently in stock.</p>
            </div>
          ) : search ? (
            <div className="text-center py-12">
              <p className="font-sans text-gray-500 dark:text-gray-400">No sodas match "{search}"</p>
            </div>
          ) : (
            <div className="py-14">
              <div className="max-w-xs mx-auto px-6 text-center">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <CupSoda size={32} className="text-gray-300 dark:text-gray-700" />
                  <FloatingBubbles size={32} className="absolute inset-0" />
                </div>
                <h2 className="font-display text-lg font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  Nothing here yet.
                </h2>
                <p className="font-sans text-sm text-gray-400 dark:text-gray-500 leading-relaxed mb-5">
                  Add your first soda. Rate it. Never forget what it tasted like.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate(`/stash/${stashId}/add`)}
                    className="w-full py-2.5"
                  >
                    <Plus size={13} />
                    Add your first soda
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/stash/${stashId}/scan`)}
                    className="w-full py-2.5 dark:hover:bg-gray-800"
                  >
                    <Barcode size={13} />
                    Scan a barcode
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {sorted.map((soda) => (
            <SodaCard
              key={soda.id}
              soda={soda}
              stashId={stashId!}
              scoreView={scoreView}
              isControversial={soda.id === controversialSodaId}
              onToggleFridge={(s) => setFridgeStatus(s.id, !s.inFridge, !s.inFridge ? Math.max(s.quantity, 1) : 0)}
            />
          ))}
        </motion.div>
      )}

      {/* Settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Collection Settings" variant="dialog">
              <div className="px-5 py-5 space-y-5">
                {/* Icon picker — any member can set the icon */}
                <div>
                  <FieldLabel className="mb-2">
                    Icon
                  </FieldLabel>
                  <div className="grid grid-cols-6 gap-1.5 p-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => stashId && onUpdateIcon(stashId, null)}
                      className={`h-9 rounded-lg flex items-center justify-center font-sans text-[10px] uppercase tracking-wide border transition-colors ${
                        !stash.icon
                          ? 'border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                          : 'border-transparent text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      None
                    </button>
                    {STASH_ICON_DEFS.map(({ name }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => stashId && onUpdateIcon(stashId, name)}
                        className={`h-9 rounded-lg flex items-center justify-center border transition-colors ${
                          stash.icon === name
                            ? 'border-sky-500 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <StashIcon name={name} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                {isOwner && (
                  <div>
                    <FieldLabel className="mb-2">
                      Accent Colour
                    </FieldLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {ACCENT_COLORS.map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          title={label}
                          onClick={() => stashId && onUpdateAccentColor(stashId, value)}
                          className={`w-9 h-9 rounded-xl border-2 transition-all ${
                            stash.accentColor === value
                              ? 'scale-110 shadow'
                              : 'opacity-70 hover:opacity-100'
                          } ${!value ? 'border-gray-300 dark:border-gray-600' : 'border-transparent'}`}
                          style={value ? { backgroundColor: value, borderColor: stash.accentColor === value ? value : 'transparent' } : undefined}
                          aria-label={label}
                          aria-pressed={stash.accentColor === value}
                        >
                          {!value && (
                            <span className="text-gray-400 dark:text-gray-500 text-[9px] font-sans uppercase leading-none flex items-center justify-center w-full h-full">
                              ✕
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isOwner && (
                  <form onSubmit={handleRename}>
                    <FieldLabel className="mb-1.5">
                      Collection Name
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        className="flex-1 py-2"
                      />
                      <Button
                        type="submit"
                        disabled={renaming || !renameVal.trim()}
                      >
                        {renaming ? '…' : 'Save'}
                      </Button>
                    </div>
                  </form>
                )}

                <div>
                  <FieldLabel className="mb-1.5">
                    Invite Code
                  </FieldLabel>
                  <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
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
                  <FieldLabel className="mb-2">
                    Members
                  </FieldLabel>
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center shrink-0 font-sans">
                          {(m.displayName ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="flex-1 font-sans text-sm text-gray-900 dark:text-gray-100 truncate">
                          {m.displayName ?? 'Unknown'}
                          {m.userId === stash.ownerId && (
                            <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wide text-gray-400">owner</span>
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
                      <p className="font-sans text-xs text-gray-400 dark:text-gray-500">Loading members…</p>
                    )}
                  </div>
                </div>

                {settingsError && (
                  <p className="font-sans text-sm text-red-600 dark:text-red-400">{settingsError}</p>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40 transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete Collection
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeave}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <LogOut size={13} />
                      Leave Collection
                    </button>
                  )}
                </div>
              </div>
      </Modal>

      {/* Inventory panel */}
      <Modal
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        variant="sheet"
        title={
          <div className="flex items-center gap-2">
            <Refrigerator size={16} className="text-gray-700 dark:text-gray-300" />
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Stock Inventory</h2>
            <span className="font-sans text-xs text-gray-400 dark:text-gray-500">
              {fridgeSodas.length} {fridgeSodas.length === 1 ? 'soda' : 'sodas'}{totalUnits > 0 ? ` · ${totalUnits} units` : ''}
            </span>
          </div>
        }
      >
              {fridgeSodas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <Refrigerator size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-display text-gray-500 dark:text-gray-400 text-sm">Fridge is empty.</p>
                  <p className="font-sans text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Open a soda and toggle "In Stock" to track your supply.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {fridgeSodas.map((soda) => (
                    <div key={soda.id} className="flex items-center gap-2 px-4 py-2.5">
                      {/* Tappable left region: thumb + name */}
                      <button
                        type="button"
                        onClick={() => { setInventoryOpen(false); navigate(`/stash/${stashId}/soda/${soda.id}`); }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      >
                        {soda.imageUrl ? (
                          <img src={soda.imageUrl} alt="" loading="lazy" decoding="async" className="w-9 h-9 rounded-lg object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800">
                            <CupSoda size={14} className="text-sky-400 dark:text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">{soda.name}</p>
                          {soda.brand && (
                            <p className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">{soda.brand}</p>
                          )}
                        </div>
                      </button>
                      {/* Stepper */}
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={() => { hapticTap(); setFridgeStatus(soda.id, soda.quantity > 1, soda.quantity > 1 ? soda.quantity - 1 : 0); }}
                          className="w-10 h-10 rounded-l-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          aria-label="Decrease"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-9 h-10 flex items-center justify-center font-display font-bold text-sm text-gray-900 dark:text-white tabular-nums border-y border-gray-200 dark:border-gray-700">
                          {soda.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => { hapticTap(); setFridgeStatus(soda.id, true, soda.quantity + 1); }}
                          className="w-10 h-10 rounded-r-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          aria-label="Increase"
                        >
                          <Plus size={11} />
                        </button>
                        {/* Remove from stock */}
                        <button
                          type="button"
                          onClick={() => { hapticMedium(); setFridgeStatus(soda.id, false, 0); }}
                          className="ml-1.5 w-10 h-10 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          aria-label="Remove from stock"
                          title="Remove from stock"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
      </Modal>

      {/* Top rated panel */}
      <Modal
        open={topOpen}
        onClose={() => setTopOpen(false)}
        variant="sheet"
        title={
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-600 dark:text-amber-500" />
            <h2 className="font-display font-bold text-gray-900 dark:text-white">Top Rated</h2>
          </div>
        }
      >
              {topThree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                  <Trophy size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-display text-gray-500 dark:text-gray-400 text-sm">No ratings yet.</p>
                  <p className="font-sans text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Rate some sodas to see your top picks here.
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
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                        i === 0 ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' :
                        i === 1 ? 'border-gray-400 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' :
                                  'border-orange-400 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      }`}>
                        {i + 1}
                      </span>
                      {soda.imageUrl ? (
                        <img src={soda.imageUrl} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800">
                          <CupSoda size={16} className="text-sky-400 dark:text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{soda.name}</p>
                        {soda.brand && (
                          <p className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate">{soda.brand}</p>
                        )}
                      </div>
                      {soda.avgScore !== null && <ScoreBadge score={soda.avgScore} size="sm" />}
                    </button>
                  ))}
                </div>
              )}
      </Modal>

      {stash && (
        <ShoppingListModal
          open={shoppingListOpen}
          onClose={() => setShoppingListOpen(false)}
          stashName={stash.name}
          sodas={sodas}
        />
      )}
    </div>
  );
}
