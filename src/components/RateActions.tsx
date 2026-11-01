import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CupSoda, Plus, EyeOff, Barcode } from 'lucide-react';
import type { Stash } from '../types/stash';
import { useAuth } from '../contexts/AuthContext';
import { useHomeUntasted } from '../hooks/useHomeUntasted';
import { useTasteSodas, type TasteSoda } from '../hooks/useTasteSodas';
import { useStashSodas } from '../hooks/useStashSodas';
import { searchSodas, hasExactMatch, tastedSummary } from '../lib/sodaSearch';
import { buildReveal, formatScore } from '../lib/reveal';
import { StarRating } from '../components/StarRating';
import { Button } from './ui';
import { Skeleton } from './Skeleton';
import { hapticTap, hapticMedium } from '../lib/haptics';

interface Props {
  stashes: Stash[];
  loading: boolean;
}

/** How many of the waiting-on-you rows to draw before the page's numbers start. */
const SHORTLIST = 5;

/**
 * The things on the ratings screen that you *do*, as opposed to read.
 *
 * This used to be a tab of its own — a whole screen whose only content was a search box
 * and a shortlist, which for a household that has rated everything is a screen with
 * nothing on it. It is a section now: the ratings page is where you look a past rating
 * up and where you file a new one, and those belong together.
 *
 * Three actions, in the order they come up: look one up, add one that isn't here, and
 * rate one that is waiting. Rating happens inline — the row expands and the reveal lands
 * in the same row, because opening a page to set five stars puts a navigation on the most
 * frequent action in the app.
 */
export function RateActions({ stashes, loading }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;

  const [query, setQuery] = useState('');
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

  // A soda somebody else has already scored is sealed until you rate it, and that is
  // the whole reason to get to it. The count comes from the RPC; their scores do not.
  const sealedIds = useMemo(
    () => new Set(untasted.filter((u) => u.ratingCount > 0).map((u) => u.id)),
    [untasted],
  );
  const waiting = useMemo(() => {
    const byId = new Map(sodas.map((s) => [s.id, s]));
    return untasted.map((u) => byId.get(u.id)).filter((s): s is TasteSoda => !!s);
  }, [untasted, sodas]);

  const list = query ? results : waiting.slice(0, SHORTLIST);
  const hidden = query ? 0 : Math.max(0, waiting.length - SHORTLIST);

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

  return (
    <section aria-label="Actions">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setJustRated(null); }}
          placeholder="Have we had this? Search…"
          autoComplete="off"
          className="w-full pl-9 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400"
        />
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          onClick={() => navigate(`/stash/${stashes[0]?.id}/add`)}
          disabled={!stashes.length}
          className="tap-44 flex-1 py-2.5"
        >
          <Plus size={14} />
          Add soda
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0]?.id}/scan`)}
          disabled={!stashes.length}
          className="tap-44 flex-1 py-2.5"
        >
          <Barcode size={14} />
          Scan
        </Button>
      </div>

      {!query && waiting.length > 0 && (
        <p className="mt-5 font-sans text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Waiting on you
          <span className="ml-2 normal-case tracking-normal text-gray-400 dark:text-gray-500">
            {waiting.length} unrated
          </span>
        </p>
      )}

      {(loading || sodasLoading) ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : list.length > 0 ? (
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
      ) : query ? (
        <p className="mt-4 font-sans text-sm text-gray-400 dark:text-gray-500 text-center">
          No soda here matches “{query}”.
        </p>
      ) : null}

      {hidden > 0 && (
        <p className="mt-2 font-sans text-[11px] text-gray-400 dark:text-gray-500">
          {hidden} more unrated — open a collection to work through them.
        </p>
      )}

      {/* Only when nothing already here is exactly this: offering to add a second
          Henry Weinhard's is how a collection ends up with three of them. */}
      {query && !exact && (
        <Button
          variant="secondary"
          onClick={() => navigate(`/stash/${stashes[0]?.id}/add`, { state: { name: query } })}
          disabled={!stashes.length}
          className="tap-44 w-full mt-3 py-2.5"
        >
          <Plus size={13} />
          Add “{query}” as new
        </Button>
      )}
    </section>
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
          <span className="shrink-0 font-sans text-[11px] text-gray-300 dark:text-gray-600">—</span>
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
