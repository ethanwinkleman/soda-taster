import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Refrigerator, Minus, Plus, Trash2, Check, X, Pencil, Camera, Flame, CupSoda } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { StarRating } from '../components/StarRating';
import { ScoreBadge } from '../components/ScoreBadge';
import { Skeleton } from '../components/Skeleton';
import { SodaComments } from '../components/SodaComments';
import { ShareCardButton } from '../components/ShareCardButton';
import { Button, Textarea, FieldLabel } from '../components/ui';
import { hapticTap, hapticMedium, hapticSuccess, hapticError } from '../lib/haptics';

export function SodaDetailPage() {
  const { id: stashId, sodaId } = useParams<{ id: string; sodaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;
  const confirm = useConfirm();
  const { sodas, loading, error, editSoda, removeSoda, setFridgeStatus, updateSodaImage, saveRating, deleteRating, refresh } =
    useStashSodas(stashId, user?.id, displayName);

  const sodaIndex = sodas.findIndex((s) => s.id === sodaId);
  const soda = sodaIndex >= 0 ? sodas[sodaIndex] : undefined;
  const prevSoda = sodaIndex > 0 ? sodas[sodaIndex - 1] : null;
  const nextSoda = sodaIndex >= 0 && sodaIndex < sodas.length - 1 ? sodas[sodaIndex + 1] : null;

  function handleSwipeEnd(_: unknown, info: PanInfo) {
    const past = Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500;
    if (!past) return;
    if (info.offset.x < 0 && nextSoda) {
      hapticTap();
      navigate(`/stash/${stashId}/soda/${nextSoda.id}`);
    } else if (info.offset.x > 0 && prevSoda) {
      hapticTap();
      navigate(`/stash/${stashId}/soda/${prevSoda.id}`);
    }
  }

  const isControversial = (() => {
    const candidates = sodas.filter((s) => s.ratings.length >= 2);
    if (!candidates.length) return false;
    const variance = (s: typeof candidates[0]) => {
      const scores = s.ratings.map((r) => r.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      return scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    };
    const best = candidates.reduce((a, b) => variance(a) >= variance(b) ? a : b);
    return variance(best) > 0 && best.id === sodaId;
  })();

  const imgInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [ratingVal, setRatingVal] = useState(0);
  const [noteVal, setNoteVal] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && soda && !initialized) {
      setRatingVal(soda.myRating?.score ?? 0);
      setNoteVal(soda.myRating?.notes ?? '');
      setInitialized(true);
    }
  }, [loading, soda, initialized]);

  function startEditing() {
    if (!soda) return;
    setEditName(soda.name);
    setEditBrand(soda.brand);
    setEditing(true);
  }

  async function handleEditSave() {
    if (!soda) return;
    const name = editName.trim() || soda.name;
    const brand = editBrand.trim();
    setEditing(false);
    toast.success('Record updated.');
    try {
      await editSoda(soda.id, { name, brand });
    } catch {
      toast.error('Update failed — changes reverted.');
    }
  }

  async function handleSaveRating() {
    if (!soda || !ratingVal) return;
    const isUpdate = !!soda.myRating;
    hapticSuccess();
    try {
      await saveRating(soda.id, ratingVal, displayName, noteVal);
      toast.success(isUpdate ? 'Rating updated.' : 'Rating saved.');
    } catch {
      hapticError();
      toast.error('Failed to save rating.');
    }
  }

  // Tapping a star saves immediately — no separate submit step
  async function handleStarTap(v: number) {
    if (!soda) return;
    hapticTap();
    const prevScore = soda.myRating?.score ?? 0;
    const isUpdate = !!soda.myRating;
    setRatingVal(v);
    try {
      await saveRating(soda.id, v, displayName, noteVal);
      toast.success(isUpdate ? 'Rating updated.' : 'Rating saved.');
    } catch {
      setRatingVal(prevScore);
      hapticError();
      toast.error('Failed to save rating.');
    }
  }

  async function handleDeleteRating() {
    if (!soda?.myRating) return;
    const { id: ratingId, score: prevScore, notes: prevNotes } = soda.myRating;
    hapticMedium();
    setRatingVal(0);
    setNoteVal('');
    try {
      await deleteRating(ratingId, soda.id);
      toast.success('Rating removed.');
    } catch {
      setRatingVal(prevScore);
      setNoteVal(prevNotes ?? '');
      hapticError();
      toast.error('Failed to remove rating.');
    }
  }

  async function handleFridgeToggle() {
    if (!soda) return;
    hapticMedium();
    const newInFridge = !soda.inFridge;
    try {
      await setFridgeStatus(soda.id, newInFridge, newInFridge ? Math.max(soda.quantity, 1) : 0);
    } catch {
      hapticError();
      toast.error('Failed to update stock status.');
    }
  }

  async function handleQtyChange(delta: number) {
    if (!soda) return;
    hapticTap();
    const newQty = Math.max(0, soda.quantity + delta);
    try {
      await setFridgeStatus(soda.id, soda.inFridge, newQty);
    } catch {
      hapticError();
      toast.error('Failed to update quantity.');
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !soda) return;
    e.target.value = '';
    setImageError(null);
    setUploadingImage(true);
    const err = await updateSodaImage(soda.id, file);
    setUploadingImage(false);
    if (err) { setImageError(err); toast.error(err); return; }
    toast.success('Photo updated.');
  }

  async function handleDelete() {
    if (!soda) return;
    const ok = await confirm({
      title: `Remove "${soda.name}"?`,
      body: 'This will remove the soda and all its ratings from the collection.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeSoda(soda.id);
      navigate(`/stash/${stashId}`);
    } catch {
      hapticError();
      toast.error('Failed to remove soda.');
    }
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-display text-gray-500 dark:text-gray-400 mb-4">
          Failed to load soda.
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

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Skeleton className="w-8 h-8 shrink-0 mt-1" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </div>
        {/* Hero (image + score) */}
        <div className="flex rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Skeleton className="w-1/3 shrink-0 min-h-[11rem]" />
          <div className="flex-1 p-4 flex items-center gap-3">
            <Skeleton className="w-12 h-12 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
        {/* My rating */}
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-36" />
        </div>
        {/* Fridge */}
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="w-11 h-6 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!soda) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-sans text-gray-400 dark:text-gray-500">Soda not found.</p>
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="mt-4 text-sm font-sans text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
        >
          ← Return to collection
        </button>
      </div>
    );
  }

  const noteChanged = noteVal.trim() !== (soda.myRating?.notes ?? '');

  return (
    <div className="overflow-x-hidden">
    <motion.div
      className="max-w-md mx-auto px-4 py-8"
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleSwipeEnd}
    >

      {/* Article header */}
      <div className="flex items-start gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/stash/${stashId}`)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 mt-1"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Soda name"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-sky-500 dark:border-sky-400 text-gray-900 dark:text-gray-100 focus:outline-none font-display text-lg font-bold"
              />
              <input
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                placeholder="Manufacturer (optional)"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none font-sans text-sm"
              />
            </div>
          ) : (
            <>
              <motion.h1
                layoutId={`soda-${soda.id}-name`}
                className="font-display text-2xl font-bold text-gray-900 dark:text-white leading-tight break-words"
              >
                {soda.name}
              </motion.h1>
              {soda.brand && (
                <p className="font-sans text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                  {soda.brand}
                </p>
              )}
              {isControversial && (
                <span className="inline-flex items-center gap-1 mt-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400">
                  <Flame size={10} />
                  Most Controversial
                </span>
              )}
            </>
          )}
        </div>

        {editing ? (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 mt-1"
            aria-label="Edit soda"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Hero — image (left ⅓) + avg score (right ⅔) */}
      <motion.div
        layoutId={`soda-${soda.id}-card`}
        className="mb-5 flex rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-[0_4px_20px_-6px_rgba(255,61,120,0.12)]"
      >
        {/* Image column */}
        <div className="w-1/3 shrink-0 relative min-h-[11rem] self-stretch">
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />
          {soda.imageUrl ? (
            <>
              <motion.img
                layoutId={`soda-${soda.id}-thumb`}
                src={soda.imageUrl}
                alt={soda.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-2 right-1.5 p-1 bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                aria-label="Change photo"
              >
                {uploadingImage
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={12} />}
              </button>
            </>
          ) : (
            <motion.div layoutId={`soda-${soda.id}-thumb`} className="absolute inset-0">
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors border-r border-dashed border-gray-300 dark:border-gray-600"
              >
                <CupSoda size={20} className="text-gray-300 dark:text-gray-600" />
                <span className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-wider text-center leading-tight px-1">
                  <Camera size={10} />
                  Add photo
                </span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Score column — Average (group) on the left, Mine on the right */}
        <div className="flex-1 min-h-[11rem] grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
          <AnimatePresence mode="wait">
            {soda.avgScore !== null ? (
              <motion.div
                key="avg-rated"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="p-4 flex flex-col justify-center items-center gap-2 text-center"
              >
                <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Average
                </span>
                <ScoreBadge score={soda.avgScore} size="lg" layoutId={`soda-${soda.id}-score`} burst />
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {soda.ratings.length} rating{soda.ratings.length !== 1 ? 's' : ''}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="avg-unrated"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 flex flex-col justify-center items-center gap-2 text-center"
              >
                <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Average
                </span>
                <span className="font-display text-4xl font-bold text-gray-300 dark:text-gray-600 leading-none">—</span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 italic">
                  Not yet rated
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {soda.myRating ? (
              <motion.div
                key="mine-rated"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="p-4 flex flex-col justify-center items-center gap-2 text-center"
              >
                <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Mine
                </span>
                <ScoreBadge score={soda.myRating.score} size="lg" />
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Saved
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="mine-unrated"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 flex flex-col justify-center items-center gap-2 text-center"
              >
                <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Mine
                </span>
                <span className="font-display text-4xl font-bold text-gray-300 dark:text-gray-600 leading-none">—</span>
                <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 italic">
                  Rate below
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {imageError && (
        <p className="mb-4 -mt-3 text-xs font-sans text-red-600 dark:text-red-400">{imageError}</p>
      )}

      {/* My Rating */}
      <div className="mb-5 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]">
        <FieldLabel as="p" className="mb-3">
          My Rating
        </FieldLabel>
        <StarRating value={ratingVal} onChange={handleStarTap} size="lg" />
        <Textarea
          value={noteVal}
          onChange={(e) => setNoteVal(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Tasting notes (optional)…"
          tone="inset"
          className="mt-3 py-2"
        />
        <div className="flex gap-2 mt-2">
          {noteChanged && ratingVal > 0 && (
            <Button onClick={handleSaveRating} className="flex-1">
              Save Notes
            </Button>
          )}
          {soda.myRating && (
            <Button variant="danger" onClick={handleDeleteRating} className="px-4">
              Remove
            </Button>
          )}
        </div>
        {!soda.myRating && ratingVal === 0 && (
          <p className="mt-2 text-[10px] font-sans text-gray-400 dark:text-gray-500">
            Tap a star — your rating saves instantly
          </p>
        )}
      </div>

      {/* Rating breakdown */}
      <AnimatePresence>
      {soda.ratings.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)] overflow-hidden"
        >
          <FieldLabel as="p" className="px-4 pt-4 pb-2">
            Everyone's Ratings
          </FieldLabel>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {soda.ratings.map((r) => {
              const ratingBg = [
                'var(--color-rating-1)',
                'var(--color-rating-2)',
                'var(--color-rating-3)',
                'var(--color-rating-4)',
                'var(--color-rating-5)',
              ][Math.max(0, Math.round(r.score) - 1)];
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {r.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.displayName}</p>
                    {r.notes && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-snug">{r.notes}</p>
                    )}
                  </div>
                  <span
                    className="shrink-0 font-display font-bold text-sm tabular-nums px-2.5 py-1 rounded-full text-gray-900"
                    style={{ background: ratingBg }}
                  >
                    {r.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Fridge inventory */}
      <div className="mb-5 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-[0_2px_12px_-4px_rgba(26,21,35,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Refrigerator size={16} className={soda.inFridge ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'} />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              In Stock
            </span>
          </div>
          <button
            type="button"
            onClick={handleFridgeToggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              soda.inFridge
                ? 'bg-sky-600 dark:bg-sky-400'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
            aria-label="Toggle in fridge"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                soda.inFridge ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {soda.inFridge && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="font-sans text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Quantity</span>
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                onClick={() => handleQtyChange(-1)}
                whileTap={{ scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Minus size={12} />
              </motion.button>
              <span className="w-8 text-center font-display font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {soda.quantity}
              </span>
              <motion.button
                type="button"
                onClick={() => handleQtyChange(1)}
                whileTap={{ scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={12} />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      {stashId && user && (
        <SodaComments
          sodaId={soda.id}
          stashId={stashId}
          userId={user.id}
          displayName={displayName}
        />
      )}

      {/* Share tasting card */}
      <div className="mb-3">
        <ShareCardButton soda={soda} />
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={handleDelete}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-sans text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40 transition-colors"
      >
        <Trash2 size={13} />
        Remove from Collection
      </button>
    </motion.div>
    </div>
  );
}
