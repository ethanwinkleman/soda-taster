import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CupSoda, Plus, EyeOff, Barcode, Refrigerator } from 'lucide-react';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useHomeUntasted } from '../hooks/useHomeUntasted';
import { useTasteSodas, type TasteSoda } from '../hooks/useTasteSodas';
import { useStashSodas } from '../hooks/useStashSodas';
import { searchSodas, hasExactMatch, tastedSummary } from '../lib/sodaSearch';
import { buildReveal, formatScore } from '../lib/reveal';
import { StarRating } from '../components/StarRating';
import { Button } from '../components/ui';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { Skeleton } from '../components/Skeleton';
import { hapticTap, hapticMedium } from '../lib/haptics';

interface Props {
  stashes: Stash[];
  loading: boolean;
}

/**
 * The main screen, and the only one anyone uses often.
 *
 * Two jobs happen all the time and they are the same interaction: "have we had this
 * before?" and "rate this now". You type a name; either it comes back with a score
 * against it, which is the answer, or it does not and you add it. Everything else —
 * how you are doing, managing collections — is occasional or rare, and lives elsewhere
 * so that it is not sitting on top of this.
 */
export function SodasPage({ stashes, loading }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  const [query, setQuery] = useState('');
  /** The row currently expanded for rating — inline, so the search stays put. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justRated, setJustRated] = useState<string | null>(null);

  const stashIds = useMemo(() => stashes.map((s) => s.id), [stashes]);
  const { sodas, loading: sodasLoading } = useTasteSodas(stashIds, user?.id);
  const { sodas: untasted } = useHomeUntasted(user?.id);

  const open = sodas.find((s) => s.id === openId) ?? null;
  const { saveRating } = useStashSodas(open?.stashId, user?.id, displayName);

  const results = useMemo(() => searchSodas(sodas, query), [sodas, query]);
  const exact = hasExactMatch(results, query);

  /** With no query, the shortlist is what you are most likely reaching for. */
  const sealedIds = useMemo(
    () => new Set(untasted.filter((u) => u.ratingCount > 0).map((u) => u.id)),
    [untasted],
  );
  const shortlist = useMemo(() => {
    const byId = new Map(sodas.map((s) => [s.id, s]));
    return untasted.map((u) => byId.get(u.id)).filter((s): s is TasteSoda => !!s).slice(0, 8);
  }, [untasted, sodas]);

  function toggle(soda: TasteSoda) {
    hapticTap();
    if (openId === soda.id) { setOpenId(null); return; }
    setOpenId(soda.id);
    setScore(soda.myScore ?? 0);
    setJustRated(null);
  }

  async function commit(soda: TasteSoda) {
    if (score <= 0) return;
    setSaving(true);
    hapticMedium();
    await saveRating(soda.id, score, displayName, undefined);
    // Rating it is what unseals everyone else's, so every cached copy is now stale.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['taste-sodas'] }),
      queryClient.invalidateQueries({ queryKey: ['home-untasted', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['soda-ratings', soda.id] }),
    ]);
    setSaving(false);
    setJustRated(soda.id);
    setOpenId(null);
  }

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
        <Button onClick={() => navigate('/collections')} className="w-full py-2.5">
          Go to collections
        </Button>
      </div>
    );
  }

  const list = query ? results : shortlist;

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      {/* Nothing above the search. It is the first thing on the most-used screen
          because it answers both frequent questions at once. */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setJustRated(null); }}
          placeholder="Have we had this? Search or add…"
          autoComplete="off"
          className="w-full pl-9 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400"
        />
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0]?.id}/scan`)}
          disabled={!stashes.length}
          className="tap-44 flex-1 py-2"
        >
          <Barcode size={13} />
          Scan
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0]?.id}/add`)}
          disabled={!stashes.length}
          className="tap-44 flex-1 py-2"
        >
          <Plus size={13} />
          Add new
        </Button>
      </div>

      {!query && (
        <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          {shortlist.length ? 'Not rated yet' : 'Everything is rated'}
        </p>
      )}

      {(loading || sodasLoading) ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-6 font-sans text-sm text-gray-400 dark:text-gray-500 text-center">
          {query ? `No soda here matches “${query}”.` : 'Nothing left to try — add one.'}
        </p>
      ) : (
        <motion.div
          className="mt-3 space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
        >
          {list.map((soda) => (
            <SodaRow
              key={soda.id}
              soda={soda}
              sealed={sealedIds.has(soda.id)}
              open={openId === soda.id}
              justRated={justRated === soda.id}
              score={score}
              saving={saving}
              onToggle={() => toggle(soda)}
              onScore={setScore}
              onSave={() => commit(soda)}
              onOpenDetail={() => navigate(`/stash/${soda.stashId}/soda/${soda.id}`)}
            />
          ))}
        </motion.div>
      )}

      {/* Only when nothing in the collection is already exactly this. */}
      {query && !exact && (
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0]?.id}/add`, { state: { name: query } })}
          className="tap-44 w-full mt-3 py-2.5"
        >
          <Plus size={13} />
          Add “{query}” as new
        </Button>
      )}
    </div>
  );
}

function SodaRow({ soda, sealed, open, justRated, score, saving, onToggle, onScore, onSave, onOpenDetail }: {
  soda: TasteSoda;
  sealed: boolean;
  open: boolean;
  justRated: boolean;
  score: number;
  saving: boolean;
  onToggle: () => void;
  onScore: (n: number) => void;
  onSave: () => void;
  onOpenDetail: () => void;
}) {
  const summary = tastedSummary(soda);
  const reveal = justRated && soda.myScore !== null
    ? buildReveal(soda.myScore, soda.others)
    : null;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] overflow-hidden"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 p-3"
      >
        {soda.imageUrl ? (
          <img src={soda.imageUrl} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800">
            <CupSoda size={20} className="text-sky-400 dark:text-gray-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-snug">
            {soda.name}
          </p>
          {/* The answer to "have we had this", on the line under the name. */}
          <p className="mt-0.5 font-sans text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {summary ?? (sealed ? 'Rate it to see what they said' : soda.brand || 'Not rated yet')}
          </p>
        </div>

        {sealed && soda.myScore === null ? (
          <span className="shrink-0 text-sky-600 dark:text-sky-400" title="Someone has rated this; yours unseals it">
            <EyeOff size={14} />
          </span>
        ) : soda.myScore !== null ? (
          <span className="shrink-0 w-9 h-9 rounded-full border-2 border-sky-500 dark:border-sky-400 flex items-center justify-center font-display font-bold text-xs tabular-nums text-gray-900 dark:text-gray-50">
            {formatScore(soda.myScore)}
          </span>
        ) : (
          <Refrigerator size={14} className="shrink-0 text-gray-300 dark:text-gray-600" />
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rate"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-3">
              <StarRating value={score} onChange={onScore} size="lg" />
              <div className="mt-3 flex gap-2">
                <Button onClick={onSave} disabled={score <= 0 || saving} className="flex-1 py-2">
                  {saving ? 'Saving…' : soda.myScore !== null ? 'Update' : 'Rate it'}
                </Button>
                <Button variant="secondary" onClick={onOpenDetail} className="tap-44 py-2 px-3">
                  Notes
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {reveal && (
          <motion.div
            key="reveal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-200 dark:border-gray-700 bg-sky-50/60 dark:bg-sky-900/15"
          >
            <div className="px-3 py-2.5">
              <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100">
                {reveal.headline}
              </p>
              <p className="mt-0.5 font-sans text-xs text-gray-600 dark:text-gray-400">
                {reveal.detail}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
