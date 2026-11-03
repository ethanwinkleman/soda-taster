import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Refrigerator, CupSoda, MessageSquare, Flame, EyeOff } from 'lucide-react';
import type { Soda } from '../types/stash';
import { hapticTap } from '../lib/haptics';
import { isRevealed, hiddenCount } from '../lib/ratingVisibility';
import { ScoreBadge } from './ScoreBadge';
import { tileGradient } from '../lib/sodaTile';

interface Props {
  soda: Soda;
  stashId: string;
  scoreView?: 'group' | 'mine';
  isControversial?: boolean;
  onToggleFridge?: (soda: Soda) => void;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } },
};

/**
 * A soda, as a photo with its name and score on it.
 *
 * This was a 64px thumbnail on a text row, which made a shelf of sodas read as a
 * spreadsheet — the bottle is the thing you recognise, and it was the smallest element
 * on the card. The photo is the card now.
 *
 * **Most sodas have no photo**, so the placeholder has to be a design rather than a gap.
 * It is a cup watermark over one of six on-brand gradients, picked from the soda's id
 * (`lib/sodaTile.ts`), so an unphotographed soda gets a tile that reads as deliberate
 * *and* is told apart from its neighbours at a glance. Those gradients are dark enough
 * for white text, so a placeholder takes exactly the same scrim and type as a real
 * photo rather than needing a second treatment.
 */
export function SodaCard({
  soda,
  stashId,
  scoreView = 'group',
  isControversial = false,
}: Props) {
  const navigate = useNavigate();
  // Your own score is always yours to see. The group score waits until you have rated.
  const revealed = isRevealed(soda);
  const blindCount = hiddenCount(soda);
  const score = scoreView === 'mine'
    ? (soda.myRating?.score ?? null)
    : (revealed ? soda.avgScore : null);

  // "Not rated" means *you* have not rated it, whatever anyone else has done — a soda
  // the group has already scored is the one you most want to get to, and rating it is
  // also what unseals their verdict. Keying this off `ratingCount` would hide exactly
  // those, which is the same trap Try Next documents.
  const unrated = soda.myRating === null;

  // The meta line never repeats the badge. In the Mine view it used to read "Not
  // rated" for exactly the sodas the badge is now on, so the card said it twice; where
  // the badge covers it, this carries the group's count instead, which is the thing the
  // card would otherwise not tell you.
  const ratingsText = scoreView === 'mine' && soda.myRating
    ? 'My rating'
    : blindCount > 0
      ? `${blindCount} hidden`
      : `${soda.ratingCount} rating${soda.ratingCount !== 1 ? 's' : ''}`;

  function handleClick() {
    hapticTap();
    navigate(`/stash/${stashId}/soda/${soda.id}`);
  }

  return (
    <motion.div variants={cardVariants}>
      <motion.div
        layoutId={`soda-${soda.id}-card`}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 cursor-pointer shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] hover:shadow-[0_8px_24px_-6px_rgba(255,61,120,0.25)] transition-shadow"
      >
        {soda.imageUrl ? (
          <motion.img
            layoutId={`soda-${soda.id}-thumb`}
            src={soda.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.div
            layoutId={`soda-${soda.id}-thumb`}
            className={`absolute inset-0 bg-gradient-to-br ${tileGradient(soda.id)} flex items-center justify-center`}
          >
            <CupSoda className="w-1/2 h-1/2 text-white/25" strokeWidth={1.5} />
          </motion.div>
        )}

        {/* The photo is someone's camera roll, so the type cannot rely on it being
            dark. The scrim is what makes white legible over any of them. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none"
        />

        {/* Top-left stack, so the two chips never collide on a 138px card. Cherry for
            the one that is a call to action, smoked glass for the one that is a fact. */}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {unrated && (
            <span className="rounded-full bg-sky-500 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/60 shadow-[0_2px_8px_-2px_rgba(26,21,35,0.5)]">
              Not rated
            </span>
          )}
          {soda.inFridge && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              <Refrigerator size={10} />
              {soda.quantity > 0 ? `×${soda.quantity}` : 'stocked'}
            </span>
          )}
        </div>

        <div className="absolute right-2 top-2">
          {score !== null ? (
            <ScoreBadge
              score={score}
              size="sm"
              // Only the group average morphs into the detail page's badge, because
              // that is the one the detail page draws under this id. Handing it
              // "mine" would land your score in the average's place.
              layoutId={scoreView === 'group' ? `soda-${soda.id}-score` : undefined}
            />
          ) : scoreView === 'group' && blindCount > 0 ? (
            <span
              title="Rate this yourself to see what everyone else gave it"
              className="w-10 h-10 rounded-full border-2 border-dashed border-white/80 bg-black/45 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <EyeOff size={15} aria-label="Score hidden until you rate it" />
            </span>
          ) : (
            <span className="w-10 h-10 rounded-full border-2 border-dashed border-white/60 bg-black/35 backdrop-blur-sm flex items-center justify-center font-display text-sm text-white/80">
              —
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <motion.p
            layoutId={`soda-${soda.id}-name`}
            className="font-display font-bold text-[13px] leading-tight text-white line-clamp-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]"
          >
            {soda.name}
          </motion.p>
          <div className="mt-1 flex items-center gap-1 font-sans text-[10px] uppercase tracking-wide text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {soda.brand && (
              <>
                <span className="truncate">{soda.brand}</span>
                <span className="text-white/40">·</span>
              </>
            )}
            <span className="shrink-0">{ratingsText}</span>
            {soda.commentCount > 0 && (
              <span className="flex items-center gap-0.5 shrink-0">
                <MessageSquare size={9} />
                {soda.commentCount}
              </span>
            )}
            {isControversial && (
              <Flame
                size={10}
                className="shrink-0 text-orange-400"
                aria-label="Most controversial"
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
