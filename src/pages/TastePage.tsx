import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CupSoda, Plus, EyeOff, X, Barcode } from 'lucide-react';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useHomeUntasted } from '../hooks/useHomeUntasted';
import { useTasteSodas, type TasteSoda } from '../hooks/useTasteSodas';
import { useStashSodas } from '../hooks/useStashSodas';
import { useSodaRatings } from '../hooks/useSodaRatings';
import { buildReveal, formatScore } from '../lib/reveal';
import { StarRating } from '../components/StarRating';
import { RevealCard } from '../components/RevealCard';
import { Button, Textarea } from '../components/ui';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { hapticTap, hapticMedium } from '../lib/haptics';

interface Props {
  stashes: Stash[];
  loading: boolean;
}

/**
 * The front door: the act, not the archive.
 *
 * The collections page answered "what do I own", which is a question nobody opens an
 * app to ask. This one asks what you are drinking, takes the rating, and then — the
 * part that never existed — says what that meant. The archive lives at /collections.
 */
export function TastePage({ stashes, loading }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<TasteSoda | null>(null);
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  /** Set once a rating lands, which is what swaps the sheet for the reveal. */
  const [revealed, setRevealed] = useState<TasteSoda | null>(null);

  const stashIds = useMemo(() => stashes.map((s) => s.id), [stashes]);
  const { sodas: untasted } = useHomeUntasted(user?.id);
  const { sodas: all } = useTasteSodas(stashIds, user?.id);

  // The rating itself still belongs to the collection the soda is in, so this is the
  // same mutator the collection page uses — optimistic patch, rollback and all.
  const { saveRating } = useStashSodas(picked?.stashId, user?.id, displayName);
  const { ratings } = useSodaRatings(revealed?.id);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all
      .filter((s) => s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q))
      .slice(0, 8);
  }, [all, query]);

  function choose(soda: TasteSoda) {
    hapticTap();
    setPicked(soda);
    setScore(soda.myScore ?? 0);
    setNotes('');
    setRevealed(null);
  }

  function close() {
    setPicked(null);
    setScore(0);
    setNotes('');
  }

  async function handleSave() {
    if (!picked || score <= 0) return;
    setSaving(true);
    hapticMedium();
    await saveRating(picked.id, score, displayName, notes);
    // Rating it is what unseals the rest, so the cached copy from before is wrong.
    await queryClient.invalidateQueries({ queryKey: ['soda-ratings', picked.id] });
    await queryClient.invalidateQueries({ queryKey: ['home-untasted', user?.id] });
    await queryClient.invalidateQueries({ queryKey: ['taste-sodas'] });
    setSaving(false);
    setRevealed(picked);
    setQuery('');
    close();
  }

  const reveal = revealed
    ? buildReveal(
        ratings.find((r) => r.userId === user?.id)?.score ?? 0,
        ratings.filter((r) => r.userId !== user?.id).map((r) => ({ name: r.displayName || 'Someone', score: r.score })),
      )
    : null;

  // Nothing to rate until there is a collection to rate into.
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

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
        What are you drinking?
      </h1>
      <p className="mt-0.5 font-sans text-xs text-gray-500 dark:text-gray-400">
        Rate it, and find out where everyone else landed.
      </p>

      <div className="relative mt-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your sodas…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400"
        />
      </div>

      <AnimatePresence mode="wait">
        {reveal && revealed && (
          <motion.div
            key="reveal"
            className="mt-5"
            exit={{ opacity: 0, y: -8 }}
          >
            <RevealCard reveal={reveal} sodaName={revealed.name} />
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="tap-44 mt-3 w-full font-sans text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Rate another
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search results take over when there is a query; otherwise the shortlist is
          what you are most likely reaching for — sealed first, then what is cold. */}
      <SodaList
        sodas={query ? matches : untastedAsTaste(untasted)}
        sealedIds={new Set(untasted.filter((u) => u.ratingCount > 0).map((u) => u.id))}
        emptyLabel={query ? `Nothing matches “${query}”.` : 'You have rated everything. Add a soda to keep going.'}
        onPick={choose}
      />

      <Button
        variant="secondary"
        onClick={() => navigate(`/stash/${stashes[0]?.id}/add`)}
        className="w-full mt-4 py-2.5"
        disabled={!stashes.length}
      >
        <Plus size={13} />
        Add a soda
      </Button>
      {stashes.length > 0 && (
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0].id}/scan`)}
          className="tap-44 w-full mt-2 py-2.5"
        >
          <Barcode size={13} />
          Scan a barcode
        </Button>
      )}

      {/* Rating sheet */}
      <AnimatePresence>
        {picked && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-(--z-modal)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Rate ${picked.name}`}
              className="fixed inset-x-0 bottom-0 z-(--z-modal) bg-white dark:bg-gray-800 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 p-5 pb-safe"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="max-w-md mx-auto">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
                      {picked.name}
                    </p>
                    {picked.brand && (
                      <p className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate">{picked.brand}</p>
                    )}
                  </div>
                  <button type="button" onClick={close} aria-label="Close" className="tap-44 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4">
                  <StarRating value={score} onChange={setScore} size="lg" />
                </div>

                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Tasting notes (optional)…"
                  tone="inset"
                  className="mt-3 py-2"
                />

                <Button onClick={handleSave} disabled={score <= 0 || saving} className="w-full mt-3 py-2.5">
                  {saving ? 'Saving…' : picked.myScore !== null ? 'Update rating' : 'Rate it'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The home feed's shape, as the front door's list wants it. */
function untastedAsTaste(rows: { id: string; stashId: string; name: string; brand: string; imageUrl: string | null }[]): TasteSoda[] {
  return rows.map((r) => ({ ...r, myScore: null }));
}

function SodaList({ sodas, sealedIds, emptyLabel, onPick }: {
  sodas: TasteSoda[];
  sealedIds: Set<string>;
  emptyLabel: string;
  onPick: (s: TasteSoda) => void;
}) {
  if (sodas.length === 0) {
    return (
      <p className="mt-5 font-sans text-sm text-gray-400 dark:text-gray-500 text-center">{emptyLabel}</p>
    );
  }
  return (
    <motion.div
      className="mt-5 space-y-2"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
    >
      {sodas.map((soda) => (
        <motion.button
          key={soda.id}
          type="button"
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => onPick(soda)}
          className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] flex items-center gap-3 p-3"
        >
          {soda.imageUrl ? (
            <img src={soda.imageUrl} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-gray-700 dark:to-gray-800">
              <CupSoda size={20} className="text-sky-400 dark:text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-gray-900 dark:text-gray-100 truncate leading-snug">{soda.name}</p>
            {soda.brand && (
              <p className="mt-0.5 font-sans text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">{soda.brand}</p>
            )}
          </div>
          {sealedIds.has(soda.id) ? (
            <span className="shrink-0 flex items-center gap-1 font-sans text-[10px] uppercase tracking-wide text-sky-600 dark:text-sky-400" title="Rate it to see what they said">
              <EyeOff size={12} />
            </span>
          ) : soda.myScore !== null ? (
            <span className="shrink-0 font-sans text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
              {formatScore(soda.myScore)}
            </span>
          ) : null}
        </motion.button>
      ))}
    </motion.div>
  );
}
