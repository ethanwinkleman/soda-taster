import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CupSoda, EyeOff, Refrigerator } from 'lucide-react';
import type { Soda } from '../types/stash';
import { isRevealed, hiddenCount } from '../lib/ratingVisibility';
import { buildReveal, type OtherScore } from '../lib/reveal';
import { useSodaRatings } from '../hooks/useSodaRatings';
import { useAuth } from '../contexts/AuthContext';
import { StarRating } from './StarRating';
import { Button } from './ui';
import { hapticTap, hapticMedium } from '../lib/haptics';

/** How many to offer before the shelf starts. */
const SHORTLIST = 3;

interface Props {
  sodas: Soda[];
  stashId: string;
  /** The collection's own `saveRating`, so this writes through the same cache. */
  onRate: (sodaId: string, score: number) => Promise<void> | void;
  loading?: boolean;
}

/**
 * The sodas in this collection you have not rated, with the rating in the row.
 *
 * This was a tab of its own and is a block near the top of the collection page now.
 * What it kept from that page is the only part that had no other home: **rating without
 * leaving the list**, and the reveal that lands when the group's sealed verdict opens.
 * What it dropped is everything the collection page already does — the search box, the
 * add button — because two of each on one screen is the duplication this app keeps
 * having to undo.
 *
 * It is scoped to **this** collection, not to every one you belong to. You are standing
 * inside a collection; a soda from a different shelf is not a thing you can open.
 */
export function RateWaiting({ sodas, stashId, onRate, loading = false }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [justRated, setJustRated] = useState<string | null>(null);

  // Untasted means *you* have not rated it, whatever the rest of the group has done —
  // a soda they have already scored is the one most worth getting to, because rating
  // it is also what unseals their verdict.
  const waiting = sodas.filter((s) => s.myRating === null);

  // The soda you just rated is no longer "waiting", so the row holding its reveal would
  // unmount the instant the write lands — and the reveal is the whole reason to rate
  // here rather than on the detail page. Hold it until you move on.
  const held = justRated ? sodas.find((s) => s.id === justRated) : undefined;
  const list = [
    ...waiting.slice(0, SHORTLIST),
    ...(held && !waiting.some((s) => s.id === held.id) ? [held] : []),
  ];

  // **The page's own data is what says the write landed.** `saveRating` is deliberately
  // fired and not awaited — offline it pauses rather than throws — so awaiting the call
  // proves nothing. What does prove it is this collection's query refetching: the
  // mutation invalidates it on success, and a soda whose group scores have appeared is
  // a soda the server has accepted a rating for.
  const groupScores = held?.otherScores ?? [];
  const myScore = held?.myRating?.score ?? null;

  // Names are the one thing the list cannot carry, so they come from the per-soda read
  // — and only once the scores are visible, because until the rating lands the policy
  // hands back your own rows and nobody else's.
  const { ratings } = useSodaRatings(justRated ?? undefined);
  const others: OtherScore[] = ratings
    .filter((r) => r.userId !== user?.id && r.score !== null)
    .map((r) => ({ name: r.displayName || 'Someone', score: Number(r.score) }));

  useEffect(() => {
    if (justRated && groupScores.length > 0) {
      void queryClient.invalidateQueries({ queryKey: ['soda-ratings', justRated] });
    }
  }, [justRated, groupScores.length, queryClient]);

  // Nothing to open means the reveal can be drawn at once; otherwise it waits for the
  // names rather than claiming you were first.
  const reveal =
    justRated === null || myScore === null ? null
      : groupScores.length === 0 ? buildReveal(myScore, [])
        : others.length > 0 ? buildReveal(myScore, others)
          : null;

  if (loading || list.length === 0) return null;

  function toggle(soda: Soda) {
    hapticTap();
    if (openId === soda.id) { setOpenId(null); return; }
    setOpenId(soda.id);
    setScore(0);
    setJustRated(null);
  }

  async function commit(soda: Soda) {
    if (score <= 0) return;
    setSaving(true);
    hapticMedium();
    await onRate(soda.id, score);
    setSaving(false);
    setJustRated(soda.id);
  }

  return (
    <section aria-label="Waiting on you" className="mb-5">
      <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
        Waiting on you
        <span className="ml-2 normal-case tracking-normal">{waiting.length} unrated</span>
      </p>

      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
      >
        {list.map((soda) => (
          <Row
            key={soda.id}
            soda={soda}
            open={openId === soda.id}
            rated={justRated === soda.id}
            reveal={justRated === soda.id ? reveal : null}
            score={score}
            saving={saving}
            onToggle={() => toggle(soda)}
            onScore={setScore}
            onSave={() => commit(soda)}
            onOpenDetail={() => navigate(`/stash/${stashId}/soda/${soda.id}`)}
          />
        ))}
      </motion.div>

      {waiting.length > SHORTLIST && (
        <p className="mt-2 font-sans text-[11px] text-gray-400 dark:text-gray-500">
          {waiting.length - SHORTLIST} more unrated — Try Next below has all of them.
        </p>
      )}
    </section>
  );
}

function Row({ soda, open, rated, reveal, score, saving, onToggle, onScore, onSave, onOpenDetail }: {
  soda: Soda;
  open: boolean;
  rated: boolean;
  reveal: ReturnType<typeof buildReveal> | null;
  score: number;
  saving: boolean;
  onToggle: () => void;
  onScore: (n: number) => void;
  onSave: () => void;
  onOpenDetail: () => void;
}) {
  const sealed = !isRevealed(soda);
  const hidden = hiddenCount(soda);

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
          <div className="mt-0.5 flex items-center gap-2">
            <p className="font-sans text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {sealed ? 'Rate it to see what they said' : soda.brand || 'Not rated yet'}
            </p>
            {soda.inFridge && (
              <span className="shrink-0 flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Refrigerator size={10} />
                {soda.quantity > 0 ? `×${soda.quantity}` : 'stocked'}
              </span>
            )}
          </div>
        </div>

        {sealed ? (
          <span className="shrink-0 text-sky-600 dark:text-sky-400" title={`${hidden} rating${hidden !== 1 ? 's' : ''} hidden until you rate it`}>
            <EyeOff size={14} aria-label="Score hidden until you rate it" />
          </span>
        ) : (
          <span className="shrink-0 font-sans text-[11px] text-gray-300 dark:text-gray-600">—</span>
        )}
      </motion.button>

      <AnimatePresence initial={false}>
        {open && !rated && (
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
                  {saving ? 'Saving…' : 'Rate it'}
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
