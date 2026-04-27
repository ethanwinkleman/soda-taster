import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Refrigerator, Minus, Plus, Trash2, Check, X, Pencil, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStashSodas } from '../hooks/useStashSodas';
import { StarRating } from '../components/StarRating';
import { ScoreBadge } from '../components/ScoreBadge';
import { Skeleton } from '../components/Skeleton';
import { SodaComments } from '../components/SodaComments';

export function SodaDetailPage() {
  const { id: stashId, sodaId } = useParams<{ id: string; sodaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = (user?.user_metadata?.full_name ?? user?.email ?? 'Unknown') as string;
  const { sodas, loading, editSoda, removeSoda, setFridgeStatus, updateSodaImage, saveRating, deleteRating } =
    useStashSodas(stashId, user?.id, displayName);

  const soda = sodas.find((s) => s.id === sodaId);

  const imgInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [ratingVal, setRatingVal] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && soda && !initialized) {
      setRatingVal(soda.myRating?.score ?? 0);
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
    await editSoda(soda.id, {
      name: editName.trim() || soda.name,
      brand: editBrand.trim(),
    });
    setEditing(false);
  }

  async function handleSaveRating() {
    if (!soda || !ratingVal) return;
    setSavingRating(true);
    await saveRating(soda.id, ratingVal, displayName);
    setSavingRating(false);
  }

  async function handleDeleteRating() {
    if (!soda?.myRating) return;
    await deleteRating(soda.myRating.id, soda.id);
    setRatingVal(0);
  }

  async function handleFridgeToggle() {
    if (!soda) return;
    const newInFridge = !soda.inFridge;
    await setFridgeStatus(soda.id, newInFridge, newInFridge ? Math.max(soda.quantity, 1) : 0);
  }

  async function handleQtyChange(delta: number) {
    if (!soda) return;
    const newQty = Math.max(0, soda.quantity + delta);
    await setFridgeStatus(soda.id, soda.inFridge, newQty);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !soda) return;
    e.target.value = '';
    setImageError(null);
    setUploadingImage(true);
    const err = await updateSodaImage(soda.id, file);
    setUploadingImage(false);
    if (err) setImageError(err);
  }

  async function handleDelete() {
    if (!soda || !confirm(`Remove "${soda.name}" from this collection?`)) return;
    await removeSoda(soda.id);
    navigate(`/stash/${stashId}`);
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Skeleton className="w-8 h-8 shrink-0 mt-1" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="border-t border-gray-800 dark:border-gray-200 mb-2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
            <div className="border-b border-gray-400 dark:border-gray-600 mt-2" />
          </div>
        </div>
        {/* Image */}
        <Skeleton className="w-full h-52" />
        {/* Avg score */}
        <div className="flex items-center gap-4 p-4 border border-gray-300 dark:border-gray-600">
          <Skeleton className="w-12 h-12 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        {/* My rating */}
        <div className="p-4 border border-gray-300 dark:border-gray-600 space-y-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-36" />
        </div>
        {/* Fridge */}
        <div className="p-4 border border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="w-11 h-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!soda) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-sans italic text-gray-400 dark:text-gray-500">Soda not found.</p>
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

  const ratingChanged = ratingVal !== (soda.myRating?.score ?? 0);

  return (
    <div className="max-w-md mx-auto px-4 py-8">

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
          <div className="border-t border-gray-800 dark:border-gray-200 mb-1.5" />
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Soda name"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-700 dark:border-gray-300 text-gray-900 dark:text-gray-100 focus:outline-none font-display text-lg font-bold"
              />
              <input
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                placeholder="Manufacturer (optional)"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 focus:outline-none font-sans text-sm italic"
              />
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-black italic text-gray-900 dark:text-white leading-tight break-words">
                {soda.name}
              </h1>
              {soda.brand && (
                <p className="font-sans text-sm text-gray-500 dark:text-gray-400 mt-0.5 italic break-words">
                  {soda.brand}
                </p>
              )}
            </>
          )}
          <div className="border-b border-gray-400 dark:border-gray-600 mt-1.5" />
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

      {/* Illustration */}
      <div className="mb-5">
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleImageChange}
        />
        {soda.imageUrl ? (
          <div className="relative border border-gray-300 dark:border-gray-600 overflow-hidden">
            <img
              src={soda.imageUrl}
              alt={soda.name}
              className="w-full h-52 object-cover"
            />
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
              aria-label="Change photo"
            >
              {uploadingImage
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={14} />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            className="w-full h-24 border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-gray-600 dark:hover:border-gray-400 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <Camera size={18} />
            <span className="text-[10px] font-sans uppercase tracking-[0.2em]">Add illustration</span>
          </button>
        )}
        {imageError && (
          <p className="mt-2 text-xs font-sans text-red-600 dark:text-red-400 italic">{imageError}</p>
        )}
      </div>

      {/* Average score */}
      <AnimatePresence mode="wait">
        {soda.avgScore !== null && (
          <motion.div
            key={soda.avgScore}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-4 mb-5 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
          >
            <ScoreBadge score={soda.avgScore} size="lg" />
            <div>
              <p className="font-display text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                {soda.avgScore.toFixed(1)}
              </p>
              <p className="font-sans text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {soda.ratings.length} rating{soda.ratings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My Rating */}
      <div className="mb-5 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">
          My Rating
        </p>
        <StarRating value={ratingVal} onChange={setRatingVal} size="lg" />
        <div className="flex gap-2 mt-3">
          {ratingChanged && ratingVal > 0 && (
            <button
              type="button"
              onClick={handleSaveRating}
              disabled={savingRating}
              className="flex-1 py-2 font-sans text-xs font-bold uppercase tracking-wider text-gray-50 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-40 transition-colors"
            >
              {savingRating ? 'Filing…' : soda.myRating ? 'Update' : 'Submit'}
            </button>
          )}
          {soda.myRating && (
            <button
              type="button"
              onClick={handleDeleteRating}
              className="py-2 px-4 font-sans text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 border border-gray-300 dark:border-gray-600 hover:border-red-300 transition-colors"
            >
              Retract
            </button>
          )}
        </div>
        {!soda.myRating && ratingVal === 0 && (
          <p className="mt-2 text-[10px] font-sans italic text-gray-400 dark:text-gray-500">
            Tap a star to record your rating
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
          className="mb-5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 overflow-hidden"
        >
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Correspondent Ratings
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Reviewer
                </th>
                <th className="text-right px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {soda.ratings.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <td className="px-4 py-2.5 font-sans text-sm text-gray-900 dark:text-gray-100">{r.displayName}</td>
                  <td className="px-4 py-2.5 text-right font-display font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-amber-500 mr-1">★</span>
                    {r.score.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Fridge inventory */}
      <div className="mb-5 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Refrigerator size={16} className={soda.inFridge ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'} />
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              In Stock
            </span>
          </div>
          <button
            type="button"
            onClick={handleFridgeToggle}
            className={`relative w-11 h-6 transition-colors duration-200 border ${
              soda.inFridge
                ? 'bg-gray-800 dark:bg-gray-200 border-gray-900 dark:border-gray-100'
                : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
            }`}
            aria-label="Toggle in fridge"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 transition-transform duration-200 ${
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
                className="w-8 h-8 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Minus size={12} />
              </motion.button>
              <span className="w-8 text-center font-display font-black text-gray-900 dark:text-gray-100 tabular-nums">
                {soda.quantity}
              </span>
              <motion.button
                type="button"
                onClick={() => handleQtyChange(1)}
                whileTap={{ scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-8 h-8 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={12} />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Correspondence */}
      {stashId && user && (
        <SodaComments
          sodaId={soda.id}
          stashId={stashId}
          userId={user.id}
          displayName={displayName}
        />
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={handleDelete}
        className="w-full flex items-center justify-center gap-2 py-3 font-sans text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40 transition-colors"
      >
        <Trash2 size={13} />
        Remove from Collection
      </button>
    </div>
  );
}
